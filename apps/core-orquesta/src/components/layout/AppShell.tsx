import type { ReactNode } from "react"
import { Settings, KeyRound, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useOrquestaStore } from "@/stores/orquesta.store"
import GlobalConfigModal from "@/components/shared/GlobalConfigModal"
import CredentialsModal  from "@/components/shared/CredentialsModal"

export default function AppShell({ children }: { children: ReactNode }) {
  const { showGlobalConfig, showCredentials, toggleGlobalConfig, toggleCredentials } = useOrquestaStore()

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:"var(--background)", color:"var(--foreground)" }}>
      <header style={{ display:"flex", height:48, alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)", padding:"0 16px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:"-0.02em" }}>core · orquesta</span>
          <span style={{ fontSize:12, color:"var(--muted-foreground)", marginLeft:4 }}>Inteligencia competitiva</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={toggleGlobalConfig} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--muted-foreground)", cursor:"pointer", fontSize:12 }}>
            <Settings size={14} />Configuración
          </button>
          <button onClick={toggleCredentials} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--muted-foreground)", cursor:"pointer", fontSize:12 }}>
            <KeyRound size={14} />Credenciales
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--muted-foreground)", cursor:"pointer", fontSize:12 }}>
            <LogOut size={14} />Salir
          </button>
        </div>
      </header>

      <main style={{ flex:1, overflow:"hidden", display:"flex" }}>{children}</main>

      {showGlobalConfig && <GlobalConfigModal onClose={toggleGlobalConfig} />}
      {showCredentials  && <CredentialsModal  onClose={toggleCredentials}  />}
    </div>
  )
}
