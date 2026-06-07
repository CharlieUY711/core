"use client";

import React, {
  useRef, useEffect, useState, useCallback, useMemo,
} from "react";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { GeoJsonProperties, MultiPolygon, Polygon } from "geojson";

// ─── Types ────────────────────────────────────────────────────────────────────
export type LayerType = "all" | "origins" | "cono" | "direct" | "expansion";

export interface workspace {
  id: string; name: string; role: string;
  lat: number; lng: number; r: number;
  color: string; layer: string; primary?: boolean;
}

export interface Route {
  from: string; to: string; color: string;
  width: number; speed: number; layer: LayerType;
  glow?: boolean; dashed?: boolean;
}

export interface CoreGlobeProps {
  routes?: Route[]; hubs?: workspace[];
  highlightCountry?: string;
  activeLayer?: LayerType;
  onHubClick?: (workspace: workspace) => void;
  autoRotate?: boolean;
  className?: string;
}

// ─── Default data ─────────────────────────────────────────────────────────────
export const DEFAULT_HUBS: workspace[] = [
  { id:"uy", name:"Uruguay",          role:"workspace principal · CORE",  lat:-33,   lng:-56,   r:7, color:"#FFFFFF", layer:"cono",     primary:true },
  { id:"ar", name:"Buenos Aires",     role:"Distribución Cono Sur", lat:-34.6, lng:-58.4, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"br", name:"São Paulo",        role:"Distribución Cono Sur", lat:-23.5, lng:-46.6, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"cl", name:"Santiago",         role:"Distribución Cono Sur", lat:-33.4, lng:-70.7, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"py", name:"Asunción",         role:"Distribución Cono Sur", lat:-25.3, lng:-57.6, r:3, color:"#4A90E8", layer:"cono"      },
  { id:"cn", name:"Shanghai",         role:"Origen · China",        lat:31.2,  lng:121.5, r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"sg", name:"Singapur",         role:"Origen · Asia SE",      lat:1.3,   lng:103.8, r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"in", name:"Mumbai",           role:"Origen · India",        lat:19.1,  lng:72.9,  r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"tr", name:"Turquía",          role:"Origen especial",       lat:39.9,  lng:32.9,  r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"nl", name:"Rotterdam",        role:"Origen · Europa",       lat:51.9,  lng:4.5,   r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"es", name:"Barcelona",        role:"Origen · España",       lat:41.4,  lng:2.2,   r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"us", name:"Nueva York",       role:"Origen · EE.UU.",       lat:40.7,  lng:-74,   r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"mx", name:"Ciudad de México", role:"Expansión 2029",        lat:19.4,  lng:-99.1, r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"pe", name:"Lima",             role:"Expansión 2027",        lat:-12,   lng:-77,   r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"co", name:"Bogotá",           role:"Expansión 2028",        lat:4.7,   lng:-74.1, r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"bo", name:"Santa Cruz",       role:"Expansión 2027",        lat:-17.8, lng:-63.2, r:3, color:"#5A5A5A", layer:"expansion" },
];

