"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketAuth } from "@/lib/hooks/useMarketAuth";

interface Props {
  open:    boolean;
  onClose: () => void;
  onSuccess?: () => void;   // callback cuando login/registro OK
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const { signIn, signUp } = useMarketAuth();
  const [modo,     setModo]     = useState<"login" | "registro">("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [nombre,   setNombre]   = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [mensaje,  setMensaje]  = useState<string | null>(null);

  function reset() {
    setError(null); setMensaje(null);
    setEmail(""); setPassword(""); setNombre("");
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError(null);
    try {
      if (modo === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) { setError(error); return; }
        onClose(); onSuccess?.();
      } else {
        if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
        const { error } = await signUp(email.trim(), password, nombre.trim());
        if (error) { setError(error); return; }
        setMensaje("¡Registro exitoso! Revisá tu email para confirmar tu cuenta.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff", fontSize: 15, outline: "none",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.85)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            style={{ width: "100%", maxWidth: 400, borderRadius: 28, padding: 28, background: "#111", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 }}
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, gap: 4, marginBottom: 20 }}>
              {(["login", "registro"] as const).map((m) => (
                <button key={m} onClick={() => { setModo(m); reset(); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
                    background: modo === m ? "var(--primary)" : "transparent",
                    color: modo === m ? "#fff" : "rgba(255,255,255,0.5)" }}>
                  {m === "login" ? "Ingresar" : "Registrarse"}
                </button>
              ))}
            </div>

            {/* Mensaje legal */}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
              Para participar debes registrarte en Market. El premio obtenido quedará asociado
              a tu cuenta y permanecerá disponible durante toda su vigencia.
            </p>

            {error   && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#3a1515", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {mensaje && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#143a1e", color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{mensaje}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {modo === "registro" && (
                <input type="text" placeholder="Nombre completo" value={nombre}
                  onChange={(e) => setNombre(e.target.value)} style={inp} />
              )}
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }} style={inp} />
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"} placeholder="Contraseña" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                  style={{ ...inp, paddingRight: 44 }}
                />
                <button onClick={() => setShowPwd(!showPwd)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 16 }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>

              <button onClick={handleSubmit} disabled={loading}
                style={{ padding: "14px 0", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: 16, color: "#fff", marginTop: 4,
                  background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, var(--primary), var(--secondary))",
                  boxShadow: loading ? "none" : "0 0 30px rgba(124,58,237,0.4)" }}>
                {loading ? "Procesando..." : modo === "login" ? "Ingresar" : "Crear cuenta"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
