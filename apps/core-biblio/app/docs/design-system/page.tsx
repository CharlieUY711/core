import PageHeader from '@/app/components/PageHeader'
import DocCard from '@/app/components/DocCard'

// ─── Inline content components ───────────────────────────────────────────────

function ColorPalette() {
  const colors = [
    { name: 'Navy CORE',  hex: '#0D2B55', uso: 'Títulos H1, portadas, elementos primarios' },
    { name: 'Blue CORE',  hex: '#1A4F9C', uso: 'Títulos H2, bordes de sección' },
    { name: 'Blue Light', hex: '#2E6FC4', uso: 'Títulos H3, bordes de tabla header' },
    { name: 'Blue Pale',  hex: '#D8E8F8', uso: 'Fondos de callout, highlights' },
    { name: 'Gold CORE',  hex: '#C9A84C', uso: 'Divisores, acentos decorativos' },
    { name: 'Gray Body',  hex: '#4A4A4A', uso: 'Texto de párrafo principal' },
    { name: 'Gray Mid',   hex: '#7A7A7A', uso: 'Subtextos, metadatos, pie de página' },
    { name: 'Gray Light', hex: '#F2F5FA', uso: 'Fondos de tablas (filas pares), código' },
    { name: 'Red Alert',  hex: '#C0392B', uso: 'Alertas, confidencial, advertencias' },
    { name: 'White',      hex: '#FFFFFF', uso: 'Fondo principal, texto sobre fondos oscuros' },
  ]
  return (
    <div className="space-y-2">
      {colors.map((c, i) => (
        <div key={c.hex} className="flex items-center gap-3 rounded-lg px-3 py-2"
          style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
          <div className="w-8 h-8 rounded flex-shrink-0 border border-white/10" style={{ background: c.hex }} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium" style={{ color: '#E8EDF5' }}>{c.name}</span>
            <span className="font-mono text-[10px] ml-2" style={{ color: 'rgba(232,237,245,0.35)' }}>{c.hex}</span>
          </div>
          <span className="text-[11px] text-right hidden sm:block" style={{ color: 'rgba(232,237,245,0.4)' }}>{c.uso}</span>
        </div>
      ))}
    </div>
  )
}

