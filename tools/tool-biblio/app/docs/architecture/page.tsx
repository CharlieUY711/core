import PageHeader from '@/app/components/PageHeader'
import DocCard from '@/app/components/DocCard'

const chapters = [
  {
    number: '02',
    title: 'Technical Architecture',
    description: 'Principios, stack tecnológico, microservicios y módulos principales de la plataforma.',
    badge: 'Core',
    badgeColor: '#C9A84C',
    items: [
      'Multi-tenant · Multi-país · Multi-moneda',
      'API Gateway → Microservicios → Event Bus',
      'PostgreSQL / AlloyDB · Kafka / PubSub',
      'Frontend: React/Next.js + React Native',
    ],
  },
  {
    number: '05',
    title: 'Information Architecture',
    description: 'Estructura de la plataforma, navegación, roles y permisos diferenciados por vertical.',
    badge: 'IA',
    badgeColor: '#7EB5F4',
    items: [
      'Dashboard · Logistics · Rep · Market',
      'Roles: Admin Global, País, Empresa, Operador',
      'Permisos RBAC + ABAC',
      'Multi-país / Multi-idioma / Multi-moneda',
    ],
  },
  {
    number: '06',
    title: 'Database Master Model',
    description: 'Entidades maestras, modelo lógico y físico. Escalabilidad a 2035: 2M SKUs, 500M eventos.',
    badge: 'DB',
    badgeColor: '#4ECBA0',
    items: [
      'Empresas → Usuarios → Roles & Permisos',
      'Marcas → Productos → SKUs → Inventarios',
      'Órdenes → Envíos → Tracking',
      'Marketplace → Listings → Transacciones → Pagos',
    ],
  },
]

const integrations = [
  { name: 'AFIP', type: 'Fiscal', country: 'AR', color: '#7EB5F4' },
  { name: 'Receita Federal', type: 'Fiscal', country: 'BR', color: '#7EB5F4' },
  { name: 'DGI', type: 'Fiscal', country: 'UY', color: '#7EB5F4' },
  { name: 'SII', type: 'Fiscal', country: 'CL', color: '#7EB5F4' },
  { name: 'DHL / FedEx', type: 'Courier', country: 'Global', color: '#C9A84C' },
  { name: 'MercadoPago', type: 'Pagos', country: 'LATAM', color: '#4ECBA0' },
  { name: 'Stripe', type: 'Pagos', country: 'Global', color: '#4ECBA0' },
  { name: 'Mapbox', type: 'Geo', country: 'Global', color: '#9F97E8' },
]

export default function ArchitecturePage() {
  return (
    <div>
      <PageHeader
        tag="ENG · Arquitectura"
        tagColor="#C9A84C"
        tagBg="rgba(201,168,76,0.08)"
        title="Arquitectura CORE"
        subtitle="Technical Architecture, Database Model, Information Architecture e integraciones externas."
      />

      {/* Stack overview */}
      <div
        className="rounded-xl px-5 py-4 mb-6 font-mono text-xs animate-in"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[10px] tracking-wider uppercase mb-3" style={{ color: 'rgba(201,168,76,0.5)' }}>
          Stack general
        </p>
        {[
          'Frontend (React / Next.js + React Native)',
          '↓',
          'API Gateway  ·  Rate limiting  ·  Auth JWT',
          '↓',
          'Microservicios  ·  logistics · rep · market · identity',
          '↓',
          'Event Bus  (Kafka / PubSub)',
          '↓',
          'Database Cluster  (PostgreSQL / AlloyDB)',
          '↓',
          'Data Lake  (S3 / GCS)',
        ].map((line, i) => (
          <p
            key={i}
            className="leading-6"
            style={{ color: line === '↓' ? 'rgba(201,168,76,0.4)' : 'rgba(232,237,245,0.6)' }}
          >
            {line}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {chapters.map((ch, i) => (
          <div key={ch.number} className={`animate-in delay-${i + 1}`}>
            <DocCard {...ch} />
          </div>
        ))}
      </div>

      {/* Integrations */}
      <div className="animate-in delay-4">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(232,237,245,0.35)' }}>
          Integraciones externas
        </p>
        <div className="grid grid-cols-2 gap-2">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: '#E8EDF5' }}>{int.name}</p>
                <p className="text-[10px]" style={{ color: 'rgba(232,237,245,0.35)' }}>{int.type}</p>
              </div>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: `${int.color}15`, color: int.color, border: `1px solid ${int.color}25` }}
              >
                {int.country}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

