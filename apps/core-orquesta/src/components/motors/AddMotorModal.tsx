import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useCreateMotor } from '@/hooks/useMotors'

const schema = z.object({
  name:         z.string().min(1, 'Nombre requerido'),
  description:  z.string().optional(),
  interval_min: z.coerce.number().min(1).default(30),
  detail_level: z.enum(['Básico', 'Estándar', 'Profundo']).default('Estándar'),
})

type FormData = z.infer<typeof schema>

interface Props { onClose: () => void }

export default function AddMotorModal({ onClose }: Props) {
  const { mutate: createMotor, isPending } = useCreateMotor()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { interval_min: 30, detail_level: 'Estándar' },
  })

  const onSubmit = (data: FormData) => {
    createMotor({
      name:         data.name,
      description:  data.description ?? null,
      icon:         'globe',
      status:       'inactive',
      version:      '1.0.0',
      interval_min: data.interval_min,
      sources:      [],
      detail_level: data.detail_level,
      fallback:     null,
      companies:    [],
    }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Nuevo motor</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Nombre *</label>
            <input
              {...register('name')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Monitor de noticias"
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Descripción</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="¿Qué monitorea este motor?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Intervalo (min)</label>
              <input
                {...register('interval_min')}
                type="number"
                min={1}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Nivel de detalle</label>
              <select
                {...register('detail_level')}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option>Básico</option>
                <option>Estándar</option>
                <option>Profundo</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : 'Crear motor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
