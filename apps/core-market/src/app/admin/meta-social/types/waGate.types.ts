// src/app/admin/meta-social/types/waGate.types.ts

export interface WaGateOption {
  id?:        string
  position:   number
  label:      string          // máx. 20 caracteres: es el texto del botón de WhatsApp
  is_correct: boolean
  action_url: string | null   // a dónde va si NO es la correcta
  image_url:  string | null
}

export interface WaGate {
  id:              string
  recipient:       string     // sólo dígitos, con país
  recipient_label: string | null
  prompt:          string
  success_text:    string
  enabled:         boolean
  options:         WaGateOption[]
}

export type WaGateDraft = Omit<WaGate, 'id'> & { id?: string }
