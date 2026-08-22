import { useState } from "react";
import { useEditorStore } from "../engine/useEditorStore";

const ACCENT = "var(--brand-madre)";

export default function HistoryPanel() {
  const { history, histIdx, undo, redo, reset } = useEditorStore();
  const [open, setOpen] = useState(false);

  const btnStyle: React.CSSProperties = {
    flex:1, padding:"5px", border:"0.5px solid var(--color-border-secondary)",
    borderRadius:"6px", background:"var(--color-background-primary)",
    color:"var(--color-text-secondary)", fontSize:"10px", cursor:"pointer"
  };

  return (
    <div>
      {/* Header clickeable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", cursor:"pointer", userSelect:"none" }}
      >
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontSize:"10px", fontWeight:600, color:"var(--mute)", textTransform:"uppercase", letterSpacing:".08em" }}>Historial</span>
          <span style={{ background:"color-mix(in srgb, var(--brand-madre) 12%, transparent)", color:ACCENT, fontSize:"9px", padding:"1px 5px", borderRadius:"4px", fontWeight:600 }}>{history.length}</span>
        </div>
        <span style={{ fontSize:"10px", color:"var(--gray-400)", transition:"transform .15s", display:"inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>

      {/* Lista expandible */}
      {open && (
        <div style={{ padding:"0 12px 8px", maxHeight:"160px", overflowY:"auto" }}>
          {history.length === 0
            ? <span style={{ fontSize:"10px", color:"var(--gray-400)" }}>Sin acciones</span>
            : [...history].reverse().map((h, i) => (
              <div key={i} style={{
                fontSize:"10px", padding:"3px 6px", borderRadius:"4px", marginBottom:"2px",
                background: i === 0 ? "color-mix(in srgb, var(--brand-madre) 10%, transparent)" : "transparent",
                color: i === 0 ? ACCENT : "var(--mute)"
              }}>{h.label}</div>
            ))
          }
        </div>
      )}

      {/* Botones siempre visibles */}
      <div style={{ display:"flex", gap:"5px", padding:"6px 12px 10px" }}>
        <button style={btnStyle} onClick={undo} disabled={histIdx <= 0}>↩ Undo</button>
        <button style={btnStyle} onClick={redo} disabled={histIdx >= history.length - 1}>Redo ↪</button>
        <button style={btnStyle} onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

