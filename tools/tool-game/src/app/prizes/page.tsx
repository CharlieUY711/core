import { PRIZES } from "@/lib/design-system/tokens";
import Link from "next/link";

export default function PrizesPage() {
  return (
    <main className="min-h-screen px-5 py-12 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Premios disponibles</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Girá y podés ganar cualquiera de estos premios
        </p>
      </div>

      <div className="space-y-3">
        {PRIZES.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-3xl">{p.emoji}</span>
            <div>
              <p className="font-semibold">{p.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Premio instantáneo</p>
            </div>
            <div className="ml-auto w-3 h-3 rounded-full" style={{ background: p.color }} />
          </div>
        ))}
      </div>

      <Link
        href="/game"
        className="block w-full py-4 rounded-2xl font-bold text-center transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          boxShadow:  "var(--glow-primary)",
        }}
      >
        ¡Jugar ahora!
      </Link>
    </main>
  );
}
