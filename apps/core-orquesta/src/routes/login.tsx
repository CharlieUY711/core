import { useState } from "react"
import { supabase } from "@/lib/supabase"

type View = "login" | "register" | "recover"

export default function LoginPage() {
  const [view, setView]         = useState<View>("login")
  const [fullName, setFullName] = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [message, setMessage]   = useState("")

  const swap = (v: View) => { setView(v); setError(""); setMessage(""); setPassword("") }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError("Credenciales incorrectas.")
        return
      }
      if (view === "register") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) { setError(error.message); return }
        setMessage("Te enviamos un email para confirmar tu cuenta.")
        return
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`
      })
      if (error) { setError(error.message); return }
      setMessage("Te enviamos un link para restablecer la contraseña.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.")
    } finally {
      setLoading(false)
    }
  }

  const cta = view === "login" ? "Ingresar" : view === "register" ? "Crear cuenta" : "Enviar link"

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 12px", borderRadius:8,
    border:"1px solid #2a2a2a", background:"#111",
    color:"#fafafa", fontSize:14, outline:"none", fontFamily:"inherit"
  }
  const tabBase: React.CSSProperties = {
    flex:1, padding:"10px", borderRadius:6, border:"none",
    fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .15s", fontFamily:"inherit"
  }

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw", alignItems:"center", justifyContent:"center", background:"#0a0a0a" }}>
      <div style={{ width:"100%", maxWidth:360, padding:"0 20px" }}>

        <div style={{ textAlign:"center", marginBottom:32 }}>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.02em", color:"#fafafa", margin:0 }}>core · orquesta</h1>
          <p style={{ marginTop:6, fontSize:13, color:"#555" }}>Inteligencia competitiva en tiempo real</p>
        </div>

        {/* Tabs */}
        {view !== "recover" && (
          <div style={{ display:"flex", gap:4, padding:4, borderRadius:8, background:"#111", marginBottom:24 }}>
            <button type="button" onClick={() => swap("login")} style={{ ...tabBase, background: view === "login" ? "#1a1a1a" : "transparent", color: view === "login" ? "#fafafa" : "#555" }}>Ingresar</button>
            <button type="button" onClick={() => swap("register")} style={{ ...tabBase, background: view === "register" ? "#1a1a1a" : "transparent", color: view === "register" ? "#fafafa" : "#555" }}>Registrarse</button>
          </div>
        )}

        {view === "recover" && (
          <h2 style={{ fontSize:16, fontWeight:600, color:"#fafafa", marginBottom:20 }}>Recuperar contraseña</h2>
        )}

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {view === "register" && (
            <input style={inp} placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus />
          )}
          <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={view !== "register"} />
          {view !== "recover" && (
            <input style={inp} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          )}

          {error   && <p style={{ fontSize:12, color:"#ef4444", margin:0 }}>{error}</p>}
          {message && <p style={{ fontSize:12, color:"#22c55e", margin:0 }}>{message}</p>}

          <button type="submit" disabled={loading} style={{ padding:"11px", borderRadius:8, background:"#fff", color:"#000", fontWeight:700, fontSize:14, border:"none", cursor:"pointer", marginTop:4 }}>
            {loading ? "..." : cta}
          </button>
        </form>

        <div style={{ marginTop:16, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          {view === "login" && (
            <button type="button" onClick={() => swap("recover")} style={{ fontSize:12, color:"#444", background:"none", border:"none", cursor:"pointer" }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {view !== "login" && (
            <button type="button" onClick={() => swap("login")} style={{ fontSize:12, color:"#444", background:"none", border:"none", cursor:"pointer" }}>
              ← Volver a ingresar
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
