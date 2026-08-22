import { useState, useRef } from "react";
import AdminBiblioteca from "../pages/AdminBiblioteca";
import { supabase } from "../../../utils/supabase/client";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";

export interface MediaItem {
  id: string;
  bucket: string;
  path: string;
  tipo: "imagen" | "video";
  nombre: string;
  size_bytes: number;
  duracion_seg?: number;
  thumbnail_path?: string;
  status: string;
  created_at: string;
  url?: string;
}

interface Props {
  imagenes: string[];
  videos: string[];
  onChangeImagenes: (urls: string[]) => void;
  onChangeVideos: (urls: string[]) => void;
  maxImagenes?: number;
  maxVideos?: number;
}

function getUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function getThumb(bucket: string, path: string, tipo: string, thumbPath?: string): string {
  if (tipo === "video") {
    return thumbPath ? getUrl("biblioteca", thumbPath) : "";
  }
  return `${getUrl(bucket, path)}?width=200&height=200&resize=cover`;
}

export default function SelectorMediaArticulo({
  imagenes, videos,
  onChangeImagenes, onChangeVideos,
  maxImagenes = 9, maxVideos = 5,
}: Props) {
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTipo, setModalTipo]       = useState<"imagen"|"video">("imagen");
  const [replaceIdx, setReplaceIdx]     = useState<number | null>(null);
  const dragImgIdx  = useRef<number | null>(null);
  const dragVidIdx  = useRef<number | null>(null);

  const openModal = (tipo: "imagen"|"video", idx: number | null = null) => {
    setModalTipo(tipo);
    setReplaceIdx(idx);
    setModalOpen(true);
  };

  const handleSelect = (items: MediaItem[]) => {
    const imgs = items.filter(i => i.tipo === "imagen").map(i => i.url || getUrl(i.bucket, i.path));
    const vids = items.filter(i => i.tipo === "video").map(i => i.url || getUrl(i.bucket, i.path));

    if (modalTipo === "imagen") {
      if (replaceIdx !== null) {
        const next = [...imagenes];
        next[replaceIdx] = imgs[0] || next[replaceIdx];
        onChangeImagenes(next);
      } else {
        const next = [...imagenes, ...imgs].slice(0, maxImagenes);
        onChangeImagenes(next);
      }
    } else {
      if (replaceIdx !== null) {
        const next = [...videos];
        next[replaceIdx] = vids[0] || next[replaceIdx];
        onChangeVideos(next);
      } else {
        const next = [...videos, ...vids].slice(0, maxVideos);
        onChangeVideos(next);
      }
    }
    setModalOpen(false);
  };

  // Drag & drop imágenes
  const onImgDragStart = (i: number) => { dragImgIdx.current = i; };
  const onImgDrop = (i: number) => {
    if (dragImgIdx.current === null || dragImgIdx.current === i) return;
    const next = [...imagenes];
    const [moved] = next.splice(dragImgIdx.current, 1);
    next.splice(i, 0, moved);
    onChangeImagenes(next);
    dragImgIdx.current = null;
  };

  // Drag & drop videos
  const onVidDragStart = (i: number) => { dragVidIdx.current = i; };
  const onVidDrop = (i: number) => {
    if (dragVidIdx.current === null || dragVidIdx.current === i) return;
    const next = [...videos];
    const [moved] = next.splice(dragVidIdx.current, 1);
    next.splice(i, 0, moved);
    onChangeVideos(next);
    dragVidIdx.current = null;
  };

  const removeImg = (i: number) => { const next = [...imagenes]; next.splice(i,1); onChangeImagenes(next); };
  const removeVid = (i: number) => { const next = [...videos];   next.splice(i,1); onChangeVideos(next);   };

  const slotStyle = (filled: boolean, first = false): React.CSSProperties => ({
    width: "100%", aspectRatio: "1", borderRadius: 10, overflow: "hidden",
    border: first && filled ? `2px solid ${ACCENT}` : `1.5px solid ${filled ? "var(--border)" : "#F3F4F6"}`,
    background: filled ? "#000" : "var(--gray-50)",
    cursor: "pointer", position: "relative",
    transition: "all .15s",
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

      {/* IMÁGENES */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
          <span style={{ fontSize:"0.8rem", fontWeight:700, color:"#374151" }}>
            Imágenes <span style={{ color:"var(--gray-400)", fontWeight:400 }}>({imagenes.length}/{maxImagenes}) · primera = principal</span>
          </span>
          {imagenes.length < maxImagenes && (
            <button onClick={() => openModal("imagen")} style={{
              padding:"0.3rem 0.75rem", background:ACCENT, color:"#fff",
              border:"none", borderRadius:7, fontSize:"0.78rem", fontWeight:700, cursor:"pointer"
            }}>+ Agregar</button>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:"0.35rem" }}>
          {Array.from({ length: maxImagenes }).map((_, i) => {
            const url = imagenes[i];
            return (
              <div key={i}
                style={slotStyle(!!url, i === 0)}
                draggable={!!url}
                onDragStart={() => onImgDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onImgDrop(i)}
                onClick={() => !url && openModal("imagen")}
              >
                {url ? (
                  <>
                    <img src={`${url}?width=200`} alt={`img-${i}`}
                      style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    {i === 0 && (
                      <div style={{ position:"absolute", top:2, left:2, background:ACCENT,
                        color:"#fff", fontSize:"8px", padding:"1px 4px", borderRadius:3, fontWeight:700 }}>
                        Principal
                      </div>
                    )}
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:2, opacity:0, transition:"all .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,.45);opacity:1")}
                      onMouseLeave={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,0);opacity:0")}
                    >
                      <button onClick={e => { e.stopPropagation(); openModal("imagen", i); }}
                        style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:5,
                          padding:"2px 6px", fontSize:"9px", cursor:"pointer" }}>✏ Reemplazar</button>
                      <button onClick={e => { e.stopPropagation(); removeImg(i); }}
                        style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:5,
                          padding:"2px 6px", fontSize:"9px", cursor:"pointer" }}>🗑 Quitar</button>
                    </div>
                  </>
                ) : (
                  <span style={{ color:"#D1D5DB", fontSize:"1.2rem" }}>+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* VIDEOS */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
          <span style={{ fontSize:"0.8rem", fontWeight:700, color:"#374151" }}>
            Videos <span style={{ color:"var(--gray-400)", fontWeight:400 }}>({videos.length}/{maxVideos}) · máx 30s</span>
          </span>
          {videos.length < maxVideos && (
            <button onClick={() => openModal("video")} style={{
              padding:"0.3rem 0.75rem", background:BLUE, color:"#fff",
              border:"none", borderRadius:7, fontSize:"0.78rem", fontWeight:700, cursor:"pointer"
            }}>+ Agregar</button>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.5rem" }}>
          {Array.from({ length: maxVideos }).map((_, i) => {
            const url = videos[i];
            return (
              <div key={i}
                style={{ ...slotStyle(!!url), aspectRatio:"16/9" }}
                draggable={!!url}
                onDragStart={() => onVidDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onVidDrop(i)}
                onClick={() => !url && openModal("video")}
              >
                {url ? (
                  <>
                    <video src={url} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.3)",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                      <span style={{ fontSize:"1.5rem" }}>▶</span>
                    </div>
                    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:2, opacity:0, transition:"all .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,.55);opacity:1")}
                      onMouseLeave={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,0);opacity:0")}
                    >
                      <button onClick={e => { e.stopPropagation(); openModal("video", i); }}
                        style={{ background:BLUE, color:"#fff", border:"none", borderRadius:5,
                          padding:"2px 6px", fontSize:"9px", cursor:"pointer" }}>✏ Reemplazar</button>
                      <button onClick={e => { e.stopPropagation(); removeVid(i); }}
                        style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:5,
                          padding:"2px 6px", fontSize:"9px", cursor:"pointer" }}>🗑 Quitar</button>
                    </div>
                  </>
                ) : (
                  <span style={{ color:"#D1D5DB", fontSize:"1.5rem" }}>🎬</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL BIBLIOTECA */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:900,
            maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden",
            boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

            {/* Header modal */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontWeight:700, fontSize:"1rem", color:"#111" }}>
                {modalTipo === "imagen" ? "🖼 Seleccionar imágenes" : "🎬 Seleccionar videos"}
                {replaceIdx !== null && " — reemplazar"}
              </span>
              <button onClick={() => setModalOpen(false)}
                style={{ background:"none", border:"none", fontSize:"1.25rem", cursor:"pointer", color:"var(--mute)" }}>✕</button>
            </div>

            {/* Biblioteca en modo modal */}
            <div style={{ flex:1, overflow:"auto", padding:"1rem" }}>
              <AdminBiblioteca
                mode="modal"
                maxImages={modalTipo === "imagen" ? (replaceIdx !== null ? 1 : maxImagenes - imagenes.length) : 0}
                maxVideos={modalTipo === "video"  ? (replaceIdx !== null ? 1 : maxVideos   - videos.length)   : 0}
                onSelect={handleSelect}
                selectedIds={[]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

