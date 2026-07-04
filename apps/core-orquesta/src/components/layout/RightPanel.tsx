import { useOrquestaStore } from '@/stores/orquesta.store'
import type { RightPanelTab } from '@/types/orquesta.types'

// Tabs
import ProfileTab   from '@/components/tabs/ProfileTab'
import SignalsTab   from '@/components/tabs/SignalsTab'
import EventsTab    from '@/components/tabs/EventsTab'
import DocumentsTab from '@/components/tabs/DocumentsTab'
import RelationsTab from '@/components/tabs/RelationsTab'

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'profile',   label: 'Perfil'      },
  { id: 'signals',   label: 'Señales'     },
  { id: 'events',    label: 'Eventos'     },
  { id: 'documents', label: 'Documentos'  },
  { id: 'relations', label: 'Relaciones'  },
]

export default function RightPanel() {
  const { activeCompany, activeTab, setActiveTab } = useOrquestaStore()

  if (!activeCompany) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Seleccioná una empresa para ver el contexto
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Empresa activa */}
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">{activeCompany.name}</h2>
        {activeCompany.industry && (
          <p className="text-xs text-muted-foreground">{activeCompany.industry}</p>
        )}
      </div>

      {/* Tab bar */}
      <nav className="flex gap-1 border-b border-border px-4 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-t-md px-3 py-1.5 text-xs font-medium transition',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Contenido del tab */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'profile'   && <ProfileTab   company={activeCompany} />}
        {activeTab === 'signals'   && <SignalsTab   company={activeCompany} />}
        {activeTab === 'events'    && <EventsTab    company={activeCompany} />}
        {activeTab === 'documents' && <DocumentsTab company={activeCompany} />}
        {activeTab === 'relations' && <RelationsTab company={activeCompany} />}
      </div>
    </div>
  )
}
