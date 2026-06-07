import PageHeader from '@/app/components/PageHeader'
import DocCard from '@/app/components/DocCard'

const countries = [
  { name: 'Uruguay', role: 'HQ', status: 'Activo', color: '#4ECBA0' },
  { name: 'Brasil (Sur)', role: 'Cross-border', status: 'Activo', color: '#4ECBA0' },
  { name: 'Paraguay', role: 'Distribución', status: 'Activo', color: '#4ECBA0' },
  { name: 'Argentina', role: 'Representación', status: 'Activo', color: '#4ECBA0' },
  { name: 'Chile', role: 'Marketplace', status: 'Activo', color: '#4ECBA0' },
  { name: 'Perú', role: 'Alianza local', status: '2028', color: '#C9A84C' },
  { name: 'Colombia', role: 'Rep + Market', status: '2028', color: '#C9A84C' },
  { name: 'México', role: 'Market B2B', status: '2029', color: '#9F97E8' },
  { name: 'Bolivia', role: 'Log. terrestre', status: '2030', color: '#9F97E8' },
]

const values = ['Integración', 'Transparencia', 'Escalabilidad', 'Regionalidad', 'Innovación', 'Eficiencia']

const monetization = [
  { vertical: 'CORE Logistics', model: 'Tarifas por servicio', color: '#7EB5F4' },
  { vertical: 'CORE Rep', model: 'Comisiones + Fees mensuales', color: '#4ECBA0' },
  { vertical: 'CORE Market', model: 'Comisión + Suscripción + Ads', color: '#C9A84C' },
  { vertical: 'CORE Intelligence', model: 'Suscripción SaaS', color: '#9F97E8' },
  { vertical: 'CORE Finance', model: 'Intereses + Comisiones', color: '#F4956A' },
]

export default function StrategyPage() {
  return (
    <div>
      <PageHeader
        tag="CEO · Estrategia"
        tagColor="#4ECBA0"
        tagBg="rgba(29,158,117,0.08)"
        title="Estrategia CORE"
        subtitle="Visión 2035, Expansion Blueprint, Modelo de Monetización y Taxonomía de negocio."
      />

      {/* Vision */}
      <div className="animate-in delay-1 mb-6">
        <DocCard
          title="Visión 2035"
          description="La plataforma líder de operaciones y comercio regional en Latinoamérica."
          badge="Cap. 01"
          badgeColor="#4ECBA0"
          items={[
            'Operador regional con presencia en 10 países',
            'Puente entre marcas, logística y mercados',
            'Estándar de tecnología y eficiencia para LATAM',
            '50.000 empresas · 2M SKUs · 500M eventos/año',
          ]}
        />
      </div>

      {/* Values */}
      <div className="animate-in delay-2 mb-6">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(232,237,245,0.35)' }}>
          Valores corporativos
        </p>
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="font-mono text-[11px] px-3 py-1 rounded-full"
              style={{ background: 'rgba(201,168,76,0.08)', color: 'rgba(201,168,76,0.7)', border: '1px solid rgba(201,168,76,0.15)' }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Countries */}
      <div className="animate-in delay-3 mb-6">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(232,237,245,0.35)' }}>
          Presencia regional
        </p>
        <div className="grid grid-cols-3 gap-2">
          {countries.map((c) => (
            <div
              key={c.name}
              className="rounded-lg px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium" style={{ color: '#E8EDF5' }}>{c.name}</p>
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: `${c.color}18`, color: c.color }}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(232,237,245,0.35)' }}>{c.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monetization */}
      <div className="animate-in delay-4">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(232,237,245,0.35)' }}>
          Modelo de monetización
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {monetization.map((m, i) => (
            <div
              key={m.vertical}
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderBottom: i < monetization.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <p className="text-xs font-medium" style={{ color: '#E8EDF5' }}>{m.vertical}</p>
              </div>
              <p className="text-xs" style={{ color: 'rgba(232,237,245,0.4)' }}>{m.model}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

