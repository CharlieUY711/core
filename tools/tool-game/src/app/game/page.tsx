"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InfinitePrizeRibbon } from "@/components/ribbon/InfinitePrizeRibbon";
import { AuthModal } from "@/components/ui-game/AuthModal";
import { useMarketAuth } from "@/lib/hooks/useMarketAuth";
import { aplicarPremioAlCarrito } from "@/lib/supabase/carritoApi";

interface Prize { id: string; label: string; emoji: string; color: string; }

const CAMPAIGN_ID  = "market-rewards-2026";
const EXPIRES_DAYS = 7;

export default function GamePage() {
  const { user, isAuthenticated, isLoading } = useMarketAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [result,     setResult]     = useState<Prize | null>(null);
  const [applying,   setApplying]   = useState(false);
  const [applied,    setApplied]    = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  function handlePlay() {
    if (!isAuthenticated) { setShowAuth(true); return; }
    setResult(null);
    setApplied(false);
    setApplyError(null);
    setIsSpinning(true);
  }

  async function handleResult(prize: Prize) {
    setResult(prize);
    setApplying(true);

    const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { ok, error } = await aplicarPremioAlCarrito(
      prize.id, prize.label, prize.emoji, CAMPAIGN_ID, expiresAt
    );

    setApplying(false);
    if (ok) setApplied(true);
    else    setApplyError(error ?? "Error al aplicar el premio");
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", gap: 32, background: "var(--background)",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          <span style={{ color: "var(--primary)" }}>Market</span> Rewards
        </h1>
        {user && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
            Hola, {user.name} 👋
          </p>
        )}
      </div>

      {/* Ribbon */}
      <InfinitePrizeRibbon
        isSpinning={isSpinning}
        onResult={handleResult}
        onSpinComplete={() => setIsSpinning(false)}
      />

      {/* Resultado */}
      <AnimatePresence>
        {result && (
          <motion.div style={{ textAlign: "center", maxWidth: 320 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{result.emoji}</div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>
              ¡Ganaste: {result.label}!
            </p>

            {applying && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                Aplicando al carrito...
              </p>
            )}
            {applied && !applying && (
              <p style={{ fontSize: 13, color: "var(--success)", marginTop: 8 }}>
                ✓ Premio aplicado a tu carrito de Market
              </p>
            )}
            {applyError && (
              <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 8 }}>
                {applyError}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón */}
      {!isSpinning && !isLoading && (
        <button onClick={handlePlay}
          style={{
            width: "100%", maxWidth: 320, padding: "16px 0",
            borderRadius: 18, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 18, color: "#fff",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            boxShadow: "0 0 40px rgba(124,58,237,0.4)",
          }}>
          {isAuthenticated ? "🎰 JUGAR" : "🔒 Iniciar sesión para jugar"}
        </button>
      )}

      {isSpinning && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Girando...</p>
      )}

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          // Después del login arrancamos la tirada automáticamente
          setTimeout(() => {
            setResult(null); setApplied(false); setApplyError(null);
            setIsSpinning(true);
          }, 400);
        }}
      />
    </main>
  );
}