function TypographySystem() {
  const types = [
    { elem: 'Título H1',         font: 'Calibri', size: '18pt', style: 'Bold',    color: 'Blanco / fondo Navy' },
    { elem: 'Subtítulo H2',      font: 'Calibri', size: '14pt', style: 'Bold',    color: '#0D2B55 Navy' },
    { elem: 'Subtítulo H3',      font: 'Calibri', size: '12pt', style: 'Bold',    color: '#1A4F9C Blue' },
    { elem: 'Párrafo body',      font: 'Calibri', size: '11pt', style: 'Regular', color: '#4A4A4A Gray Body' },
    { elem: 'Pie de página',     font: 'Calibri', size: '9pt',  style: 'Regular', color: '#7A7A7A Gray Mid' },
    { elem: 'Código / mono',     font: 'Courier New', size: '9pt', style: 'Regular', color: '#2D2D2D' },
    { elem: 'Leyenda / caption', font: 'Calibri', size: '9pt',  style: 'Italic',  color: '#7A7A7A Gray Mid' },
  ]
  const web = [
    { elem: 'Display / Hero', size: '3–4rem', lh: '1.1' },
    { elem: 'H1',             size: '2rem',   lh: '1.2' },
    { elem: 'H2',             size: '1.5rem', lh: '1.3' },
    { elem: 'H3',             size: '1.25rem',lh: '1.4' },
    { elem: 'Body',           size: '1rem',   lh: '1.6' },
    { elem: 'Caption / Meta', size: '0.75rem',lh: '1.4' },
    { elem: 'Código',         size: '0.875rem',lh: '1.5' },
  ]
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-medium tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Documentos</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#0D2B55' }}>
                {['Elemento','Fuente','Tamaño','Estilo','Color'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t, i) => (
                <tr key={t.elem} style={{ background: i % 2 === 0 ? 'rgba(242,245,250,0.04)' : 'transparent' }}>
                  <td className="px-3 py-2" style={{ color: '#E8EDF5' }}>{t.elem}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.font}</td>
                  <td className="px-3 py-2" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.size}</td>
                  <td className="px-3 py-2" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.style}</td>
                  <td className="px-3 py-2" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.color}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium tracking-widest uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Escala web (rem)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#0D2B55' }}>
                {['Elemento','Tamaño','Line Height'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {web.map((t, i) => (
                <tr key={t.elem} style={{ background: i % 2 === 0 ? 'rgba(242,245,250,0.04)' : 'transparent' }}>
                  <td className="px-3 py-2" style={{ color: '#E8EDF5' }}>{t.elem}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.size}</td>
                  <td className="px-3 py-2" style={{ color: 'rgba(232,237,245,0.5)' }}>{t.lh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] italic px-3 py-2 rounded" style={{ color: '#2E6FC4', background: 'rgba(216,232,248,0.08)', borderLeft: '3px solid #2E6FC4' }}>
        Fuente web: &apos;Calibri&apos;, &apos;Segoe UI&apos;, sans-serif. Fallback primario: Segoe UI en Linux / browsers sin Office.
      </p>
    </div>
  )
}

function CSSVariables() {
  const vars = [
    ['--color-navy',       '#0D2B55'],
    ['--color-blue',       '#1A4F9C'],
    ['--color-blue-light', '#2E6FC4'],
    ['--color-blue-pale',  '#D8E8F8'],
    ['--color-gold',       '#C9A84C'],
    ['--color-gray-body',  '#4A4A4A'],
    ['--color-gray-mid',   '#7A7A7A'],
    ['--color-gray-light', '#F2F5FA'],
    ['--color-red-alert',  '#C0392B'],
    ['--font-primary',     "Calibri, 'Segoe UI', sans-serif"],
    ['--font-mono',        "'Courier New', monospace"],
    ['--radius-sm',        '4px'],
    ['--radius-md',        '8px'],
    ['--shadow-card',      '0 2px 8px rgba(13,43,85,0.08)'],
  ]
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-4 py-2" style={{ background: '#0D2B55' }}>
        <span className="font-mono text-[11px]" style={{ color: 'rgba(232,237,245,0.6)' }}>:root {'{'}</span>
      </div>
      <div className="px-4 py-3 space-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {vars.map(([k, v]) => (
          <div key={k} className="flex gap-3 font-mono text-[11px]">
            <span style={{ color: '#7EB5F4' }}>{k}:</span>
            <span style={{ color: '#C9A84C' }}>{v};</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2" style={{ background: '#0D2B55' }}>
        <span className="font-mono text-[11px]" style={{ color: 'rgba(232,237,245,0.6)' }}>{'}'}</span>
      </div>
    </div>
  )
}

function UIComponents() {
  const comps = [
    ['Botones',       'Primario Navy, secundario outline Blue Light. Texto blanco o Navy. Calibri 11pt.'],
    ['Inputs',        'Borde 1pt Gray Mid. Fondo blanco. Placeholder Gray Mid. Focus: borde Blue Light.'],
    ['Tablas',        'Header Navy + texto blanco. Filas alternas Gray Light / White. Bordes #C8D5E8.'],
    ['Cards',         'Fondo White o Gray Light. Borde 1pt #C8D5E8. Radio 4px. Sombra sutil.'],
    ['Modales',       'Overlay Navy 70% opacidad. Contenedor White. Borde Blue Light.'],
    ['Menús',         'Fondo Navy. Texto White. Hover: Blue Light. Activo: Gold CORE subrayado.'],
    ['Dashboards',    'Grid 12 columnas. KPIs en cards Gold accent. Gráficos Blue palette.'],
    ['Badges / Tags', 'Fondo Blue Pale. Texto Blue CORE. Borde Blue Light. Calibri 9pt Bold.'],
    ['Alertas',       'Fondo Red Alert 10% opacidad. Borde izquierdo 4pt Red Alert.'],
    ['Callouts',      'Fondo Blue Pale. Borde izquierdo 6pt Blue Light. Texto cursiva Blue CORE.'],
  ]
  const states = [
    ['Default',   'Color base definido por componente'],
    ['Hover',     '+10% luminosidad o color adyacente de paleta'],
    ['Active',    '-10% luminosidad'],
    ['Focus',     'outline 2px Blue Light con offset 2px'],
    ['Disabled',  '40% opacidad, cursor not-allowed'],
    ['Error',     'Borde y texto Red Alert'],
    ['Success',   'Borde y texto #1D9E75 (Green CORE)'],
  ]
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#0D2B55' }}>
              <th className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>Componente</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {comps.map(([c, d], i) => (
              <tr key={c} style={{ background: i % 2 === 0 ? 'rgba(242,245,250,0.04)' : 'transparent' }}>
                <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: '#E8EDF5' }}>{c}</td>
                <td className="px-3 py-2" style={{ color: 'rgba(232,237,245,0.5)' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="text-[10px] font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(201,168,76,0.6)' }}>Estados de interacción</p>
        <div className="grid grid-cols-1 gap-1">
          {states.map(([s, d], i) => (
            <div key={s} className="flex gap-3 px-3 py-1.5 rounded text-xs"
              style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <span className="font-mono w-20 flex-shrink-0" style={{ color: '#C9A84C' }}>{s}</span>
              <span style={{ color: 'rgba(232,237,245,0.45)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Animations() {
  const items = [
    ['Globe',             'Rotación suave constante. Rutas animadas por arco. Hubs pulsantes. Modo día/noche UTC.'],
    ['Transiciones UI',   'ease-in-out 200ms. Sin saltos bruscos. Hover states suaves.'],
    ['Indicadores carga', 'Spinner circular. Color Blue Light. No usar barras de progreso lineales.'],
    ['Page transitions',  'Fade-in desde abajo 16px. Duración 300ms. Delay escalonado entre elementos.'],
    ['Rutas del globo',   'Grosor según volumen. Azul=logística, oro=rep, verde=market.'],
  ]
  const principles = [
    '150ms microinteracciones · 300ms transiciones de página · 600ms+ globo',
    'Easing: ease-in-out default · ease-out para entrar · ease-in para salir',
    'Nunca usar animaciones que distraigan del contenido',
    'Respetar prefers-reduced-motion',
  ]
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {items.map(([e, d], i) => (
          <div key={e} className="flex gap-3 px-3 py-2 rounded text-xs"
            style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
            <span className="font-medium w-36 flex-shrink-0" style={{ color: '#E8EDF5' }}>{e}</span>
            <span style={{ color: 'rgba(232,237,245,0.45)' }}>{d}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-3 rounded space-y-1.5" style={{ background: 'rgba(216,232,248,0.06)', borderLeft: '3px solid #2E6FC4' }}>
        <p className="text-[10px] font-medium tracking-widest uppercase mb-2" style={{ color: '#2E6FC4' }}>Principios</p>
        {principles.map(p => (
          <p key={p} className="text-[11px]" style={{ color: 'rgba(232,237,245,0.5)' }}>— {p}</p>
        ))}
      </div>
    </div>
  )
}

function Nomenclature() {
  const files = [
    ['Documento Word',      'CORE_NOMBRE_vX.X.docx',     'CORE_TechSpec_v2.0.docx'],
    ['Presentación',        'CORE_NOMBRE_vX.X.pptx',     'CORE_InvestorDeck_v1.0.pptx'],
    ['Imagen / Asset',      'core-nombre-variante.ext',  'core-logo-navy.svg'],
    ['Componente UI',       'PascalCase.tsx',             'NavMenu.tsx'],
    ['Página Next.js',      'app/ruta/page.tsx',          'app/docs/strategy/page.tsx'],
    ['Variable CSS color',  '--color-navy-core',          '--color-gold-core'],
    ['Clase Tailwind',      'core-[nombre]',              'core-callout, core-badge'],
  ]
  const code = [
    ['Componentes React',    'PascalCase',          'NavMenu, CoreButton'],
    ['Hooks',                'camelCase + use',     'useSupabase, useSession'],
    ['Constantes',           'UPPER_SNAKE_CASE',    'NAVY_CORE, API_BASE_URL'],
    ['Funciones/variables',  'camelCase',           'handleLogin, isAuthenticated'],
    ['Rutas API',            'kebab-case',          '/api/v1/core-market'],
  ]
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#0D2B55' }}>
              {['Tipo','Formato','Ejemplo'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.map(([t, f, e], i) => (
              <tr key={t} style={{ background: i % 2 === 0 ? 'rgba(242,245,250,0.04)' : 'transparent' }}>
                <td className="px-3 py-2" style={{ color: '#E8EDF5' }}>{t}</td>
                <td className="px-3 py-2 font-mono" style={{ color: '#C9A84C' }}>{f}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'rgba(232,237,245,0.4)' }}>{e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="text-[10px] font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(201,168,76,0.6)' }}>Convenciones de código</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#0D2B55' }}>
                {['Elemento','Convención','Ejemplo'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {code.map(([e, c, ex], i) => (
                <tr key={e} style={{ background: i % 2 === 0 ? 'rgba(242,245,250,0.04)' : 'transparent' }}>
                  <td className="px-3 py-2" style={{ color: '#E8EDF5' }}>{e}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: '#C9A84C' }}>{c}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'rgba(232,237,245,0.4)' }}>{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Confidentiality() {
  const levels = [
    ['Público',      'Público',                      'Cualquier persona. Materiales de marketing y website.'],
    ['Interno',      'Uso interno',                  'Empleados y contratistas de CORE.'],
    ['Confidencial', 'Confidencial — Uso interno',   'Equipos directivos, managers, leads técnicos.'],
    ['Restringido',  'Restringido — Alta Dirección',  'C-Level, directorio, inversores.'],
    ['Secreto',      'Secreto — No distribuir',       'Solo personas autorizadas por CEO.'],
  ]
  const colors: Record<string, string> = {
    'Público':      '#4ECBA0',
    'Interno':      '#7EB5F4',
    'Confidencial': '#C9A84C',
    'Restringido':  '#F4956A',
    'Secreto':      '#C0392B',
  }
  return (
    <div className="space-y-2">
      {levels.map(([ nivel, etiqueta, dest ]) => (
        <div key={nivel} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
            style={{ background: `${colors[nivel]}18`, color: colors[nivel], border: `1px solid ${colors[nivel]}33` }}>
            {nivel.toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-medium" style={{ color: '#E8EDF5' }}>{etiqueta}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(232,237,245,0.4)' }}>{dest}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const sections = [
  {
    number: '01',
    title: 'Paleta de Colores Corporativos',
    description: 'Eje Navy-Blue-Gold que transmite profesionalismo, tecnología y confianza regional.',
    badge: 'Brand',
    badgeColor: '#C9A84C',
    items: ['Navy CORE · Blue CORE · Blue Light · Blue Pale', 'Gold CORE — exclusivo para acentos', 'Gray Body / Mid / Light', 'Red Alert · White'],
    content: <ColorPalette />,
  },
  {
    number: '02',
    title: 'Sistema Tipográfico',
    description: 'Calibri como tipografía oficial. Courier New para código. Escala definida para documentos y web.',
    badge: 'Type',
    badgeColor: '#7EB5F4',
    items: ['Calibri Bold / Regular para todos los documentos', 'Courier New para código monoespaciado', 'Escala rem para implementaciones web'],
    content: <TypographySystem />,
  },
  {
    number: '03',
    title: 'Variables CSS y Tokens de Diseño',
    description: 'Tokens centralizados para todas las implementaciones web. Nunca usar valores hardcodeados.',
    badge: 'Dev',
    badgeColor: '#4ECBA0',
    items: ['Variables de color en :root', 'Fuentes y radios', 'Sombras y efectos', 'Compatibles con Tailwind config'],
    content: <CSSVariables />,
  },
  {
    number: '04',
    title: 'Componentes UI',
    description: 'Estilo minimalista-profesional. Sin bordes redondeados excesivos ni sombras dramáticas.',
    badge: 'UI',
    badgeColor: '#9F97E8',
    items: ['Botones, inputs, tablas, cards', 'Modales, menús, dashboards', 'Badges, alertas, callouts', 'Estados: hover, focus, error, disabled'],
    content: <UIComponents />,
  },
  {
    number: '05',
    title: 'Animaciones y Motion',
    description: 'Animaciones funcionales y contenidas. El Globe Experience es la animación principal de la marca.',
    badge: 'Motion',
    badgeColor: '#F4956A',
    items: ['Globe: rotación suave + rutas animadas + hubs pulsantes', 'Transiciones UI: 200ms ease-in-out', 'Page transitions: 300ms fade-in', 'Respeta prefers-reduced-motion'],
    content: <Animations />,
  },
  {
    number: '06',
    title: 'Nomenclatura y Convenciones',
    description: 'Estándar de nombres para archivos, componentes, variables y rutas de API.',
    badge: 'Std',
    badgeColor: '#C9A84C',
    items: ['Archivos: CORE_NOMBRE_vX.X.docx', 'Componentes React: PascalCase', 'Variables CSS: kebab-case', 'Rutas API: /api/v1/core-[nombre]'],
    content: <Nomenclature />,
  },
  {
    number: '07',
    title: 'Niveles de Confidencialidad',
    description: 'Todo material de CORE debe estar clasificado. La etiqueta aparece en portada, encabezado y pie de página.',
    badge: 'Policy',
    badgeColor: '#C0392B',
    items: ['Público · Interno · Confidencial', 'Restringido — Alta Dirección', 'Secreto — No distribuir', 'Default Biblioteca: Confidencial — Uso interno'],
    content: <Confidentiality />,
  },
]

export default function DesignSystemPage() {
  return (
    <div>
      <PageHeader
        tag="Brand · Design System"
        tagColor="#C9A84C"
        tagBg="rgba(201,168,76,0.1)"
        title="Design System & Brand Guidelines"
        subtitle="Definiciones gráficas, visuales y de comunicación corporativa del ecosistema CORE."
      />
      <div className="grid grid-cols-1 gap-3">
        {sections.map((section, i) => (
          <div key={section.number} className={`animate-in delay-${i + 1}`}>
            <DocCard
              {...section}
              downloadLabel="Descargar .docx"
              downloadHref="/CORE_DesignSystem_v1.0.docx"
            />
          </div>
        ))}
      </div>
      <div
        className="mt-8 rounded-xl px-5 py-4 animate-in"
        style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: '#C9A84C' }}>
          Documento oficial
        </p>
        <p className="font-mono text-xs" style={{ color: 'rgba(232,237,245,0.45)' }}>
          CORE_DesignSystem_v1.0.docx · Confidencial — Uso interno · Mayo 2026
        </p>
      </div>
    </div>
  )
}

