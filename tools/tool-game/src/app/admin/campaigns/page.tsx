import Link from "next/link";

const COLS = ["Nombre", "Mecánica", "Estado", "Inicio", "Fin", "Premios", "Acciones"];

export default function CampaignsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campañas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Gestión completa · nombre · branding · fechas · tenant · estado
          </p>
        </div>
        <Link href="/admin/campaigns/new"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
          + Nueva campaña
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        {["Todas", "Activas", "Pausadas", "Borrador", "Finalizadas"].map((f) => (
          <button key={f}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "rgba(255,255,255,0.03)" }}>
            <tr>
              {COLS.map((c) => (
                <th key={c} className="px-4 py-3 text-left font-medium"
                  style={{ color: "var(--text-muted)" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-14 text-center" style={{ color: "var(--text-muted)" }}>
                Sin campañas.{" "}
                <Link href="/admin/campaigns/new" style={{ color: "var(--primary)" }}>
                  Crear primera campaña →
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
