/**
 * Definiciones — qué existe: territorios, monedas, idiomas y la taxonomía.
 *
 * QUÉ EXISTE vs. QUÉ ESTÁ CONFIGURADO
 * La división vale cuando hay dos autores. En las apps los hay: el código
 * declara que la funcionalidad existe, la plataforma decide si se ofrece.
 *
 * En un territorio el autor es uno solo: CORE Market define que Colombia
 * existe y CORE Market le pone la moneda. Sin dos autores la división es
 * artificial — y producía dos listas del mismo país, una para renombrarlo y
 * otra para configurarlo. Por eso configurar un territorio ES definirlo, y
 * pasa adentro de su propia fila.
 *
 * Lo mismo con la taxonomía: departamentos y categorías los define la
 * plataforma y nadie más.
 *
 * LAS CUATRO SON LA MISMA TABLA
 * `Tabla`, con check por fila y los botones en la barra. Escritas por separado
 * empiezan iguales y terminan distintas: una alinea los números y otra no, una
 * confirma antes de borrar y otra no, y hay que volver a aprender cada una.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { BarraDeAccionesSuelta } from "./BarraDeAcciones";
import { Tabla, Columna, Fila, fecha } from "./Tabla";
import { Pantalla, EstadoDePantalla } from "./Pantalla";

const ACCENT = "var(--brand-madre)";

/* ─────────────────────────────────────────────────────────────────────── */

interface Moneda   { codigo: string; nombre: string; simbolo: string; decimales: number }
interface Tasa     { id: string; codigo: string; nombre: string; tasa: number; por_defecto: boolean }
interface Zona     { id: string; nombre: string; tipo: string; codigo: string | null; estado: string }
interface Fuente   { id: string; nombre: string; tipo: string; url: string | null;
                     estado: string; tiene_clave: boolean }
interface Cotiz    { de: string; a: string; tasa: number; compra: number | null;
                     venta: number | null; vigente_desde: string }

interface Pais {
  id: string; iso: string; nombre: string; estado: string; creado: string;
  moneda: Moneda | null; impuestos: Tasa[]; zonas: Zona[];
  fuentes: Fuente[]; cotizaciones: Cotiz[];
  tiendas: number; configurado: boolean;
}
interface MonedaDef {
  codigo: string; nombre: string; simbolo: string; decimales: number;
  estado: string; es_global: boolean; pais: string | null;
  country_id: string | null; en_uso: number; creado: string;
}
interface IdiomaDef {
  codigo: string; nombre: string; nativo: string | null;
  estado: string; en_uso: number; creado: string;
}
interface Nodo { id: string; nombre: string; activo: boolean; created_at?: string;
                 departamento_id?: string; categoria_id?: string }

type Cual = "paises" | "monedas" | "idiomas" | "taxonomia";

const TIPO_DE_ZONA: Record<string, string> = {
  national: "Territorio nacional", free_zone: "Zona franca",
};

/** El rastro va al final y con el mismo ancho en todas. */
const CREADO: Columna = { id: "creado", label: "Creado", rastro: true, ancho: 80,
  ver: f => fecha(f.creado) };

