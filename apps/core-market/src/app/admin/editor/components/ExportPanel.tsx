import { useRef } from "react";
import { useEditorStore } from "../engine/useEditorStore";

export default function ExportPanel() {
  const store  = useEditorStore();
  const fmtRef = useRef<HTMLSelectElement>(null);
  const qualRef= useRef<HTMLInputElement>(null);

  const exportImg = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#emi-edit-canvas");
    if (!canvas || !store.src) return;
    const fmt  = fmtRef.current?.value.toLowerCase() || "png";
    const q    = parseInt(qualRef.current?.value || "90") / 100;
    const mime = fmt === "png" ? "image/png" : fmt === "jpeg" ? "image/jpeg" : "image/webp";
    const a    = document.createElement("a");
    a.href     = canvas.toDataURL(mime, q);
    a.download = `emi-export.${fmt}`;
    a.click();
    store.saveHistory(`Exportado como ${fmt.toUpperCase()}`);
  };

  const selStyle: React.CSSProperties = {
    width:"100%", padding:"5px 7px", border:"0.5px solid var(--color-border-secondary)",
    borderRadius:"6px", background:"var(--color-background-primary)",
    color:"var(--color-text-primary)", fontSize:"11px"
  };

  return (
    <div style={{ padding:"10px 12px" }}>
      <div style={{ fontSize:"10px", fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>Exportar</div>
      <div style={{ marginBottom:"8px" }}>
        <label style={{ fontSize:"11px", color:"var(--color-text-secondary)", display:"block", marginBottom:"3px" }}>Formato</label>
        <select ref={fmtRef} style={selStyle}><option>PNG</option><option>JPEG</option><option>WEBP</option></select>
      </div>
      <div style={{ marginBottom:"10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"var(--color-text-secondary)", marginBottom:"3px" }}>
          <span>Calidad</span><span id="emi-q-val" style={{ fontWeight:500, color:"var(--color-text-primary)" }}>90</span>
        </div>
        <input ref={qualRef} type="range" min="1" max="100" defaultValue="90" style={{ width:"100%", height:"3px", accentColor:"var(--brand-madre)" }}
          onChange={e => { const el = document.getElementById("emi-q-val"); if(el) el.textContent = e.target.value; }} />
      </div>
      <button onClick={exportImg} disabled={!store.src}
        style={{ width:"100%", padding:"8px", background: store.src ? "var(--brand-madre)" : "#ccc",
          color:"#fff", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:500,
          cursor: store.src ? "pointer" : "not-allowed" }}>
        ⬇ Exportar
      </button>
    </div>
  );
}


