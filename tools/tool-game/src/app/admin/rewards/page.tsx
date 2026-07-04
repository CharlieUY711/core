import Link from "next/link";

const COLS = ["Premio", "Tipo", "Probabilidad", "Stock", "Vigencia", "Costo", "Acciones"];

export default function RewardsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Premios</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            CRUD · probabilidades · stock · vigencias · límites · costos · ROI esperado
          </p>
        </div>
        <Link href="/admin/rewards/new"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
          + Nuevo premio
        </Link>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "rgba(255,255,255,0.03)" }}>
            <tr>{COLS.map((c) => (
              <th key={c} className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-14 text-center" style={{ color: "var(--text-muted)" }}>
                Sin premios.{" "}
                <Link href="/admin/rewards/new" style={{ color: "var(--primary)" }}>Crear primer premio →</Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
