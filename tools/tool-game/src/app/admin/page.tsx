export default function AdminPage() {
  const cards = [
    { label: "Campañas activas",   value: "—", icon: "🎯", color: "var(--primary)" },
    { label: "Jugadores hoy",      value: "—", icon: "👥", color: "var(--accent)"  },
    { label: "Premios entregados", value: "—", icon: "🎁", color: "var(--gold)"    },
    { label: "Conversiones",       value: "—", icon: "💰", color: "var(--success)" },
    { label: "Revenue",            value: "—", icon: "📊", color: "var(--primary)" },
    { label: "ROI",                value: "—", icon: "📈", color: "var(--success)" },
    { label: "CAC evitado",        value: "—", icon: "🛡️", color: "var(--accent)"  },
    { label: "Auditorías hoy",     value: "—", icon: "🔍", color: "var(--text-muted)" },
  ];
  const actions = [
    { label: "+ Nueva campaña", href: "/admin/campaigns/new" },
    { label: "+ Nuevo premio",  href: "/admin/rewards/new"   },
    { label: "Ver analytics",   href: "/admin/analytics"     },
    { label: "Auditoría",       href: "/admin/audit"         },
  ];
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Panel de control · Reward Engine · Multi-tenant
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon, color }) => (
          <div key={label} className="p-5 rounded-2xl space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-2xl">{icon}</div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="p-6 rounded-2xl space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="font-semibold">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          {actions.map(({ label, href }) => (
            <a key={href} href={href}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--primary)" }}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
