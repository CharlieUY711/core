
function SyncDropdown({ onSyncML }: { onSyncML: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        padding:"0.25rem 0.6rem", fontSize:"0.75rem", fontWeight:700,
        border:"1px solid #FFE600", borderRadius:6, background:"#fff",
        color:"#333", cursor:"pointer", display:"flex", alignItems:"center", gap:4,
      }}>Sync ▾</button>
      {open && (
        <div style={{ position:"absolute", top:"110%", left:0, background:"#fff",
          border:"1.5px solid var(--border)", borderRadius:8, zIndex:200,
          boxShadow:"0 4px 16px rgba(0,0,0,.1)", minWidth:120 }}
          onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { onSyncML(); setOpen(false); }} style={{
            display:"block", width:"100%", padding:"0.5rem 1rem", textAlign:"left",
            fontSize:"0.78rem", fontWeight:700, border:"none", background:"none",
            cursor:"pointer", color:"#333",
          }}>🟡 ML</button>
          <button disabled style={{
            display:"block", width:"100%", padding:"0.5rem 1rem", textAlign:"left",
            fontSize:"0.78rem", fontWeight:600, border:"none", background:"none",
            cursor:"not-allowed", color:"var(--gray-400)",
          }}>🔵 Meta</button>
          <button disabled style={{
            display:"block", width:"100%", padding:"0.5rem 1rem", textAlign:"left",
            fontSize:"0.78rem", fontWeight:600, border:"none", background:"none",
            cursor:"not-allowed", color:"var(--gray-400)",
          }}>🟢 WA</button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";
const GREEN  = "var(--color-success)";

interface Articulo {
  id: string;
  nombre: string;
  tipo: "market" | "secondhand";
  status: string;
  precio: number;
  moneda: string;
  imagen_principal?: string;
  imagenes?: any[];
  stock: number;
  condicion?: string;
  departamento_nombre?: string;
  categoria_nombre?: string;
  atributos?: Record<string, any>;
  descripcion?: string;
  rating_promedio?: number;
  rating_count?: number;
  impresiones?: number;
  clicks?: number;
  ranking_score?: number;
  created_at: string;
  published_at?: string;
  deleted_at?: string;
  baja_prevista?: string;
  sync_ml?: boolean;
  sync_meta?: boolean;
  sync_wa?: boolean;
  mkt_destacado?: boolean;
  mkt_promovido?: boolean;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: "Activo",   bg: "#dcfce7", color: "#166534" },
  draft:    { label: "Borrador", bg: "#F3F4F6", color: "var(--mute)" },
  paused:   { label: "Pausado",  bg: "#fef9c3", color: "#854d0e" },
  inactive: { label: "Inactivo", bg: "#fee2e2", color: "#991b1b" },
};

const ALL_COLS = [
  { id:"categoria", label:"Categoría" },
  { id:"marca",     label:"Marca" },
  { id:"ranking",   label:"Ranking" },
  { id:"ctr",       label:"CTR" },
  { id:"baja",      label:"Baja" },
  { id:"mkt1",      label:"MKT 1" },
  { id:"mkt2",      label:"MKT 2" },
];

type SortKey = "precio"|"stock"|"status"|"tipo"|"alta"|null;
type SortDir = "asc"|"desc";

function fmtFecha(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-UY", { day:"2-digit", month:"2-digit", year:"2-digit" });
}

function fmtPrecio(n: number, moneda = "UYU") {
  return moneda + " " + Number(n).toLocaleString("es-UY");
}

