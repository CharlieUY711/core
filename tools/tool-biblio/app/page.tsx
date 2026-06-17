import Link from 'next/link'

const sections = [
  {
    href: '/docs/prompts',
    label: 'Prompts',
    description: 'Prompts oficiales de CORE para producción y desarrollo de producto.',
    tag: 'PM',
    color: 'rgba(46,111,196,0.12)',
    border: 'rgba(46,111,196,0.3)',
    tagColor: '#7EB5F4',
  },
  {
    href: '/docs/architecture',
    label: 'Arquitectura',
    description: 'Technical Architecture, Database Model, Information Architecture e integraciones.',
    tag: 'ENG',
    color: 'rgba(201,168,76,0.08)',
    border: 'rgba(201,168,76,0.25)',
    tagColor: '#C9A84C',
  },
  {
    href: '/docs/strategy',
    label: 'Estrategia',
    description: 'Visión 2035, Expansion Blueprint, Monetization Model y Taxonomía de negocio.',
    tag: 'CEO',
    color: 'rgba(29,158,117,0.08)',
    border: 'rgba(29,158,117,0.25)',
    tagColor: '#4ECBA0',
  },
  {
    href: '/docs/roadmap',
    label: 'Roadmap',
    description: 'Fases de desarrollo: MVP → Growth → Scale → Leadership 2026–2035.',
    tag: 'PLAN',
    color: 'rgba(83,74,183,0.1)',
    border: 'rgba(83,74,183,0.3)',
    tagColor: '#9F97E8',
  },
  {
    href: '/docs/products',
    label: 'Productos',
    description: 'CORE Logistics, Rep, Market, Intelligence y Finance — Brand Architecture.',
    tag: 'PROD',
    color: 'rgba(216,90,48,0.08)',
    border: 'rgba(216,90,48,0.25)',
    tagColor: '#F4956A',
  },
]

export default function HomePage() {
  return (
    <div className="animate-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="font-mono text-[11px] tracking-[0.16em] uppercase px-2.5 py-1 rounded"
            style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            v1.0 — 2026
          </span>
          <span
            className="font-mono text-[11px] tracking-[0.1em] uppercase"
            style={{ color: 'rgba(232,237,245,0.3)' }}
          >
            Confidencial
          </span>
        </div>

        <h1
          className="text-4xl font-semibold tracking-tight mb-3"
          style={{ color: '#E8EDF5' }}
        >
          Biblioteca{' '}
          <span
            className="font-mono"
            style={{ color: '#C9A84C' }}
          >
            CORE
          </span>
        </h1>

        <p
          className="text-base max-w-xl leading-relaxed"
          style={{ color: 'rgba(232,237,245,0.55)' }}
        >
          Documentación oficial del ecosistema CORE — Blueprint Estratégico,
          Técnico y Operativo 2026–2035.
        </p>
      </div>

      {/* Gold rule */}
      <div className="gold-rule mb-10" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        {[
          { value: '5', label: 'Países activos' },
          { value: '10', label: 'Capítulos' },
          { value: '4', label: 'Verticales' },
          { value: '2035', label: 'Horizonte' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-4 py-3 animate-in delay-1"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p
              className="font-mono text-2xl font-medium"
              style={{ color: '#C9A84C' }}
            >
              {stat.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,245,0.4)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Section grid */}
      <div>
        <p
          className="text-[11px] font-medium tracking-[0.12em] uppercase mb-4"
          style={{ color: 'rgba(232,237,245,0.35)' }}
        >
          Secciones disponibles
        </p>

        <div className="grid grid-cols-1 gap-3">
          {sections.map((section, i) => (
            <Link
              key={section.href}
              href={section.href}
              className={`group flex items-center justify-between rounded-xl px-5 py-4 transition-all duration-200 animate-in delay-${i + 1}`}
              style={{
                background: section.color,
                border: `1px solid ${section.border}`,
              }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="font-mono text-[10px] font-medium tracking-wider px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: section.tagColor,
                    border: `1px solid ${section.border}`,
                    minWidth: '44px',
                    textAlign: 'center',
                  }}
                >
                  {section.tag}
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#E8EDF5' }}>
                    {section.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(232,237,245,0.45)' }}>
                    {section.description}
                  </p>
                </div>
              </div>
              <svg
                className="w-4 h-4 opacity-30 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
                style={{ color: '#E8EDF5', flexShrink: 0 }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="mt-12 pt-8 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <p
          className="font-mono text-[11px] tracking-wider text-center"
          style={{ color: 'rgba(201,168,76,0.4)' }}
        >
          CORE — Global Supply. Regional Growth.
        </p>
      </div>
    </div>
  )
}