export function Definiciones({ p }: { p: EstadoDePantalla }) {
  const t = p.tablas;
  const avisar = p.avisar;
  const [cual, setCual] = useState<Cual>("paises");

  const [paises,  setPaises]  = useState<Pais[]>([]);
  const [monedas, setMonedas] = useState<MonedaDef[]>([]);
  const [idiomas, setIdiomas] = useState<IdiomaDef[]>([]);
  const [huerfanas, setHuerfanas] = useState<{ id: string; nombre: string }[]>([]);
  const [deptos,  setDeptos]  = useState<Nodo[]>([]);
  const [cats,    setCats]    = useState<Nodo[]>([]);
  const [subcats, setSubcats] = useState<Nodo[]>([]);
  const [cargando, setCargando] = useState(true);

  const traer = useCallback(async () => {
    const [d, dep, cat, sub] = await Promise.all([
      supabase.rpc("definiciones_de_plataforma"),
      supabase.from("departamentos").select("*").order("orden", { ascending: true, nullsFirst: false }),
      supabase.from("categorias").select("*").order("orden", { ascending: true, nullsFirst: false }),
      supabase.from("subcategorias").select("*").order("orden", { ascending: true, nullsFirst: false }),
    ]);
    if (d.error) { avisar(d.error.message, false); setCargando(false); return; }
    const def = d.data as {
      paises: Pais[]; monedas: MonedaDef[]; idiomas: IdiomaDef[];
      fuentes_sin_territorio: { id: string; nombre: string }[];
    };
    setPaises(def.paises ?? []);
    setMonedas(def.monedas ?? []);
    setIdiomas(def.idiomas ?? []);
    setHuerfanas(def.fuentes_sin_territorio ?? []);
    setDeptos((dep.data ?? []) as Nodo[]);
    setCats((cat.data ?? []) as Nodo[]);
    setSubcats((sub.data ?? []) as Nodo[]);
    setCargando(false);
  }, [avisar]);

  useEffect(() => { void traer(); }, [traer]);

  /** Guardar por RPC y recargar. Todo lo que escribe pasa por acá. */
  const rpc = async (fn: string, params: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn, params);
    // El mensaje de la función explica el caso —qué lo está usando, por qué no
    // se puede— así que se muestra tal cual.
    if (error) { avisar(error.message, false); throw new Error(error.message); }
    await traer();
    avisar(ok);
  };

  const borrarDefiniciones = async (tipo: string, filas: Fila[]) => {
    const problemas: string[] = [];
    for (const f of filas) {
      const { error } = await supabase.rpc("eliminar_definicion",
        { p_tipo: tipo, p_clave: f.clave });
      if (error) problemas.push(`${f.nombre ?? f.clave}: ${error.message}`);
    }
    await traer();
    if (problemas.length) avisar(problemas[0]
      + (problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : ""), false);
    else avisar(`${filas.length} eliminado(s)`);
  };

  const SOLAPAS: { id: Cual; label: string }[] = [
    { id: "paises",    label: `Territorios (${paises.length})` },
    { id: "monedas",   label: `Monedas (${monedas.length})` },
    { id: "idiomas",   label: `Idiomas (${idiomas.length})` },
    { id: "taxonomia", label: `Taxonomía (${deptos.length})` },
  ];

  const sinConfigurar = paises.filter(p => !p.configurado).length;

  /* Un solo buscador para las cuatro listas: busca en la que estas mirando.
     Cuatro campos -uno por solapa- serian cuatro estados que hay que recordar
     por separado, y al volver a una solapa no sabrias por que falta la mitad. */
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const filtra = <T extends { nombre?: string | null; codigo?: string | null }>(xs: T[]) =>
    !q ? xs : xs.filter(x =>
      ((x.nombre ?? "") + " " + (x.codigo ?? "")).toLowerCase().includes(q));

  /*
   * SE DECLARA ANTES DE DIBUJAR.
   *
   * La barra va arriba en el árbol, así que con esto adentro del JSX —como
   * estaba— los botones no sabían qué se podía hacer hasta un render después:
   * aparecían recién al elegir una fila.
   *
   * Sólo se declara el de la solapa abierta. Declarar los cuatro dejaría tres
   * registrados sin estar a la vista, y el nivel activo por omisión es el
   * primero: "Agregar" en Monedas habría agregado un país.
   */
  const nivel_paises = cual !== "paises" ? null : t.nivel("paises", {
          columnas: [
            { id: "nombre", label: "Territorio", editable: true, ancho: 240 },
            { id: "iso",    label: "ISO",        editable: true, ancho: 60 },
            { id: "estadoTexto", label: "Estado", ancho: 150 },
            { id: "moneda_txt",  label: "Moneda", ancho: 90 },
            { id: "impuestos_n", label: "Tasas",  numero: true, ancho: 60 },
            { id: "zonas_n",     label: "Zonas",  numero: true, ancho: 60 },
            { id: "tiendas",     label: "Tiendas", numero: true, ancho: 70, esUso: true },
            CREADO,
          ],
          filas: filtra(paises).map(p => ({
            clave: p.id, nombre: p.nombre, iso: p.iso, creado: p.creado,
            tiendas: p.tiendas,
            estadoTexto: p.configurado ? "Configurado" : "Falta configurar",
            moneda_txt: p.moneda?.codigo ?? "—",
            impuestos_n: p.impuestos.length,
            zonas_n: p.zonas.length,
            p,
          })),
          inactiva: f => !(f.p as Pais).configurado,
          nombreDe: f => String(f.nombre),
          detalle: f => <DetalleDeTerritorio p={f.p as Pais} rpc={rpc} />,
          onCrear: v => rpc("guardar_pais",
            { p_id: null, p_iso: v.iso, p_nombre: v.nombre, p_activo: true },
            "Territorio agregado. Falta configurarlo."),
          onGuardar: (f, v) => rpc("guardar_pais",
            { p_id: f.clave, p_iso: v.iso, p_nombre: v.nombre, p_activo: true }, "Guardado"),
          onBorrar: fs => borrarDefiniciones("pais", fs),
        });

  const nivel_monedas = cual !== "monedas" ? null : t.nivel("monedas", {
          columnas: [
            { id: "nombre",    label: "Moneda",   editable: true, ancho: 240 },
            { id: "codigo",    label: "Código",   ancho: 60 },
            { id: "simbolo",   label: "Símbolo",  editable: true, ancho: 60 },
            { id: "decimales", label: "Decimales", editable: true, numero: true, ancho: 70 },
            { id: "country_id", label: "De", editable: true, ancho: 190,
              // Se edita en su celda, como todo lo demás.
              opciones: [
                // Sin país es global: el dólar y el euro no son de ninguno.
                { valor: "", label: "Todos los territorios" },
                ...paises.map(p => ({ valor: p.id, label: p.nombre })),
              ],
              ver: f => String(f.de_txt) },
            { id: "en_uso", label: "En uso", numero: true, ancho: 60, esUso: true },
            CREADO,
          ],
          filas: filtra(monedas).map(m => ({
            clave: m.codigo, nombre: m.nombre, codigo: m.codigo, simbolo: m.simbolo,
            decimales: m.decimales, country_id: m.country_id ?? "",
            de_txt: m.es_global ? "Todos los territorios" : (m.pais ?? "—"),
            en_uso: m.en_uso, creado: m.creado,
          })),
          nombreDe: f => String(f.codigo),
          onCrear: v => rpc("guardar_moneda", {
            p_codigo: v.codigo ?? v.nombre?.slice(0, 3), p_nombre: v.nombre,
            p_simbolo: v.simbolo, p_decimales: Number(v.decimales || 2),
            p_country_id: v.country_id || null, p_activa: true }, "Moneda agregada"),
          onGuardar: (f, v) => rpc("guardar_moneda", {
            p_codigo: f.clave, p_nombre: v.nombre, p_simbolo: v.simbolo,
            p_decimales: Number(v.decimales), p_country_id: v.country_id || null,
            p_activa: true }, "Guardado"),
          onBorrar: fs => borrarDefiniciones("moneda", fs),
        });

  const nivel_idiomas = cual !== "idiomas" ? null : t.nivel("idiomas", {
          columnas: [
            { id: "nombre", label: "Idioma", editable: true, ancho: 240 },
            { id: "codigo", label: "Código", ancho: 60 },
            { id: "nativo", label: "Nombre nativo", editable: true, ancho: 200 },
            { id: "en_uso", label: "Traducciones", numero: true, ancho: 90, esUso: true },
            CREADO,
          ],
          filas: filtra(idiomas).map(l => ({
            clave: l.codigo, nombre: l.nombre, codigo: l.codigo,
            nativo: l.nativo ?? "", en_uso: l.en_uso, creado: l.creado,
          })),
          nombreDe: f => String(f.nombre),
          onCrear: v => rpc("guardar_idioma", {
            p_codigo: v.codigo ?? v.nombre?.slice(0, 2).toLowerCase(),
            p_nombre: v.nombre, p_nativo: v.nativo, p_activo: true }, "Idioma agregado"),
          onGuardar: (f, v) => rpc("guardar_idioma", {
            p_codigo: f.clave, p_nombre: v.nombre, p_nativo: v.nativo,
            p_activo: true }, "Guardado"),
          onBorrar: fs => borrarDefiniciones("idioma", fs),
        });

  const nivel_deptos = cual !== "taxonomia" ? null : t.nivel("deptos", {
          columnas: [
            { id: "nombre", label: "Departamento", editable: true, ancho: 240 },
            { id: "hijos",  label: "Categorías",   numero: true, ancho: 80, esUso: true },
            CREADO,
          ],
          filas: filtra(deptos).map(d => ({
            clave: d.id, nombre: d.nombre, creado: d.created_at,
            hijos: cats.filter(c => c.departamento_id === d.id).length,
            activo: d.activo,
          })),
          inactiva: f => f.activo === false,
          nombreDe: f => String(f.nombre),
          onCrear: v => rpc("admin_create_department",
            { p_name: v.nombre, p_slug: slug(v.nombre) }, "Departamento agregado"),
          onGuardar: (f, v) => rpc("admin_update_department",
            { p_id: f.clave, p_name: v.nombre, p_slug: slug(v.nombre),
              p_is_active: f.activo !== false }, "Guardado"),
          onBorrar: async fs => {
            for (const f of fs) await supabase.rpc("admin_delete_department", { p_id: f.clave });
            await traer();
            avisar(`${fs.length} eliminado(s)`);
          },
          detalle: d => (
            <Tabla {...t.nivel(`cats:${d.clave}`, {
              anidada: true,
              columnas: [
                { id: "nombre", label: "Categoría",     editable: true, ancho: 240 },
                { id: "hijos",  label: "Subcategorías", numero: true, ancho: 80, esUso: true },
                CREADO,
              ],
              filas: cats.filter(c => c.departamento_id === d.clave).map(c => ({
                clave: c.id, nombre: c.nombre, creado: c.created_at,
                hijos: subcats.filter(s => s.categoria_id === c.id).length,
                activo: c.activo,
              })),
              inactiva: f => f.activo === false,
              nombreDe: f => String(f.nombre),
              onCrear: v => rpc("admin_create_category",
                { p_department_id: d.clave, p_name: v.nombre, p_slug: slug(v.nombre) },
                "Categoría agregada"),
              onGuardar: (f, v) => rpc("admin_update_category",
                { p_id: f.clave, p_name: v.nombre, p_slug: slug(v.nombre),
                  p_is_active: f.activo !== false, p_department_id: d.clave }, "Guardado"),
              onBorrar: async fs => {
                for (const f of fs) await supabase.rpc("admin_delete_category", { p_id: f.clave });
                await traer();
                avisar(`${fs.length} eliminada(s)`);
              },
              detalle: c => (
                <Tabla {...t.nivel(`subcats:${c.clave}`, {
                  anidada: true,
                  columnas: [
                    { id: "nombre", label: "Subcategoría", editable: true, ancho: 240 },
                    CREADO,
                  ],
                  filas: subcats.filter(s => s.categoria_id === c.clave).map(s => ({
                    clave: s.id, nombre: s.nombre, creado: s.created_at, activo: s.activo,
                  })),
                  inactiva: f => f.activo === false,
                  nombreDe: f => String(f.nombre),
                  onCrear: v => rpc("admin_create_subcategory",
                    { p_category_id: c.clave, p_name: v.nombre, p_slug: slug(v.nombre) },
                    "Subcategoría agregada"),
                  onGuardar: (f, v) => rpc("admin_update_subcategory",
                    { p_id: f.clave, p_name: v.nombre, p_slug: slug(v.nombre),
                      p_is_active: f.activo !== false, p_category_id: c.clave }, "Guardado"),
                  onBorrar: async fs => {
                    for (const f of fs) await supabase.rpc("admin_delete_subcategory", { p_id: f.clave });
                    await traer();
                    avisar(`${fs.length} eliminada(s)`);
                  },
                })} />
              ),
            })} />
          ),
        });

  return (
    /* La barra, el buscador, el aviso, el error y el ancho los define
       `Pantalla`. Acá estaban escritos a mano — y en Tiendas, y en el Vault. */
    <Pantalla p={p}
      /* Las solapas se declaran UNA vez: `Pantalla` las dibuja como botones del
         menu y como selector adentro del buscador. */
      secciones={{
        valor: cual,
        opciones: SOLAPAS.map(s => ({ valor: s.id, label: s.label })),
        onCambio: v => setCual(v as Cual),
      }}
      buscador={{ valor: busca, onCambio: setBusca }}
      explicacion="Acá se define qué existe para que el resto del sistema lo use. Un territorio se configura adentro de su propia fila."
      notificaciones={[
        ...(huerfanas.length > 0 ? [{
          tono: "atencion" as const,
          texto: huerfanas.map(f => f.nombre).join(", ") + (huerfanas.length === 1
            ? " no está asignada a ningún territorio: sus cotizaciones no se muestran en ninguno."
            : " no están asignadas a ningún territorio."),
        }] : []),
        ...(cual === "paises" && sinConfigurar > 0 ? [{
          tono: "atencion" as const,
          texto: sinConfigurar === 1
            ? "Hay 1 territorio sin configurar: figura activo pero no tiene con qué operar."
            : `Hay ${sinConfigurar} territorios sin configurar: figuran activos pero no tienen con qué operar.`,
        }] : []),
      ]}>

      {cargando ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>Cargando…</div>

      ) : cual === "paises" ? (
        nivel_paises && <Tabla {...nivel_paises} />

      ) : cual === "monedas" ? (
        nivel_monedas && <Tabla {...nivel_monedas} />

      ) : cual === "idiomas" ? (
        nivel_idiomas && <Tabla {...nivel_idiomas} />

      ) : (
        nivel_deptos && <Tabla {...nivel_deptos} />
      )}
    </Pantalla>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Lo que se ve al abrir un territorio                                      */
