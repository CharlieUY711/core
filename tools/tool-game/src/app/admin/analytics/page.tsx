export default function AnalyticsPage() {
  const metrics = [
    { label: "Total jugadas",     key: "totalPlays"      },
    { label: "Jugadores únicos",  key: "uniquePlayers"   },
    { label: "Registros",         key: "registrations"   },
    { label: "Conversiones",      key: "conversions"     },
    { label: "Revenue",           key: "revenue"         },
    { label: "ROI",               key: "roi"             },
    { label: "CAC evitado",       key: "cacAvoided"      },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Métricas en tiempo real del Reward Engine · Multi-tenant
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label }) => (
          <div
            key={label}
            className="p-5 rounded-2xl space-y-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      <div
        className="p-6 rounded-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-4">Gráfico de conversiones</h2>
        <div
          className="h-48 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.05)", border: "1px dashed var(--border)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>Conectar API de Market para ver datos reales</p>
        </div>
      </div>
    </div>
  );
}
