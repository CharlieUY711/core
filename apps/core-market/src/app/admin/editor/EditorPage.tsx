import { useRef, useState } from "react";
import { useEditorStore } from "./engine/useEditorStore";
import EditCanvas     from "./components/EditCanvas";
import OriginalCanvas from "./components/OriginalCanvas";
import AdjustPanel    from "./components/AdjustPanel";
import TransformPanel from "./components/TransformPanel";
import EffectsPanel   from "./components/EffectsPanel";
import HistoryPanel   from "./components/HistoryPanel";
import { supabase }   from "../../../utils/supabase/client";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";
const GREEN  = "var(--color-success)";

type Tab = "adjust" | "transform" | "effects";

export default function EditorPage() {
  const store = useEditorStore();
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>("adjust");
  const [renderCount, setRenderCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [sizeEst, setSizeEst] = useState("");

  const navBtn = (t: Tab, label: string, color: string) => (
    <button onClick={() => setTab(t)} style={{
      flex:1, padding:"7px 4px", background:"none", border:"none",
      borderBottom: tab === t ? `2px solid ${color}` : "2px solid transparent",
      color: tab === t ? color : "var(--gray-400)",
      fontSize:"11px", fontWeight: tab === t ? 600 : 400,
      cursor:"pointer", transition:"all .12s"
    }}>{label}</button>
  );

  const topBtn = (label: string, onClick: () => void, color = ACCENT, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"5px 14px", background:"none",
      border:`1.5px solid ${disabled ? "var(--border)" : color}`, borderRadius:"7px",
      color: disabled ? "#ccc" : color, fontSize:"12px", fontWeight:500,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>{label}</button>
  );

  const hasTransformations = (): boolean =>
    store.brightness !== 0 || store.contrast !== 0 || store.exposure !== 0 ||
    store.saturation !== 0 || store.temperature !== 0 || store.tint !== 0 ||
    store.sharpness !== 0 || store.blur !== 0 || store.rotation !== 0 ||
    store.fineRotation !== 0 || store.flipH || store.flipV ||
    store.scaleX !== 1 || store.scaleY !== 1 ||
    store.offsetX !== 0 || store.offsetY !== 0 ||
    store.filter !== "none" || (store.bgColor !== "transparent" && store.bgColor !== "#FFFFFF");

  const handleGrabar = async () => {
    const canvas = editCanvasRef.current;
    if (!canvas || !store.src) return;
    if (!hasTransformations()) {
      setSaveMsg("Sin cambios — subí sin editar desde Biblioteca");
      setTimeout(() => setSaveMsg(""), 3000);
      return;
    }
    setSaving(true); setSaveMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const folder   = user?.id || "public";
      const vNum     = store.versionCount + 1;
      const baseName = (store.originalName || "imagen").replace(/\.[^.]+$/, "");
      const usePng   = store.bgColor === "transparent";
      const ext      = usePng ? "png" : "jpg";
      const mime     = usePng ? "image/png" : "image/jpeg";
      const quality  = usePng ? 1 : 0.92;
      const fileName = `${baseName}_V${vNum}.${ext}`;
      const path     = `${folder}/${fileName}`;
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), mime, quality));
      const { error } = await supabase.storage.from("biblioteca").upload(path, blob, { upsert: true });
      if (error) throw error;
      const dataUrl = canvas.toDataURL(mime, quality);
      const newImg = new Image();
      newImg.onload = () => {
        store.bumpVersion(newImg, dataUrl);
        const kb = Math.round(blob.size / 1024);
        setSaveMsg(`✓ ${fileName} · ${kb > 1024 ? (kb/1024).toFixed(1)+"MB" : kb+"KB"}`);
        setTimeout(() => setSaveMsg(""), 4000);
      };
      newImg.src = dataUrl;
    } catch(e: any) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fileName = store.originalName || "";
  const shortName = fileName.length > 20 ? fileName.substring(0,18)+"…" : fileName;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 110px)", minHeight:"500px", fontFamily:"DM Sans, sans-serif" }}>

      {/* Barra superior */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px", background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", marginBottom:"6px", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontWeight:700, fontSize:"13px", color:BLUE }}>Editor</span>
          <span style={{ width:"1px", height:"18px", background:"var(--border)" }} />
          {topBtn("Subir imagen", () => document.getElementById("emi-file-input")?.click(), ACCENT)}
          {topBtn("Undo",  () => store.undo(),  BLUE, !store.src)}
          {topBtn("Redo",  () => store.redo(),  BLUE, !store.src)}
          {topBtn("Reset", () => store.reset(), "var(--gray-400)", !store.src)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          {store.src && <span style={{ fontSize:"11px", color:"var(--gray-400)" }}>{store.src.width}×{store.src.height}px</span>}
          {store.versionCount > 0 && <span style={{ fontSize:"10px", color:GREEN, fontWeight:600 }}>V{store.versionCount}</span>}
          {(["＋","－","Fit"] as const).map((l,i) => (
            <button key={i} onClick={() => {
              if(i===0) store.set("zoom",Math.min(store.zoom*1.25,5));
              else if(i===1) store.set("zoom",Math.max(store.zoom/1.25,.1));
              else store.set("zoom",1);
            }} style={{ padding:"3px 7px", border:"0.5px solid var(--border)", borderRadius:"5px", background:"#fff", color:"var(--mute)", fontSize:"11px", cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Cuerpo: Original | Menú | Preview | Salida */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 200px 1fr 160px", flex:1, overflow:"hidden", gap:"6px" }}>

        {/* Canvas Original */}
        <div style={{ display:"flex", flexDirection:"column", background:"#F4F5F7", border:"1.5px solid var(--border)", borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ height:"30px", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid var(--border)", background:"#fff", flexShrink:0 }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"var(--mute)", padding:"2px 10px", border:"1px solid var(--border)", borderRadius:"20px", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {shortName || "Original"}
            </span>
          </div>
          <OriginalCanvas />
        </div>

        {/* Panel menú central */}
        <aside style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ display:"flex", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
            {navBtn("adjust","Ajustes",ACCENT)}
            {navBtn("transform","Forma",BLUE)}
            {navBtn("effects","FX",GREEN)}
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {tab==="adjust"    && <AdjustPanel />}
            {tab==="transform" && <TransformPanel />}
            {tab==="effects"   && <EffectsPanel />}
          </div>
          <div style={{ borderTop:"1px solid #F3F4F6", flexShrink:0 }}>
            <HistoryPanel />
          </div>
        </aside>

        {/* Canvas Preview (editado) */}
        <div style={{ display:"flex", flexDirection:"column", background:"#F4F5F7", border:`1.5px solid ${ACCENT}`, borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ height:"30px", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid var(--border)", background:"#fff", flexShrink:0 }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"var(--gray-400)", padding:"2px 10px", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {shortName ? `${shortName} — preview` : "Preview"}
            </span>
          </div>
          <EditCanvas canvasRef={editCanvasRef} onRender={() => {
            setRenderCount(n => n+1);
            const c = editCanvasRef.current;
            if (c && store.src) {
              try {
                const usePng = store.bgColor === "transparent";
                const d = c.toDataURL(usePng ? "image/png" : "image/jpeg", 0.92);
                const b = Math.round((d.length - 22) * 3 / 4);
                setSizeEst(b > 1024*1024 ? `${(b/1024/1024).toFixed(1)}MB` : `${Math.round(b/1024)}KB`);
              } catch {}
            }
          }} />
        </div>

        {/* Salida */}
        <aside style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Botón Grabar */}
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6" }}>
            <button
              onClick={handleGrabar}
              disabled={saving || !store.src}
              style={{
                width:"100%", padding:"8px", background: store.src ? GREEN : "#ccc",
                color:"#fff", border:"none", borderRadius:"8px",
                fontSize:"12px", fontWeight:700,
                cursor: store.src ? "pointer" : "not-allowed",
                marginBottom:"6px"
              }}
            >
              {saving ? "Grabando..." : store.versionCount > 0 ? `Grabar V${store.versionCount+1}` : "Grabar"}
            </button>
            {saveMsg && (
              <div style={{ fontSize:"10px", textAlign:"center", color: saveMsg.startsWith("Error") ? "#EF4444" : saveMsg.startsWith("Sin") ? "#F59E0B" : GREEN }}>
                {saveMsg}
              </div>
            )}
          </div>

          {/* Info exportación */}
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6" }}>
            <div style={{ fontSize:"10px", fontWeight:600, color:"var(--gray-400)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>Salida</div>
            <div style={{ fontSize:"11px", color:"var(--mute)", lineHeight:2 }}>
              <div>Formato: {store.bgColor === "transparent" ? "PNG" : "JPG"}</div>
              <div>1200×1200px</div>
              {sizeEst && <div>~{sizeEst}</div>}
              <div style={{ color:"var(--gray-400)", fontSize:"10px" }}>render #{renderCount}</div>
            </div>
          </div>

          {/* Info imagen */}
          <div style={{ padding:"10px 12px" }}>
            <div style={{ fontSize:"10px", fontWeight:600, color:"var(--gray-400)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>Info</div>
            {store.src ? (
              <div style={{ fontSize:"11px", color:"var(--mute)", lineHeight:2 }}>
                <div>{store.src.width}×{store.src.height}px</div>
                <div>zoom {Math.round(store.zoom*100)}%</div>
                {store.filter !== "none" && <div>Filtro: {store.filter}</div>}
                {store.bgRemoved && <div style={{ color:"#6B3CFF" }}>✦ Sin fondo</div>}
              </div>
            ) : <span style={{ fontSize:"11px", color:"var(--gray-400)" }}>Sin imagen</span>}
          </div>
        </aside>
      </div>
    </div>
  );
}

