import { create } from 'zustand'
import type { Motor, Company, RightPanelTab } from '@/types/orquesta.types'

interface OrquestaState {
  // Selección activa
  activeMotor:   Motor   | null
  activeCompany: Company | null
  activeTab:     RightPanelTab

  // Modales
  showGlobalConfig:  boolean
  showCredentials:   boolean
  showAddMotor:      boolean

  // Acciones
  setActiveMotor:   (motor: Motor | null)     => void
  setActiveCompany: (company: Company | null) => void
  setActiveTab:     (tab: RightPanelTab)      => void

  toggleGlobalConfig:  () => void
  toggleCredentials:   () => void
  toggleAddMotor:      () => void
}

export const useOrquestaStore = create<OrquestaState>((set) => ({
  activeMotor:   null,
  activeCompany: null,
  activeTab:     'profile',

  showGlobalConfig: false,
  showCredentials:  false,
  showAddMotor:     false,

  setActiveMotor:   (motor)   => set({ activeMotor: motor }),
  setActiveCompany: (company) => set({ activeCompany: company }),
  setActiveTab:     (tab)     => set({ activeTab: tab }),

  toggleGlobalConfig:  () => set((s) => ({ showGlobalConfig: !s.showGlobalConfig })),
  toggleCredentials:   () => set((s) => ({ showCredentials:  !s.showCredentials  })),
  toggleAddMotor:      () => set((s) => ({ showAddMotor:     !s.showAddMotor     })),
}))
