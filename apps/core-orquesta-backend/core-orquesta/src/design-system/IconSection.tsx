import {
  Plug, Settings, Power, Terminal, Zap, FileText, GitBranch,
  Building2, AlertTriangle, CheckCircle2, XCircle, Info,
  Search, Bell, User, Loader2, Download, Upload, Plus,
  Trash2, Edit2, Eye, EyeOff, Lock, Unlock, Send, Copy,
  ArrowRight, ArrowLeft, ChevronDown, ChevronRight,
  BarChart2, Activity, Globe, Database, Mail, Rss,
  TrendingUp, Clock, Calendar, Bookmark, Star, Hash,
  MessageSquare, Filter, RefreshCw, Package, KeyRound,
  Shield, Link, Layers, List, Grid, MoreVertical,
  ChevronUp, ExternalLink, X, Save, Cpu, Radio,
  Map, Crosshair, ScanLine, Cpu as CpuIcon,
} from "lucide-react";
import { DSSection, DSSectionHeader, PreviewCard } from "./DSHelpers";

const ICONS_GRID = [
  // Core — Motores
  { icon: Plug,          name: "Plug",          group: "Motor" },
  { icon: Settings,      name: "Settings",      group: "Motor" },
  { icon: Power,         name: "Power",         group: "Motor" },
  { icon: Terminal,      name: "Terminal",      group: "Motor" },
  { icon: Cpu,           name: "Cpu",           group: "Motor" },
  { icon: Package,       name: "Package",       group: "Motor" },
  { icon: Layers,        name: "Layers",        group: "Motor" },
  // Datos / Señales
  { icon: Zap,           name: "Zap",           group: "Señal" },
  { icon: Activity,      name: "Activity",      group: "Señal" },
  { icon: Radio,         name: "Radio",         group: "Señal" },
  { icon: BarChart2,     name: "BarChart2",     group: "Señal" },
  { icon: TrendingUp,    name: "TrendingUp",    group: "Señal" },
  { icon: Rss,           name: "Rss",           group: "Señal" },
  { icon: ScanLine,      name: "ScanLine",      group: "Señal" },
  // Documentos
  { icon: FileText,      name: "FileText",      group: "Doc" },
  { icon: Download,      name: "Download",      group: "Doc" },
  { icon: Upload,        name: "Upload",        group: "Doc" },
  { icon: Save,          name: "Save",          group: "Doc" },
  { icon: Copy,          name: "Copy",          group: "Doc" },
  { icon: Bookmark,      name: "Bookmark",      group: "Doc" },
  // Relaciones
  { icon: GitBranch,     name: "GitBranch",     group: "Grafo" },
  { icon: Link,          name: "Link",          group: "Grafo" },
  { icon: Map,           name: "Map",           group: "Grafo" },
  { icon: Crosshair,     name: "Crosshair",     group: "Grafo" },
  // Empresa
  { icon: Building2,     name: "Building2",     group: "Empresa" },
  { icon: Globe,         name: "Globe",         group: "Empresa" },
  { icon: Database,      name: "Database",      group: "Empresa" },
  { icon: Hash,          name: "Hash",          group: "Empresa" },
  // Estados
  { icon: CheckCircle2,  name: "CheckCircle2",  group: "Estado" },
  { icon: XCircle,       name: "XCircle",       group: "Estado" },
  { icon: AlertTriangle, name: "AlertTriangle", group: "Estado" },
  { icon: Info,          name: "Info",          group: "Estado" },
  { icon: Loader2,       name: "Loader2",       group: "Estado" },
  // Navegación / UI
  { icon: Search,        name: "Search",        group: "UI" },
  { icon: Bell,          name: "Bell",          group: "UI" },
  { icon: User,          name: "User",          group: "UI" },
  { icon: Plus,          name: "Plus",          group: "UI" },
  { icon: Trash2,        name: "Trash2",        group: "UI" },
  { icon: Edit2,         name: "Edit2",         group: "UI" },
  { icon: Eye,           name: "Eye",           group: "UI" },
  { icon: EyeOff,        name: "EyeOff",        group: "UI" },
  { icon: Lock,          name: "Lock",          group: "UI" },
  { icon: KeyRound,      name: "KeyRound",      group: "UI" },
  { icon: Shield,        name: "Shield",        group: "UI" },
  { icon: RefreshCw,     name: "RefreshCw",     group: "UI" },
  { icon: Filter,        name: "Filter",        group: "UI" },
  { icon: MoreVertical,  name: "MoreVertical",  group: "UI" },
  { icon: X,             name: "X",             group: "UI" },
  { icon: ExternalLink,  name: "ExternalLink",  group: "UI" },
  // Time
  { icon: Clock,         name: "Clock",         group: "Tiempo" },
  { icon: Calendar,      name: "Calendar",      group: "Tiempo" },
  // Comms
  { icon: Mail,          name: "Mail",          group: "Comms" },
  { icon: MessageSquare, name: "MessageSquare", group: "Comms" },
  { icon: Send,          name: "Send",          group: "Comms" },
  // Layout
  { icon: List,          name: "List",          group: "Layout" },
  { icon: Grid,          name: "Grid",          group: "Layout" },
  { icon: ChevronDown,   name: "ChevronDown",   group: "Layout" },
  { icon: ChevronRight,  name: "ChevronRight",  group: "Layout" },
  { icon: ArrowRight,    name: "ArrowRight",    group: "Layout" },
  { icon: Star,          name: "Star",          group: "Layout" },
];

