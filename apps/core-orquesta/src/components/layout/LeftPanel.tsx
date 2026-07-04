import { Plus, SlidersHorizontal } from 'lucide-react'
import { useOrquestaStore } from '@/stores/orquesta.store'
import { useMotors }        from '@/hooks/useMotors'
import MotorCard            from '@/components/motors/MotorCard'
import MotorDetailPanel     from '@/components/motors/MotorDetailPanel'
import AddMotorModal        from '@/components/motors/AddMotorModal'

export default function LeftPanel() {
  const { activeMotor, showAddMotor, toggleAddMotor } = useOrquestaStore()
  const { motors, isLoading } = useMotors()

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Motores</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAddMotor}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Agregar motor"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Lista de motores */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : motors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <SlidersHorizontal size={32} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Sin motores todavía.
              <br />
              <button
                onClick={toggleAddMotor}
                className="mt-1 text-primary underline underline-offset-2"
              >
                Agregar el primero
              </button>
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {motors.map((motor) => (
              <li key={motor.id}>
                <MotorCard motor={motor} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel de detalle del motor activo */}
      {activeMotor && (
        <div className="border-t border-border">
          <MotorDetailPanel motor={activeMotor} />
        </div>
      )}

      {/* Modal agregar motor */}
      {showAddMotor && <AddMotorModal onClose={toggleAddMotor} />}
    </aside>
  )
}
