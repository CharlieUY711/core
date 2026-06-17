import PageHeader from '@/app/components/PageHeader'

const phases = [
  {
    phase: 'Fase 1',
    name: 'Consolidación',
    period: '2026 – 2027',
    status: 'current',
    color: '#4ECBA0',
    milestones: [
      'Operaciones en 5 países (UY, BR, PY, AR, CL)',
      'Plataforma MVP completa',
      'Primeras 100 marcas en CORE Rep',
      'CORE Market live en 5 países',
      '10.000 SKUs activos',
    ],
    tech: ['Logistics Engine v1', 'Rep Engine v1', 'Market Engine v1', 'Identity & Access', 'Billing'],
  },
  {
    phase: 'Fase 2',
    name: 'Expansión',
    period: '2028 – 2030',
    status: 'planned',
    color: '#C9A84C',
    milestones: [
      'Ingreso a Perú y Colombia',
      'CORE Intelligence activo (beta)',
      'APIs públicas + mobile app',
      'Entrada a México vía CORE Market B2B',
      '8 países activos · 500.000 SKUs',
    ],
    tech: ['Intelligence Engine', 'Event-driven completo', 'Data Lake', 'APIs públicas', 'Mobile app'],
  },
  {
    phase: 'Fase 3',
    name: 'Liderazgo',
    period: '2031 – 2035',
    status: 'future',
    color: '#9F97E8',
    milestones: [
      '10 países · 50.000 empresas',
      '2M SKUs · 500M eventos/año',
      'CORE Finance activo',
      'Globe Experience completo',
      'Liderazgo de mercado LATAM',
    ],
    tech: ['Finance Engine', 'AI predictivo', 'Globe Experience', '500M eventos/año', '99.95% SLA'],
  },
]

const techRoadmap = [
  { period: 'Q2–Q3 2026', label: 'MVP', items: ['Logistics v1', 'Rep v1', 'Market v1', 'Auth'], color: '#4ECBA0' },
  { period: 'Q4 2026–2027', label: 'Growth', items: ['Billing', 'Integrations Layer', 'APIs públicas', 'Mobile'], color: '#7EB5F4' },
  { period: '2028–2029', label: 'Scale', items: ['Intelligence Engine', 'Event-driven', 'Data Lake'], color: '#C9A84C' },
  { period: '2030–2035', label: 'Leadership', items: ['Finance Engine', 'AI predictivo', 'Globe Experience'], color: '#9F97E8' },
]

export default function RoadmapPage() {
  return (
    <div>
      <PageHeader
        tag="PLAN · Roadmap"
        tagColor="#9F97E8"
        tagBg="rgba(83,74,183,0.1)"
        title="Roadmap 2026 – 2035"
        subtitle="Tres fases de desarrollo: Consolidación, Expansión y Liderazgo regional."
      />

      {/* Phases */}
      <div className="space-y-4 mb-8">
        {phases.map((phase, i) => (
          <div
            key={phase.phase}
            className={`rounded-xl p-5 animate-in delay-${i + 1}`}
            style={{
              background: phase.status === 'current' ? `${phase.color}08` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${phase.status === 'current' ? phase.color + '30' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px]" style={{ color: phase.color }}>
                    {phase.phase}
                  </span>
                  {phase.status === 'current' && (
                    <span
                      className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                      style={{ background: `${phase.color}20`, color: phase.color, border: `1px solid ${phase.color}40` }}
                    >
                      En curso
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-base" style={{ color: '#E8EDF5' }}>
                  {phase.name}
                </h3>
              </div>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'rgba(232,237,245,0.4)' }}
              >
                {phase.period}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
              {phase.milestones.map((m) => (
                <div key={m} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                  <span className="text-xs" style={{ color: 'rgba(232,237,245,0.5)' }}>{m}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {phase.tech.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[10px] px-2 py-0.5 rounded"
                  style={{ background: `${phase.color}10`, color: `${phase.color}BB`, border: `1px solid ${phase.color}20` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tech roadmap */}
      <div className="animate-in delay-4">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(232,237,245,0.35)' }}>
          Roadmap tecnológico
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {techRoadmap.map((row, i) => (
            <div
              key={row.period}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderBottom: i < techRoadmap.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div className="w-24 flex-shrink-0">
                <p className="font-mono text-[10px]" style={{ color: row.color }}>{row.label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(232,237,245,0.3)' }}>{row.period}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.items.map((item) => (
                  <span
                    key={item}
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,237,245,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

