import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RefreshCw, Info, Move } from "lucide-react";
import type { Company } from "../../data";

interface Node { id: string; label: string; type: "company" | "event" | "signal" | "motor"; x: number; y: number; size: number; }
interface Edge { from: string; to: string; label?: string; dashed?: boolean; }

const NODE_COLORS: Record<Node["type"], { fill: string; stroke: string; glow: string }> = {
  company: { fill: "#3b82f6", stroke: "#2563eb", glow: "rgba(59,130,246,0.35)" },
  event:   { fill: "#10b981", stroke: "#059669", glow: "rgba(16,185,129,0.35)" },
  signal:  { fill: "#8b5cf6", stroke: "#7c3aed", glow: "rgba(139,92,246,0.35)" },
  motor:   { fill: "#f59e0b", stroke: "#d97706", glow: "rgba(245,158,11,0.35)" },
};

const GRAPH: { nodes: Node[]; edges: Edge[] } = {
  nodes: [
    { id: "n1",  label: "TechCorp",         type: "company", x: 310, y: 210, size: 28 },
    { id: "n2",  label: "RetailCo",          type: "company", x: 530, y: 315, size: 20 },
    { id: "n3",  label: "InnovaGroup",       type: "company", x: 120, y: 320, size: 18 },
    { id: "n4",  label: "Expansión LATAM",   type: "event",   x: 445, y: 120, size: 17 },
    { id: "n5",  label: "Serie B · $12M",    type: "event",   x: 175, y: 110, size: 17 },
    { id: "n6",  label: "Partnership",       type: "event",   x: 315, y: 380, size: 15 },
    { id: "n7",  label: "Contratación +40",  type: "signal",  x: 500, y: 225, size: 14 },
    { id: "n8",  label: "Fallo servicio",    type: "signal",  x: 605, y: 395, size: 13 },
    { id: "n9",  label: "Monitor Noticias",  type: "motor",   x: 75,  y: 205, size: 15 },
    { id: "n10", label: "Web Scraper",       type: "motor",   x: 560, y: 125, size: 15 },
    { id: "n11", label: "Analizador",        type: "motor",   x: 430, y: 415, size: 14 },
  ],
  edges: [
    { from: "n1",  to: "n4",  label: "tiene" },
    { from: "n1",  to: "n5",  label: "cerró" },
    { from: "n1",  to: "n6" },
    { from: "n2",  to: "n6" },
    { from: "n1",  to: "n7",  dashed: true },
    { from: "n2",  to: "n8",  dashed: true },
    { from: "n3",  to: "n4" },
    { from: "n9",  to: "n4" },
    { from: "n9",  to: "n5" },
    { from: "n10", to: "n7" },
    { from: "n10", to: "n4" },
    { from: "n11", to: "n7" },
    { from: "n11", to: "n6" },
  ],
};

const LEGEND = [
  { type: "company" as const, label: "Empresa" },
  { type: "event"   as const, label: "Evento" },
  { type: "signal"  as const, label: "Señal" },
  { type: "motor"   as const, label: "Motor" },
];

interface RelationsTabProps { company: Company; }

