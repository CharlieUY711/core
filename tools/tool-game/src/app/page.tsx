import Link from "next/link";
import { PRIZES } from "@/lib/design-system/tokens";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        gap: 40,
        background: "var(--background)",
      }}
    >
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎰</div>
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          <span style={{ color: "var(--primary)" }}>Market</span> Rewards
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>
          Girá la cinta y ganá premios exclusivos al instante
        </p>
      </div>

      {/* Preview premios */}
      <div style={{ width: "100%", maxWidth: 360 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", letterSpacing: 2, marginBottom: 12 }}>
          PREMIOS DISPONIBLES
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRIZES.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 24 }}>{p.emoji}</span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{p.label}</span>
              <div style={{ marginLeft: "auto", width: 10, height: 10, borderRadius: "50%", background: p.color }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Link href="/prizes" style={{ color: "var(--accent)", fontSize: 12 }}>
            Ver todos los premios →
          </Link>
        </div>
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 360 }}>
        <Link
          href="/game"
          style={{
            display: "block",
            width: "100%",
            padding: "16px 0",
            borderRadius: 18,
            fontWeight: 700,
            fontSize: 18,
            textAlign: "center",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            boxShadow: "0 0 40px rgba(124,58,237,0.4)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          ¡Jugar ahora!
        </Link>
        <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Necesitás cuenta en Market para jugar · Sin costo
        </p>
      </div>
    </main>
  );
}
