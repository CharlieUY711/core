/**
 * tipo-de-cambio — escribe la cotizacion oficial del BCU en `exchange_rates`.
 *
 * POR QUE ESTO CORRE EN EL SERVIDOR
 * El TC de una factura no puede salir del cliente. Si cada visitante consulta
 * al BCU por su cuenta, el numero que termina en la orden depende de que le
 * contesto al navegador del comprador y de si le contesto. Aca se consulta una
 * vez, se guarda, y todos -vidriera y checkout- leen la misma fila.
 *
 * ES EL UNICO ESCRITOR de `exchange_rates`. La tabla se lee sin sesion pero no
 * se escribe desde el cliente: un tipo de cambio que puede escribir cualquiera
 * es un precio que puede escribir cualquiera.
 *
 * EL BCU NO TIENE API REST
 * El codigo anterior le pegaba a
 * `cotizaciones.bcu.gub.uy/wscotizaciones/rest/cotizacion/ultimas/...`, que
 * devuelve 404: ese endpoint no existe. Nunca trajo una cotizacion. No se
 * noto porque, al fallar, devolvia 42/44 hardcodeado — o sea que el sistema
 * llevaba todo este tiempo mostrando un dolar inventado y pareciendo que
 * andaba.
 *
 * Lo que si existe es un servicio SOAP: `awsbcucotizaciones`, documentado en
 * su WSDL. Se le pide un rango de fechas y devuelve una fila por dia habil.
 *
 * IDEMPOTENTE
 * Corre cuantas veces se quiera: la fila esta identificada por
 * (source_id, from_currency, to_currency, valid_at), asi que volver a pedir la
 * misma cotizacion no duplica nada. Eso importa porque el BCU no publica todos
 * los dias -sabados, domingos y feriados no hay cotizacion nueva- y porque un
 * job que se reintenta no puede ensuciar la tabla.
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CotizacionBcu {
  fecha: string;    // YYYY-MM-DD, el dia al que corresponde la cotizacion
  monedaBcu: number;// codigo en el nomenclador del BCU
  compra: number;   // TCC
  venta: number;    // TCV
}

/** Que monedas se piden y con que codigo ISO se guardan. */
interface MonedaPedida { bcu: number; iso: string }

/**
 * Las monedas que ofrece el alta de un articulo, salvo el peso.
 *
 * Si el formulario deja elegir una moneda, tiene que existir la cotizacion
 * para convertir a ella: ofrecer EUR y no traer su cotizacion deja al usuario
 * con un selector que cambia la etiqueta y no el numero. Default por si la
 * fuente no lo declara; lo que manda es `config.monedas`.
 */
const MONEDAS_POR_DEFECTO: MonedaPedida[] = [
  { bcu: 2222, iso: "USD" },   // DOLAR USA
  { bcu: 1111, iso: "EUR" },   // EURO
];

const soloFecha = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Le pide al BCU las cotizaciones de los ultimos dias y se queda con la mas
 * reciente.
 *
 * Se pide un rango y no "la de hoy" porque el BCU no publica fines de semana
 * ni feriados: pedir un solo dia devuelve vacio tres o cuatro veces por mes, y
 * entonces el job no escribiria nada justo cuando mas falta hace que la tabla
 * tenga algo. Con un rango, siempre vuelve la ultima que hubo.
 *
 * Si algo sale mal, tira. No hay valor por defecto a proposito: un fallback
 * hardcodeado es peor que no tener cotizacion, porque factura con un numero
 * inventado en vez de negarse. Sin cotizacion nueva queda la anterior, que es
 * un numero real.
 */