export function RelationsTab({ company }: RelationsTabProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<Node | null>(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Entry animation: stagger nodes after mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const handleReset   = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest("circle[data-node]")) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.3), 2.5));
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-sm">Grafo de Relaciones</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {GRAPH.nodes.length} nodos · {GRAPH.edges.length} conexiones · contexto:{" "}
              <span className="text-blue-600 font-medium">{company.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-3">
            {LEGEND.map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: NODE_COLORS[type].fill }} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={handleZoomOut} title="Alejar"
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-600 font-mono w-9 text-center tabular-nums font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} title="Acercar"
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-all">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={handleReset} title="Reiniciar vista"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-white transition-all bg-white shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Graph container */}
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative select-none"
        style={{ height: 400, cursor: dragging ? "grabbing" : "grab" }}
      >
        {/* Tooltip */}
        {hovered && (
          <div className="absolute top-3 left-3 z-20 bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-white/10 pointer-events-none anim-fade-in">
            <p className="font-bold">{hovered.label}</p>
            <p className="text-slate-400 capitalize text-[11px] mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: NODE_COLORS[hovered.type].fill }} />
              {hovered.type === "company" ? "Empresa" : hovered.type === "event" ? "Evento" : hovered.type === "signal" ? "Señal" : "Motor"}
            </p>
          </div>
        )}

        {/* Pan hint */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Move className="w-3 h-3" />
          Arrastrar · scroll = zoom
        </div>

        <svg
          ref={svgRef}
          width="100%" height="100%"
          viewBox="0 0 680 450"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, #eff6ff 0%, #f8fafc 60%, #f1f5f9 100%)",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <defs>
            <pattern id="grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="0.8" cy="0.8" r="0.8" fill="#e2e8f0" />
            </pattern>
            <filter id="shadow-node" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.18" />
            </filter>
            {Object.entries(NODE_COLORS).map(([type, c]) => (
              <filter key={type} id={`glow-${type}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor={c.glow} result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#cbd5e1" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} style={{ transformOrigin: "340px 225px" }}>
            {/* ── Edges ── */}
            {GRAPH.edges.map((edge, i) => {
              const from = GRAPH.nodes.find((n) => n.id === edge.from)!;
              const to   = GRAPH.nodes.find((n) => n.id === edge.to)!;
              const dx = to.x - from.x, dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const ux = dx / len, uy = dy / len;
              const x1 = from.x + ux * from.size;
              const y1 = from.y + uy * from.size;
              const x2 = to.x - ux * (to.size + 5);
              const y2 = to.y - uy * (to.size + 5);
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#cbd5e1" strokeWidth={1.5} strokeOpacity={0.75}
                    strokeDasharray={edge.dashed ? "5 3" : "none"}
                    markerEnd="url(#arrow)"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transition: `opacity 0.4s ease-out ${i * 0.03}s`,
                    }}
                  />
                  {edge.label && (
                    <text x={mx} y={my - 5} fill="#94a3b8" fontSize="9"
                      textAnchor="middle" fontWeight="600"
                      style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease-out ${i * 0.03 + 0.2}s` }}>
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Nodes ── */}
            {GRAPH.nodes.map((node, i) => {
              const c = NODE_COLORS[node.type];
              const isHov = hovered?.id === node.id;
              const delay = i * 0.05;
              return (
                <g key={node.id}
                  data-node-id={node.id}
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: "pointer",
                    transform: mounted ? "scale(1)" : "scale(0)",
                    transformOrigin: `${node.x}px ${node.y}px`,
                    transition: `transform 0.4s cubic-bezier(0.34,1.3,0.64,1) ${delay}s, opacity 0.4s ease-out ${delay}s`,
                    opacity: mounted ? 1 : 0,
                  }}
                >
                  {/* Hover ring */}
                  {isHov && (
                    <circle cx={node.x} cy={node.y} r={node.size + 10}
                      fill={c.fill} opacity={0.15}
                      style={{ transition: "all 0.2s ease-out" }} />
                  )}

                  {/* Main circle */}
                  <circle
                    data-node="true"
                    cx={node.x} cy={node.y} r={node.size}
                    fill={c.fill} stroke={c.stroke} strokeWidth={2.5}
                    filter={isHov ? `url(#glow-${node.type})` : "url(#shadow-node)"}
                    opacity={0.92}
                    style={{ transition: "all 0.2s ease-out" }}
                  />

                  {/* Shine highlight */}
                  <circle
                    cx={node.x - node.size * 0.28}
                    cy={node.y - node.size * 0.28}
                    r={node.size * 0.32}
                    fill="white" opacity={0.22}
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Label */}
                  <text
                    x={node.x} y={node.y + node.size + 14}
                    fill={isHov ? "#1e293b" : "#475569"}
                    fontSize="10" textAnchor="middle" fontWeight={isHov ? "700" : "600"}
                    style={{ pointerEvents: "none", transition: "fill 0.15s ease-out" }}
                  >
                    {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                  </text>

                  {/* Type indicator dot */}
                  <circle cx={node.x + node.size * 0.65} cy={node.y - node.size * 0.65}
                    r={4} fill="white" stroke={c.stroke} strokeWidth={1.5}
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}