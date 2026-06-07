import PageHeader from '@/app/components/PageHeader'
import DocCard from '@/app/components/DocCard'

const prompts = [
  {
    number: '01',
    title: 'CORE-PM-BIBLIO-SETUP-V2',
    description: 'Setup del proyecto Biblioteca CORE en Next.js 14 + TypeScript + Tailwind.',
    badge: 'Setup',
    badgeColor: '#7EB5F4',
    items: [
      'Estructura de carpetas y archivos',
      'Configuración técnica completa',
      'Diseño premium estilo Linear/Stripe',
      'Standalone — sin monorepo',
    ],
    downloadLabel: 'Descargar prompt .md',
  },
  {
    number: '02',
    title: 'CORE-LANDING-V1',
    description: 'Generación de la landing page pública de CORE con globo interactivo y módulos.',
    badge: 'Web',
    badgeColor: '#4ECBA0',
    items: [
      'Hero con globo Three.js',
      'Secciones: Connect, Move, Grow, Market',
      'Mapa interactivo Cono Sur',
      'CTAs y social proof',
    ],
    downloadLabel: 'Descargar prompt .md',
  },
  {
    number: '03',
    title: 'CORE-DASHBOARD-V1',
    description: 'Dashboard operativo multi-tenant con KPIs, envíos, inventario y marketplace.',
    badge: 'App',
    badgeColor: '#9F97E8',
    items: [
      'KPI cards en tiempo real',
      'Tabla de envíos activos',
      'Gráficos de performance',
      'Alertas y notificaciones',
    ],
    downloadLabel: 'Descargar prompt .md',
  },
  {
    number: '04',
    title: 'CORE-DB-SCHEMA-V1',
    description: 'Generación del esquema PostgreSQL completo basado en el Database Master Model.',
    badge: 'DB',
    badgeColor: '#C9A84C',
    items: [
      'Tablas maestras: companies, users, brands',
      'Tablas operativas: orders, shipments, tracking',
      'Marketplace: listings, transactions, payments',
      'Particionamiento por country_code',
    ],
    downloadLabel: 'Descargar prompt .md',
  },
]

export default function PromptsPage() {
  return (
    <div>
      <PageHeader
        tag="PM · Prompts"
        tagColor="#7EB5F4"
        tagBg="rgba(46,111,196,0.1)"
        title="Prompts Oficiales"
        subtitle="Prompts de producción verificados para el desarrollo y operación del ecosistema CORE."
      />

      <div className="grid grid-cols-1 gap-3">
        {prompts.map((prompt, i) => (
          <div key={prompt.number} className={`animate-in delay-${i + 1}`}>
            <DocCard {...prompt} />
          </div>
        ))}
      </div>

      <div
        className="mt-8 rounded-xl px-5 py-4 animate-in delay-5"
        style={{
          background: 'rgba(46,111,196,0.06)',
          border: '1px solid rgba(46,111,196,0.2)',
        }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: '#7EB5F4' }}>
          Nomenclatura oficial
        </p>
        <p className="font-mono text-xs" style={{ color: 'rgba(232,237,245,0.45)' }}>
          CORE-[ÁREA]-[NOMBRE]-V[N] · Ej: CORE-PM-BIBLIO-SETUP-V2
        </p>
      </div>
    </div>
  )
}