const GROUP_COLORS: Record<string, string> = {
  Motor:   "bg-blue-100 text-blue-600",
  Señal:   "bg-violet-100 text-violet-600",
  Doc:     "bg-emerald-100 text-emerald-600",
  Grafo:   "bg-amber-100 text-amber-600",
  Empresa: "bg-cyan-100 text-cyan-600",
  Estado:  "bg-red-100 text-red-600",
  UI:      "bg-slate-100 text-slate-600",
  Tiempo:  "bg-orange-100 text-orange-600",
  Comms:   "bg-pink-100 text-pink-600",
  Layout:  "bg-indigo-100 text-indigo-600",
};

export function IconSection() {
  const groups = Array.from(new Set(ICONS_GRID.map((i) => i.group)));

  return (
    <DSSection id="icons">
      <DSSectionHeader
        title="Iconografía"
        subtitle="Librería Lucide React. Estilo: lineal, 2px stroke, esquinas redondeadas, 24×24px base."
        badge="Lucide"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map((g) => (
          <span key={g} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${GROUP_COLORS[g] ?? "bg-slate-100 text-slate-600"}`}>
            {g}
          </span>
        ))}
      </div>
      <PreviewCard>
        <div className="grid grid-cols-8 gap-4 p-2">
          {ICONS_GRID.map(({ icon: Icon, name, group }) => (
            <div key={name}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-default group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${GROUP_COLORS[group] ?? "bg-slate-100 text-slate-600"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-mono text-slate-400 text-center leading-tight group-hover:text-slate-600 transition-colors">{name}</p>
            </div>
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Tamaños de ícono">
        <div className="flex items-end gap-8">
          {[
            { size: 12, label: "12px — Caption" },
            { size: 14, label: "14px — Small" },
            { size: 16, label: "16px — Base" },
            { size: 20, label: "20px — Medium" },
            { size: 24, label: "24px — Standard" },
            { size: 32, label: "32px — Large" },
            { size: 40, label: "40px — XL" },
          ].map(({ size, label }) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Zap style={{ width: size, height: size }} className="text-blue-600" />
              <p className="text-[9px] text-slate-400 text-center whitespace-nowrap">{label}</p>
            </div>
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Íconos con contenedor">
        <div className="flex items-center gap-5">
          {[
            { size: "w-8 h-8", radius: "rounded-lg",  bg: "bg-blue-100",    icon: "text-blue-600" },
            { size: "w-10 h-10",radius: "rounded-xl", bg: "bg-emerald-100", icon: "text-emerald-600" },
            { size: "w-12 h-12",radius: "rounded-2xl",bg: "bg-violet-100",  icon: "text-violet-600" },
            { size: "w-10 h-10",radius: "rounded-full",bg: "bg-amber-100",  icon: "text-amber-600" },
            { size: "w-10 h-10",radius: "rounded-xl", bg: "bg-slate-900",   icon: "text-blue-400" },
            { size: "w-10 h-10",radius: "rounded-xl", bg: "bg-blue-600",    icon: "text-white" },
          ].map(({ size, radius, bg, icon }, i) => (
            <div key={i} className={`${size} ${radius} ${bg} flex items-center justify-center border border-black/[0.05] shadow-sm`}>
              <Plug className={`w-4 h-4 ${icon}`} />
            </div>
          ))}
          <div className="ml-4 text-xs text-slate-400 space-y-1">
            <p>• Siempre centrado en el contenedor</p>
            <p>• Tamaño ícono = tamaño contenedor / 2.5</p>
            <p>• Usar <code className="bg-slate-100 px-1 rounded text-[10px]">stroke-2</code> para consistencia</p>
          </div>
        </div>
      </PreviewCard>
    </DSSection>
  );
}
