import { useState, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import { useMediaLibrary, MediaTipo, MediaItem } from "../../hooks/useMediaLibrary";
import AdminImport from "./AdminImport";
import AdminExport from "./AdminExport";
import AdminCatalog from "./AdminCatalog";
import { BarraDeAcciones } from "../components/BarraDeAcciones";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";

function fmtSize(b: number): string {
  if (!b) return "?";
  return b > 1048576 ? `${(b/1048576).toFixed(1)}MB` : `${Math.round(b/1024)}KB`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-UY", { day:"2-digit", month:"2-digit", year:"2-digit" });
}

function getThumbUrl(item: MediaItem): string {
  if (item.tipo === "documento") return "";
  if (item.tipo === "video") {
    if (item.thumbnail_path) {
      return supabase.storage.from("biblioteca").getPublicUrl(item.thumbnail_path).data.publicUrl;
    }
    return "";
  }
  const url = supabase.storage.from(item.bucket).getPublicUrl(item.path).data.publicUrl;
  return `${url}?width=200&height=200&resize=cover`;
}

interface Props {
  mode?: "page" | "modal";
  maxImages?: number;
  maxVideos?: number;
  onSelect?: (items: MediaItem[]) => void;
  selectedIds?: string[];
}

interface UploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
}

export default function AdminBiblioteca({
  mode = "page",
  maxImages = 9,
  maxVideos = 5,
  onSelect,
  selectedIds = [],
}: Props) {
  useOutletContext<any>();

  /*
   * Importar y Exportar viven acá, no en la barra lateral.
   *
   * Son operaciones SOBRE la Biblioteca, no lugares a los que se va. Sueltas en
   * el menú obligaban a saber de antemano que existían y sobre qué actuaban;
   * acá están donde está lo que importan y exportan.
   */
  const [tab,        setTab]        = useState<
    "biblioteca" | "subir" | "taxonomia" | "importar" | "exportar">("biblioteca");
  const [search,     setSearch]     = useState("");
  const [filterTipo, setFilterTipo] = useState<MediaTipo | "all">("all");
  const [filterCat,  setFilterCat]  = useState<string>("all");
  const [selected,   setSelected]   = useState<Set<string>>(new Set(selectedIds));
  const [uploads,    setUploads]    = useState<UploadItem[]>([]);
  const [uploadCat,  setUploadCat]  = useState<"articulo" | "documento" | "otro">("articulo");
  const [uploadTags, setUploadTags] = useState("");
  const [preview,    setPreview]    = useState<MediaItem | null>(null);
  const [toast,      setToast]      = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, loading, reload, deleteItem, stats } = useMediaLibrary({
    tipo:     filterTipo === "all" ? undefined : filterTipo,
    categoria: filterCat === "all" ? undefined : filterCat as any,
    search,
  });

  const notify = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSelect = (item: MediaItem) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) { next.delete(item.id); return next; }
      const selImgs = items.filter(i => next.has(i.id) && i.tipo === "imagen").length;
      const selVids = items.filter(i => next.has(i.id) && i.tipo === "video").length;
      if (item.tipo === "imagen" && selImgs >= maxImages) { notify(`Máx ${maxImages} imágenes`, false); return prev; }
      if (item.tipo === "video"  && selVids >= maxVideos)  { notify(`Máx ${maxVideos} videos`,   false); return prev; }
      next.add(item.id);
      return next;
    });
  };

  const captureVideoThumb = async (file: File, userId: string, name: string): Promise<string | null> => {
    return new Promise(res => {
      const v = document.createElement("video");
      v.src = URL.createObjectURL(file); v.muted = true; v.currentTime = 1;
      v.onloadeddata = async () => {
        try {
          const c = document.createElement("canvas");
          c.width = 320; c.height = 180;
          c.getContext("2d")!.drawImage(v, 0, 0, 320, 180);
          const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), "image/jpeg", 0.8));
          const path = `${userId}/thumb_${name}`;
          const { error } = await supabase.storage.from("biblioteca").upload(path, blob, { upsert: true });
          URL.revokeObjectURL(v.src);
          res(error ? null : path);
        } catch { res(null); }
      };
      v.onerror = () => res(null);
    });
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) { notify("Sesión expirada", false); return; }

    const arr = Array.from(files);
    setUploads(prev => [...arr.map(f => ({ file: f, progress: 0, status: "pending" as const })), ...prev]);
    setTab("subir");

    for (let i = 0; i < arr.length; i++) {
      const file    = arr[i];
      const isVideo = file.type.startsWith("video/");
      const isDoc   = file.type === "text/html" || file.type === "application/pdf";
      const bucket  = isVideo ? "videos" : "biblioteca";
      const ext     = file.name.split(".").pop() || "bin";
      const rand    = Math.random().toString(36).slice(2, 7);
      const ts      = Date.now();
      const fname   = `${user.id}/${ts}_${rand}.${ext}`;
      const tipo    = isVideo ? "video" : isDoc ? "documento" : "imagen";

      const setProgress = (p: number, status: UploadItem["status"], error?: string) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: p, status, error } : u));
      };

      setProgress(10, "uploading");
      try {
        const prog = setInterval(() => setUploads(prev =>
          prev.map((u, idx) => idx === i && u.progress < 80 ? { ...u, progress: u.progress + 15 } : u)
        ), 300);

        const { error: upErr } = await supabase.storage.from(bucket).upload(fname, file, { upsert: false });
        clearInterval(prog);
        if (upErr) throw upErr;

        let thumbPath: string | null = null;
        let duracion: number | null  = null;
        let width:  number | null    = null;
        let height: number | null    = null;

        if (isVideo) {
          thumbPath = await captureVideoThumb(file, user.id, `${ts}_${rand}.jpg`);
          duracion  = await new Promise(r => {
            const v = document.createElement("video");
            v.src = URL.createObjectURL(file);
            v.onloadedmetadata = () => { r(Math.round(v.duration)); URL.revokeObjectURL(v.src); };
            v.onerror = () => r(null);
          });
        } else if (!isDoc) {
          const dims: [number,number] | null = await new Promise(r => {
            const img = new Image();
            img.onload = () => { r([img.naturalWidth, img.naturalHeight]); URL.revokeObjectURL(img.src); };
            img.onerror = () => r(null);
            img.src = URL.createObjectURL(file);
          });
          if (dims) { [width, height] = dims; }
        }

        const tags = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

        const { error: dbErr } = await supabase.from("media_library").insert({
          user_id:        user.id,
          bucket,
          path:           fname,
          tipo,
          nombre:         file.name,
          size_bytes:     file.size,
          width, height,
          duracion_seg:   duracion,
          thumbnail_path: thumbPath,
          categoria:      uploadCat,
          etiquetas:      tags,
          status:         "ready",
        });
        if (dbErr) throw dbErr;

        setProgress(100, "done");
      } catch (e: any) {
        setProgress(0, "failed", e.message);
      }
    }
    await reload();
    setTimeout(() => setTab("biblioteca"), 600);
  }, [uploadCat, uploadTags, reload]);

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    await deleteItem(item);
    setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    notify("Eliminado");
  };

  const selImgs = items.filter(i => selected.has(i.id) && i.tipo === "imagen").length;
  const selVids = items.filter(i => selected.has(i.id) && i.tipo === "video").length;
  const selDocs = items.filter(i => selected.has(i.id) && i.tipo === "documento").length;

  const inp: React.CSSProperties = {
    padding:"0.5rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px",
    fontSize:"0.85rem", outline:"none", background:"#fff", color:"#111",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:"10px", fontWeight:600, fontSize:"0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":"#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Stats */}
      {mode === "page" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.5rem" }}>
          {[
            { label:"Total",      value: stats.total,      color: BLUE   },
            { label:"Imágenes",   value: stats.imagenes,   color: ACCENT },
            { label:"Videos",     value: stats.videos,     color: "#8B5CF6" },
            { label:"Documentos", value: stats.documentos, color: "#0EA5E9" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"0.6rem 0.85rem",
              borderLeft:`3px solid ${s.color}`, border:`1px solid #F3F4F6` }}>
              <div style={{ fontSize:"1.25rem", fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:"0.72rem", color:"var(--gray-400)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* La misma barra que el resto del panel: la dibuja el shell y acá sólo
          se declara qué hay. Antes eran pestañas con su propio estilo, así que
          Biblioteca y Publicaciones no se parecían aunque hicieran lo mismo. */}
      <BarraDeAcciones
        acciones={([
          ["biblioteca", `Biblioteca (${stats.total})`],
          ["subir",      "Subir"],
          ["taxonomia",  "Deptos y Categorías"],
          ["importar",   "Importar"],
          ["exportar",   "Exportar"],
        ] as const).map(([id, label]) => ({
          label,
          activa: tab === id,
          color: ACCENT,
          onClick: () => setTab(id as typeof tab),
        }))}
        derecha={mode === "modal" && selected.size > 0 ? (
          <button onClick={() => onSelect?.(items.filter(i => selected.has(i.id)))}
            style={{ padding:"0.42rem 1.1rem", background:ACCENT, color:"#fff",
              border:"none", borderRadius:7, fontWeight:700, fontSize:"0.76rem",
              cursor:"pointer", fontFamily:"DM Sans,sans-serif" }}>
            Usar ({selected.size}) →
          </button>
        ) : undefined}
      />

      {/* Importar y Exportar: las pantallas que ya existían, ahora acá adentro.
          No se reescriben — funcionan y son las mismas; lo que cambia es dónde
          se llega a ellas. */}
      {/* Departamentos y categorías: es la estructura con la que se clasifica
          lo que hay en la Biblioteca. Suelta en el menú era una pantalla que
          nadie sabía para qué servía; acá está al lado de lo que ordena. */}
      {tab === "taxonomia" && (
        <div style={{ marginTop:"0.5rem" }}><AdminCatalog /></div>
      )}

      {tab === "importar" && (
        <div style={{ marginTop:"0.5rem" }}><AdminImport /></div>
      )}
      {tab === "exportar" && (
        <div style={{ marginTop:"0.5rem" }}><AdminExport /></div>
      )}

      {/* TAB BIBLIOTECA */}
      {tab === "biblioteca" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

          {/* Filtros */}
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o etiqueta..."
              style={{ ...inp, flex:1, minWidth:160 }} />

            {/* Filtro tipo */}
            <div style={{ display:"flex", gap:"3px" }}>
              {(["all","imagen","video","documento"] as const).map(t => (
                <button key={t} onClick={() => setFilterTipo(t)} style={{
                  padding:"0.4rem 0.65rem", borderRadius:7, fontSize:"0.78rem",
                  border:`1.5px solid ${filterTipo===t ? ACCENT : "var(--border)"}`,
                  background: filterTipo===t ? `color-mix(in srgb, var(--brand-madre) 8%, transparent)` : "#fff",
                  color: filterTipo===t ? ACCENT : "var(--mute)",
                  fontWeight: filterTipo===t ? 700 : 400, cursor:"pointer",
                }}>
                  {t==="all"?"Todo":t==="imagen"?"🖼":t==="video"?"🎬":"📄"}
                </button>
              ))}
            </div>

            {/* Filtro categoria */}
            <div style={{ display:"flex", gap:"3px" }}>
              {(["all","articulo","documento","venta"] as const).map(c => (
                <button key={c} onClick={() => setFilterCat(c)} style={{
                  padding:"0.4rem 0.65rem", borderRadius:7, fontSize:"0.78rem",
                  border:`1.5px solid ${filterCat===c ? BLUE : "var(--border)"}`,
                  background: filterCat===c ? `color-mix(in srgb, var(--brand-navy) 8%, transparent)` : "#fff",
                  color: filterCat===c ? BLUE : "var(--mute)",
                  fontWeight: filterCat===c ? 700 : 400, cursor:"pointer",
                }}>
                  {c==="all"?"Todas":c==="articulo"?"🛍 Art.":c==="documento"?"📄 Doc":"💰 Venta"}
                </button>
              ))}
            </div>

            <input ref={inputRef} type="file" multiple accept="image/*,video/*,text/html,application/pdf"
              style={{ display:"none" }} onChange={e => handleFiles(e.target.files)} />
            <button onClick={() => inputRef.current?.click()} style={{
              padding:"0.45rem 0.9rem", background:ACCENT, color:"#fff",
              border:"none", borderRadius:8, fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>
              ⬆ Subir
            </button>
            <button onClick={reload} style={{ ...inp, cursor:"pointer", color:"var(--mute)", padding:"0.45rem 0.6rem" }}>↻</button>
          </div>

          {/* Selección info en modal */}
          {mode === "modal" && (
            <div style={{ fontSize:"0.78rem", color:"var(--mute)", display:"flex", gap:"1rem" }}>
              <span>🖼 {selImgs}/{maxImages}</span>
              <span>🎬 {selVids}/{maxVideos}</span>
              {selDocs > 0 && <span>📄 {selDocs}</span>}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--gray-400)" }}>Cargando...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem" }}>
              <div style={{ fontSize:"3rem" }}>🗂</div>
              <div style={{ color:"var(--gray-400)", marginTop:"0.5rem" }}>Biblioteca vacía</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:"0.6rem" }}>
              {items.map(item => {
                const isSel  = selected.has(item.id);
                const thumb  = getThumbUrl(item);
                const isDoc  = item.tipo === "documento";
                return (
                  <div key={item.id}
                    onClick={() => mode === "modal" ? toggleSelect(item) : setPreview(item)}
                    style={{
                      border:`2px solid ${isSel ? ACCENT : "var(--border)"}`, borderRadius:10,
                      overflow:"hidden", cursor:"pointer", background:"#fff", position:"relative",
                      boxShadow: isSel ? `0 0 0 3px color-mix(in srgb, var(--brand-madre) 15%, transparent)` : "0 1px 3px rgba(0,0,0,.05)",
                      transition:"all .15s",
                    }}>

                    {/* Thumbnail */}
                    <div style={{ height:100, background:"var(--gray-50)", display:"flex",
                      alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
                      {isDoc ? (
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:"2.5rem" }}>📄</div>
                          <div style={{ fontSize:"8px", color:"var(--gray-400)", marginTop:"2px" }}>
                            {item.nombre.split(".").pop()?.toUpperCase()}
                          </div>
                        </div>
                      ) : thumb ? (
                        <img src={thumb} alt={item.nombre} loading="lazy"
                          style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      ) : (
                        <div style={{ fontSize:"2.5rem" }}>🎬</div>
                      )}

                      {/* Duración video */}
                      {item.tipo === "video" && item.duracion_seg && (
                        <div style={{ position:"absolute", bottom:3, right:3,
                          background:"rgba(0,0,0,.65)", color:"#fff",
                          fontSize:"8px", padding:"1px 4px", borderRadius:3 }}>
                          {item.duracion_seg}s
                        </div>
                      )}

                      {/* Checkbox modal */}
                      {mode === "modal" && (
                        <div style={{ position:"absolute", top:4, left:4,
                          width:16, height:16, borderRadius:4,
                          border:`2px solid ${isSel ? ACCENT : "rgba(255,255,255,.8)"}`,
                          background: isSel ? ACCENT : "rgba(255,255,255,.6)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {isSel && <span style={{ color:"#fff", fontSize:"9px" }}>✓</span>}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding:"0.4rem 0.5rem" }}>
                      <div style={{ fontSize:"10px", fontWeight:600, color:"#374151",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {item.nombre}
                      </div>
                      <div style={{ fontSize:"9px", color:"var(--gray-400)" }}>
                        {fmtSize(item.size_bytes)} · {fmtDate(item.created_at)}
                      </div>
                      {item.etiquetas?.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"2px", marginTop:"2px" }}>
                          {item.etiquetas.slice(0,2).map(t => (
                            <span key={t} style={{ fontSize:"8px", padding:"1px 4px",
                              background:`color-mix(in srgb, var(--brand-navy) 8%, transparent)`, color:BLUE, borderRadius:3 }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display:"flex", borderTop:"1px solid #F3F4F6" }}>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(item.url||""); notify("URL copiada"); }}
                        style={{ flex:1, padding:"0.3rem", background:"none", border:"none", cursor:"pointer", fontSize:"10px", color:"var(--mute)" }}>
                        📋
                      </button>
                      {isDoc && (
                        <button onClick={e => { e.stopPropagation(); window.open(item.url, "_blank"); }}
                          style={{ flex:1, padding:"0.3rem", background:"none", border:"none", cursor:"pointer", fontSize:"10px", color:BLUE }}>
                          👁
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleDelete(item); }}
                        style={{ flex:1, padding:"0.3rem", background:"none", border:"none", cursor:"pointer", fontSize:"10px", color:"#EF4444" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmar selección modal */}
          {mode === "modal" && selected.size > 0 && (
            <div style={{ position:"sticky", bottom:0, background:"#fff", padding:"0.75rem",
              borderTop:"1px solid var(--border)", display:"flex", gap:"0.75rem", alignItems:"center" }}>
              <span style={{ fontSize:"0.85rem", color:"#374151", flex:1 }}>
                {selImgs>0 && `${selImgs} imagen(es) `}
                {selVids>0 && `${selVids} video(s) `}
                {selDocs>0 && `${selDocs} doc(s) `}
                seleccionado(s)
              </span>
              <button onClick={() => setSelected(new Set())} style={{
                padding:"0.45rem 0.9rem", background:"none", border:"1.5px solid var(--border)",
                borderRadius:8, cursor:"pointer", fontSize:"0.82rem", color:"var(--mute)" }}>
                Limpiar
              </button>
              <button onClick={() => onSelect?.(items.filter(i => selected.has(i.id)))} style={{
                padding:"0.45rem 1.1rem", background:ACCENT, color:"#fff",
                border:"none", borderRadius:8, fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>
                Usar seleccionados →
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB SUBIR */}
      {tab === "subir" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = ACCENT; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; handleFiles(e.dataTransfer.files); }}
            style={{ border:"2px dashed var(--border)", borderRadius:12, padding:"2rem",
              textAlign:"center", cursor:"pointer", color:"var(--gray-400)", transition:"border-color .2s" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"0.5rem" }}>⬆</div>
            <div style={{ fontWeight:600, color:"#374151", marginBottom:"0.25rem" }}>
              Arrastrá archivos o hacé click
            </div>
            <div style={{ fontSize:"0.8rem" }}>Imágenes · Videos MP4 · HTML · PDF</div>
          </div>

          {/* Opciones */}
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px" }}>Categoría</div>
              <div style={{ display:"flex", gap:"4px" }}>
                {(["articulo","documento","otro"] as const).map(c => (
                  <button key={c} onClick={() => setUploadCat(c)} style={{
                    flex:1, padding:"0.4rem", borderRadius:7, fontSize:"0.75rem",
                    border:`1.5px solid ${uploadCat===c ? ACCENT : "var(--border)"}`,
                    background: uploadCat===c ? `color-mix(in srgb, var(--brand-madre) 8%, transparent)` : "#fff",
                    color: uploadCat===c ? ACCENT : "var(--mute)",
                    fontWeight: uploadCat===c ? 700 : 400, cursor:"pointer",
                  }}>
                    {c==="articulo"?"🛍 Art.":c==="documento"?"📄 Doc":"📎 Otro"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:2, minWidth:200 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px" }}>
                Etiquetas <span style={{ fontWeight:400, color:"var(--gray-400)" }}>(separadas por coma)</span>
              </div>
              <input value={uploadTags} onChange={e => setUploadTags(e.target.value)}
                placeholder="verano, electro, oferta"
                style={{ ...inp, width:"100%" }} />
            </div>
          </div>

          {/* Lista uploads */}
          {uploads.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
              {uploads.map((u, i) => (
                <div key={i} style={{ background:"var(--gray-50)", borderRadius:8,
                  padding:"0.55rem 0.75rem", border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"0.82rem", fontWeight:500, color:"#374151",
                      maxWidth:"70%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {u.file.name}
                    </span>
                    <span style={{ fontSize:"0.75rem", color:
                      u.status==="done" ? "#16a34a" : u.status==="failed" ? "#dc2626" : "var(--mute)" }}>
                      {u.status==="done"?"✓ Listo":u.status==="failed"?"✗ Error":
                       u.status==="uploading"?`${u.progress}%`:"En cola"}
                    </span>
                  </div>
                  <div style={{ height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:2, transition:"width .3s",
                      width:`${u.progress}%`,
                      background: u.status==="failed"?"#ef4444":u.status==="done"?"#22c55e":ACCENT }} />
                  </div>
                  {u.error && <div style={{ fontSize:"0.72rem", color:"#dc2626", marginTop:"2px" }}>{u.error}</div>}
                </div>
              ))}
              <button onClick={() => { setUploads([]); setTab("biblioteca"); }}
                style={{ padding:"0.45rem", background:"none", border:"1.5px solid var(--border)",
                  borderRadius:8, cursor:"pointer", fontSize:"0.82rem", color:"var(--mute)" }}>
                Limpiar lista
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={() => setPreview(null)}>
          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden",
            maxWidth:800, width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"0.75rem 1rem", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontWeight:700, fontSize:"0.9rem", color:"#111" }}>{preview.nombre}</span>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {preview.tipo === "documento" && (
                  <button onClick={() => window.open(preview.url, "_blank")} style={{
                    padding:"0.35rem 0.75rem", background:BLUE, color:"#fff",
                    border:"none", borderRadius:7, fontSize:"0.8rem", cursor:"pointer" }}>
                    🖨 Imprimir
                  </button>
                )}
                <button onClick={() => { navigator.clipboard.writeText(preview.url||""); notify("URL copiada"); }}
                  style={{ padding:"0.35rem 0.75rem", background:"none", border:"1.5px solid var(--border)",
                    borderRadius:7, fontSize:"0.8rem", cursor:"pointer", color:"var(--mute)" }}>
                  📋 Copiar URL
                </button>
                <button onClick={() => setPreview(null)}
                  style={{ background:"none", border:"none", fontSize:"1.25rem", cursor:"pointer", color:"var(--mute)" }}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflow:"auto", padding:"1rem", display:"flex",
              alignItems:"center", justifyContent:"center", background:"var(--gray-50)", minHeight:300 }}>
              {preview.tipo === "imagen" && (
                <img src={preview.url} alt={preview.nombre}
                  style={{ maxWidth:"100%", maxHeight:"60vh", borderRadius:8, objectFit:"contain" }} />
              )}
              {preview.tipo === "video" && (
                <video src={preview.url} controls style={{ maxWidth:"100%", maxHeight:"60vh", borderRadius:8 }} />
              )}
              {preview.tipo === "documento" && (
                <iframe src={preview.url} title={preview.nombre}
                  style={{ width:"100%", height:"60vh", border:"none", borderRadius:8 }} />
              )}
            </div>
            <div style={{ padding:"0.6rem 1rem", borderTop:"1px solid var(--border)",
              display:"flex", gap:"1rem", fontSize:"0.78rem", color:"var(--gray-400)" }}>
              <span>{fmtSize(preview.size_bytes)}</span>
              <span>{fmtDate(preview.created_at)}</span>
              <span>{preview.categoria}</span>
              {preview.etiquetas?.length > 0 && (
                <span>{preview.etiquetas.map(t => `#${t}`).join(" ")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


