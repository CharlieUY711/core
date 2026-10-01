import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { Pantalla, usePantalla } from "../components/Pantalla";

type Vista = "ideas" | "proyectos" | "actividad";
type EstadoIdea = "nueva" | "evaluacion" | "estacionada" | "convertida" | "descartada";
type EstadoProyecto = "activo" | "pausado" | "archivado";

interface Idea {
  id: string; titulo: string; descripcion: string; estado: EstadoIdea;
  prioridad: "baja" | "normal" | "alta"; created_at: string; updated_at: string;
}
interface Proyecto {
  id: string; nombre: string; codigo: string | null; descripcion: string; objetivo: string;
  estado: EstadoProyecto; created_at: string; updated_at: string;
}
interface Vinculo { idea_id: string; proyecto_id: string; vinculada_en: string }
interface Evento {
  id: number; entidad_tipo: string; entidad_id: string; accion: string;
  detalle: Record<string, unknown>; ocurrido_en: string;
}

const ESTADOS_IDEA: { id: EstadoIdea; nombre: string }[] = [
  { id: "nueva", nombre: "Nueva" },
  { id: "evaluacion", nombre: "En evaluación" },
  { id: "estacionada", nombre: "Estacionada" },
  { id: "convertida", nombre: "Convertida en trabajo" },
  { id: "descartada", nombre: "Descartada" },
];
const ESTADOS_PROYECTO: { id: EstadoProyecto; nombre: string }[] = [
  { id: "activo", nombre: "Activo" },
  { id: "pausado", nombre: "Pausado" },
  { id: "archivado", nombre: "Archivado" },
];

const caja: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 10, padding: 18,
};
const campo: React.CSSProperties = {
  width: "100%", padding: "9px 11px", border: "1px solid var(--border)",
  borderRadius: 7, font: "inherit", boxSizing: "border-box",
};
const boton: React.CSSProperties = {
  padding: "9px 14px", border: 0, borderRadius: 7, cursor: "pointer",
  background: "var(--brand-navy)", color: "var(--card)", fontWeight: 700,
};

function fecha(valor: string) {
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(valor));
}

