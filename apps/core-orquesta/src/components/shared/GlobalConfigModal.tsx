import { X } from 'lucide-react'

interface Props { onClose: () => void }

export default function GlobalConfigModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Configuración global</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            Configuración de motores, notificaciones y preferencias globales.
          </p>
          {/* TODO: opciones de config */}
        </div>
      </div>
    </div>
  )
}
