import { useState, useRef, useCallback } from "react";
import { useEditorStore } from "../engine/useEditorStore";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";

const ASPECTS = [
  { label:"1:1",  ratio:"1:1"   },
  { label:"4:5",  ratio:"4:5"   },
  { label:"16:9", ratio:"16:9"  },
  { label:"9:16", ratio:"9:16"  },
  { label:"3:2",  ratio:"3:2"   },
  { label:"○",   ratio:"circle" },
];

const BG_COLORS = [
  { label:"Blanco",       color:"#FFFFFF" },
  { label:"Negro",        color:"#000000" },
  { label:"Gris",         color:"#808080" },
  { label:"Transp",       color:"transparent" },
  { label:"Azul",         color:"#0F3460" },
  { label:"Naranja",      color:"#FF7A00" },
];

const TOOLS = [
  { id:"select-rect", icon:"▭", title:"Selección rectangular" },
  { id:"select-circ", icon:"◯", title:"Selección circular" },
  { id:"select-free", icon:"⌖", title:"Selección libre" },
  { id:"cut",         icon:"✂", title:"Cortar selección" },
];

export default function TransformPanel() {
  const store = useEditorStore();
  const { rotation, fineRotation, set, saveHistory, activeTool, bgColor, aspectRatio } = store;
  const [activePreset, setActivePreset] = useState<string|null>(null);
  const dialRef  = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastAngle = useRef(0);

  const rotate = (deg: number, key: string) => {
    setActivePreset(activePreset === key ? null : key);
    const next = (rotation + deg + 360) % 360;
    set("rotation", next);
    saveHistory(`Rotar ${deg > 0 ? "+" : ""}${deg}°`);
  };

  const flip = (axis: "h"|"v", key: string) => {
    setActivePreset(activePreset === key ? null : key);
    if (axis === "h") { set("flipH", !store.flipH); saveHistory("Flip H"); }
    else              { set("flipV", !store.flipV); saveHistory("Flip V"); }
  };

  const getAngleFromEvent = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = dialRef.current!.getBoundingClientRect();
    return Math.round(Math.atan2(e.clientY - (rect.top + rect.height/2), e.clientX - (rect.left + rect.width/2)) * 180 / Math.PI);
  };

  const onDialMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    dragging.current = true;
    lastAngle.current = getAngleFromEvent(e);
  };

  const onDialMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const angle = getAngleFromEvent(e);
    const delta = angle - lastAngle.current;
    lastAngle.current = angle;
    set("fineRotation", Math.max(-45, Math.min(45, fineRotation + delta)));
  }, [fineRotation, set]);

  const onDialMouseUp = () => {
    if (dragging.current) { dragging.current = false; saveHistory(`Ángulo: ${fineRotation}°`); }
  };

  const dialAngle = (fineRotation / 45) * 135;
  const dialRad   = (dialAngle - 90) * Math.PI / 180;
  const dialR     = 28;
  const dotX      = 38 + dialR * Math.cos(dialRad);
  const dotY      = 38 + dialR * Math.sin(dialRad);

  const sectionTitle = (t: string) => (
    <div style={{ fontSize:"10px", fontWeight:600, color:"var(--gray-400)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:"6px" }}>{t}</div>
  );

  const activeBg = BG_COLORS.find(b => b.color === bgColor)?.label || null;

  return (
    <div style={{ display:"flex", flexDirection:"column" }}>

      {/* Rotación rápida — 4 en una línea */}
      <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6" }}>
        {sectionTitle("Rotación")}
        <div style={{ display:"flex", gap:"4px" }}>
          {[
            { label:"↻ 90°",  key:"r90",  action:() => rotate(90, "r90")  },
            { label:"↺ -90°", key:"r-90", action:() => rotate(-90,"r-90") },
            { label:"⟺ H",   key:"fh",   action:() => flip("h","fh")     },
            { label:"⟷ V",   key:"fv",   action:() => flip("v","fv")     },
          ].map(p => (
            <button key={p.key} onClick={p.action} style={{
              flex:1, padding:"5px 2px", fontSize:"10px", cursor:"pointer", whiteSpace:"nowrap",
              border:`1.5px solid ${activePreset===p.key ? ACCENT : "var(--border)"}`,
              borderRadius:"7px",
              background: activePreset===p.key ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "#fff",
              color: activePreset===p.key ? ACCENT : "var(--mute)",
              fontWeight: activePreset===p.key ? 600 : 400,
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Dial ángulo libre */}
      <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:"10px" }}>
        <svg ref={dialRef} width="76" height="76" viewBox="0 0 76 76"
          style={{ cursor:"grab", flexShrink:0 }}
          onMouseDown={onDialMouseDown} onMouseMove={onDialMouseMove}
          onMouseUp={onDialMouseUp} onMouseLeave={onDialMouseUp}>
          <circle cx="38" cy="38" r={dialR} fill="none" stroke="#F3F4F6" strokeWidth="5"/>
          <circle cx="38" cy="38" r={dialR} fill="none" stroke={ACCENT} strokeWidth="5"
            strokeDasharray={`${Math.abs(dialAngle/360) * 2 * Math.PI * dialR} ${2 * Math.PI * dialR}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(${-90 + (fineRotation < 0 ? dialAngle : 0)} 38 38)`}
          />
          <circle cx={dotX} cy={dotY} r="6" fill={ACCENT} stroke="#fff" strokeWidth="2"/>
          <text x="38" y="42" textAnchor="middle" fontSize="10" fontWeight="700" fill={ACCENT}>{fineRotation}°</text>
        </svg>
        <div style={{ flex:1 }}>
          <input type="range" min="-45" max="45" value={fineRotation}
            style={{ width:"100%", height:"3px", accentColor:ACCENT }}
            onChange={e => set("fineRotation", parseInt(e.target.value))}
            onMouseUp={e => saveHistory(`Ángulo: ${(e.target as HTMLInputElement).value}°`)}
          />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"9px", color:"#C4C4C4", marginTop:"2px" }}>
            <span>-45°</span><span>0</span><span>+45°</span>
          </div>
        </div>
      </div>

      {/* Aspecto */}
      <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6" }}>
        {sectionTitle("Aspecto")}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"4px", marginBottom:"10px" }}>
          {ASPECTS.map(a => {
            const active = aspectRatio === a.ratio;
            return (
              <button key={a.label} onClick={() => {
                const next = active ? null : a.ratio;
                set("aspectRatio", next);
                saveHistory("Aspecto: " + a.label);
              }} style={{
                padding:"6px 4px", fontSize:"10px", cursor:"pointer",
                border:`1.5px solid ${active ? ACCENT : "var(--border)"}`,
                borderRadius: a.label === "○" ? "50%" : "7px",
                background: active ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "#fff",
                color: active ? ACCENT : "var(--mute)",
                fontWeight: active ? 600 : 400,
                display:"flex", alignItems:"center", justifyContent:"center",
                aspectRatio: a.label === "○" ? "1" : "auto",
              }}>{a.label}</button>
            );
          })}
        </div>

        {/* Fondo */}
        {sectionTitle("Fondo")}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"4px", marginBottom:"8px" }}>
          {BG_COLORS.map(bg => (
            <button key={bg.label} title={bg.label} onClick={() => {
              const next = bgColor === bg.color ? "transparent" : bg.color;
              set("bgColor", next);
              saveHistory("Fondo: " + bg.label);
            }} style={{
              width:"100%", aspectRatio:"1", borderRadius:"6px", cursor:"pointer",
              background: bg.color === "transparent"
                ? "linear-gradient(135deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%)"
                : bg.color,
              border:`2px solid ${bgColor === bg.color ? ACCENT : "var(--border)"}`,
            }}/>
          ))}
        </div>

        <button onClick={() => {
          if (!store.src) return;
          const w = store.src.width, h = store.src.height;
          const g = gcd(w, h);
          set("aspectRatio", `${w/g}:${h/g}`);
          saveHistory("Auto proporción");
        }} style={{
          width:"100%", padding:"6px", fontSize:"10px", fontWeight:600,
          border:`1.5px solid ${BLUE}`, borderRadius:"7px",
          background:"color-mix(in srgb, var(--brand-navy) 6%, transparent)", color:BLUE, cursor:"pointer"
        }}>⊞ Auto proporción</button>
      </div>

      {/* Herramientas */}
      <div style={{ padding:"10px 12px" }}>
        {sectionTitle("Selección y corte")}
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
          {TOOLS.map(t => (
            <button key={t.id} title={t.title} onClick={() => {
              set("activeTool", activeTool === t.id ? null : t.id);
            }} style={{
              width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center",
              border:`1.5px solid ${activeTool===t.id ? ACCENT : "var(--border)"}`,
              borderRadius:"7px",
              background: activeTool===t.id ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "#fff",
              color: activeTool===t.id ? ACCENT : "var(--mute)",
              fontSize:"14px", cursor:"pointer"
            }}>{t.icon}</button>
          ))}
        </div>
        {activeTool && (
          <div style={{ marginTop:"6px", fontSize:"10px", color:"var(--gray-400)", padding:"4px 8px", background:"var(--gray-50)", borderRadius:"6px" }}>
            {activeTool === "select-rect" && "Arrastrá para seleccionar área rectangular"}
            {activeTool === "select-circ" && "Arrastrá para seleccionar área circular"}
            {activeTool === "select-free" && "Dibujá libremente el área de selección"}
            {activeTool === "cut"         && "Recortá la selección actual"}
          </div>
        )}
      </div>
    </div>
  );
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }


