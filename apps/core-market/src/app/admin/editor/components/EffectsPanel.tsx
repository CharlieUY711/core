import { useState } from "react";
import { useEditorStore } from "../engine/useEditorStore";
import { FILTERS } from "../engine/filters";
import { removeBg } from "../engine/bgRemoval";

const A = "var(--brand-madre)";

export default function EffectsPanel() {
  const store = useEditorStore();
  const [bgProgress, setBgProgress] = useState<number|null>(null);

  const applyFilter = (name: string) => {
    const f = FILTERS[name];
    Object.entries(f).forEach(([k, v]) => store.set(k as any, v));
    store.set("filter", name);
    store.saveHistory("Filtro: " + name);
  };

  const handleBgRemove = async () => {
    if (!store.src) return;
    setBgProgress(0);
    try {
      const result = await removeBg(store.src, p => setBgProgress(p));
      store.setSrc(result);
      store.set("bgRemoved", true);
      store.saveHistory("Fondo removido (IA)");
    } catch(e: any) {
      console.error(e);
    } finally {
      setBgProgress(null);
    }
  };

  const filterNames = Object.keys(FILTERS);
  const labels: Record<string,string> = {
    none:"Original",cinematic:"Cinematic",vintage:"Vintage",
    highcontrast:"Hi Contrast",cool:"Cool",warm:"Warm",bw:"B&W",fade:"Fade"
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding:"7px 4px", border:`0.5px solid ${active ? A : "var(--color-border-secondary)"}`,
    borderRadius:"6px", background: active ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "var(--color-background-primary)",
    color: active ? A : "var(--color-text-secondary)",
    fontSize:"11px", cursor:"pointer", textAlign:"center" as const
  });

  return (
    <div>
      <div style={{ padding:"10px 12px", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize:"10px", fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>Presets</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5px" }}>
          {filterNames.map(name => (
            <button key={name} style={btnStyle(store.filter === name)} onClick={() => applyFilter(name)}>
              {labels[name] || name}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:"10px 12px" }}>
        <div style={{ fontSize:"10px", fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>IA Local</div>
        <button
          onClick={handleBgRemove}
          disabled={bgProgress !== null || !store.src}
          style={{ width:"100%", padding:"8px", borderRadius:"7px",
            border:"0.5px solid rgba(99,60,255,.4)", background:"rgba(99,60,255,.08)",
            color:"#6B3CFF", fontSize:"11px", fontWeight:500, cursor:"pointer" }}>
          {bgProgress !== null ? `Procesando... ${bgProgress}%` : "✦ Quitar fondo (IA)"}
        </button>
        {bgProgress !== null && (
          <div style={{ marginTop:"6px", height:"3px", borderRadius:"2px", background:"var(--color-border-tertiary)", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${bgProgress}%`, background:"#6B3CFF", transition:"width .3s" }} />
          </div>
        )}
        <p style={{ fontSize:"10px", color:"var(--color-text-secondary)", marginTop:"6px", lineHeight:1.5 }}>
          Procesamiento local · sin datos externos · modelo ONNX
        </p>
      </div>
    </div>
  );
}


