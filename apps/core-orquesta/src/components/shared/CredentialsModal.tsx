import { X } from 'lucide-react'
import { ApiVaultPage } from '@core/core-apivault/components'
import { supabase } from '@/lib/supabase'

interface Props { onClose: () => void }

export default function CredentialsModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Credenciales de API</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Contenido — es el ApiVaultPage ya construido */}
        <div className="flex-1 overflow-y-auto">
          <ApiVaultPage
            supabase={supabase}
            appId="core-orquesta"
          />
        </div>
      </div>
    </div>
  )
}