export const DEFAULT_ROUTES: Route[] = [
  { from:"cn", to:"uy", color:"#FFFFFF", width:1.5, speed:0.004,  layer:"origins",   glow:true   },
  { from:"nl", to:"uy", color:"#FFFFFF", width:1.5, speed:0.0035, layer:"origins",   glow:true   },
  { from:"us", to:"uy", color:"#FFFFFF", width:1.5, speed:0.005,  layer:"origins",   glow:true   },
  { from:"es", to:"uy", color:"#FFFFFF", width:1.2, speed:0.0038, layer:"origins",   glow:true   },
  { from:"sg", to:"uy", color:"#9B9B9B", width:1.0, speed:0.003,  layer:"origins"               },
  { from:"in", to:"uy", color:"#9B9B9B", width:1.0, speed:0.003,  layer:"origins"               },
  { from:"tr", to:"uy", color:"#9B9B9B", width:0.9, speed:0.0033, layer:"origins"               },
  { from:"uy", to:"ar", color:"#4A90E8", width:1.4, speed:0.007,  layer:"cono"                  },
  { from:"uy", to:"br", color:"#4A90E8", width:1.4, speed:0.006,  layer:"cono"                  },
  { from:"uy", to:"cl", color:"#4A90E8", width:1.2, speed:0.007,  layer:"cono"                  },
  { from:"uy", to:"py", color:"#4A90E8", width:1.0, speed:0.008,  layer:"cono"                  },
  { from:"cn", to:"br", color:"#FFFFFF", width:1.8, speed:0.0045, layer:"direct",    glow:true   },
  { from:"us", to:"ar", color:"#FFFFFF", width:1.6, speed:0.005,  layer:"direct",    glow:true   },
  { from:"nl", to:"cl", color:"#FFFFFF", width:1.5, speed:0.0042, layer:"direct",    glow:true   },
  { from:"uy", to:"pe", color:"#5A5A5A", width:1.0, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"co", color:"#5A5A5A", width:1.0, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"mx", color:"#5A5A5A", width:1.0, speed:0.004,  layer:"expansion", dashed:true },
  { from:"uy", to:"bo", color:"#5A5A5A", width:0.8, speed:0.006,  layer:"expansion", dashed:true },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────
const toRad = (d: number) => (d * Math.PI) / 180;

interface Pt { sx: number; sy: number; z: number; vis: boolean; }

function project(lat: number, lng: number, rX: number, rY: number, cx: number, cy: number, R: number): Pt {
  const phi = toRad(lat), theta = toRad(lng);
  let x = Math.cos(phi) * Math.cos(theta);
  let y = Math.sin(phi);
  let z = Math.cos(phi) * Math.sin(theta);
  const cY = Math.cos(rY), sY = Math.sin(rY);
  const x2 = x * cY - z * sY, z2 = x * sY + z * cY;
  const cX = Math.cos(rX), sX = Math.sin(rX);
  const y2 = y * cX - z2 * sX, z3 = y * sX + z2 * cX;
  return { sx: cx + x2 * R, sy: cy - y2 * R, z: z3, vis: z3 > -0.15 };
}

function arcPoints(la1: number, lo1: number, la2: number, lo2: number, n = 56) {
  const xyz = (la: number, lo: number) => [
    Math.cos(toRad(la)) * Math.cos(toRad(lo)),
    Math.sin(toRad(la)),
    Math.cos(toRad(la)) * Math.sin(toRad(lo)),
  ];
  const p1 = xyz(la1, lo1), p2 = xyz(la2, lo2);
  const pts: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = p1.map((v1, j) => v1 * (1 - t) + p2[j] * t);
    const l = Math.hypot(...v);
    pts.push({ lat: (Math.asin(v[1] / l) * 180) / Math.PI, lng: (Math.atan2(v[2], v[0]) * 180) / Math.PI });
  }
  return pts;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CoreGlobe({
  routes: rProp, hubs: hProp,
  highlightCountry, activeLayer: alProp = "all",
  onHubClick, autoRotate = true, className = "",
}: CoreGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const rotRef    = useRef({ x: -0.5, y: 0.978, vx: 0, vy: 0.0012 });
  const dragRef   = useRef({ active: false, lastX: 0, lastY: 0 });
  const hoverRef  = useRef<workspace | null>(null);
  const layerRef  = useRef<LayerType>(alProp);
  const offRef    = useRef<Map<string, number>>(new Map());
  const geoRef    = useRef<Array<Array<Array<[number, number]>>>>([]);

  const hubs   = hProp  ?? DEFAULT_HUBS;
  const routes = rProp  ?? DEFAULT_ROUTES;

  useEffect(() => { layerRef.current = alProp; }, [alProp]);

  // Geolocation: center on user country on load
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      rotRef.current.y = -lng * Math.PI / 180;
      rotRef.current.x = lat * Math.PI / 180 * 0.4;
    });
  }, []);

  const hubMap = useMemo(() => new Map(hubs.map(h => [h.id, h])), [hubs]);

  const [tooltip, setTooltip] = useState<{ workspace: workspace; x: number; y: number } | null>(null);

  // load world geo
  useEffect(() => {
    fetch("/world-110m.json")
      .then(r => r.json())
      .then((topo: Topology) => {
        const countries = topojson.feature(
          topo,
          topo.objects.countries as GeometryCollection<GeoJsonProperties>
        );
        const polys: Array<Array<Array<[number, number]>>> = [];
        for (const feat of (countries as any).features) {
          const g = feat.geometry;
          if (!g) continue;
          if (g.type === "Polygon") polys.push(g.coordinates);
          else if (g.type === "MultiPolygon") g.coordinates.forEach((c: any) => polys.push(c));
        }
        geoRef.current = polys;
      });
  }, []);

  // init routes offsets
  useEffect(() => {
    routes.forEach(r => {
      const k = `${r.from}-${r.to}`;
      if (!offRef.current.has(k)) offRef.current.set(k, Math.random());
    });
  }, [routes]);

  // main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, R = 0, cx = 0, cy = 0;

    function resize() {
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      W = rect.width; H = Math.round(W * 0.62);
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      wrap.style.height  = H + "px";
      ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
      R = Math.min(W, H) * 0.38; cx = W / 2; cy = H / 2;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function drawLand() {
      const { x: rX, y: rY } = rotRef.current;
      ctx.fillStyle   = "#1C2333";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth   = 0.3;

      for (const poly of geoRef.current) {
        for (const ring of poly) {
          let started = false;
          ctx.beginPath();
          for (const [lng, lat] of ring) {
            const p = project(lat, lng, rX, rY, cx, cy, R);
            if (!p.vis) { started = false; continue; }
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    function drawGraticule() {
      const { x: rX, y: rY } = rotRef.current;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth   = 0.4;
      function drawSegs(pts: Pt[]) {
        if (pts.length < 2) return;
        ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 30) {
        const pts: Pt[] = []; let cur: Pt[] = [];
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = project(lat, lng, rX, rY, cx, cy, R);
          if (p.vis) cur.push(p); else if (cur.length) { drawSegs(cur); cur = []; }
        }
        if (cur.length) drawSegs(cur);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        let cur: Pt[] = [];
        for (let lng2 = -180; lng2 <= 180; lng2 += 5) {
          const p = project(lat, lng2, rX, rY, cx, cy, R);
          if (p.vis) cur.push(p); else if (cur.length) { drawSegs(cur); cur = []; }
        }
        if (cur.length) drawSegs(cur);
      }
    }

    function drawRoute(route: Route) {
      const h1 = hubMap.get(route.from), h2 = hubMap.get(route.to);
      if (!h1 || !h2) return;
      const { x: rX, y: rY } = rotRef.current;
      const key = `${route.from}-${route.to}`;
      const off = offRef.current.get(key) ?? 0;
      const pts = arcPoints(h1.lat, h1.lng, h2.lat, h2.lng);
      const segs: Pt[][] = []; let cur: Pt[] = [];
      for (const pt of pts) {
        const p = project(pt.lat, pt.lng, rX, rY, cx, cy, R);
        if (p.vis) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; }
      }
      if (cur.length) segs.push(cur);
      segs.forEach(seg => {
        if (seg.length < 2) return;
        function stroke() {
          ctx.beginPath(); ctx.moveTo(seg[0].sx, seg[0].sy);
          for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].sx, seg[i].sy);
          ctx.stroke();
        }
        if (route.glow) {
          ctx.save(); ctx.shadowColor = route.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = route.color + "44"; ctx.lineWidth = route.width * 2.8;
          stroke(); ctx.restore();
        }
        ctx.save();
        ctx.strokeStyle = route.color; ctx.lineWidth = route.width; ctx.globalAlpha = 0.75;
        if (route.dashed) { ctx.setLineDash([6,5]); ctx.lineDashOffset = -off * 80; }
        else ctx.setLineDash([]);
        stroke(); ctx.restore();
        if (!route.dashed && seg.length > 4) {
          const dot = seg[Math.floor(off * seg.length) % seg.length];
          ctx.save(); ctx.shadowColor = route.color; ctx.shadowBlur = 14;
          ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.92;
          ctx.beginPath(); ctx.arc(dot.sx, dot.sy, 2.4, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      });
    }

    function drawHub(workspace: workspace, t: number) {
      const { x: rX, y: rY } = rotRef.current;
      const p = project(workspace.lat, workspace.lng, rX, rY, cx, cy, R);
      if (!p.vis) return;
      const hovered     = hoverRef.current?.id === workspace.id;
      const highlighted = highlightCountry === workspace.id;
      const r = workspace.r * (hovered || highlighted ? 1.4 : 1);
      if (workspace.primary || highlighted) {
        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.8 + i * 0.33) % 1;
          ctx.save(); ctx.strokeStyle = workspace.color; ctx.lineWidth = 0.8;
          ctx.globalAlpha = (1 - phase) * 0.5;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, (r+4)+phase*24, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.shadowColor = workspace.primary ? "rgba(255,255,255,0.6)" : workspace.color;
      ctx.shadowBlur = hovered ? 20 : 10;
      ctx.strokeStyle = workspace.primary ? "rgba(255,255,255,0.4)" : workspace.color;
      ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r+3, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = workspace.primary ? "#FFFFFF" : workspace.color;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI*2); ctx.fill();
      if (workspace.primary) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r*0.45, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      if (workspace.primary || hovered || highlighted) {
        ctx.save();
        ctx.font = `${workspace.primary?400:300} ${workspace.primary?11:10}px -apple-system,sans-serif`;
        ctx.fillStyle = workspace.primary ? "#FFFFFF" : workspace.color;
        ctx.globalAlpha = 0.9; ctx.textAlign = "left";
        ctx.fillText(workspace.name, p.sx+r+6, p.sy+4);
        if (workspace.primary) {
          ctx.font = "400 9px -apple-system,sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.letterSpacing = "0.08em";
          ctx.fillText("workspace · CORE", p.sx+r+6, p.sy+16);
        }
        ctx.restore();
      }
    }

    function frame(ts: number) {
      const t = ts / 1000;
      ctx.clearRect(0, 0, W, H);
      // background
      const bg = ctx.createRadialGradient(cx,cy,R*0.3,cx,cy,R*1.6);
      bg.addColorStop(0,"#0D1018"); bg.addColorStop(0.5,"#080B10"); bg.addColorStop(1,"#040508");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      // stars
      for (let i = 0; i < 140; i++) {
        const sx = ((Math.sin(i*137.5+1)*0.5+0.5)*W)|0;
        const sy = ((Math.cos(i*137.5+7)*0.5+0.5)*H)|0;
        const sr = Math.sin(i*0.7)*0.4+0.5;
        ctx.globalAlpha = 0.12+sr*0.35; ctx.fillStyle = "#FFF";
        ctx.beginPath(); ctx.arc(sx,sy,sr*0.85,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // globe glow ring
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
      ctx.restore();
      // clip
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
      // ocean
      const fill = ctx.createRadialGradient(cx-R*0.25,cy-R*0.2,0,cx,cy,R);
      fill.addColorStop(0,"#151B28"); fill.addColorStop(0.5,"#0E1320"); fill.addColorStop(1,"#080C14");
      ctx.fillStyle = fill; ctx.fillRect(cx-R,cy-R,R*2,R*2);
      // land
      drawLand();
      drawGraticule();
      // routes
      const active = layerRef.current;
      routes.forEach(r => {
        if (active !== "all" && active !== r.layer) return;
        const k = `${r.from}-${r.to}`;
        offRef.current.set(k, ((offRef.current.get(k)??0) + r.speed) % 1);
        drawRoute(r);
      });
      ctx.restore();
      // hubs
      hubs.forEach(h => {
        if (active !== "all" && active !== h.layer && !h.primary) return;
        drawHub(h, t);
      });
      // inertia
      const rot = rotRef.current;
      if (!dragRef.current.active) {
        rot.y += rot.vy; rot.x += rot.vx * 0.3;
        rot.vy *= 0.95; rot.vx *= 0.92;
        if (autoRotate && Math.abs(rot.vy) < 0.0003) rot.vy = 0.0012;
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHubAt = useCallback((clientX: number, clientY: number): workspace | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const R = Math.min(W,H)*0.38, cx = W/2, cy = H/2;
    const { x:rX, y:rY } = rotRef.current;
    for (const h of hubs) {
      const p = project(h.lat,h.lng,rX,rY,cx,cy,R);
      if (!p.vis) continue;
      if (Math.hypot(clientX-rect.left-p.sx, clientY-rect.top-p.sy) < h.r*2.5+5) return h;
    }
    return null;
  }, [hubs]);

  const onMouseDown  = useCallback((e: React.MouseEvent) => { dragRef.current = {active:true,lastX:e.clientX,lastY:e.clientY}; rotRef.current.vx=0; rotRef.current.vy=0; }, []);
  const onMouseUp    = useCallback((e: React.MouseEvent) => { dragRef.current.active=false; const workspace=getHubAt(e.clientX,e.clientY); if(workspace&&onHubClick) onHubClick(workspace); }, [getHubAt,onHubClick]);
  const onMouseLeave = useCallback(() => { dragRef.current.active=false; hoverRef.current=null; setTooltip(null); }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const dx=e.clientX-dragRef.current.lastX, dy=e.clientY-dragRef.current.lastY;
      rotRef.current.vy=dx*0.008; rotRef.current.vx=dy*0.008;
      rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx;
      dragRef.current.lastX=e.clientX; dragRef.current.lastY=e.clientY;
    }
    const workspace = getHubAt(e.clientX,e.clientY);
    hoverRef.current = workspace;
    if (workspace) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const R=Math.min(rect.width,rect.height)*0.38;
      const p=project(workspace.lat,workspace.lng,rotRef.current.x,rotRef.current.y,rect.width/2,rect.height/2,R);
      setTooltip({workspace,x:p.sx+workspace.r+8,y:p.sy-14});
    } else setTooltip(null);
  }, [getHubAt]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; dragRef.current={active:true,lastX:t.clientX,lastY:t.clientY}; rotRef.current.vx=0; rotRef.current.vy=0; }, []);
  const onTouchEnd   = useCallback(() => { dragRef.current.active=false; }, []);
  const onTouchMove  = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; const dx=t.clientX-dragRef.current.lastX,dy=t.clientY-dragRef.current.lastY; rotRef.current.vy=dx*0.008; rotRef.current.vx=dy*0.008; rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx; dragRef.current.lastX=t.clientX; dragRef.current.lastY=t.clientY; }, []);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden select-none ${className}`} style={{background:"#0A0A0A"}}>
      <canvas ref={canvasRef} style={{display:"block",width:"100%",cursor:"grab"}}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      />
      {tooltip && (
        <div className="pointer-events-none absolute z-10 px-3 py-2 text-xs"
          style={{left:tooltip.x,top:tooltip.y,background:"rgba(10,10,10,0.95)",border:"0.5px solid rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",maxWidth:180}}>
          <p className="mb-0.5 font-medium" style={{color:"#FFFFFF"}}>{tooltip.workspace.name}</p>
          <p style={{color:"rgba(255,255,255,0.4)"}}>{tooltip.workspace.role}</p>
        </div>
      )}
    </div>
  );
}

export function CoreGlobeStatic({ className="" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{background:"#07101F",aspectRatio:"1/0.62"}}>
      <svg viewBox="0 0 400 248" className="w-full h-full" aria-label="CORE Globe">
        <circle cx="200" cy="124" r="100" fill="#0D1B38"/>
        <circle cx="200" cy="124" r="100" fill="none" stroke="#00E5FF" strokeWidth="1.2" strokeOpacity="0.25"/>
        <path d="M130 50 Q160 80 185 120" fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6"/>
        <path d="M280 60 Q250 85 205 118" fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6"/>
        <path d="M200 122 Q180 145 150 160" fill="none" stroke="#0EA5E9" strokeWidth="1.2" strokeOpacity="0.6"/>
        <circle cx="200" cy="122" r="18" fill="none" stroke="#F5C26B" strokeWidth="0.8" strokeOpacity="0.3"/>
        <circle cx="200" cy="122" r="5" fill="#FFF"/>
        <circle cx="200" cy="122" r="2.5" fill="#F5C26B"/>
        <text x="210" y="119" fontSize="9" fill="#F5C26B" fontFamily="sans-serif" fontWeight="500">Uruguay</text>
      </svg>
    </div>
  );
}

export default CoreGlobe;

