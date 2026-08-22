import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "../engine/useEditorStore";
import { buildCSSFilter } from "../engine/filters";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRender?: () => void;
}

type Zone = "center"|"corner-tl"|"corner-tr"|"corner-bl"|"corner-br"|"side-l"|"side-r"|"side-t"|"side-b"|null;

// Resoluciones por aspecto ratio
const RESOLUTIONS: Record<string, [number,number]> = {
  "1:1":   [1200,1200],
  "4:5":   [1080,1350],
  "16:9":  [1920,1080],
  "9:16":  [1080,1920],
  "3:2":   [1200,800],
  "circle":[1200,1200],
  "default":[1200,1200],
};

const MARGIN = 0.05; // 5%

function getZone(x: number, y: number, w: number, h: number): Zone {
  const e = 0.15, fx = x/w, fy = y/h;
  const cx = fx < e || fx > 1-e, cy = fy < e || fy > 1-e;
  if (cx && cy) {
    if (fx < 0.5 && fy < 0.5) return "corner-tl";
    if (fx > 0.5 && fy < 0.5) return "corner-tr";
    if (fx < 0.5 && fy > 0.5) return "corner-bl";
    return "corner-br";
  }
  if (fx < e) return "side-l"; if (fx > 1-e) return "side-r";
  if (fy < e) return "side-t"; if (fy > 1-e) return "side-b";
  return "center";
}

const CURSORS: Record<string,string> = {
  "center":"move","corner-tl":"nw-resize","corner-tr":"ne-resize",
  "corner-bl":"sw-resize","corner-br":"se-resize",
  "side-l":"ew-resize","side-r":"ew-resize","side-t":"ns-resize","side-b":"ns-resize"
};

const LABELS: Record<string,string> = {
  "center":"✥ Mover","corner-tl":"⤡ Escalar","corner-tr":"⤡ Escalar",
  "corner-bl":"⤡ Escalar","corner-br":"⤡ Escalar",
  "side-l":"↔ Ancho","side-r":"↔ Ancho","side-t":"↕ Alto","side-b":"↕ Alto"
};

