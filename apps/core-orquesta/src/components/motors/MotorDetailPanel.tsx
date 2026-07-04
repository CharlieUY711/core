import { Settings, Play, Square } from 'lucide-react'
import { useUpdateMotor } from '@/hooks/useMotors'
import { useOrquestaStore } from '@/stores/orquesta.store'
import type { Motor } from '@/types/orquesta.types'

interface Props { motor: Motor }

export default function MotorDetailPanel({ motor }: Props) {
  const { mutate: updateMotor, isPending } = useUpdateMotor()
  const { setActiveMotor } = useOrquestaStore()

  const toggle = () => {
    updateMotor({
      id:     motor.id,
      status: motor.status === 'active' ? 'inactive' : 'active',
    })
  }

  return (
    <div className="space-y-3 p-4">
      {/* Acciones rápidas */}
      <div className="flex gap-2">
        <button
          onClick={toggle}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {motor.status === 'active'
            ? <><Square size={12} /> Detener</>
            : <><Play  size={12} /> Activar</>
          }
        </button>
        <button
          onClick={() => setActiveMotor(null)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
        >
          <Settings size={12} />
        </button>
      </div>

      {/* Metadata */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Intervalo: cada {motor.interval_min} min</p>
        <p>Detalle: {motor.detail_level}</p>
        {motor.last_run_at && (
          <p>Última ejecución: {new Date(motor.last_run_at).toLocaleString('es')}</p>
        )}
      </div>
    </div>
  )
}