async function pedirAlBcu(url: string, cfg: any, monedas: MonedaPedida[]): Promise<CotizacionBcu[]> {
  const grupo  = Number(cfg?.grupo ?? 0);
  const dias   = Number(cfg?.dias_hacia_atras ?? 10);

  const hasta = new Date();
  const desde = new Date(hasta.getTime() - dias * 86_400_000);

  const sobre = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cot="Cotiza">
 <soapenv:Body>
  <cot:wsbcucotizaciones.Execute>
   <cot:Entrada>
    <cot:Moneda>${monedas.map(m => `<cot:item>${m.bcu}</cot:item>`).join("")}</cot:Moneda>
    <cot:FechaDesde>${soloFecha(desde)}</cot:FechaDesde>
    <cot:FechaHasta>${soloFecha(hasta)}</cot:FechaHasta>
    <cot:Grupo>${grupo}</cot:Grupo>
   </cot:Entrada>
  </cot:wsbcucotizaciones.Execute>
 </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml;charset=UTF-8" },
    body: sobre,
  });
  if (!res.ok) {
    throw new Error(`El BCU respondió ${res.status} al pedir la cotización.`);
  }

  const xml = await res.text();

  // El servicio contesta 200 igual cuando rechaza el pedido: el resultado real
  // viene en `respuestastatus`. Sin esto, un error del BCU se leeria como
  // "no hay cotizaciones".
  const status = /<status>(\d+)<\/status>/.exec(xml)?.[1];
  if (status && status !== "1") {
    const msg = /<mensaje>([^<]*)<\/mensaje>/.exec(xml)?.[1] ?? "sin detalle";
    throw new Error(`El BCU rechazó el pedido (status ${status}): ${msg}`);
  }

  // Se parsea con expresiones regulares y no con un parser XML porque la forma
  // de la respuesta es fija y esta declarada en el WSDL; traer un parser
  // entero para leer cuatro campos no se paga.
  const filas: CotizacionBcu[] = [];
  const bloque = /<datoscotizaciones\.dato[^>]*>([\s\S]*?)<\/datoscotizaciones\.dato>/g;
  for (const m of xml.matchAll(bloque)) {
    const cuerpo = m[1];
    const fecha  = /<Fecha>([^<]+)<\/Fecha>/.exec(cuerpo)?.[1];
    const mon    = parseInt(/<Moneda>([^<]+)<\/Moneda>/.exec(cuerpo)?.[1] ?? "", 10);
    const tcc    = parseFloat(/<TCC>([^<]+)<\/TCC>/.exec(cuerpo)?.[1] ?? "");
    const tcv    = parseFloat(/<TCV>([^<]+)<\/TCV>/.exec(cuerpo)?.[1] ?? "");
    if (fecha && Number.isFinite(mon) && Number.isFinite(tcc) && Number.isFinite(tcv) && tcv > 0) {
      filas.push({ fecha, monedaBcu: mon, compra: tcc, venta: tcv });
    }
  }

  if (!filas.length) {
    throw new Error(`El BCU no devolvió ninguna cotización entre ${soloFecha(desde)} y ${soloFecha(hasta)}.`);
  }

  // La ultima de cada moneda: el rango trae varios dias y solo interesa el mas
  // reciente que haya de cada una. Se resuelve por moneda y no de una sola vez
  // porque no todas se publican los mismos dias.
  const ultima = new Map<number, CotizacionBcu>();
  for (const f of filas.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    ultima.set(f.monedaBcu, f);
  }
  return [...ultima.values()];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const responder = (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // La fuente sale de la tabla, no del codigo: cual es el BCU y con que
    // parametros se le pregunta es un dato, y cambiarlo no deberia ser un
    // deploy.
    const { data: fuente, error: errFuente } = await supabase
      .from("exchange_rate_sources")
      .select("id, url, config, status")
      .eq("name", "BCU")
      .maybeSingle();

    if (errFuente) throw new Error(`No se pudo leer la fuente: ${errFuente.message}`);
    if (!fuente) throw new Error("No está cargada la fuente 'BCU' en exchange_rate_sources.");
    if (fuente.status !== "active") {
      return responder({ ok: true, omitido: "La fuente BCU está inactiva." });
    }

    const monedas: MonedaPedida[] = Array.isArray(fuente.config?.monedas) && fuente.config.monedas.length
      ? fuente.config.monedas
      : MONEDAS_POR_DEFECTO;

    const cotizaciones = await pedirAlBcu(fuente.url, fuente.config, monedas);
    const porCodigo = new Map(monedas.map((m) => [m.bcu, m.iso]));

    // Todo contra el peso: el BCU cotiza cada moneda contra el peso uruguayo,
    // asi que eso es lo que se guarda. Pasar de dolares a euros se resuelve
    // pivoteando por el peso, no guardando cada par por separado — n monedas
    // son n filas y no n².
    //
    // `rate` es lo que se factura y es `venta`. Para el arbitraje oficial del
    // BCU compra y venta vienen iguales -publica un solo numero-, asi que hoy
    // da lo mismo; se guardan los dos igual porque es lo que la fuente
    // declara, y el dia que una fuente los distinga la fila ya lo soporta.
    const filas = cotizaciones
      .filter((c) => porCodigo.has(c.monedaBcu))
      .map((c) => ({
        source_id:     fuente.id,
        from_currency: porCodigo.get(c.monedaBcu)!,
        to_currency:   "UYU",
        rate:          c.venta,
        compra:        c.compra,
        venta:         c.venta,
        valid_at:      new Date(`${c.fecha}T00:00:00Z`).toISOString(),
      }));

    if (!filas.length) {
      throw new Error("El BCU no devolvió ninguna de las monedas pedidas.");
    }

    const { error: errIns } = await supabase
      .from("exchange_rates")
      .upsert(filas, { onConflict: "source_id,from_currency,to_currency,valid_at" });

    if (errIns) throw new Error(`No se pudo guardar la cotización: ${errIns.message}`);

    return responder({ ok: true, cotizaciones: filas });
  } catch (e) {
    // Que falle se reporta, no se disimula: si nadie escribe la tabla, el
    // checkout de un carrito mixto deja de funcionar y hay que enterarse acá.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tipo-de-cambio:", msg);
    return responder({ ok: false, error: msg }, 500);
  }
});
