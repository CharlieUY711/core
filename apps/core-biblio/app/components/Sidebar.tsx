'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@core/auth/supabaseClient'

const navItems = [
  {
    group: 'Principal',
    links: [
      { href: '/', label: 'Inicio', icon: '⬡' },
    ],
  },
  {
    group: 'Documentación',
    links: [
      { href: '/docs/prompts',        label: 'Prompts',        icon: '◈' },
      { href: '/docs/architecture',   label: 'Arquitectura',   icon: '◇' },
      { href: '/docs/strategy',       label: 'Estrategia',     icon: '◉' },
      { href: '/docs/roadmap',        label: 'Roadmap',        icon: '◎' },
      { href: '/docs/products',       label: 'Productos',      icon: '◆' },
      { href: '/docs/design-system',  label: 'Design System',  icon: '◐' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[260px] flex flex-col z-40"
      style={{ background: '#060D1A', borderRight: '1px solid rgba(201,168,76,0.12)' }}
    >
      <div className="px-6 py-6">
        <Link href="/" className="flex flex-col gap-1 group">
          <span className="font-mono font-semibold tracking-[0.18em] text-xl transition-colors" style={{ color: '#E8EDF5' }}>
            CORE
          </span>
          <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: 'rgba(201,168,76,0.6)' }}>
            Biblioteca Interna
          </span>
        </Link>
      </div>

      <div className="gold-rule mx-6 mb-5" />

      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {navItems.map((section) => (
          <div key={section.group}>
            <p className="px-3 mb-1.5 text-[10px] font-medium tracking-[0.14em] uppercase"
              style={{ color: 'rgba(232,237,245,0.3)' }}>
              {section.group}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive ? 'text-white' : 'hover:text-white'}`}
                      style={{
                        background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                        color: isActive ? '#E8EDF5' : 'rgba(232,237,245,0.5)',
                        borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                      }}
                    >
                      <span className="text-[13px]" style={{ color: isActive ? '#C9A84C' : 'rgba(201,168,76,0.4)' }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-3"
          style={{ color: 'rgba(232,237,245,0.4)', background: 'transparent' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#C0392B'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(192,57,43,0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,237,245,0.4)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="text-[11px] tracking-widest uppercase font-medium">Cerrar sesión</span>
        </button>
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }} className="pt-3">
          <p className="text-[10px]" style={{ color: 'rgba(232,237,245,0.25)' }}>v1.0 · Mayo 2026</p>
          <p className="text-[10px]" style={{ color: 'rgba(232,237,245,0.2)' }}>Confidencial — Uso interno</p>
        </div>
      </div>
    </aside>
  )
}

