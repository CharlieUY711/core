'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { translations, type Locale } from '@charlieuy711/i18n'
import { portals, type Portal } from '@/lib/portals'

interface Props {
  user: { email: string; id: string }
  role: string
}

function getFirstName(email: string) {
  return email.split('@')[0].split('.')[0]
}

function PortalCard({ portal, locale }: { portal: Portal; locale: Locale }) {
  const tr = translations[locale]
  const isLive = portal.status === 'live'
  const isAccessible = isLive || portal.id === 'market'

  const urlMap: Record<string, string | undefined> = {
    landing:    process.env.NEXT_PUBLIC_URL_LANDING,
    biblio:     process.env.NEXT_PUBLIC_URL_BIBLIO,
    foundation: process.env.NEXT_PUBLIC_URL_FOUNDATION,
    marketing:  process.env.NEXT_PUBLIC_URL_MARKETING,
    market:     process.env.NEXT_PUBLIC_URL_MARKET,
  }
  const url = urlMap[portal.id]

  return (
    <div
      className={[
        'group relative flex flex-col border rounded-xl p-6 transition-all duration-200',
        isAccessible
          ? 'border-[#1e3354] hover:border-[#1b5ac4] cursor-pointer bg-[rgba(15,56,117,0.08)] hover:bg-[rgba(27,90,196,0.12)]'
          : 'border-[#1e3354]/50 opacity-50 bg-[rgba(15,56,117,0.04)]',
      ].join(' ')}
      onClick={() => {
        if (isAccessible && url) window.open(url, '_blank')
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0"
            style={{ backgroundColor: isLive ? '#1D9E75' : portal.id === 'market' ? '#1b5ac4' : '#2E4060' }}
          />
          <h3 className="text-sm font-semibold leading-tight" style={{ color: isAccessible ? '#e2e8f0' : '#4a6080' }}>
            {tr[portal.nameKey as keyof typeof tr]}
          </h3>
        </div>
      </div>

      <p className="text-xs leading-relaxed flex-1 mb-5" style={{ color: '#4a6080' }}>
        {tr[portal.descKey as keyof typeof tr]}
      </p>

      <div className="flex items-center justify-between">
        {isLive ? (
          <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: '#1D9E75' }}>
            {tr.dashboard_access}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        ) : portal.id === 'market' ? (
          <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: '#1b5ac4' }}>
            {tr.dashboard_access}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: '#2E4060' }}>{tr.dashboard_soon}</span>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[10px] font-mono tracking-[0.1em] uppercase whitespace-nowrap" style={{ color: '#2E4060' }}>
        {label}
      </p>
      <div className="flex-1 h-px" style={{ backgroundColor: '#1e3354' }} />
    </div>
  )
}

export default function DashboardClient({ user, role }: Props) {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('es')
  const [loggingOut, setLoggingOut] = useState(false)

  const tr = translations[locale]
  const isAdmin = role === 'admin'

  const publicPortals = portals.filter(p => p.access === 'public' && p.status === 'live')
  const livePortals   = portals.filter(p => p.access === 'restricted' && p.status === 'live')
  const devPortals    = portals.filter(p => p.status === 'dev' || p.status === 'planned')

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A1F3D', color: '#ffffff', fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar */}
      <header style={{ borderBottom: '1px solid #1e3354' }}>
        <div className="max-w-6xl mx-auto w-full px-8 py-5 flex items-center justify-between">
          <img src="/logo-white.svg" alt="Workspace by CORE" style={{ height: '32px', width: 'auto' }} />
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {(['es', 'en', 'pt'] as Locale[]).map((l) => (
                <button key={l} onClick={() => setLocale(l)} style={{
                  fontSize: '10px', fontFamily: 'monospace', padding: '3px 10px',
                  borderRadius: '4px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: locale === l ? '#7a5f2a' : '#1e3354',
                  color:       locale === l ? '#C9A84C'  : '#4a6080',
                  background:  locale === l ? 'rgba(201,168,76,0.08)' : 'transparent',
                }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="w-px h-4" style={{ backgroundColor: '#1e3354' }} />
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => router.push('/dashboard/admin')}
                  style={{
                    fontSize: '10px', fontFamily: 'monospace', padding: '4px 12px',
                    borderRadius: '4px', border: '1px solid #7a5f2a',
                    color: '#C9A84C', background: 'rgba(201,168,76,0.08)', cursor: 'pointer',
                  }}
                >
                  ADMIN
                </button>
              )}
              <p className="text-[11px] hidden sm:block" style={{ color: '#8fa3bf' }}>{user.email}</p>
              <button onClick={handleLogout} disabled={loggingOut} style={{
                fontSize: '10px', fontFamily: 'monospace', padding: '4px 12px',
                borderRadius: '4px', border: '1px solid #1e3354', color: '#4a6080',
                background: 'transparent', cursor: 'pointer',
              }}>
                {loggingOut ? '...' : tr.dashboard_logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-12">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: '#e2e8f0' }}>
            {tr.dashboard_welcome}, <span className="capitalize">{getFirstName(user.email)}</span>.
          </h1>
          <p className="text-sm" style={{ color: '#4a6080' }}>{tr.dashboard_subtitle}</p>
        </div>

        {/* Sección 1 — Públicos */}
        {publicPortals.length > 0 && (
          <div className="mb-10">
            <SectionHeader label={tr.dashboard_section_public} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {publicPortals.map(p => <PortalCard key={p.id} portal={p} locale={locale} />)}
            </div>
          </div>
        )}

        {/* Sección 2 — Restringidos activos */}
        {livePortals.length > 0 && (
          <div className="mb-10">
            <SectionHeader label={tr.dashboard_section_live} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {livePortals.map(p => <PortalCard key={p.id} portal={p} locale={locale} />)}
            </div>
          </div>
        )}

        {/* Sección 3 — En desarrollo */}
        {devPortals.length > 0 && (
          <div>
            <SectionHeader label={tr.dashboard_section_dev} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {devPortals.map(p => <PortalCard key={p.id} portal={p} locale={locale} />)}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1e3354' }}>
        <div className="max-w-6xl mx-auto w-full px-8 py-4 flex items-center justify-between">
          <p className="text-[10px] font-mono" style={{ color: '#2E4060' }}>{tr.dashboard_version}</p>
          <p className="text-[10px] font-mono" style={{ color: '#2E4060' }}>{tr.dashboard_confidential}</p>
          <p className="text-[10px] font-mono" style={{ color: '#2E4060' }}>CORE — Global Supply. Regional Growth.</p>
        </div>
      </footer>
    </div>
  )
}
