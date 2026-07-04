import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Download, Rss, Globe, TrendingUp, Calendar } from "lucide-react";
import type { OrchestratorEvent, EventType } from "../../data";

const MOTOR_ICONS: Record<string, React.ElementType> = { rss: Rss, globe: Globe, trending: TrendingUp };

const TYPE_CFG: Record<EventType, { label: string; bg: string; text: string; border: string; dot: string }> = {
  expansion:  { label: "Expansión",  bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  financiero: { label: "Financiero", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  talento:    { label: "Talento",    bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  producto:   { label: "Producto",   bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  alianza:    { label: "Alianza",    bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    dot: "bg-cyan-500" },
  riesgo:     { label: "Riesgo",     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500" },
};

type SortKey = "date" | "motorName" | "type";

export function EventsTab({ events }: { events: OrchestratorEvent[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "todos">("todos");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = events
    .filter((e) => {
      const q = search.toLowerCase();
      return (
        (e.description.toLowerCase().includes(q) || e.motorName.toLowerCase().includes(q)) &&
        (typeFilter === "todos" || e.type === typeFilter)
      );
    })
    .sort((a, b) => {
      const av = a[sortKey] as string;
      const bv = b[sortKey] as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === "asc"
        ? <ChevronUp className="w-3 h-3 inline ml-0.5 text-blue-600" />
        : <ChevronDown className="w-3 h-3 inline ml-0.5 text-blue-600" />
      : <span className="w-3 h-3 inline-block ml-0.5 opacity-0" />;

  return (
    <div className="space-y-4">

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total eventos", value: events.length, class: "bg-white border-slate-200 text-slate-900" },
          { label: "Esta semana",   value: events.filter((e) => e.date.includes("24/02") || e.date.includes("23/02")).length, class: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Con riesgo",    value: events.filter((e) => e.type === "riesgo").length, class: "bg-red-50 border-red-200 text-red-700" },
        ].map(({ label, value, class: cls }) => (
          <div key={label} className={`p-4 rounded-2xl border shadow-sm ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] mt-0.5 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Buscar eventos…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all" />
        </div>
        <div className="relative">
          <select value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EventType | "todos")}
            className="pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm appearance-none cursor-pointer">
            <option value="todos">Todos los tipos</option>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-white transition-colors shadow-sm bg-white">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Count + clear */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          <span className="text-slate-700 font-semibold">{filtered.length}</span> evento{filtered.length !== 1 ? "s" : ""}
        </span>
        {typeFilter !== "todos" && (
          <button onClick={() => setTypeFilter("todos")} className="text-blue-600 hover:underline text-xs font-medium">
            ✕ Limpiar filtro
          </button>
        )}
      </div>

      {/* ── DS Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                  onClick={() => handleSort("date")}>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha <SortIcon col="date" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                  onClick={() => handleSort("motorName")}>
                  Motor <SortIcon col="motorName" />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                  onClick={() => handleSort("type")}>
                  Tipo <SortIcon col="type" />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ev) => {
                const type = TYPE_CFG[ev.type];
                const MotorIcon = MOTOR_ICONS[ev.motorIcon] || Globe;
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">{ev.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-5 h-5 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center shrink-0">
                          <MotorIcon className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{ev.motorName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${type.bg} ${type.text} ${type.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${type.dot}`} />
                        {type.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs leading-relaxed">
                      {ev.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-200">
                <Search className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400">Sin eventos con los filtros aplicados</p>
            </div>
          )}
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {filtered.length} evento{filtered.length !== 1 ? "s" : ""} · ordenado por{" "}
              <span className="font-semibold text-slate-600">{sortKey === "date" ? "fecha" : sortKey === "motorName" ? "motor" : "tipo"}</span>
              {" "}({sortDir === "desc" ? "↓ desc" : "↑ asc"})
            </p>
            <button className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:underline font-medium">
              <Download className="w-3 h-3" />
              Exportar CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