export default function AdminDesarrollo() {
  const p = usePantalla();
  const { setVista, setTopStats } = useShop();
  const [vista, setVistaLocal] = useState<Vista>("ideas");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [descripcionProyecto, setDescripcionProyecto] = useState("");
  const [proyectoPorIdea, setProyectoPorIdea] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoIdea | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const { proyectoId } = useParams<{ proyectoId?: string }>();

  const cargar = useCallback(async () => {
    const [rIdeas, rProyectos, rVinculos, rEventos] = await Promise.all([
      supabase.from("core_desarrollo_ideas").select("*").order("updated_at", { ascending: false }),
      supabase.from("core_desarrollo_proyectos").select("*").order("updated_at", { ascending: false }),
      supabase.from("core_desarrollo_idea_proyectos").select("idea_id, proyecto_id, vinculada_en"),
      supabase.from("core_desarrollo_eventos").select("*").order("ocurrido_en", { ascending: false }).limit(30),
    ]);
    const fallo = rIdeas.error ?? rProyectos.error ?? rVinculos.error ?? rEventos.error;
    if (fallo) {
      setError(fallo.message);
      setIdeas([]); setProyectos([]); setVinculos([]); setEventos([]);
    } else {
      setError(null);
      setIdeas((rIdeas.data ?? []) as Idea[]);
      setProyectos((rProyectos.data ?? []) as Proyecto[]);
      setVinculos((rVinculos.data ?? []) as Vinculo[]);
      setEventos((rEventos.data ?? []) as Evento[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => {
    setVista(proyectoId ? "Proyecto" : vista === "ideas" ? "Ideas" : vista === "proyectos" ? "Proyectos" : "Actividad");
    setTopStats([
      { label: "Ideas", value: ideas.length, color: "var(--card)" },
      { label: "Proyectos", value: proyectos.length, color: "var(--color-success)" },
    ]);
    return () => { setVista(""); setTopStats([]); };
  }, [vista, proyectoId, ideas.length, proyectos.length, setVista, setTopStats]);

  const guardarIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setGuardando(true);
    const { error: fallo } = await supabase.from("core_desarrollo_ideas").insert({
      titulo: titulo.trim(), descripcion: descripcion.trim(),
    });
    setGuardando(false);
    if (fallo) { p.avisar(fallo.message, false); return; }
    setTitulo(""); setDescripcion("");
    p.avisar("Idea guardada.");
    await cargar();
  };

  const guardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreProyecto.trim()) return;
    setGuardando(true);
    const { error: fallo } = await supabase.from("core_desarrollo_proyectos").insert({
      nombre: nombreProyecto.trim(), descripcion: descripcionProyecto.trim(),
    });
    setGuardando(false);
    if (fallo) { p.avisar(fallo.message, false); return; }
    setNombreProyecto(""); setDescripcionProyecto("");
    p.avisar("Proyecto guardado.");
    await cargar();
  };

  const cambiarEstadoIdea = async (idea: Idea, estado: EstadoIdea) => {
    const { error: fallo } = await supabase.from("core_desarrollo_ideas")
      .update({ estado }).eq("id", idea.id);
    if (fallo) { p.avisar(fallo.message, false); return; }
    await cargar();
  };

  const cambiarEstadoProyecto = async (proyecto: Proyecto, estado: EstadoProyecto) => {
    const { error: fallo } = await supabase.from("core_desarrollo_proyectos")
      .update({ estado }).eq("id", proyecto.id);
    if (fallo) { p.avisar(fallo.message, false); return; }
    await cargar();
  };

  const vincularIdea = async (idea: Idea) => {
    const proyectoId = proyectoPorIdea[idea.id];
    if (!proyectoId) return;
    const { error: fallo } = await supabase.from("core_desarrollo_idea_proyectos")
      .upsert({ idea_id: idea.id, proyecto_id: proyectoId }, { onConflict: "idea_id,proyecto_id", ignoreDuplicates: true });
    if (fallo) { p.avisar(fallo.message, false); return; }
    p.avisar("Idea vinculada al proyecto.");
    await cargar();
  };

  const ideasVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ideas.filter(i =>
      (filtroEstado === "todas" || i.estado === filtroEstado) &&
      (!q || i.titulo.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q)));
  }, [ideas, filtroEstado, busqueda]);

  const proyectoNombre = useMemo(() => new Map(proyectos.map(x => [x.id, x.nombre])), [proyectos]);

  const tabs: { id: Vista; nombre: string }[] = [
    { id: "ideas", nombre: "Ideas" }, { id: "proyectos", nombre: "Proyectos" },
    { id: "actividad", nombre: "Actividad reciente" },
  ];

  if (proyectoId) {
    return <Pantalla p={p} error={error} explicacion="Ficha de proyecto">
      {cargando ? <p>Cargando información…</p>
        : <FichaProyecto proyecto={proyectos.find(x => x.id === proyectoId)}
            ideas={ideas} vinculos={vinculos.filter(v => v.proyecto_id === proyectoId)}
            proyectoId={proyectoId} avisar={p.avisar} recargar={cargar}
            cambiarEstado={cambiarEstadoProyecto} />}
    </Pantalla>;
  }

  return <Pantalla p={p} error={error} explicacion="Ideas y proyectos del grupo CORE">
    <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
      {tabs.map(tab => <button key={tab.id} onClick={() => setVistaLocal(tab.id)}
        style={{ ...boton, background: vista === tab.id ? "var(--brand-navy)" : "var(--card)",
          color: vista === tab.id ? "var(--card)" : "var(--brand-navy)",
          border: "1px solid var(--border)" }}>{tab.nombre}</button>)}
      <button onClick={() => void cargar()} style={{ ...boton, marginLeft: "auto" }}>Actualizar</button>
    </div>

    {cargando ? <p>Cargando información…</p> : <>
      {vista === "ideas" && <section>
        <form onSubmit={guardarIdea} style={{ ...caja, display: "grid", gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Registrar una idea</h2>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título de la idea" required maxLength={200} style={campo} />
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Contexto, necesidad o resultado esperado" rows={3} style={campo} />
          <div><button disabled={guardando} style={boton}>{guardando ? "Guardando…" : "Guardar idea"}</button></div>
        </form>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en título y descripción"
            aria-label="Buscar ideas" style={{ ...campo, flex: 1, minWidth: 220 }} />
          <select aria-label="Filtrar por estado" value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as EstadoIdea | "todas")}
            style={{ ...campo, width: "auto", minWidth: 200 }}>
            <option value="todas">Todos los estados</option>
            {ESTADOS_IDEA.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {ideas.length === 0 && <div style={caja}>Todavía no hay ideas. Registrá la primera para iniciar el repositorio.</div>}
          {ideas.length > 0 && ideasVisibles.length === 0 && <div style={caja}>Ninguna idea coincide con el filtro.</div>}
          {ideasVisibles.map(idea => <article key={idea.id} style={caja}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ margin: "0 0 6px" }}>{idea.titulo}</h3>
                {idea.descripcion && <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{idea.descripcion}</p>}
                <small>Actualizada: {fecha(idea.updated_at)}</small>
              </div>
              <select aria-label={`Estado de ${idea.titulo}`} value={idea.estado}
                onChange={e => void cambiarEstadoIdea(idea, e.target.value as EstadoIdea)} style={{ ...campo, width: "auto", minWidth: 180 }}>
                {ESTADOS_IDEA.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <select aria-label="Vincular con proyecto" value={proyectoPorIdea[idea.id] ?? ""}
                onChange={e => setProyectoPorIdea(prev => ({ ...prev, [idea.id]: e.target.value }))}
                style={{ ...campo, width: "auto", minWidth: 240 }}>
                <option value="">Vincular a proyecto…</option>
                {proyectos.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
              <button type="button" onClick={() => void vincularIdea(idea)} disabled={!proyectoPorIdea[idea.id]}
                style={{ ...boton, opacity: proyectoPorIdea[idea.id] ? 1 : .55 }}>Vincular</button>
              {(vinculos.filter(v => v.idea_id === idea.id)).map(v => <span key={v.proyecto_id}
                style={{ alignSelf: "center", padding: "5px 9px", borderRadius: 999,
                  background: "var(--madre-tint)" }}>
                <Link to={`/admin/desarrollo/${v.proyecto_id}`}>{proyectoNombre.get(v.proyecto_id) ?? "Proyecto"}</Link>
              </span>)}
            </div>
          </article>)}
        </div>
      </section>}

      {vista === "proyectos" && <section>
        <form onSubmit={guardarProyecto} style={{ ...caja, display: "grid", gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Registrar un proyecto</h2>
          <input value={nombreProyecto} onChange={e => setNombreProyecto(e.target.value)} placeholder="Nombre del proyecto" required maxLength={160} style={campo} />
          <textarea value={descripcionProyecto} onChange={e => setDescripcionProyecto(e.target.value)} placeholder="Objetivo y contexto" rows={3} style={campo} />
          <div><button disabled={guardando} style={boton}>{guardando ? "Guardando…" : "Guardar proyecto"}</button></div>
        </form>
        <div style={{ display: "grid", gap: 10 }}>
          {proyectos.length === 0 && <div style={caja}>Todavía no hay proyectos registrados.</div>}
          {proyectos.map(proyecto => <article key={proyecto.id} style={caja}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: "0 0 6px" }}><Link to={`/admin/desarrollo/${proyecto.id}`}>{proyecto.nombre}</Link></h3>
                {proyecto.descripcion && <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{proyecto.descripcion}</p>}
                <small>{vinculos.filter(v => v.proyecto_id === proyecto.id).length} idea(s) vinculada(s) · <Link to={`/admin/desarrollo/${proyecto.id}`}>Abrir ficha</Link></small>
              </div>
              <select aria-label={`Estado de ${proyecto.nombre}`} value={proyecto.estado}
                onChange={e => void cambiarEstadoProyecto(proyecto, e.target.value as EstadoProyecto)} style={{ ...campo, width: "auto", minWidth: 150 }}>
                {ESTADOS_PROYECTO.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
            </div>
          </article>)}
        </div>
      </section>}

      {vista === "actividad" && <section style={{ display: "grid", gap: 8 }}>
        {eventos.length === 0 && <div style={caja}>La actividad aparecerá acá cuando se creen o actualicen ideas y proyectos.</div>}
        {eventos.map(evento => {
          const registro = evento.entidad_tipo !== "proyecto" ? ideas.find(x => x.id === evento.entidad_id)
            : proyectos.find(x => x.id === evento.entidad_id);
          const etiqueta = evento.entidad_tipo === "proyecto" ? "Proyecto" : "Idea";
          const destino = evento.entidad_tipo === "vinculo"
            ? proyectoNombre.get(String(evento.detalle.proyecto_id ?? "")) : undefined;
          return <article key={evento.id} style={{ ...caja, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span><b>{etiqueta}</b> · {registro ? ("titulo" in registro ? registro.titulo : registro.nombre) : "Registro actualizado"} · {evento.accion.replace(/_/g, " ")}{destino ? ` → ${destino}` : ""}</span>
            <small>{fecha(evento.ocurrido_en)}</small>
          </article>;
        })}
      </section>}
    </>}
  </Pantalla>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function FichaProyecto({ proyecto, ideas, vinculos, proyectoId, avisar, recargar, cambiarEstado }: {
  proyecto?: Proyecto; ideas: Idea[]; vinculos: Vinculo[]; proyectoId: string;
  avisar: (mensaje: string, ok?: boolean) => void; recargar: () => Promise<void>;
  cambiarEstado: (proyecto: Proyecto, estado: EstadoProyecto) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [resumen, setResumen] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    if (!proyecto) return;
    setNombre(proyecto.nombre); setResumen(proyecto.descripcion); setObjetivo(proyecto.objetivo ?? "");
  }, [proyecto?.id, proyecto?.updated_at]);

  useEffect(() => {
    if (!UUID.test(proyectoId)) return;
    let vivo = true;
    void supabase.from("core_desarrollo_eventos").select("*")
      .or(`entidad_id.eq.${proyectoId},detalle->>proyecto_id.eq.${proyectoId}`)
      .order("ocurrido_en", { ascending: false }).limit(20)
      .then(({ data }) => { if (vivo) setEventos((data ?? []) as Evento[]); });
    return () => { vivo = false; };
  }, [proyectoId, proyecto?.updated_at, vinculos.length]);

  if (!proyecto) {
    return <div style={caja}>No se encontró el proyecto. <Link to="/admin/desarrollo">Volver a CORE Desarrollo</Link></div>;
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    const { error: fallo } = await supabase.from("core_desarrollo_proyectos")
      .update({ nombre: nombre.trim(), descripcion: resumen.trim(), objetivo: objetivo.trim() })
      .eq("id", proyecto.id);
    setGuardando(false);
    if (fallo) { avisar(fallo.message, false); return; }
    avisar("Ficha guardada.");
    await recargar();
  };

  const ideaPorId = new Map(ideas.map(i => [i.id, i]));
  const nombreEstadoIdea = (id: EstadoIdea) => ESTADOS_IDEA.find(x => x.id === id)?.nombre ?? id;

  return <div style={{ display: "grid", gap: 16 }}>
    <div><Link to="/admin/desarrollo">← CORE Desarrollo</Link></div>
    <form onSubmit={guardar} style={{ ...caja, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Ficha del proyecto</h2>
        <select aria-label="Estado del proyecto" value={proyecto.estado}
          onChange={e => void cambiarEstado(proyecto, e.target.value as EstadoProyecto)}
          style={{ ...campo, width: "auto", minWidth: 150 }}>
          {ESTADOS_PROYECTO.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </div>
      <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={160} style={campo} /></label>
      <label>Resumen<textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={4} style={campo} /></label>
      <label>Objetivo<textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={3} style={campo} /></label>
      <small>Creado: {fecha(proyecto.created_at)} · Actualizado: {fecha(proyecto.updated_at)}</small>
      <div><button disabled={guardando} style={boton}>{guardando ? "Guardando…" : "Guardar ficha"}</button></div>
    </form>

    <section style={caja}>
      <h3 style={{ margin: "0 0 10px" }}>Ideas vinculadas ({vinculos.length})</h3>
      {vinculos.length === 0 && <p style={{ margin: 0 }}>Todavía no hay ideas vinculadas. Se vinculan desde la lista de ideas.</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {vinculos.map(v => {
          const idea = ideaPorId.get(v.idea_id);
          return <div key={v.idea_id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>{idea ? idea.titulo : "Idea"}{idea ? ` · ${nombreEstadoIdea(idea.estado)}` : ""}</span>
            <small>Vinculada: {fecha(v.vinculada_en)}</small>
          </div>;
        })}
      </div>
    </section>

    <section style={caja}>
      <h3 style={{ margin: "0 0 10px" }}>Actividad del proyecto</h3>
      {eventos.length === 0 && <p style={{ margin: 0 }}>Sin actividad registrada.</p>}
      <div style={{ display: "grid", gap: 6 }}>
        {eventos.map(ev => <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{ev.entidad_tipo === "vinculo" ? `Idea vinculada: ${ideaPorId.get(ev.entidad_id)?.titulo ?? "idea"}` : ev.accion.replace(/_/g, " ")}</span>
          <small>{fecha(ev.ocurrido_en)}</small>
        </div>)}
      </div>
    </section>
  </div>;
}
