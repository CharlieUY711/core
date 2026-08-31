/**
 * Una tienda: su configuración completa, en su propia página.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ DEJÓ DE SER UNA FILA DESPLEGABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Configurar una tienda son hoy cinco bloques: miembros y roles, todo lo que
 * tiene habilitado, el titular, las vidrieras y los datos básicos. Eso adentro
 * del renglón de una tabla no entra, y va a entrar peor cada vez.
 *
 * Y editar una fila era peor todavía: se convertía en dos campos sueltos
 * —nombre y territorio— con el resto de las columnas vacías, sin que nada
 * explicara por qué esos dos y no los otros.
 *
 * LA LISTA MIRA; LA PÁGINA CONFIGURA
 * En la lista se ve el estado de todas y se comparan. Acá se cambia una. Son
 * dos gestos distintos y ahora tienen dos lugares distintos.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CREAR TAMBIÉN ES ACÁ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/admin/tiendas/nueva` es esta misma página, pidiendo lo mínimo: nombre y
 * territorio. Al crearla se queda acá, en la tienda recién hecha, con todo lo
 * demás a la vista — que es donde uno quiere estar después de crearla, no de
 * vuelta en una lista buscando cuál era.
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { ItemDeBarra } from "../components/BarraDeAcciones";
import { MiembrosDeTienda } from "../components/MiembrosDeTienda";
import { AppsDeTienda } from "../components/AppsDeTienda";
import { VIDRIERAS } from "../utils/capacidades";
import { BarraDeAccionesSuelta } from "../components/BarraDeAcciones";

const ACCENT = "var(--brand-madre)";

interface Tienda {
  id: string; codigo: string; nombre: string;
  owner_id: string | null; owner_email: string | null;
  activa: boolean; es_plataforma: boolean;
  capacidades: string[] | null; vidrieras: string[] | null;
  moneda_base: string | null; pais: string | null;
  publicaciones: number; fichas: number; creada: string;
}

export default function AdminTienda() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const p = usePantalla();
  const { setVista } = useShop();

  const esNueva = id === "nueva";

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [cargando, setCargando] = useState(!esNueva);
  const [territorios, setTerritorios] = useState<
    { iso: string; nombre: string; moneda: string | null }[]>([]);

  /* Para la nueva. Se piden dos cosas y no diez: lo demás se configura acá
     abajo una vez que existe, con la tienda delante. */
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("UY");
  const [creando, setCreando] = useState(false);
  const [correo, setCorreo] = useState("");

  /* Los territorios salen de Definiciones, con su moneda. La moneda no se
     elige: es del territorio, y elegirla aparte permitía país UY con moneda
     USD sin que nada lo impidiera. */
  useEffect(() => {
    supabase.from("countries")
      .select("iso_code, name, status, currencies(code)")
      .eq("status", "active").order("name")
      .then(({ data, error }) => {
        if (error) { console.warn("[tienda] territorios:", error.message); return; }
        setTerritorios((data ?? []).map((c: {
          iso_code: string; name: string; currencies: { code: string }[] | null
        }) => ({ iso: c.iso_code, nombre: c.name, moneda: c.currencies?.[0]?.code ?? null })));
      });
  }, []);

  const monedaDe = (iso: string) =>
    territorios.find(t => t.iso === iso)?.moneda ?? null;

  const traer = useCallback(async () => {
    if (esNueva) return;
    const { data, error } = await supabase.rpc("listar_tiendas");
    setCargando(false);
    if (error) { p.avisar(error.message, false); return; }
    const t = ((data ?? []) as Tienda[]).find(x => x.id === id) ?? null;
    setTienda(t);
    if (t) setVista(t.nombre);
  }, [id, esNueva, p, setVista]);

  useEffect(() => { void traer(); }, [traer]);
  useEffect(() => () => setVista(""), [setVista]);

  const rpc = async (fn: string, params: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn, params);
    if (error) { p.avisar(error.message, false); return false; }
    p.avisar(ok);
    await traer();
    return true;
  };

  const crear = async () => {
    setCreando(true);
    const { data, error } = await supabase.rpc("crear_tienda", {
      p_codigo: slug(nombre), p_nombre: nombre.trim(),
      p_owner_email: correo.trim() || null,
      p_capacidades: [], p_vidrieras: ["market"],
      p_moneda_base: monedaDe(pais) ?? "UYU", p_pais: pais,
    });
    setCreando(false);
    if (error) { p.avisar(error.message, false); return; }
    p.avisar(`"${nombre.trim()}" creada.`);
    /* Se queda EN la tienda recién creada, no vuelve a la lista: lo que sigue
       —quién entra, qué tiene habilitado— se hace acá, y mandarlo a buscarla
       de nuevo sería perder el hilo justo cuando lo tiene. */
    navegar(`/admin/tiendas/${data}`, { replace: true });
  };

  const alternarVidriera = (v: string) => {
    if (!tienda) return;
    const actual = tienda.vidrieras ?? [];
    void rpc("actualizar_tienda", {
      p_id: tienda.id,
      p_vidrieras: actual.includes(v) ? actual.filter(x => x !== v) : [...actual, v],
    }, "Guardado");
  };

  /* La salida, una sola vez: esta pantalla tiene cuatro returns -cargando, sin
     permiso, no encontrada y la tienda- y en todos se sale al mismo lugar.
     Escrita en cada uno, el dia que cambie el destino cambian tres. */
  const VOLVER_A_TIENDAS = { a: "Tiendas", onVolver: () => navegar("/admin/tiendas") };

  const acciones: ItemDeBarra[] = [

    ...(tienda ? [
      { label: tienda.activa ? "Desactivar" : "Reactivar",
        color: tienda.activa ? "#EF4444" : "var(--brand-navy)",
        desactivada: tienda.es_plataforma,
        motivo: "CORE Market no se desactiva: es la plataforma",
        onClick: () => {
          if (tienda.activa && !confirm(
            `¿Desactivar ${tienda.nombre}? Deja de operar, pero no se borra: ` +
            "tiene publicaciones, fichas y órdenes.")) return;
          void rpc("actualizar_tienda", { p_id: tienda.id, p_activa: !tienda.activa },
            tienda.activa ? "Desactivada." : "Vuelve a estar activa.");
        } },
    ] : []),
  ];

  /* ── Nueva ─────────────────────────────────────────────────────────── */
  if (esNueva) {
    return (
      <Pantalla p={p} extra={acciones} volver={VOLVER_A_TIENDAS}
        explicacion="Nombre y territorio. Lo demás se configura una vez creada.">
        <Bloque titulo="Nueva tienda"
          nota="Se piden dos cosas: el resto se configura acá mismo apenas exista.">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem",
            maxWidth: 460 }}>
            <Campo label="NOMBRE">
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="COMITA" style={inp} autoFocus />
              {nombre.trim() && (
                <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--mute)" }}>
                  Código: <code>{slug(nombre)}</code> — se arma solo y no se cambia después.
                </div>
              )}
            </Campo>

            <Campo label="TERRITORIO">
              <select value={pais} onChange={e => setPais(e.target.value)} style={inp}>
                {territorios.map(t => (
                  <option key={t.iso} value={t.iso}>{t.nombre}</option>
                ))}
              </select>
              <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--mute)" }}>
                {/* La moneda sale del territorio. Decirlo acá evita la pregunta
                    "¿y dónde elijo la moneda?". */}
                Moneda: <b>{monedaDe(pais) ?? "sin moneda definida"}</b> — sale del territorio.
              </div>
            </Campo>

            <Campo label="DUEÑO (OPCIONAL)">
              <input value={correo} onChange={e => setCorreo(e.target.value)}
                placeholder="alguien@ejemplo.com" style={inp} />
              <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--mute)" }}>
                Tiene que ser alguien con cuenta. Sin dueño, la tienda existe pero
                nadie puede entrar — se le puede poner después.
              </div>
            </Campo>

            <BarraDeAccionesSuelta acciones={[{
              label: creando ? "Creando…" : "Crear tienda",
              destacado: true, color: ACCENT,
              desactivada: creando || !nombre.trim() || !monedaDe(pais),
              motivo: !nombre.trim() ? "Escribí el nombre"
                : "Ese territorio no tiene moneda definida: se configura en Definiciones",
              onClick: () => { void crear(); },
            }]} />
          </div>
        </Bloque>
      </Pantalla>
    );
  }

  /* ── Una que existe ────────────────────────────────────────────────── */
  if (cargando) {
    return <Pantalla p={p} extra={acciones} volver={VOLVER_A_TIENDAS}>
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--gray-400)" }}>
        Cargando…
      </div>
    </Pantalla>;
  }

  if (!tienda) {
    return <Pantalla p={p} extra={acciones} volver={VOLVER_A_TIENDAS}
      error="No existe esa tienda, o no tenés acceso a ella." >
      <div />
    </Pantalla>;
  }

  return (
    <Pantalla p={p} extra={acciones} volver={VOLVER_A_TIENDAS}
      explicacion={`${tienda.codigo} · ${territorios.find(t => t.iso === tienda.pais)?.nombre ?? tienda.pais ?? "sin territorio"}`}
      notificaciones={[
        ...(!tienda.owner_email ? [{ tono: "atencion" as const,
          texto: "Esta tienda no tiene titular. Revisá que haya alguien en Miembros que pueda entrar." }] : []),
        ...(!tienda.activa ? [{ tono: "atencion" as const,
          texto: "Está desactivada: no opera. Se reactiva desde la barra." }] : []),
      ]}>

      {/* Primero quién entra: sin nadie que pueda entrar, configurar el resto
          no sirve de nada. */}
      <Bloque titulo="Miembros"
        nota="Quiénes entran y qué puede hacer cada uno. El acceso lo da esta lista.">
        <MiembrosDeTienda storeId={tienda.id} avisar={p.avisar} />
      </Bloque>

      <Bloque titulo="Qué tiene habilitado"
        nota="Las pantallas del producto, lo que consume servicios que se cobran, y lo que se conecta.">
        <AppsDeTienda storeId={tienda.id} avisar={p.avisar} />
      </Bloque>

      <Bloque titulo="Vidrieras"
        nota="Dónde puede publicar. Una tienda puede vender en las dos.">
        <BarraDeAccionesSuelta acciones={VIDRIERAS.map(v => ({
          label: v.label,
          activa: tienda.vidrieras?.includes(v.id),
          color: ACCENT,
          desactivada: tienda.es_plataforma,
          motivo: "CORE Market administra, no vende",
          onClick: () => alternarVidriera(v.id),
        }))} />
      </Bloque>

      <Bloque titulo="Datos"
        nota="El código no se cambia: lo referencian las publicaciones y las órdenes.">
        <div style={{ display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.8rem", maxWidth: 760 }}>
          <Dato label="Código"      valor={tienda.codigo} />
          <Dato label="Titular"     valor={tienda.owner_email ?? "sin titular"} />
          <Dato label="Territorio"
            valor={territorios.find(t => t.iso === tienda.pais)?.nombre ?? tienda.pais ?? "—"} />
          <Dato label="Moneda"      valor={tienda.moneda_base ?? "—"} />
          <Dato label="Publicaciones" valor={String(tienda.publicaciones)} />
          <Dato label="Fichas"      valor={String(tienda.fichas)} />
        </div>
      </Bloque>
    </Pantalla>
  );
}

/* ── Piezas ────────────────────────────────────────────────────────────── */

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "0.45rem 0.7rem", border: "1.5px solid var(--border)",
  borderRadius: 8, fontSize: "0.85rem", outline: "none",
  background: "#fff", color: "#111",
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700,
        color: "var(--mute)", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--mute)" }}>{label}</div>
      <div style={{ fontSize: "0.86rem", color: "#111" }}>{valor}</div>
    </div>
  );
}

function Bloque({ titulo, nota, children }: {
  titulo: string; nota?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1rem 1.1rem",
      display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#111" }}>{titulo}</div>
        {nota && <div style={{ fontSize: "0.76rem", color: "var(--mute)" }}>{nota}</div>}
      </div>
      {children}
    </div>
  );
}

/**
 * El código de la tienda, a partir del nombre.
 *
 * Se arma solo y no se pide: es un identificador, no un dato del negocio, y
 * pedirlo obliga a inventar uno y a que dos personas inventen distinto.
 */
function slug(nombre: string): string {
  return nombre.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "tienda";
}
