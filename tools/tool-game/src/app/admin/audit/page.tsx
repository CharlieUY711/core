const METRICS = [
  { label: "Total jugadas",      key: "totalPlays"      },
  { label: "Jugadores únicos",   key: "uniquePlayers"   },
  { label: "Registros nuevos",   key: "registrations"   },
  { label: "Conversiones",       key: "conversions"     },
  { label: "Revenue generado",   kfont-medium"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead style={{ background: "rgba(255,255,255,0.03)" }}>
            <tr>{COLS.map((c) => (
              <th key={c} className="px-4 py-3 text-left font-medium" style={{ color: "var(--text-muted)" }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-14 text-center" style={{ color: "var(--text-muted)" }}>
                Sin registros de auditoría todavía
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
