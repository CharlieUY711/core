// src/app/admin/meta-social/types/whatsapp.types.ts

export interface WhatsAppPhoneNumber {
  id:             string
  display_phone_number: string
  verified_name:  string
  code_verification_status?: string
  quality_rating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  platform_type?:  string
  throughput?:     { level: string }
}

export interface WhatsAppMessageTemplate {
  id:         string
  name:       string
  status:     'APPROVED' | 'PENDING' | 'REJECTED'
  category:   string
  language:   string
  components: WhatsAppTemplateComponent[]
}

export interface WhatsAppTemplateComponent {
  type:       'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  text?:      string
  format?:    'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  buttons?:   WhatsAppButton[]
}

export interface WhatsAppButton {
  type:      'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text:      string
  url?:      string
  phone_number?: string
}

// Para enviar un mensaje template (Etapa 2)
export interface WhatsAppSendTemplateParams {
  to:           string           // número destino con código de país
  templateName: string
  languageCode: string
  components?:  WhatsAppTemplateComponent[]
}
