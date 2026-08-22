import { useEditorStore } from "../engine/useEditorStore";

type SliderKey = "brightness"|"contrast"|"exposure"|"saturation"|"temperature"|"tint"|"sharpness"|"blur";

const SLIDERS: { key: SliderKey; label: string; min: number; max: number }[] = [
  { key:"brightness", label:"Brillo",      min:-100, max:100 },
  { key:"contrast",   label:"Contraste",   min:-100, max:100 },
  { key:"exposure",   label:"Exposicion",  min:-100, max:100 },
  { key:"saturation", label:"Saturacion",  min:-100, max:100 },
  { key:"temperature",label:"Temperatura", min:-100, max:100 },
  { key:"tint",       label:"Tinte",       min:-100, max:100 },
  { key:"sharpness",  label:"Nitidez",     min:0,    max:100 },
  { key:"blur",       label:"Blur",        min:0,    max:20  },
];

const GROUPS = [
  { title:"Luz",     keys:["brightness","contrast","exposure"] as SliderKey[],  color:"var(--brand-madre)" },
  { title:"Color",   keys:["saturation","temperature","tint"]  as SliderKey[],  color:"var(--brand-navy)" },
  { title:"Detalle", keys:["sharpness","blur"]                 as SliderKey[],  color:"var(--color-success)" },
];

function pct(val: number, min: number, max: number) {
  return Math.round(((val - min) / (max - min)) * 100);
}

export default function AdjustPanel() {
  const store = useEditorStore();

  const handle = (key: SliderKey, val: number) => {
    store.set(key, val);
    store.saveHistory(`${key}: ${val}`);
  };

  return (
    <div>
      <style>{`
        input.emi-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        input.emi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid var(--color-text-light);
          box-shadow: 0 0 0 1px currentColor;
          cursor: pointer;
        }
        input.emi-slider::-moz-range-thumb {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid var(--color-text-light);
          cursor: pointer;
        }
      `}</style>
      {GROUPS.map(g => (
        <div key={g.title} style={{ padding:"10px 12px", borderBottom:`1px solid ${g.color}22` }}>
          <div style={{ fontSize:"10px", fontWeight:600, color:g.color, textTransform:"uppercase", letterSpacing:".08em", marginBottom:"8px" }}>
            {g.title}
          </div>
          {SLIDERS.filter(s => g.keys.includes(s.key)).map(sl => {
            const val = store[sl.key] as number;
            const p   = pct(val, sl.min, sl.max);
            const track = `linear-gradient(to right, ${g.color} ${p}%, var(--border) ${p}%)`;
            return (
              <div key={sl.key} style={{ marginBottom:"8px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"var(--mute)", marginBottom:"4px" }}>
                  <span>{sl.label}</span>
                  <span style={{ fontWeight:600, color:g.color, minWidth:"28px", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>
                    {val}
                  </span>
                </div>
                <input
                  type="range"
                  className="emi-slider"
                  min={sl.min}
                  max={sl.max}
                  value={val}
                  style={{
                    background: track,
                    accentColor: g.color,
                    color: g.color,
                  } as React.CSSProperties}
                  onChange={e => handle(sl.key, parseInt(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

