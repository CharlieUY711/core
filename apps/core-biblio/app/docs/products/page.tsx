import PageHeader from '@/app/components/PageHeader'

const products = [
  {
    id: 'logistics',
    name: 'CORE Logistics',
    tagline: 'Motor de operaciones logísticas regionales',
    status: 'Activo',
    statusColor: '#4ECBA0',
    color: '#7EB5F4',
    description:
      'Gestiona envíos nacionales e internacionales, inventarios en depósitos propios y de terceros, trámites aduaneros, cross-docking y fulfillment.',
    features: [
      'Creación y seguimiento de envíos',
      'Gestión de inventarios y depósitos',
      'Tramitación aduanera (DUA, CFE, NF-e)',
      'Cross-docking y fulfillment',
      'Tracking en tiempo real',
      'Integraciones DHL / FedEx / UPS',
    ],
    revenue: 'Tarifa por envío · Almacenamiento · Picking · Aduana',
  },
  {
    id: 'rep',
    name: 'CORE Rep',
    tagline: 'Representación comercial de marcas internacionales',
    status: 'Activo',
    statusColor: '#4ECBA0',
    color: '#4ECBA0',
    description:
      'Permite a marcas internacionales gestionar su expansión en LATAM a través de canales retail, horeca y gourmet.',
    features: [
      'Gestión de marcas y productos',
      'Canales: Retail · Horeca · Gourmet',
      'Red de distribuidores',
      'Prospección y reuniones comerciales',
      'Trade marketing digital',
      'Reportes de venta por canal',
    ],
    revenue: 'Fee mensual por marca · Comisión sobre ventas · Trade marketing',
  },
  {
    id: 'market',
    name: 'CORE Market',
    tagline: 'Marketplace B2B regional',
    status: 'Activo',
    statusColor: '#4ECBA0',
    color: '#C9A84C',
    description:
      'Conecta vendedores (marcas, distribuidores, importadores) con compradores (supermercados, restaurantes, tiendas especializadas).',
    features: [
      'Catálogo multi-categoría',
      'Listings y gestión de stock',
      'Carrito y transacciones B2B',
      'Pagos integrados (MercadoPago / Stripe)',
      'Sponsored listings y branded ads',
      'Suscripciones Seller Pro / Buyer Premium',
    ],
    revenue: 'Comisión por transacción · Suscripciones · Publicidad nativa',
  },
  {
    id: 'intelligence',
    name: 'CORE Intelligence',
    tagline: 'Analítica predictiva e inteligencia de mercado',
    status: 'Fase 2',
    statusColor: '#C9A84C',
    color: '#9F97E8',
    description:
      'Capa de analítica e inteligencia artificial para forecasting de demanda, modelos de riesgo y análisis de canales.',
    features: [
      'Forecasting de demanda',
      'Modelos de riesgo',
      'Análisis de canales y benchmarking',
      'Reportes premium',
      'Insights predictivos',
      'Integración con Data Lake CORE',
    ],
    revenue: 'Suscripción SaaS mensual · Reportes premium · Forecasting',
  },
  {
    id: 'finance',
    name: 'CORE Finance',
    tagline: 'Servicios financieros para el ecosistema CORE',
    status: 'Fase 3',
    statusColor: '#9F97E8',
    color: '#F4956A',
    description:
      'Vertical financiera para empresas que operan dentro del ecosistema: factoring, créditos operativos y pagos cross-border.',
    features: [
      'Factoring de facturas',
      'Créditos operativos',
      'Adelantos de capital',
      'Pagos cross-border',
      'Gestión de FX / spread cambiario',
      'Dashboard financiero integrado',
    ],
    revenue: 'Intereses · Comisiones · Spread cambiario',
  },
]

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        tag="PROD · Productos"
        tagColor="#F4956A"
        tagBg="rgba(216,90,48,0.08)"
        title="Productos CORE"
        subtitle="Las cinco verticales del ecosistema: Logistics, Rep, Market, Intelligence y Finance."
      />

      <div className="space-y-4">
        {products.map((product, i) => (
          <div
            key={product.id}
            className={`rounded-xl p-5 animate-in delay-${i + 1}`}
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid rgba(255,255,255,0.07)`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: product.color }}
                />
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: '#E8EDF5' }}>
                    {product.name}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(232,237,245,0.4)' }}>
                    {product.tagline}
                  </p>
                </div>
              </div>
              <span
                className="font-mono text-[10px] px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: `${product.statusColor}15`,
                  color: product.statusColor,
                  border: `1px solid ${product.statusColor}30`,
                }}
              >
                {product.status}
              </span>
            </div>

            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'rgba(232,237,245,0.5)' }}>
              {product.description}
            </p>

            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {product.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: product.color }} />
                  <span className="text-xs" style={{ color: 'rgba(232,237,245,0.45)' }}>{feature}</span>
                </div>
              ))}
            </div>

            <div
              className="rounded-lg px-3 py-2"
              style={{ background: `${product.color}08`, border: `1px solid ${product.color}18` }}
            >
              <p className="text-[10px] font-mono" style={{ color: product.color + 'AA' }}>
                Revenue: <span style={{ color: product.color }}>{product.revenue}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