export default function EditCanvas({ canvasRef, onRender }: Props) {
  const store   = useEditorStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number | null>(null);
  const [zone, setZone]     = useState<Zone>(null);
  const [tipPos, setTipPos] = useState({ x:0, y:0 });
  const isDragging = useRef(false);
  const dragStart  = useRef({ x:0, y:0 });

  const render = useCallback(() => {
    const src = store.src;
    const c   = canvasRef.current;
    const w   = wrapRef.current;
    if (!src || !c || !w) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {

      // Resolución de exportación según aspecto
      const key = store.aspectRatio || "default";
      const [outW, outH] = RESOLUTIONS[key] || RESOLUTIONS.default;

      // Área útil con margen 5%
      const usableW = Math.round(outW * (1 - MARGIN * 2));
      const usableH = Math.round(outH * (1 - MARGIN * 2));

      // Escalar imagen para caber en área útil manteniendo proporción
      const imgAspect = src.width / src.height;
      let drawW: number, drawH: number;
      if (imgAspect > usableW / usableH) {
        drawW = usableW; drawH = Math.round(usableW / imgAspect);
      } else {
        drawH = usableH; drawW = Math.round(usableH * imgAspect);
      }

      // Aplicar scaleX/scaleY del usuario
      drawW = Math.round(drawW * store.scaleX);
      drawH = Math.round(drawH * store.scaleY);

      // Canvas de preview — escalado al contenedor
      const maxW = w.clientWidth - 24, maxH = w.clientHeight - 24;
      const previewScale = Math.min(maxW / outW, maxH / outH, 1) * store.zoom;
      c.width  = Math.round(outW * previewScale);
      c.height = Math.round(outH * previewScale);

      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);

      // Fondo
      const bg = store.bgColor && store.bgColor !== "transparent" ? store.bgColor : "#FFFFFF";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, c.width, c.height);

      // Marco guía (borde del margen 5%)
      ctx.strokeStyle = "color-mix(in srgb, var(--brand-madre) 20%, transparent)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const mx = c.width * MARGIN, my = c.height * MARGIN;
      ctx.strokeRect(mx, my, c.width - mx*2, c.height - my*2);
      ctx.setLineDash([]);

      // Clip circular
      if (store.aspectRatio === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c.width/2, c.height/2, c.width/2 - mx, c.height/2 - my, 0, 0, Math.PI*2);
        ctx.clip();
      }

      // Dibujar imagen con rotación y filtros
      const r = store.fineRotation * Math.PI / 180;
      const cx2 = c.width/2 + store.offsetX * previewScale;
      const cy2 = c.height/2 + store.offsetY * previewScale;
      const dw = drawW * previewScale;
      const dh = drawH * previewScale;

      ctx.save();
      ctx.translate(cx2, cy2);
      if (store.flipH) ctx.scale(-1, 1);
      if (store.flipV) ctx.scale(1, -1);
      ctx.rotate(store.rotation * Math.PI / 180 + r);
      ctx.filter = buildCSSFilter(store);
      ctx.drawImage(src, -dw/2, -dh/2, dw, dh);
      ctx.restore();
      if (store.aspectRatio === "circle") ctx.restore();


      if (store.activeTool === "select-circ") {
        ctx.strokeStyle="var(--brand-madre)"; ctx.lineWidth=1.5; ctx.setLineDash([5,3]);
        ctx.beginPath();
        ctx.ellipse(c.width/2, c.height/2, c.width*0.35, c.height*0.35, 0, 0, Math.PI*2);
        ctx.stroke(); ctx.setLineDash([]);
      }

      // Dimensiones en esquina
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(c.width - 80, c.height - 18, 78, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "9px monospace";
      ctx.fillText(`${outW}×${outH}px`, c.width - 76, c.height - 7);

      if (onRender) onRender();
    });
  }, [store, zone, canvasRef, onRender]);

  useEffect(() => { render(); }, [
    store.src, store.brightness, store.contrast, store.exposure,
    store.saturation, store.temperature, store.tint, store.sharpness,
    store.blur, store.rotation, store.fineRotation,
    store.flipH, store.flipV, store.zoom, store.scaleX, store.scaleY,
    store.offsetX, store.offsetY, store.bgColor, store.aspectRatio,
    store.activeTool, zone, render
  ]);

  const getCanvasPos = (e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX-rect.left, y: e.clientY-rect.top, w: rect.width, h: rect.height };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src) return;
    const pos = getCanvasPos(e);
    if (!pos || pos.x<0||pos.y<0||pos.x>pos.w||pos.y>pos.h) {
      if (!isDragging.current) setZone(null); return;
    }
    const z = getZone(pos.x, pos.y, pos.w, pos.h);
    if (!isDragging.current) { setZone(z); setTipPos({x:pos.x+14,y:pos.y-22}); }

    if (isDragging.current && zone) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const S = 0.008;
      if (zone==="center") {
        store.set("offsetX", store.offsetX + dx);
        store.set("offsetY", store.offsetY + dy);
      } else if (zone?.startsWith("corner")) {
        const d = (Math.abs(dx)>Math.abs(dy)?dx:dy)*S;
        store.set("scaleX", Math.max(0.1, store.scaleX+d));
        store.set("scaleY", Math.max(0.1, store.scaleY+d));
      } else if (zone==="side-l"||zone==="side-r") {
        store.set("scaleX", Math.max(0.1, store.scaleX + dx*(zone==="side-r"?1:-1)*S*2));
      } else if (zone==="side-t"||zone==="side-b") {
        store.set("scaleY", Math.max(0.1, store.scaleY + dy*(zone==="side-b"?1:-1)*S*2));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src||!zone) return;
    isDragging.current=true;
    dragStart.current={x:e.clientX,y:e.clientY};
  };

  const handleMouseUp = () => {
    if (isDragging.current) { isDragging.current=false; store.saveHistory("Transformación"); }
  };

  const cursor = store.src && zone ? (CURSORS[zone]||"crosshair") : store.activeTool ? "crosshair" : "default";

  return (
    <div ref={wrapRef}
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"12px", position:"relative", cursor, userSelect:"none" }}
      onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp} onMouseLeave={() => { setZone(null); isDragging.current=false; }}
    >
      <canvas ref={canvasRef}
        style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:"4px",
          display: store.src ? "block" : "none",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
      />
      {!store.src && (
        <div style={{ color:"#bbb", fontSize:"12px", textAlign:"center", position:"absolute" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>✏️</div>
          Carga una imagen para editar
        </div>
      )}
      {zone && store.src && LABELS[zone] && (
        <div style={{ position:"absolute", left:tipPos.x, top:tipPos.y,
          background:"rgba(0,0,0,.7)", color:"#fff", fontSize:"10px",
          padding:"3px 8px", borderRadius:"4px", pointerEvents:"none", whiteSpace:"nowrap", zIndex:10
        }}>{LABELS[zone]}</div>
      )}
    </div>
  );
}