export default function AdminPublicaciones() {
  const navigate = useNavigate();
  const [articulos, setArticulos]   = useState<Articulo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [editing,  setEditing]      = useState<string|null>(null);
  const [editForm, setEditForm]     = useState<Partial<Articulo>>({});
  const [isSH, setIsSH]             = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>(null);
  const [sortDir, setSortDir]       = useState<SortDir>("asc");
  const [filterStatus, setFilterStatus] = useState<string|null>(null);
  const [visibleCols, setVisibleCols]   = useState<Set<string>>(new Set(["alta"]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [toast, setToast] = useState<{text:string;ok:boolean}|null>(null);
  const [mlSyncing, setMlSyncing] = useState<Set<string>>(new Set());
  const [mlErrors,  setMlErrors]  = useState<Record<string, string>>({});

  const syncML = async (ids: string[]) => {
    setMlSyncing(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    const results = await Promise.all(ids.map(async id => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "sync_item", product_id: id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || "Error");
        return { id, ok: true };
      } catch (e: any) {
        return { id, ok: false, error: e.message };
      }
    }));
    setMlSyncing(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    const errors: Record<string, string> = {};
    let okCount = 0;
    results.forEach(r => { if (r.ok) okCount++; else errors[r.id] = r.error; });
    setMlErrors(prev => ({ ...prev, ...errors }));
    if (okCount > 0) { notify(`${okCount} producto(s) sincronizados con ML`); load(); }
    if (Object.keys(errors).length > 0) notify(`${Object.keys(errors).length} error(s) al sincronizar`, false);
  };

  const notify = (text: string, ok = true) => {
    setToast({text,ok}); setTimeout(()=>setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("articulos")
      .select("*")
      .eq("vendedor_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setArticulos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const cycleStatus = () => {
    const opts = [null, "active", "draft", "paused"];
    const idx = opts.indexOf(filterStatus);
    setFilterStatus(opts[(idx+1)%opts.length]);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
    setEditing(null);
  };

  const startEdit = (a: Articulo) => {
    setEditForm({ nombre:a.nombre, descripcion:a.descripcion, precio:a.precio,
      precio_original:(a as any).precio_original, stock:a.stock, condicion:a.condicion,
      departamento_nombre:a.departamento_nombre });
    setEditing(a.id);
  };
  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("articulos").update(editForm).eq("id", id);
    if (!error) {
      setArticulos(prev => prev.map(a => a.id===id ? {...a,...editForm} : a));
      notify("Guardado");
    } else notify(error.message, false);
    setEditing(null);
  };

  const cambiarStatus = async (id: string, status: string) => {
    await supabase.from("articulos").update({ status }).eq("id", id);
    setArticulos(prev => prev.map(a => a.id===id ? {...a,status} : a));
    notify("Estado actualizado");
  };

  const clonar = async (a: Articulo) => {
    const { id, created_at, published_at, ...rest } = a;
    const { error } = await supabase.from("articulos").insert({
      ...rest, nombre: a.nombre + " (copia)", status:"draft",
      impresiones:0, clicks:0, ventas_count:0, ranking_score:0,
    });
    if (!error) { notify("Artículo clonado como borrador"); load(); }
    else notify(error.message, false);
  };

  const archivar = async (id: string) => {
    await supabase.from("articulos").update({ status:"inactive" }).eq("id", id);
    setArticulos(prev => prev.map(a => a.id===id ? {...a,status:"inactive"} : a));
    notify("Archivado");
  };

  /**
   * Aplica un cambio y devuelve cuantas filas cambiaron de verdad.
   *
   * Un update que RLS no permite no devuelve error: afecta cero filas y sale
   * limpio. Sin `.select()` no hay forma de distinguirlo de un exito, que es
   * exactamente lo que pasaba: la pantalla decia "Eliminado" y el articulo
   * seguia ahi al recargar.
   */
  const aplicar = async (ids: string[], cambios: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("articulos").update(cambios).in("id", ids).select("id");
    if (error) throw new Error(error.message);
    return (data ?? []).length;
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este artículo?")) return;
    try {
      const n = await aplicar([id], { deleted_at: new Date().toISOString(), status: "deleted" });
      if (n === 0) {
        notify("No se pudo eliminar: no tenés permiso sobre este artículo", false);
        return;
      }
      notify("Eliminado");
    } catch (e: any) {
      notify(e.message || "No se pudo eliminar", false);
    }
    // Se recarga del servidor en vez de sacarlo de la lista local: lo que
    // muestra la pantalla tiene que ser lo que quedo guardado.
    load();
  };

  const accionLote = async (accion: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;

    const cambios: Record<string, Record<string, unknown>> = {
      activar:  { status: "active"   },
      pausar:   { status: "paused"   },
      archivar: { status: "inactive" },
      eliminar: { deleted_at: new Date().toISOString(), status: "deleted" },
    };
    const cambio = cambios[accion];
    if (!cambio) return;
    if (accion === "eliminar" && !confirm("¿Eliminar " + ids.length + " artículo(s)?")) return;

    try {
      const n = await aplicar(ids, cambio);
      if (n === 0) {
        notify("No se aplicó a ningún artículo: no tenés permiso sobre ellos", false);
      } else if (n < ids.length) {
        // Decir "aplicado a 5" cuando cambiaron 2 es peor que no decir nada.
        notify(`Aplicado a ${n} de ${ids.length}: sobre el resto no tenés permiso`, false);
      } else {
        notify("Acción aplicada a " + n + " artículo(s)");
      }
    } catch (e: any) {
      notify(e.message || "No se pudo aplicar la acción", false);
    }
    setSelected(new Set());
    load();
  };

  let filtered = articulos.filter(a => {
    if (isSH && a.tipo !== "secondhand") return false;
    if (!isSH && a.tipo !== "market") return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  if (sortKey) {
    filtered = [...filtered].sort((a,b) => {
      let va: any, vb: any;
      if (sortKey==="precio") { va=a.precio; vb=b.precio; }
      else if (sortKey==="stock") { va=a.stock; vb=b.stock; }
      else if (sortKey==="status") { va=a.status; vb=b.status; }
      else if (sortKey==="alta") { va=a.published_at||a.created_at; vb=b.published_at||b.created_at; }
      else { va=a.tipo; vb=b.tipo; }
      if (va<vb) return sortDir==="asc"?-1:1;
      if (va>vb) return sortDir==="asc"?1:-1;
      return 0;
    });
  }

  const stats = {
    total:   articulos.length,
    activos: articulos.filter(a=>a.status==="active").length,
    borradores: articulos.filter(a=>a.status==="draft").length,
    clicks:  articulos.reduce((s,a)=>s+(a.clicks||0),0),
  };

  const color = isSH ? GREEN : ACCENT;

  const thBase: React.CSSProperties = {
    padding:"0.5rem 0.75rem", textAlign:"left", fontSize:"11px",
    fontWeight:700, color:"var(--mute)", textTransform:"uppercase",
    letterSpacing:".05em", borderBottom:"2px solid #F3F4F6",
    background:"#FAFAFA", whiteSpace:"nowrap", userSelect:"none",
  };
  const thSort = (key: SortKey): React.CSSProperties => ({
    ...thBase, cursor:"pointer",
    color: sortKey===key ? color : "var(--mute)",
  });
  const td: React.CSSProperties = {
    padding:"0.55rem 0.75rem", fontSize:"0.82rem", color:"#374151",
    borderBottom:"1px solid var(--gray-50)", verticalAlign:"middle",
  };
  const sortIco = (key: SortKey) =>
    sortKey===key ? (sortDir==="asc"?" ↑":" ↓") : " ↕";

  const inpStyle: React.CSSProperties = {
    width:"100%", padding:"0.4rem 0.6rem", border:"1.5px solid var(--border)",
    borderRadius:6, fontSize:"0.82rem", outline:"none", fontFamily:"DM Sans,sans-serif",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:10, fontWeight:600, fontSize:"0.875rem",
          background:toast.ok?"#f0fdf4":"#fef2f2", color:toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":"#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:"1.25rem", fontWeight:800, color:"#111", margin:0 }}>Mis Publicaciones</h1>
          <p style={{ fontSize:"0.8rem", color:"var(--mute)", margin:"2px 0 0" }}>
            {isSH ? "♻️ Second Hand" : "🛍 Market"} · {filtered.length} artículos
          </p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <div style={{ display:"flex", borderRadius:12, overflow:"hidden",
            boxShadow:"0 4px 10px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.2)",
            border:"1px solid rgba(0,0,0,.08)", flexShrink:0, width:260 }}>
            <button onClick={() => setIsSH(false)} style={{
              flex:1, padding:"0.65rem 0", border:"none", cursor:"pointer",
              fontWeight:800, fontSize:"0.875rem", letterSpacing:".01em",
              background: !isSH ? ACCENT : "#F3F4F6",
              color: !isSH ? "#fff" : "var(--gray-400)",
              boxShadow: !isSH ? "inset 0 2px 4px rgba(0,0,0,.2)" : "none",
              transform: !isSH ? "translateY(1px)" : "translateY(0)",
              transition:"all .12s",
            }}>Market</button>
            <button onClick={() => setIsSH(true)} style={{
              flex:1, padding:"0.65rem 0", border:"none", cursor:"pointer",
              fontWeight:800, fontSize:"0.875rem", letterSpacing:".01em",
              background: isSH ? GREEN : "#F3F4F6",
              color: isSH ? "#fff" : "var(--gray-400)",
              boxShadow: isSH ? "inset 0 2px 4px rgba(0,0,0,.2)" : "none",
              transform: isSH ? "translateY(1px)" : "translateY(0)",
              transition:"all .12s",
            }}>Second Hand</button>
          </div>
          <button onClick={() => navigate("/admin/publicaciones/nueva")} style={{
            padding:"0.6rem 1.25rem", background:color, color:"#fff",
            border:"none", borderRadius:10, fontWeight:700, fontSize:"0.875rem",
            cursor:"pointer", transition:"background .15s",
          }}>+ Nuevo artículo</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.6rem" }}>
        {[
          { label:"Total",      value:stats.total,      c:BLUE   },
          { label:"Activos",    value:stats.activos,    c:GREEN  },
          { label:"Borradores", value:stats.borradores, c:"#F59E0B" },
          { label:"Clicks",     value:stats.clicks,     c:color  },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"0.75rem 1rem",
            border:"1px solid #F3F4F6", borderLeft:`3px solid ${s.c}` }}>
            <div style={{ fontSize:"1.4rem", fontWeight:800, color:s.c }}>{s.value}</div>
            <div style={{ fontSize:"0.72rem", color:"var(--mute)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barra acciones lote + columnas */}
      <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
        {selected.size > 0 && (
          <div style={{ display:"flex", gap:"4px", padding:"0.3rem 0.75rem",
            background:"color-mix(in srgb, var(--brand-navy) 6%, transparent)", borderRadius:8, border:`1px solid ${BLUE}`, alignItems:"center" }}>
            <span style={{ fontSize:"0.78rem", color:BLUE, fontWeight:700, marginRight:"4px" }}>
              {selected.size} sel.
            </span>
            {/* Sync dropdown */}
            <SyncDropdown onSyncML={() => syncML(Array.from(selected))} />
            {/* Artículo actions */}
            {[
              { id:"activar",  label:"✓ Activar",  c:GREEN },
              { id:"pausar",   label:"⏸ Pausar",   c:"#F59E0B" },
              { id:"archivar", label:"📦 Archivar", c:"var(--mute)" },
              { id:"eliminar", label:"🗑 Eliminar", c:"#EF4444" },
            ].map(ac => (
              <button key={ac.id} onClick={() => accionLote(ac.id)} style={{
                padding:"0.25rem 0.6rem", fontSize:"0.75rem", fontWeight:600,
                border:`1px solid ${ac.c}`, borderRadius:6,
                background:"#fff", color:ac.c, cursor:"pointer",
              }}>{ac.label}</button>
            ))}
          </div>
        )}
        <div style={{ marginLeft:"auto", position:"relative" }}>
          <button onClick={() => setShowColPicker(p=>!p)} style={{
            padding:"0.35rem 0.75rem", border:"1.5px solid var(--border)",
            borderRadius:7, background:"#fff", color:"var(--mute)",
            fontSize:"0.78rem", cursor:"pointer", fontWeight:600,
          }}>⚙ Columnas</button>
          {showColPicker && (
            <div style={{ position:"absolute", right:0, top:"110%", background:"#fff",
              border:"1.5px solid var(--border)", borderRadius:10, padding:"0.75rem",
              zIndex:100, minWidth:180, boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}
              onMouseLeave={() => setShowColPicker(false)}>
              {ALL_COLS.map(col => (
                <label key={col.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                  padding:"0.25rem 0", cursor:"pointer", fontSize:"0.82rem" }}>
                  <input type="checkbox" checked={visibleCols.has(col.id)}
                    style={{ accentColor:color }}
                    onChange={() => setVisibleCols(prev => {
                      const n = new Set(prev);
                      n.has(col.id)?n.delete(col.id):n.add(col.id); return n;
                    })} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #F3F4F6",
        overflow:"auto", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"3rem", color:"var(--gray-400)" }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"3rem" }}>
            <div style={{ fontSize:"3rem" }}>📦</div>
            <div style={{ fontWeight:700, color:"#374151", marginTop:"0.5rem" }}>Sin publicaciones</div>
            <button onClick={() => navigate("/admin/publicaciones/nueva")} style={{
              marginTop:"1rem", padding:"0.6rem 1.25rem", background:color, color:"#fff",
              border:"none", borderRadius:8, fontWeight:700, cursor:"pointer",
            }}>+ Nuevo artículo</button>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr>
                <th style={{ ...thBase, width:36 }}>
                  <input type="checkbox"
                    checked={selected.size===filtered.length && filtered.length>0}
                    onChange={toggleAll} style={{ accentColor:color }} />
                </th>
                <th style={{ ...thBase, width:52 }}>Foto</th>
                <th style={thBase}>Nombre</th>
                <th style={thSort("precio")} onClick={()=>handleSort("precio")}>
                  Precio{sortIco("precio")}
                </th>
                <th style={thSort("stock")} onClick={()=>handleSort("stock")}>
                  Stock{sortIco("stock")}
                </th>
                <th style={{ ...thSort("status"), cursor:"pointer" }} onClick={cycleStatus}>
                  Estado {filterStatus ? "· "+STATUS_CFG[filterStatus]?.label : "↕"}
                </th>
                <th style={{ ...thBase, textAlign:"center" }}>Sync</th>
                <th style={{ ...thBase }}>Departamento</th>
                <th style={thSort("alta")} onClick={()=>handleSort("alta")}>
                  Alta{sortIco("alta")}
                </th>
                {visibleCols.has("categoria") && <th style={thBase}>Categoría</th>}
                {visibleCols.has("marca")     && <th style={thBase}>Marca</th>}
                {visibleCols.has("ranking")   && <th style={thBase}>Ranking</th>}
                {visibleCols.has("ctr")       && <th style={thBase}>CTR</th>}
                {visibleCols.has("baja")      && <th style={thBase}>Baja</th>}
                {visibleCols.has("mkt1")      && <th style={thBase}>MKT 1</th>}
                {visibleCols.has("mkt2")      && <th style={thBase}>MKT 2</th>}
                <th style={{ ...thBase, width:36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const cfg  = STATUS_CFG[a.status] || STATUS_CFG.draft;
                const isExp = expanded.has(a.id);
                const isSel = selected.has(a.id);
                const isEd  = editing === a.id;
                const ctr   = a.impresiones ? Math.round((a.clicks||0)/a.impresiones*100) : 0;

                return (
                  <>
                    <tr key={a.id} style={{
                      background: isSel?"color-mix(in srgb, var(--brand-madre) 4%, transparent)": isExp?"#FAFAFA":"#fff",
                      transition:"background .1s",
                    }}>
                      <td style={td}>
                        <input type="checkbox" checked={isSel}
                          onChange={()=>toggleOne(a.id)} style={{ accentColor:color }} />
                      </td>
                      <td style={td}>
                        <div style={{ width:40, height:40, borderRadius:6, overflow:"hidden", background:"#F3F4F6" }}>
                          {a.imagen_principal
                            ? <img src={a.imagen_principal+"?width=80"} alt={a.nombre}
                                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            : <div style={{ width:"100%", height:"100%", display:"flex",
                                alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>
                                {a.tipo==="secondhand"?"♻️":"🛍"}
                              </div>
                          }
                        </div>
                      </td>
                      <td style={{ ...td, maxWidth:200 }}>
                        <div style={{ fontWeight:600, color:"#111", overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.nombre}</div>
                        {a.condicion && <div style={{ fontSize:"10px", color:"var(--mute)" }}>{a.condicion}</div>}
                      </td>
                      <td style={{ ...td, fontWeight:700, color }}>{fmtPrecio(a.precio,a.moneda)}</td>
                      <td style={{ ...td, textAlign:"center" }}>
                        <span style={{ color:a.stock===0?"#EF4444":a.stock<5?"#F59E0B":"#374151",
                          fontWeight:a.stock<5?700:400 }}>{a.stock}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:20,
                          background:cfg.bg, color:cfg.color, fontWeight:700 }}>{cfg.label}</span>
                      </td>
                      <td style={{ ...td, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:"4px", justifyContent:"center", alignItems:"center" }}>
                          {/* ML badge — clickeable */}
                          {(() => {
                            const synced  = !!(a as any)["sync_ml"];
                            const syncing = mlSyncing.has(a.id);
                            const hasErr  = !!mlErrors[a.id];
                            const bg      = syncing ? "var(--border)" : hasErr ? "#EF4444" : synced ? "#FFE600" : "transparent";
                            const border  = syncing ? "var(--border)" : hasErr ? "#EF4444" : "#FFE600";
                            const tc      = hasErr ? "#fff" : "#333";
                            return (
                              <button
                                title={hasErr ? mlErrors[a.id] : synced ? "Sincronizado — click para re-sync" : "Click para publicar en ML"}
                                disabled={syncing}
                                onClick={() => syncML([a.id])}
                                style={{ padding:"2px 7px", fontSize:"10px", fontWeight:700,
                                  border:`1.5px solid ${border}`, borderRadius:5, cursor:"pointer",
                                  background:bg, color:tc, opacity:syncing?0.5:1, transition:"all .2s" }}>
                                {syncing ? "…" : "ML"}
                              </button>
                            );
                          })()}
                          <span style={{ fontSize:"13px", opacity:(a as any)["sync_meta"]?1:0.2 }}>🔵</span>
                          <span style={{ fontSize:"13px", opacity:(a as any)["sync_wa"]?1:0.2 }}>🟢</span>
                        </div>
                      </td>
                      <td style={td}>{a.departamento_nombre||"—"}</td>
                      <td style={td}>{fmtFecha(a.published_at||a.created_at)}</td>
                      {visibleCols.has("categoria") && <td style={td}>{a.categoria_nombre||"—"}</td>}
                      {visibleCols.has("marca")     && <td style={td}>{a.atributos?.marca||"—"}</td>}
                      {visibleCols.has("ranking")   && <td style={td}>{a.ranking_score?Number(a.ranking_score).toFixed(2):"—"}</td>}
                      {visibleCols.has("ctr")       && <td style={td}>{ctr}%</td>}
                      {visibleCols.has("baja")      && <td style={td}>{fmtFecha(a.baja_prevista||a.deleted_at)}</td>}
                      {visibleCols.has("mkt1")      && <td style={{ ...td, textAlign:"center" }}><input type="checkbox" checked={!!a.mkt_destacado} style={{ accentColor:color }} onChange={()=>{}} /></td>}
                      {visibleCols.has("mkt2")      && <td style={{ ...td, textAlign:"center" }}><input type="checkbox" checked={!!a.mkt_promovido} style={{ accentColor:color }} onChange={()=>{}} /></td>}
                      <td style={td}>
                        <button onClick={()=>toggleExpand(a.id)} style={{
                          background:"none", border:"none", cursor:"pointer", color:"var(--gray-400)",
                          fontSize:"13px", padding:"2px 4px",
                          transform:isExp?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s",
                        }}>▼</button>
                      </td>
                    </tr>

                    {/* EXPANDIDO */}
                    {isExp && (
                      <tr key={a.id+"-exp"}>
                        <td colSpan={99} style={{ padding:0, borderBottom:"2px solid #F3F4F6" }}>
                          <div style={{ padding:"1.25rem", background:"var(--gray-50)",
                            display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>

                            <div>
                              <div style={{ display:"flex", justifyContent:"space-between",
                                alignItems:"center", marginBottom:"0.75rem" }}>
                                <span style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--gray-400)",
                                  textTransform:"uppercase" }}>Información</span>
                                {isEd ? (
                                  <div style={{ display:"flex", gap:"6px" }}>
                                    <button onClick={()=>saveEdit(a.id)} style={{
                                      padding:"0.25rem 0.75rem", background:color, color:"#fff",
                                      border:"none", borderRadius:6, fontSize:"0.75rem",
                                      fontWeight:700, cursor:"pointer" }}>Guardar</button>
                                    <button onClick={()=>setEditing(null)} style={{
                                      padding:"0.25rem 0.75rem", background:"none", color:"var(--mute)",
                                      border:"1px solid var(--border)", borderRadius:6,
                                      fontSize:"0.75rem", cursor:"pointer" }}>Cancelar</button>
                                  </div>
                                ) : null}
                              </div>

                              {isEd ? (
                                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                                  <div>
                                    <div style={{ fontSize:"10px", color:"var(--gray-400)", marginBottom:"2px" }}>Nombre</div>
                                    <input style={inpStyle} value={editForm.nombre||""}
                                      onChange={e=>setEditForm(f=>({...f,nombre:e.target.value}))} />
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                                    <div>
                                      <div style={{ fontSize:"10px", color:"var(--gray-400)", marginBottom:"2px" }}>Precio</div>
                                      <input type="number" style={inpStyle} value={editForm.precio||""}
                                        onChange={e=>setEditForm(f=>({...f,precio:parseFloat(e.target.value)}))} />
                                    </div>
                                    <div>
                                      <div style={{ fontSize:"10px", color:"var(--gray-400)", marginBottom:"2px" }}>Stock</div>
                                      <input type="number" style={inpStyle} value={editForm.stock||""}
                                        onChange={e=>setEditForm(f=>({...f,stock:parseInt(e.target.value)}))} />
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize:"10px", color:"var(--gray-400)", marginBottom:"2px" }}>Descripción</div>
                                    <textarea style={{ ...inpStyle, minHeight:70, resize:"vertical" }}
                                      value={editForm.descripcion||""}
                                      onChange={e=>setEditForm(f=>({...f,descripcion:e.target.value}))} />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize:"0.82rem", color:"#374151", lineHeight:2 }}>
                                  <div><b>ID:</b> <span style={{ fontFamily:"monospace", fontSize:"10px" }}>{a.id.slice(0,16)}</span></div>
                                  <div><b>Depto:</b> {a.departamento_nombre||"—"}</div>
                                  <div><b>Categoría:</b> {a.categoria_nombre||"—"}</div>
                                  <div><b>Marca:</b> {a.atributos?.marca||"—"}</div>
                                  {a.condicion && <div><b>Condición:</b> {a.condicion}</div>}
                                  {a.descripcion && (
                                    <div style={{ color:"var(--mute)", fontSize:"0.78rem", lineHeight:1.5, marginTop:"0.25rem" }}>
                                      {a.descripcion.slice(0,220)}{a.descripcion.length>220?"…":""}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                              {(() => {
                                const tit: React.CSSProperties = {
                                  fontSize:"0.7rem", fontWeight:700, color:"var(--gray-400)",
                                  textTransform:"uppercase", letterSpacing:".08em", marginBottom:"0.6rem"
                                };
                                const grid3: React.CSSProperties = {
                                  display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"5px"
                                };
                                const grid4: React.CSSProperties = {
                                  display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"4px"
                                };
                                const btn = (bg: string, tc: string, border: string): React.CSSProperties => ({
                                  padding:"0.45rem 0.25rem", fontSize:"0.75rem", fontWeight:700,
                                  border:`1.5px solid ${border}`, borderRadius:7,
                                  background:bg, color:tc, cursor:"pointer"
                                });
                                return (
                                  <>
                                    <div>
                                      <div style={tit}>Acciones</div>
                                      <div style={{ ...grid3, marginBottom:"5px" }}>
                                        <button onClick={()=>navigate("/admin/publicaciones/nueva")}
                                          style={btn(color,"#fff",color)}>Nuevo</button>
                                        <button onClick={()=>clonar(a)}
                                          style={btn("#fff",color,color)}>Clonar</button>
                                        <button onClick={()=>isEd?setEditing(null):startEdit(a)}
                                          style={btn(isEd?color:"#fff",isEd?"#fff":color,color)}>Editar</button>
                                      </div>
                                      <div style={grid3}>
                                        <button onClick={()=>cambiarStatus(a.id,a.status==="active"?"paused":"active")}
                                          style={btn("#fff",color,color)}>
                                          {a.status==="active"?"Pausar":"Activar"}
                                        </button>
                                        <button onClick={()=>archivar(a.id)}
                                          style={btn("#fff",color,color)}>Archivar</button>
                                        <button onClick={()=>eliminar(a.id)}
                                          style={btn("#fff","#EF4444","#EF4444")}>Eliminar</button>
                                      </div>
                                    </div>

                                    <div>
                                      <div style={tit}>Publicar en</div>
                                      <div style={{ ...grid4, marginBottom:"4px" }}>
                                        {[
                                          {label:"ML",    c:"#FFE600",tc:"#333", syncKey:"sync_ml"},
                                          {label:"Meta",  c:"#1877F2",tc:"#fff", syncKey:"sync_meta"},
                                          {label:"WA",    c:"#25D366",tc:"#fff", syncKey:"sync_wa"},
                                          {label:"Custom",c:"var(--mute)",tc:"#fff", syncKey:""},
                                        ].map(s=>{
                                          const synced = s.syncKey ? !!(a as any)[s.syncKey] : false;
                                          return (
                                            <button key={s.label} style={{
                                              padding:"0.4rem 0.1rem",fontSize:"10px",fontWeight:700,
                                              border:`1.5px solid ${s.c}`,borderRadius:6,cursor:"pointer",
                                              background: synced ? s.c : "rgba(255,255,255,0.5)",
                                              color: synced ? s.tc : s.c,
                                              opacity: synced ? 1 : 0.5,
                                              transition:"all .2s",
                                            }}>{s.label}</button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div>
                                      <div style={tit}>Métricas</div>
                                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"5px" }}>
                                        {[
                                          {label:"Impresiones", value:a.impresiones||0},
                                          {label:"Clicks",      value:a.clicks||0},
                                          {label:"CTR",         value:(a.impresiones?(((a.clicks||0)/a.impresiones)*100).toFixed(1):0)+"%"},
                                          {label:"Ranking",     value:a.ranking_score?Number(a.ranking_score).toFixed(3):"—"},
                                          {label:"Rating",      value:a.rating_promedio?Number(a.rating_promedio).toFixed(1)+" ★":"—"},
                                          {label:"Reseñas",     value:a.rating_count||0},
                                        ].map(m=>(
                                          <div key={m.label} style={{background:"#fff",borderRadius:7,
                                            padding:"0.4rem 0.5rem",border:"1px solid var(--border)"}}>
                                            <div style={{fontSize:"9px",color:"var(--gray-400)",textTransform:"uppercase"}}>{m.label}</div>
                                            <div style={{fontWeight:700,color:"#374151",fontSize:"0.85rem"}}>{m.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {isEd && (
                                      <>
                                        <hr style={{border:"none",borderTop:"1px solid var(--border)",margin:"0"}}/>
                                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                                          <button onClick={()=>setEditing(null)} style={{
                                            padding:"0.55rem",fontSize:"0.82rem",fontWeight:700,
                                            border:"1.5px solid var(--border)",borderRadius:8,
                                            background:"#fff",color:"var(--mute)",cursor:"pointer"}}>
                                            Cancelar
                                          </button>
                                          <button onClick={()=>saveEdit(a.id)} style={{
                                            padding:"0.55rem",fontSize:"0.82rem",fontWeight:700,
                                            border:"none",borderRadius:8,
                                            background:color,color:"#fff",cursor:"pointer"}}>
                                            Guardar
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
