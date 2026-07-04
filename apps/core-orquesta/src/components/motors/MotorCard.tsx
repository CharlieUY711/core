import { Globe, Activity, AlertCircle, Circle } from 'lucide-react'
import { useOrquestaStore } from '@/stores/orquesta.store'
import type { Motor } from '@/types/orquesta.types'

const STATUS_ICON = {
  active:   <Activity size={12} className="text-green-500" />,
  inactive: <Circle   size={12} className="text-muted-foreground" />,
  error:    <AlertCircle size={12} className="text-destructive" />,
}

const STATUS_LABEL = {
  active:   'Activo',
  inactive: 'Inactivo',
  error:    'Error',
}

interface Props { motor: Motor }

export default function MotorCard({ motor }: Props) {
  const { activeMotor, setActiveMotor } = useOrquestaStore()
  const isActive = activeMotor?.id === motor.id

  return (
    <button
      onClick={() => setActiveMotor(isActive ? null : motor)}
      className={[
        'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent/50',
        isActive ? 'bg-accent' : '',
      ].join(' ')}
    >
      {/* Ícono */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Globe size={16} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{motor.name}</p>
        {motor.description && (
          <p className="truncate text-xs text-muted-foreground">{motor.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1">
          {STATUS_ICON[motor.status]}
          <span className="text-xs text-muted-foreground">{STATUS_LABEL[motor.status]}</span>
        </div>
      </div>
    </button>
  )
}
