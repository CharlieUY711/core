import { type ReactNode } from "react";

// ── Section wrapper ────────────────────────────────────────────────
interface SectionProps { id: string; children: ReactNode; }
export function DSSection({ id, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-4 space-y-7 py-10 border-b border-slate-200 last:border-0">
      {children}
    </section>
  );
}

// ── Section header ─────────────────────────────────────────────────
interface SectionHeaderProps { title: string; subtitle?: string; badge?: string; }
export function DSSectionHeader({ title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-blue-600 to-violet-600" />
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {badge && (
            <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-slate-500 text-sm pl-[52px] leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Preview card (contains component examples) ─────────────────────
interface PreviewCardProps { title?: string; label?: string; children: ReactNode; cols?: number; dark?: boolean; noPad?: boolean; }
export function PreviewCard({ title, label, children, dark = false, noPad = false }: PreviewCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {(title || label) && (
        <div className={`px-5 py-3 border-b ${dark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"} flex items-center justify-between`}>
          {title && <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>{title}</p>}
          {label && <span className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</span>}
        </div>
      )}
      <div className={`${noPad ? "" : "p-6"} ${dark ? "bg-slate-950" : "bg-white"}`}>
        {children}
      </div>
    </div>
  );
}

// ── Grid layout helper ─────────────────────────────────────────────
export function DSGrid({ cols = 2, gap = 4, children }: { cols?: number; gap?: number; children: ReactNode }) {
  const colMap: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };
  const gapMap: Record<number, string> = { 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6" };
  return (
    <div className={`grid ${colMap[cols] ?? "grid-cols-2"} ${gapMap[gap] ?? "gap-4"}`}>
      {children}
    </div>
  );
}

// ── Token label ────────────────────────────────────────────────────
export function TokenLabel({ name, value }: { name: string; value?: string }) {
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold text-slate-700">{name}</p>
      {value && <p className="text-[10px] font-mono text-slate-400">{value}</p>}
    </div>
  );
}

// ── Component item with label ──────────────────────────────────────
export function ComponentItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {children}
      <p className="text-[11px] text-slate-400 font-medium text-center">{label}</p>
    </div>
  );
}

// ── Inline tag ─────────────────────────────────────────────────────
export function DSTag({ children, color = "blue" }: { children: ReactNode; color?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const cls: Record<string, string> = {
    blue:  "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red:   "bg-red-100 text-red-700 border-red-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls[color]}`}>
      {children}
    </span>
  );
}

// ── Spec row ───────────────────────────────────────────────────────
export function SpecRow({ property, value }: { property: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{property}</span>
      <span className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{value}</span>
    </div>
  );
}
