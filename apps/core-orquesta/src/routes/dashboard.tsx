import AppShell    from '@/components/layout/AppShell'
import LeftPanel   from '@/components/layout/LeftPanel'
import RightPanel  from '@/components/layout/RightPanel'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">
        {/* Panel izquierdo — motores enchufables */}
        <LeftPanel />

        {/* Separador */}
        <div className="w-px shrink-0 bg-border" />

        {/* Panel derecho — contexto de empresa */}
        <RightPanel />
      </div>
    </AppShell>
  )
}
