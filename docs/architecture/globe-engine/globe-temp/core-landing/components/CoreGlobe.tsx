"use client";

/**
 * CoreGlobe — Componente de globo interactivo para CORE Landing Page
 *
 * Stack: React + TypeScript + Canvas 2D (sin dependencias externas)
 * Inspirado en: referencia visual Firefly/Gemini con Uruguay como hub central
 *
 * Props:
 *   routes          — array de rutas a renderizar
 *   hubs            — array de hubs (ciudades)
 *   highlightCountry — id de hub a resaltar programáticamente
 *   theme           — "dark" | "light" (por defecto: dark)
 *   activeLayer     — filtro de capa activa
 *   onHubClick      — callback al hacer click en un hub
 *   autoRotate      — activar rotación automática (default: true)
 *   className       — clase CSS adicional
 *
 * Uso básico:
 *   import { CoreGlobe } from "@/components/CoreGlobe";
 *   <CoreGlobe highlightCountry="uy" />
 *
 * Uso con props personalizadas:
 *   <CoreGlobe
 *     routes={myRoutes}
 *     hubs={myHubs}
 *     activeLayer="cono"
 *     onHubClick={(hub) => console.log(hub)}
 *   />
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LayerType = "all" | "origins" | "cono" | "direct" | "expansion";

export interface Hub {
  id:      string;
  name:    string;
  role:    string;
  lat:     number;
  lng:     number;
  r:       number;          // radius in logical px
  color:   string;          // hex
  layer:   string;
  primary?: boolean;        // Uruguay flag — special rendering
}

export interface Route {
  from:   string;           // hub id
  to:     string;           // hub id
  color:  string;           // hex
  width:  number;           // stroke width
  speed:  number;           // animation speed (lower = slower)
  layer:  LayerType;
  glow?:  boolean;          // bloom effect
  dashed?: boolean;         // expansion routes
}

export interface CoreGlobeProps {
  routes?:           Route[];
  hubs?:             Hub[];
  highlightCountry?: string;
  theme?:            "dark" | "light";
  activeLayer?:      LayerType;
  onHubClick?:       (hub: Hub) => void;
  autoRotate?:       boolean;
  className?:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_HUBS: Hub[] = [
  // ── Hub principal ─────────────────────────────────────────────────────────
  { id:"uy", name:"Uruguay",           role:"HQ · Hub principal",    lat:-33,   lng:-56,   r:7, color:"#F5C26B", layer:"cono",      primary:true  },
  // ── Cono Sur ─────────────────────────────────────────────────────────────
  { id:"ar", name:"Buenos Aires",      role:"Distribución Cono Sur", lat:-34.6, lng:-58.4, r:4, color:"#0EA5E9", layer:"cono"       },
  { id:"br", name:"São Paulo",         role:"Distribución Cono Sur", lat:-23.5, lng:-46.6, r:4, color:"#0EA5E9", layer:"cono"       },
  { id:"cl", name:"Santiago",          role:"Distribución Cono Sur", lat:-33.4, lng:-70.7, r:4, color:"#0EA5E9", layer:"cono"       },
  { id:"py", name:"Asunción",          role:"Distribución Cono Sur", lat:-25.3, lng:-57.6, r:3, color:"#0EA5E9", layer:"cono"       },
  // ── Orígenes globales ─────────────────────────────────────────────────────
  { id:"cn", name:"Shanghai",          role:"Origen · China",        lat:31.2,  lng:121.5, r:4, color:"#00E5FF", layer:"origins"    },
  { id:"sg", name:"Singapur",          role:"Origen · Asia SE",      lat:1.3,   lng:103.8, r:3, color:"#A78BFA", layer:"origins"    },
  { id:"in", name:"Mumbai",            role:"Origen · India",        lat:19.1,  lng:72.9,  r:3, color:"#A78BFA", layer:"origins"    },
  { id:"tr", name:"Turquía",           role:"Origen especial",       lat:39.9,  lng:32.9,  r:3, color:"#A78BFA", layer:"origins"    },
  { id:"nl", name:"Rotterdam",         role:"Origen · Europa",       lat:51.9,  lng:4.5,   r:4, color:"#00E5FF", layer:"origins"    },
  { id:"es", name:"Barcelona",         role:"Origen · España",       lat:41.4,  lng:2.2,   r:3, color:"#00E5FF", layer:"origins"    },
  { id:"us", name:"Nueva York",        role:"Origen · EE.UU.",       lat:40.7,  lng:-74,   r:4, color:"#00E5FF", layer:"origins"    },
  // ── Expansión ─────────────────────────────────────────────────────────────
  { id:"mx", name:"Ciudad de México",  role:"Expansión 2029",        lat:19.4,  lng:-99.1, r:3, color:"#FF8A4C", layer:"expansion"  },
  { id:"pe", name:"Lima",              role:"Expansión 2027",        lat:-12,   lng:-77,   r:3, color:"#FF8A4C", layer:"expansion"  },
  { id:"co", name:"Bogotá",            role:"Expansión 2028",        lat:4.7,   lng:-74.1, r:3, color:"#FF8A4C", layer:"expansion"  },
  { id:"bo", name:"Santa Cruz",        role:"Expansión 2027",        lat:-17.8, lng:-63.2, r:3, color:"#FF8A4C", layer:"expansion"  },
];

export const DEFAULT_ROUTES: Route[] = [
  // ── Orígenes → Uruguay ───────────────────────────────────────────────────
  { from:"cn", to:"uy", color:"#00E5FF", width:1.8, speed:0.004,  layer:"origins", glow:true  },
  { from:"nl", to:"uy", color:"#00E5FF", width:1.8, speed:0.0035, layer:"origins", glow:true  },
  { from:"us", to:"uy", color:"#00E5FF", width:1.8, speed:0.005,  layer:"origins", glow:true  },
  { from:"es", to:"uy", color:"#00E5FF", width:1.4, speed:0.0038, layer:"origins", glow:true  },
  { from:"sg", to:"uy", color:"#A78BFA", width:1.4, speed:0.003,  layer:"origins"             },
  { from:"in", to:"uy", color:"#A78BFA", width:1.4, speed:0.003,  layer:"origins"             },
  { from:"tr", to:"uy", color:"#A78BFA", width:1.2, speed:0.0033, layer:"origins"             },
  // ── Distribución Cono Sur ────────────────────────────────────────────────
  { from:"uy", to:"ar", color:"#0EA5E9", width:1.5, speed:0.007,  layer:"cono"               },
  { from:"uy", to:"br", color:"#0EA5E9", width:1.5, speed:0.006,  layer:"cono"               },
  { from:"uy", to:"cl", color:"#0EA5E9", width:1.4, speed:0.007,  layer:"cono"               },
  { from:"uy", to:"py", color:"#0EA5E9", width:1.2, speed:0.008,  layer:"cono"               },
  // ── Direct Shipments ─────────────────────────────────────────────────────
  { from:"cn", to:"br", color:"#F5C26B", width:2.2, speed:0.0045, layer:"direct", glow:true  },
  { from:"us", to:"ar", color:"#F5C26B", width:2.0, speed:0.005,  layer:"direct", glow:true  },
  { from:"nl", to:"cl", color:"#F5C26B", width:1.8, speed:0.0042, layer:"direct", glow:true  },
  // ── Expansión (dashed) ───────────────────────────────────────────────────
  { from:"uy", to:"pe", color:"#FF8A4C", width:1.2, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"co", color:"#FF8A4C", width:1.2, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"mx", color:"#FF8A4C", width:1.2, speed:0.004,  layer:"expansion", dashed:true },
  { from:"uy", to:"bo", color:"#FF8A4C", width:1.0, speed:0.006,  layer:"expansion", dashed:true },
];

// ─────────────────────────────────────────────────────────────────────────────
// PURE MATH HELPERS (no React)
// ─────────────────────────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;

interface ProjectedPoint {
  sx:  number;  // screen x
  sy:  number;  // screen y
  z:   number;  // depth (positive = facing camera)
  vis: boolean; // above the horizon
}

function project(
  lat: number, lng: number,
  rotX: number, rotY: number,
  cx: number, cy: number, R: number
): ProjectedPoint {
  const phi   = toRad(lat);
  const theta = toRad(lng);
  let x = Math.cos(phi) * Math.cos(theta);
  let y = Math.sin(phi);
  let z = Math.cos(phi) * Math.sin(theta);
  // rotate Y
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x2   = x * cosY - z * sinY;
  const z2   = x * sinY + z * cosY;
  // rotate X
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2   = y * cosX  - z2 * sinX;
  const z3   = y * sinX  + z2 * cosX;
  return { sx: cx + x2 * R, sy: cy - y2 * R, z: z3, vis: z3 > -0.15 };
}

function arcPoints(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  n = 56
): Array<{ lat: number; lng: number }> {
  const toXYZ = (lat: number, lng: number) => [
    Math.cos(toRad(lat)) * Math.cos(toRad(lng)),
    Math.sin(toRad(lat)),
    Math.cos(toRad(lat)) * Math.sin(toRad(lng)),
  ];
  const p1 = toXYZ(lat1, lng1);
  const p2 = toXYZ(lat2, lng2);
  const pts: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= n; i++) {
    const t  = i / n;
    const v  = p1.map((v1, j) => v1 * (1 - t) + p2[j] * t);
    const len = Math.hypot(...v);
    pts.push({
      lat: (Math.asin(v[1] / len) * 180) / Math.PI,
      lng: (Math.atan2(v[2], v[0]) * 180) / Math.PI,
    });
  }
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function CoreGlobe({
  routes:           routesProp,
  hubs:             hubsProp,
  highlightCountry,
  theme             = "dark",
  activeLayer:      activeLayerProp = "all",
  onHubClick,
  autoRotate        = true,
  className         = "",
}: CoreGlobeProps) {

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);

  // mutable refs (avoid re-renders on animation values)
  const rotRef    = useRef({ x: 0.3, y: -1.05, vx: 0, vy: 0.0012 });
  const dragRef   = useRef({ active: false, lastX: 0, lastY: 0 });
  const hoverRef  = useRef<Hub | null>(null);
  const layerRef  = useRef<LayerType>(activeLayerProp);
  const routeOffRef = useRef<Map<string, number>>(new Map());

  const hubs   = hubsProp   ?? DEFAULT_HUBS;
  const routes = routesProp ?? DEFAULT_ROUTES;

  // sync prop → ref without re-render
  useEffect(() => { layerRef.current = activeLayerProp; }, [activeLayerProp]);

  // initialise per-route offsets once
  useEffect(() => {
    routes.forEach((r) => {
      const key = `${r.from}-${r.to}`;
      if (!routeOffRef.current.has(key)) {
        routeOffRef.current.set(key, Math.random());
      }
    });
  }, [routes]);

  const hubMap = useMemo(
    () => new Map(hubs.map((h) => [h.id, h])),
    [hubs]
  );

  const [tooltip, setTooltip] = useState<{ hub: Hub; x: number; y: number } | null>(null);

  // ── canvas setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, R = 0, cx = 0, cy = 0;

    function resize() {
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = Math.round(W * 0.62);
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      wrap.style.height   = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      R  = Math.min(W, H) * 0.38;
      cx = W / 2;
      cy = H / 2;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── draw helpers ──────────────────────────────────────────────────────
    function drawLine(pts: ProjectedPoint[]) {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
      ctx.stroke();
    }

    function drawGraticule() {
      ctx.strokeStyle = "rgba(0,160,220,0.07)";
      ctx.lineWidth = 0.5;
      const { x: rotX, y: rotY } = rotRef.current;
      for (let lng = -180; lng < 180; lng += 30) {
        const pts: ProjectedPoint[] = [];
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = project(lat, lng, rotX, rotY, cx, cy, R);
          if (p.vis) pts.push(p);
          else if (pts.length) { drawLine(pts); pts.length = 0; }
        }
        if (pts.length) drawLine(pts);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const pts: ProjectedPoint[] = [];
        for (let lng2 = -180; lng2 <= 180; lng2 += 5) {
          const p = project(lat, lng2, rotX, rotY, cx, cy, R);
          if (p.vis) pts.push(p);
          else if (pts.length) { drawLine(pts); pts.length = 0; }
        }
        if (pts.length) drawLine(pts);
      }
    }

    function drawRoute(route: Route) {
      const h1 = hubMap.get(route.from);
      const h2 = hubMap.get(route.to);
      if (!h1 || !h2) return;

      const key = `${route.from}-${route.to}`;
      const off = routeOffRef.current.get(key) ?? 0;
      const pts = arcPoints(h1.lat, h1.lng, h2.lat, h2.lng);
      const { x: rotX, y: rotY } = rotRef.current;

      // segment visible points
      const segs: ProjectedPoint[][] = [];
      let cur: ProjectedPoint[] = [];
      for (const pt of pts) {
        const p = project(pt.lat, pt.lng, rotX, rotY, cx, cy, R);
        if (p.vis) { cur.push(p); }
        else if (cur.length) { segs.push(cur); cur = []; }
      }
      if (cur.length) segs.push(cur);

      segs.forEach((seg) => {
        if (seg.length < 2) return;

        // glow pass
        if (route.glow) {
          ctx.save();
          ctx.shadowColor = route.color;
          ctx.shadowBlur  = 10;
          ctx.strokeStyle = route.color + "44";
          ctx.lineWidth   = route.width * 2.8;
          drawLine(seg);
          ctx.restore();
        }

        // main stroke
        ctx.save();
        ctx.strokeStyle = route.color;
        ctx.lineWidth   = route.width;
        ctx.globalAlpha = 0.75;
        if (route.dashed) {
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -(off) * 80;
        } else {
          ctx.setLineDash([]);
        }
        drawLine(seg);
        ctx.restore();

        // moving dot
        if (!route.dashed && seg.length > 4) {
          const idx = Math.floor(off * seg.length) % seg.length;
          const dot = seg[idx];
          ctx.save();
          ctx.shadowColor = route.color;
          ctx.shadowBlur  = 14;
          ctx.fillStyle   = "#fff";
          ctx.globalAlpha = 0.92;
          ctx.beginPath();
          ctx.arc(dot.sx, dot.sy, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    function drawHub(hub: Hub, nowSec: number) {
      const { x: rotX, y: rotY } = rotRef.current;
      const p = project(hub.lat, hub.lng, rotX, rotY, cx, cy, R);
      if (!p.vis) return;

      const hovered = hoverRef.current?.id === hub.id;
      const highlighted = highlightCountry === hub.id;
      const scale = hovered || highlighted ? 1.4 : 1;
      const r = hub.r * scale;

      // pulse rings for primary hub or highlighted
      if (hub.primary || highlighted) {
        for (let i = 0; i < 3; i++) {
          const phase = (nowSec * 0.8 + i * 0.33) % 1;
          const pr    = (r + 4) + phase * 24;
          const alpha = (1 - phase) * 0.5;
          ctx.save();
          ctx.strokeStyle = hub.color;
          ctx.lineWidth   = 0.8;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // outer ring
      ctx.save();
      ctx.shadowColor = hub.color;
      ctx.shadowBlur  = hovered ? 22 : 12;
      ctx.strokeStyle = hub.color;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r + 3, 0, Math.PI * 2);
      ctx.stroke();

      // fill
      ctx.globalAlpha = 1;
      ctx.fillStyle = hub.primary ? "#FFFFFF" : hub.color;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();

      // inner dot for primary
      if (hub.primary) {
        ctx.fillStyle = "#F5C26B";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // label
      if (hub.primary || hovered || highlighted) {
        ctx.save();
        ctx.font        = `${hub.primary ? 500 : 400} ${hub.primary ? 12 : 11}px -apple-system, sans-serif`;
        ctx.fillStyle   = hub.color;
        ctx.globalAlpha = 0.95;
        ctx.textAlign   = "left";
        ctx.fillText(hub.name, p.sx + r + 6, p.sy + 4);
        if (hub.primary) {
          ctx.font      = "400 9px -apple-system, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.fillText("COMMERCIAL HUB", p.sx + r + 6, p.sy + 16);
        }
        ctx.restore();
      }
    }

    // ── main loop ─────────────────────────────────────────────────────────
    function frame(ts: number) {
      const nowSec = ts / 1000;

      ctx.clearRect(0, 0, W, H);

      // background
      const bg = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.6);
      bg.addColorStop(0,   "#0D1B38");
      bg.addColorStop(0.5, "#070F1E");
      bg.addColorStop(1,   "#030810");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // stars (deterministic)
      for (let i = 0; i < 140; i++) {
        const sx = ((Math.sin(i * 137.5 + 1) * 0.5 + 0.5) * W) | 0;
        const sy = ((Math.cos(i * 137.5 + 7) * 0.5 + 0.5) * H) | 0;
        const sr = (Math.sin(i * 0.7) * 0.4 + 0.5);
        ctx.globalAlpha = 0.12 + sr * 0.35;
        ctx.fillStyle   = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(sx, sy, sr * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // globe glow ring
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,0.28)";
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.lineWidth   = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // clip to globe
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // globe fill
      const fill = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.2, 0, cx, cy, R);
      fill.addColorStop(0,   "#122554");
      fill.addColorStop(0.5, "#0D1B38");
      fill.addColorStop(1,   "#07101E");
      ctx.fillStyle = fill;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      drawGraticule();

      // advance + draw routes
      const active = layerRef.current;
      routes.forEach((r) => {
        if (active !== "all" && active !== r.layer) return;
        const key = `${r.from}-${r.to}`;
        const cur = routeOffRef.current.get(key) ?? 0;
        routeOffRef.current.set(key, (cur + r.speed) % 1);
        drawRoute(r);
      });

      ctx.restore();

      // hubs (outside clip so labels render freely)
      hubs.forEach((h) => {
        if (active !== "all" && active !== h.layer && !h.primary) return;
        drawHub(h, nowSec);
      });

      // inertia / auto-rotate
      const rot = rotRef.current;
      if (!dragRef.current.active) {
        rot.y += rot.vy;
        rot.x += rot.vx * 0.3;
        rot.vy *= 0.95;
        rot.vx *= 0.92;
        if (autoRotate && Math.abs(rot.vy) < 0.0003) rot.vy = 0.0012;
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  // deliberately only run once — all dynamic state via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pointer events ────────────────────────────────────────────────────────
  const getHubAt = useCallback(
    (clientX: number, clientY: number): Hub | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px   = clientX - rect.left;
      const py   = clientY - rect.top;
      const W    = rect.width;
      const H    = rect.height;
      const R    = Math.min(W, H) * 0.38;
      const cx   = W / 2;
      const cy   = H / 2;
      const { x: rotX, y: rotY } = rotRef.current;
      for (const h of hubs) {
        const p = project(h.lat, h.lng, rotX, rotY, cx, cy, R);
        if (!p.vis) continue;
        if (Math.hypot(px - p.sx, py - p.sy) < h.r * 2.5 + 5) return h;
      }
      return null;
    },
    [hubs]
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    rotRef.current.vx = 0;
    rotRef.current.vy = 0;
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDragging = dragRef.current.active;
    dragRef.current.active = false;
    if (!wasDragging) return;
    // tiny click vs drag
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.hypot(dx, dy) < 4) {
      const hub = getHubAt(e.clientX, e.clientY);
      if (hub && onHubClick) onHubClick(hub);
    }
  }, [getHubAt, onHubClick]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      rotRef.current.vy = dx * 0.008;
      rotRef.current.vx = dy * 0.008;
      rotRef.current.y += rotRef.current.vy;
      rotRef.current.x += rotRef.current.vx;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    }
    const hub = getHubAt(e.clientX, e.clientY);
    hoverRef.current = hub;
    if (hub) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const W    = rect.width;
      const H    = rect.height;
      const R    = Math.min(W, H) * 0.38;
      const { x: rotX, y: rotY } = rotRef.current;
      const p = project(hub.lat, hub.lng, rotX, rotY, W / 2, H / 2, R);
      setTooltip({ hub, x: p.sx + hub.r + 8, y: p.sy - 14 });
    } else {
      setTooltip(null);
    }
  }, [getHubAt]);

  const onMouseLeave = useCallback(() => {
    dragRef.current.active = false;
    hoverRef.current = null;
    setTooltip(null);
  }, []);

  // touch
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { active: true, lastX: t.clientX, lastY: t.clientY };
    rotRef.current.vx = 0;
    rotRef.current.vy = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.lastX;
    const dy = t.clientY - dragRef.current.lastY;
    rotRef.current.vy = dx * 0.008;
    rotRef.current.vx = dy * 0.008;
    rotRef.current.y += rotRef.current.vy;
    rotRef.current.x += rotRef.current.vx;
    dragRef.current.lastX = t.clientX;
    dragRef.current.lastY = t.clientY;
  }, []);

  const onTouchEnd = useCallback(() => { dragRef.current.active = false; }, []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
      style={{ background: "#07101F" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg px-3 py-2 text-xs"
          style={{
            left: tooltip.x,
            top:  tooltip.y,
            background:   "rgba(5,15,35,0.92)",
            border:       "0.5px solid rgba(0,229,255,0.3)",
            backdropFilter: "blur(8px)",
            maxWidth:     180,
          }}
        >
          <p className="mb-0.5 font-medium" style={{ color: "#00E5FF" }}>
            {tooltip.hub.name}
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)" }}>
            {tooltip.hub.role}
          </p>
        </div>
      )}

      {/*
       * ── MOBILE STRATEGY ──────────────────────────────────────────────────
       * On screens < 640px:
       *   Option A (recomendada): reducir R a 0.44 * min(W,H) y ocultar labels
       *     → añadir class "sm:block hidden" sobre un <CoreGlobeStatic /> SVG
       *   Option B: mostrar un SVG estático precalculado (ver CoreGlobeStatic abajo)
       *   Option C: disminuir FPS en mobile: if (window.innerWidth<640) rotVY=0.0006
       *
       * La estrategia por defecto de este componente es Canvas 2D adaptativo:
       * - funciona bien hasta ~320px de ancho
       * - en mobile no hay drag, solo rotación automática más lenta
       * ─────────────────────────────────────────────────────────────────────
       */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC FALLBACK (mobile / SSR / no-JS)