/* ─────────────────────────────────────────────────────────────────────── */

function DetalleDeTerritorio({ p, rpc }: {
  p: Pais;
  rpc: (fn: string, params: Record<string, unknown>, ok: string) => Promise<void>;
}) {
  const [moneda, setMoneda] = useState("");
  const [tasa, setTasa] = useState({ codigo: "", nombre: "", tasa: "", por_defecto: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

      <Bloque titulo="Moneda local"
        nota="La moneda del territorio. El dólar y el euro no se asignan acá: se usan en todos.">
        {p.moneda ? (
          <div style={{ fontSize: "0.82rem", color: "#374151" }}>
            <b>{p.moneda.codigo}</b> — {p.moneda.nombre} ({p.moneda.simbolo}),{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{p.moneda.decimales}</span> decimales
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={moneda} placeholder="Código, ej: ARS"
              onChange={e => setMoneda(e.target.value.toUpperCase())}
              style={{ ...inp, width: 150, textAlign: "right" }} />
            <BarraDeAccionesSuelta acciones={[
              { label: "Asignar", color: ACCENT, destacado: true,
                desactivada: !moneda.trim(), motivo: "Escribí el código",
                onClick: () => { void rpc("asignar_moneda_de_pais",
                  { p_country_id: p.id, p_codigo: moneda.trim() },
                  `Moneda de ${p.nombre} asignada`).then(() => setMoneda("")); } },
            ]} />
          </div>
        )}
      </Bloque>

      <Bloque titulo="Tasas de impuesto"
        nota="En porcentaje, como las publica la autoridad fiscal. Todos los precios se publican con impuestos incluidos.">
        {p.impuestos.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse",
            fontSize: "0.8rem", marginBottom: 8 }}>
            <tbody>
              {p.impuestos.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "0.35rem 0.5rem", width: 110 }}><b>{r.codigo}</b></td>
                  <td style={{ padding: "0.35rem 0.5rem" }}>{r.nombre}</td>
                  <td style={{ padding: "0.35rem 0.5rem", width: 90, textAlign: "right",
                    fontVariantNumeric: "tabular-nums" }}>{Number(r.tasa).toFixed(2)} %</td>
                  <td style={{ padding: "0.35rem 0.5rem", width: 90, color: "var(--mute)" }}>
                    {r.por_defecto ? "por defecto" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={tasa.codigo} placeholder="código"
            onChange={e => setTasa(v => ({ ...v, codigo: e.target.value }))}
            style={{ ...inp, width: 110 }} />
          <input value={tasa.nombre} placeholder="nombre"
            onChange={e => setTasa(v => ({ ...v, nombre: e.target.value }))}
            style={{ ...inp, flex: 1, minWidth: 150 }} />
          <input value={tasa.tasa} placeholder="%" inputMode="decimal"
            onChange={e => setTasa(v => ({ ...v, tasa: e.target.value }))}
            style={{ ...inp, width: 80, textAlign: "right",
              fontVariantNumeric: "tabular-nums" }} />
          <label style={{ display: "flex", gap: 6, alignItems: "center",
            fontSize: "0.78rem", color: "var(--mute)", cursor: "pointer" }}>
            <input type="checkbox" checked={tasa.por_defecto} style={{ accentColor: ACCENT }}
              onChange={e => setTasa(v => ({ ...v, por_defecto: e.target.checked }))} />
            por defecto
          </label>
          <BarraDeAccionesSuelta acciones={[
            { label: "Agregar", color: ACCENT, destacado: true,
              desactivada: !tasa.codigo.trim() || !tasa.nombre.trim() || !tasa.tasa,
              motivo: "Faltan código, nombre y tasa",
              onClick: () => { void rpc("guardar_tasa_de_impuesto", {
                p_country_id: p.id, p_codigo: tasa.codigo, p_nombre: tasa.nombre,
                // En PORCENTAJE (10, 22), no en fracción: es como lo lee el
                // resto de la aplicación.
                p_tasa: Number(tasa.tasa), p_por_defecto: tasa.por_defecto,
              }, `Tasa agregada a ${p.nombre}`).then(() =>
                setTasa({ codigo: "", nombre: "", tasa: "", por_defecto: false })); } },
          ]} />
        </div>
      </Bloque>

      {p.zonas.length > 0 && (
        <Bloque titulo="Zonas"
          nota="El territorio nacional y las zonas francas. Su tratamiento fiscal es distinto, y hoy las tasas cuelgan del país, no de la zona.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.zonas.map(z => (
              <span key={z.id} style={{ fontSize: "0.75rem", padding: "3px 10px",
                borderRadius: 999, border: "1px solid var(--border)", background: "#fff",
                color: "#374151" }}>
                {z.nombre}
                <span style={{ marginLeft: 6, color: "var(--gray-400)" }}>
                  {TIPO_DE_ZONA[z.tipo] ?? z.tipo}
                </span>
              </span>
            ))}
          </div>
        </Bloque>
      )}

      <Bloque titulo="Tipo de cambio"
        nota="La fuente es nacional: el banco central del territorio. Las cotizaciones son las monedas globales contra la de acá.">
        {p.fuentes.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "#B45309", fontWeight: 600 }}>
            Sin fuente. Los precios en otra moneda no se pueden convertir en este territorio.
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#374151", marginBottom: 8 }}>
            {p.fuentes.map(f => (
              <div key={f.id}>
                <b>{f.nombre}</b>
                <span style={{ color: "var(--mute)" }}> · {f.tipo}</span>
                <span style={{ color: "var(--mute)" }}>
                  {" "}· clave {f.tiene_clave ? "puesta" : "no requerida"}
                </span>
              </div>
            ))}
          </div>
        )}

        {p.cotizaciones.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <tbody>
              {p.cotizaciones.map(c => {
                /* Una fecha vieja es la única señal de que el trabajo diario
                   dejó de correr. Dos días porque los bancos centrales no
                   publican fines de semana. */
                const dias = Math.floor(
                  (Date.now() - new Date(c.vigente_desde).getTime()) / 86400000);
                return (
                  <tr key={c.de} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "0.35rem 0.5rem", width: 110 }}>
                      <b>{c.de} → {c.a}</b>
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem", width: 100, textAlign: "right",
                      fontVariantNumeric: "tabular-nums" }}>{Number(c.tasa).toFixed(4)}</td>
                    <td style={{ padding: "0.35rem 0.5rem", width: 100, textAlign: "right",
                      fontVariantNumeric: "tabular-nums" }}>
                      {c.compra != null ? Number(c.compra).toFixed(4) : "—"}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem", width: 100, textAlign: "right",
                      fontVariantNumeric: "tabular-nums" }}>
                      {c.venta != null ? Number(c.venta).toFixed(4) : "—"}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem",
                      color: dias > 2 ? "#B45309" : "var(--mute)",
                      fontWeight: dias > 2 ? 700 : 400 }}>
                      {new Date(c.vigente_desde).toLocaleDateString("es-UY")}
                      {dias > 2 && <span style={{ marginLeft: 6 }}>⚠ hace {dias} días</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Bloque>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

const inp: React.CSSProperties = {
  padding: "0.35rem 0.55rem", border: "1.5px solid var(--border)", borderRadius: 7,
  fontSize: "0.8rem", outline: "none", background: "#fff", color: "#111",
  fontFamily: "DM Sans, sans-serif",
};

/** Un slug simple. La base lo exige y nadie quiere escribirlo a mano. */
const slug = (s?: string) => (s ?? "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Bloque({ titulo, nota, children }: {
  titulo: string; nota?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#374151" }}>{titulo}</div>
      {nota && <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", marginBottom: 6 }}>{nota}</div>}
      {children}
    </div>
  );
}

/* `Aviso` y `Alerta` vivían acá: dos cajas con sus propios colores, dibujadas
   arriba del contenido. Ahora la explicación va a la barra de arriba y lo que
   hay que mirar va a la campanita, que son los dos lugares donde eso vive para
   todo el panel. */

export default Definiciones;
