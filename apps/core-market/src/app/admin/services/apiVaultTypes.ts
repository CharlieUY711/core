// @charlieuy711/api-vault — types & constants

export type VaultEnv  = 'production' | 'staging' | 'development' | 'testing'
export type VaultType = 'api_key' | 'token' | 'oauth' | 'secret' | 'webhook' | 'connection' | 'jwt' | 'cert'

export interface ApiVaultEntry {
  id:         string
  user_id:    string
  tenant_id:  string | null
  created_by: string | null
  name:       string
  platform:   string
  type:       VaultType
  value:      string
  env:        VaultEnv
  tags:       string[]
  notes:      string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type ApiVaultInsert = Omit<ApiVaultEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface ApiVaultPageProps {
  supabase:   any
  tenantId?:  string
  appId?:     string
  className?: string
}
export type ApiVaultUpdate = Partial<ApiVaultInsert>

export interface ApiVaultResult<T = void> {
  ok:     boolean
  data?:  T
  error?: string
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const VAULT_TYPE_LABELS: Record<VaultType, string> = {
  api_key:    'API Key',
  token:      'Token',
  oauth:      'OAuth Token',
  secret:     'Secret',
  webhook:    'Webhook URL',
  connection: 'Connection String',
  jwt:        'JWT',
  cert:       'Certificate / PEM',
}

/**
 * Los tipos, agrupados para el menú.
 *
 * POR QUÉ AGRUPAR
 * Ocho botones para ocho tipos es pedirle a alguien que sepa la diferencia
 * entre un JWT y un OAuth token antes de poder mirar sus credenciales. Y no la
 * necesita: en el panel las cinco primeras se usan igual —se guardan, se
 * revelan, se copian, vencen— y nadie va a querer ver los JWT sin ver los
 * tokens.
 *
 * EL CRITERIO ES QUÉ HACÉS CON ELLA, NO QUÉ FORMA TIENE
 *   Claves        lo que se presenta para autenticarse. Es un secreto.
 *   Conexiones    a dónde se apunta. Una dirección, no una identidad.
 *   Certificados  un archivo, con un vencimiento que importa de verdad.
 *
 * AGRUPAR EN EL MENÚ NO ES PERDER EL DATO
 * El tipo guardado sigue siendo exacto —un OAuth token no es una API key, y esa
 * diferencia importa para renovarlo— y se ve en su columna. Lo que se hace
 * grueso es la navegación, no la información.
 */
export const VAULT_TYPE_GROUPS: { id: string; label: string; tipos: VaultType[] }[] = [
  { id: 'clave',    label: 'Claves',
    tipos: ['api_key', 'token', 'oauth', 'jwt', 'secret'] },
  { id: 'conexion', label: 'Conexiones',
    tipos: ['connection', 'webhook'] },
  { id: 'cert',     label: 'Certificados',
    tipos: ['cert'] },
]

export const VAULT_ENV_LABELS: Record<VaultEnv, string> = {
  production:  'Production',
  staging:     'Staging',
  development: 'Development',
  testing:     'Testing',
}

// ── Platforms by category ─────────────────────────────────────────────────────

export interface VaultPlatformDef {
  name:     string
  category: string
  icon:     string
}

export const VAULT_PLATFORM_DEFS: VaultPlatformDef[] = [
  // AI & ML
  { name: 'OpenAI',          category: 'AI & ML',       icon: '🤖' },
  { name: 'Anthropic',       category: 'AI & ML',       icon: '🧠' },
  { name: 'Google AI',       category: 'AI & ML',       icon: '✨' },
  { name: 'Hugging Face',    category: 'AI & ML',       icon: '🤗' },
  { name: 'Cohere',          category: 'AI & ML',       icon: '🔮' },
  { name: 'Replicate',       category: 'AI & ML',       icon: '♾️' },
  { name: 'Groq',            category: 'AI & ML',       icon: '⚡' },
  { name: 'Mistral',         category: 'AI & ML',       icon: '🌪️' },
  { name: 'Stability AI',    category: 'AI & ML',       icon: '🎨' },
  { name: 'ElevenLabs',      category: 'AI & ML',       icon: '🎙️' },
  // Pagos
  { name: 'Stripe',          category: 'Pagos',         icon: '💳' },
  { name: 'PayPal',          category: 'Pagos',         icon: '🔵' },
  { name: 'MercadoPago',     category: 'Pagos',         icon: '💙' },
  { name: 'Braintree',       category: 'Pagos',         icon: '💰' },
  { name: 'Square',          category: 'Pagos',         icon: '⬜' },
  { name: 'Adyen',           category: 'Pagos',         icon: '🟢' },
  { name: 'Razorpay',        category: 'Pagos',         icon: '💸' },
  { name: 'Conekta',         category: 'Pagos',         icon: '🇲🇽' },
  { name: 'Wompi',           category: 'Pagos',         icon: '🇨🇴' },
  { name: 'Kushki',          category: 'Pagos',         icon: '🌎' },
  // Cloud
  { name: 'AWS',             category: 'Cloud',         icon: '🟠' },
  { name: 'Google Cloud',    category: 'Cloud',         icon: '☁️' },
  { name: 'Azure',           category: 'Cloud',         icon: '🔷' },
  { name: 'Cloudflare',      category: 'Cloud',         icon: '🌤️' },
  { name: 'DigitalOcean',    category: 'Cloud',         icon: '🌊' },
  { name: 'Hetzner',         category: 'Cloud',         icon: '🖥️' },
  { name: 'Linode',          category: 'Cloud',         icon: '🟢' },
  { name: 'Vultr',           category: 'Cloud',         icon: '🔵' },
  // Base de datos & Backend
  { name: 'Supabase',        category: 'Base de datos', icon: '⚡' },
  { name: 'Firebase',        category: 'Base de datos', icon: '🔥' },
  { name: 'PlanetScale',     category: 'Base de datos', icon: '🪐' },
  { name: 'Neon',            category: 'Base de datos', icon: '💚' },
  { name: 'MongoDB Atlas',   category: 'Base de datos', icon: '🍃' },
  { name: 'Redis',           category: 'Base de datos', icon: '🔴' },
  { name: 'Turso',           category: 'Base de datos', icon: '🦅' },
  { name: 'Xata',            category: 'Base de datos', icon: '🦋' },
  // Deploy & DevOps
  { name: 'Vercel',          category: 'Deploy',        icon: '▲' },
  { name: 'Netlify',         category: 'Deploy',        icon: '🌐' },
  { name: 'Railway',         category: 'Deploy',        icon: '🚂' },
  { name: 'Render',          category: 'Deploy',        icon: '🟣' },
  { name: 'Fly.io',          category: 'Deploy',        icon: '🪰' },
  { name: 'GitHub',          category: 'Deploy',        icon: '🐙' },
  { name: 'GitLab',          category: 'Deploy',        icon: '🦊' },
  { name: 'Docker Hub',      category: 'Deploy',        icon: '🐳' },
  // Email & SMS
  { name: 'SendGrid',        category: 'Email & SMS',   icon: '✉️' },
  { name: 'Resend',          category: 'Email & SMS',   icon: '📨' },
  { name: 'Mailgun',         category: 'Email & SMS',   icon: '📬' },
  { name: 'Postmark',        category: 'Email & SMS',   icon: '📮' },
  { name: 'Brevo',           category: 'Email & SMS',   icon: '📧' },
  { name: 'Twilio',          category: 'Email & SMS',   icon: '📱' },
  { name: 'Vonage',          category: 'Email & SMS',   icon: '💬' },
  { name: 'AWS SES',         category: 'Email & SMS',   icon: '📩' },
  // Comunicación
  //
  // Los nombres NO son decorativos: `useMetaVault` filtra las entradas por
  // `platform === 'Instagram'` -comparación exacta contra este texto-, así que
  // sin estas tres filas la pantalla de Meta no podía leer nada. Y no fallaba:
  // decía "no hay credenciales" para siempre, que es lo que hace que nadie
  // sepa por qué.
  { name: 'Meta',            category: 'Comunicación',  icon: '📣' },
  { name: 'Instagram',       category: 'Comunicación',  icon: '📸' },
  { name: 'Facebook',        category: 'Comunicación',  icon: '👥' },
  { name: 'Slack',           category: 'Comunicación',  icon: '💬' },
  { name: 'Discord',         category: 'Comunicación',  icon: '🎮' },
  { name: 'WhatsApp',        category: 'Comunicación',  icon: '🟢' },
  { name: 'Telegram',        category: 'Comunicación',  icon: '✈️' },
  { name: 'Intercom',        category: 'Comunicación',  icon: '💙' },
  // Analytics & Monitoring
  { name: 'DataDog',         category: 'Monitoring',    icon: '🐕' },
  { name: 'Sentry',          category: 'Monitoring',    icon: '🔍' },
  { name: 'LogRocket',       category: 'Monitoring',    icon: '🚀' },
  { name: 'Mixpanel',        category: 'Monitoring',    icon: '📊' },
  { name: 'Amplitude',       category: 'Monitoring',    icon: '📈' },
  { name: 'PostHog',         category: 'Monitoring',    icon: '🦔' },
  { name: 'Segment',         category: 'Monitoring',    icon: '⭕' },
  { name: 'New Relic',       category: 'Monitoring',    icon: '🟡' },
  // CRM & Marketing
  { name: 'HubSpot',         category: 'CRM',           icon: '🟠' },
  { name: 'Salesforce',      category: 'CRM',           icon: '☁️' },
  { name: 'Pipedrive',       category: 'CRM',           icon: '🟢' },
  { name: 'ActiveCampaign',  category: 'CRM',           icon: '📣' },
  { name: 'Klaviyo',         category: 'CRM',           icon: '📧' },
  { name: 'Mailchimp',       category: 'CRM',           icon: '🐵' },
  // Publicidad. `meta_ads` es el identificador canonico que resuelve la edge
  // function meta-ads-read via resolveCredential (DEC-011): el valor de `name`
  // viaja literal a api_vault.platform y la comparacion es exacta, por eso es
  // el slug y no un nombre de display. Sin alias. Mismo motivo por el que se
  // registro 'Serper.dev' para buscar-web.
  { name: 'meta_ads',        category: 'CRM',           icon: '📢' },
  // Búsqueda
  { name: 'Serper.dev',      category: 'Búsqueda',      icon: '🔎' },
  // Mapas & Geo
  { name: 'Google Maps',     category: 'Mapas',         icon: '📍' },
  { name: 'Mapbox',          category: 'Mapas',         icon: '🗺️' },
  { name: 'HERE Maps',       category: 'Mapas',         icon: '🧭' },
  // Autenticación
  { name: 'Auth0',           category: 'Auth',          icon: '🔐' },
  { name: 'Clerk',           category: 'Auth',          icon: '🔑' },
  { name: 'Okta',            category: 'Auth',          icon: '🛡️' },
  { name: 'Stytch',          category: 'Auth',          icon: '🔒' },
  // Storage & Media
  { name: 'Cloudinary',      category: 'Storage',       icon: '🖼️' },
  { name: 'AWS S3',          category: 'Storage',       icon: '🪣' },
  { name: 'Uploadthing',     category: 'Storage',       icon: '📁' },
  { name: 'Imgix',           category: 'Storage',       icon: '🎨' },
  // eCommerce
  { name: 'Shopify',         category: 'eCommerce',     icon: '🛍️' },
  { name: 'WooCommerce',     category: 'eCommerce',     icon: '🛒' },
  { name: 'MercadoLibre',    category: 'eCommerce',     icon: '🟡' },
  // Otro
  { name: 'Otro',            category: 'Otro',          icon: '🔑' },
]

export const VAULT_PLATFORMS = VAULT_PLATFORM_DEFS.map(p => p.name)

/**
 * Las que se usan de verdad, arriba de todo.
 *
 * La lista completa tiene noventa y dos plataformas ordenadas por categoría, y
 * las cinco que este sistema realmente lee están desparramadas en cuatro
 * categorías distintas: Meta en "Comunicación", Mercado Libre en "Pagos",
 * Serper en "Búsqueda". Cargar una credencial obligaba a recorrer la lista
 * entera sabiendo de antemano en qué categoría la pusimos nosotros.
 *
 * Estas son las que el código lee -las mismas de `credencialesRequeridas`- más
 * las dos de Mercado. Las otras ochenta y siete siguen ahí abajo: no se saca
 * ninguna, sólo se ponen éstas primero.
 */
export const VAULT_PLATFORMS_FRECUENTES = [
  'Meta', 'Instagram', 'Facebook', 'WhatsApp',
  'MercadoLibre', 'MercadoPago',
  'Serper.dev', 'Mapbox',
]

export const VAULT_PLATFORM_CATEGORIES = [
  'AI & ML', 'Pagos', 'Cloud', 'Base de datos', 'Deploy',
  'Email & SMS', 'Comunicación', 'Monitoring', 'CRM', 'Búsqueda', 'Mapas',
  'Auth', 'Storage', 'eCommerce', 'Otro',
]

export const PLATFORM_ICONS: Record<string, string> = Object.fromEntries(
  VAULT_PLATFORM_DEFS.map(p => [p.name, p.icon])
)