// Usar como fallback cuando CoreGlobe no pueda renderizar
// ─────────────────────────────────────────────────────────────────────────────

export function CoreGlobeStatic({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ background: "#07101F", aspectRatio: "1 / 0.62" }}
    >
      <svg
        viewBox="0 0 400 248"
        className="w-full h-full"
        aria-label="CORE Globe — Uruguay como hub central de Latinoamérica"
      >
        {/* bg */}
        <circle cx="200" cy="124" r="100" fill="#0D1B38" />
        <circle cx="200" cy="124" r="100" fill="none" stroke="#00E5FF" strokeWidth="1.2" strokeOpacity="0.25" />
        {/* graticule suggestion */}
        <line x1="200" y1="24"  x2="200" y2="224" stroke="#0EA5E9" strokeWidth="0.4" strokeOpacity="0.15" />
        <line x1="100" y1="124" x2="300" y2="124" stroke="#0EA5E9" strokeWidth="0.4" strokeOpacity="0.15" />
        <ellipse cx="200" cy="124" rx="100" ry="30" fill="none" stroke="#0EA5E9" strokeWidth="0.4" strokeOpacity="0.12" />
        {/* routes */}
        <path d="M130 50 Q160 80 185 120"  fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6" />
        <path d="M280 60 Q250 85 205 118"  fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6" />
        <path d="M200 122 Q180 145 150 160" fill="none" stroke="#0EA5E9" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M200 122 Q215 145 240 155" fill="none" stroke="#0EA5E9" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M200 122 Q185 160 170 185" fill="none" stroke="#0EA5E9" strokeWidth="1.2" strokeOpacity="0.6" />
        <path d="M320 90  Q270 105 207 120" fill="none" stroke="#F5C26B" strokeWidth="1.8" strokeOpacity="0.7" />
        {/* Uruguay hub */}
        <circle cx="200" cy="122" r="18" fill="none" stroke="#F5C26B" strokeWidth="0.8" strokeOpacity="0.3" />
        <circle cx="200" cy="122" r="10" fill="none" stroke="#F5C26B" strokeWidth="0.8" strokeOpacity="0.5" />
        <circle cx="200" cy="122" r="5"  fill="#FFF" />
        <circle cx="200" cy="122" r="2.5" fill="#F5C26B" />
        <text x="210" y="119" fontSize="9" fill="#F5C26B" fontFamily="sans-serif" fontWeight="500">Uruguay</text>
        <text x="210" y="129" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif">COMMERCIAL HUB</text>
      </svg>
    </div>
  );
}

export default CoreGlobe;
