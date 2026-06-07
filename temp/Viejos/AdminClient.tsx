'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PortalConfig from './PortalConfig'
import AppScanner from './AppScanner'
import SettingsPanel from './SettingsPanel'
import ReleasePanel from './ReleasePanel'

interface Palette  { id: string; name: string; description: string }
interface Design   { id: string; name: string; description: string }
interface Portal   {
  id: string; name_es: string; status: string; access: string
  palette_id: string | null; design_id: string | null
  features: Record<string, boolean>
}

interface Props {
  user:     { email: string; id: string }
  palettes: Palette[]
  designs:  Design[]
  portals:  Portal[]
}

type Section = 'overview' | 'palettes' | 'designs' | 'portals' | 'scanner' | 'settings' | 'release'

export default function AdminClient({ user, palettes, designs, portals }: Props) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [configPortal, setConfigPortal] = useState<Portal | null>(null)
  const [releaseAppId, setReleaseAppId] = useState<string | undefined>(undefined)

  const goRelease = (id: string) => { setReleaseAppId(id); setSection('release') }

  const navItems: { id: Section; label: string; count?: number }[] = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'palettes', label: 'PALETAS',  count: palettes.length },
    { id: 'designs',  label: 'DISEÑOS',  count: designs.length },
    { id: 'portals',  label: 'APPS',     count: portals.length },
    { id: 'scanner',  label: 'ESCÁNER' },
    { id: 'release',  label: 'RELEASE' },
    { id: 'settings', label: 'SETTINGS' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', color: 'var(--color-text)', fontFamily: 'var(--font-base)' }}>

      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← WORKSPACE
            </button>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>ADMIN PANEL</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-3)' }}>{user.email}</span>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(30,45,66,0.4)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
              padding: '14px 16px', background: 'none', border: 'none',
              borderBottom: section === item.id ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: section === item.id ? 'var(--color-gold)' : 'var(--color-text-3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'color 0.15s', marginBottom: '-1px',
            }}>
              {item.label}
              {item.count !== undefined && (
                <span style={{
                  fontSize: '9px', padding: '1px 5px', borderRadius: '10px',
                  backgroundColor: section === item.id ? 'rgba(201,168,76,0.15)' : 'rgba(74,96,128,0.3)',
                  color: section === item.id ? 'var(--color-gold)' : 'var(--color-text-3)',
                }}>{item.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 32px' }}>
        {section === 'overview' && <OverviewSection palettes={palettes} designs={designs} portals={portals} setSection={setSection} />}
        {section === 'palettes' && <ListSection title="Paletas" items={palettes} type="palette" router={router} />}
        {section === 'designs'  && <ListSection title="Diseños" items={designs}  type="design"  router={router} />}
        {section === 'portals'  && (
          <PortalsSection
            portals={portals} router={router}
            onConfig={p => setConfigPortal(p)}
            onRelease={goRelease}
          />
        )}
        {section === 'scanner'  && <AppScanner />}
        {section === 'release'  && <ReleasePanel initialAppId={releaseAppId} />}
        {section === 'settings' && <SettingsPanel />}
      </main>

      {configPortal && (
        <PortalConfig
          portal={configPortal}
          palettes={palettes}
          designs={designs}
          onClose={() => setConfigPortal(null)}
          onSaved={() => { setConfigPortal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function OverviewSection({ palettes, designs, portals, setSection }: {
  palettes: Palette[]; designs: Design[]; portals: Portal[];
  setSection: (s: Section) => void
}) {
  const stats = [
    { label: 'Paletas',  value: palettes.length, section: 'palettes' as Section, color: 'var(--color-blue)' },
    { label: 'Diseños',  value: designs.length,  section: 'designs'  as Section, color: 'var(--color-green)' },
    { label: 'Apps',     value: portals.length,  section: 'portals'  as Section, color: 'var(--color-gold)' },
    { label: 'Activas',  value: portals.filter(p => p.status === 'live').length, section: 'portals' as Section, color: 'var(--color-green)' },
  ]
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>Design System Manager</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-3)' }}>Gestioná paletas, diseños y apps del ecosistema CORE.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => setSection(s.section)} style={{
            padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)',
            background: 'rgba(15,56,117,0.06)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>{s.label.toUpperCase()}</div>
          </button>
        ))}
      </div>
      <SectionHeader label="ACCIONES RÁPIDAS" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Nueva Paleta', desc: 'Definir tokens de color, tipografía y sombras',     path: '/dashboard/admin/palettes/new', color: 'var(--color-blue)' },
          { label: 'Nuevo Diseño', desc: 'Definir tokens de layout, navbar y componentes',    path: '/dashboard/admin/designs/new',  color: 'var(--color-green)' },
          { label: 'Nueva App',    desc: 'Registrar una app nueva o existente en el sistema', path: '/dashboard/admin/portals/new',  color: 'var(--color-gold)' },
        ].map(item => (
          <a key={item.label} href={item.path} style={{
            display: 'block', padding: '20px', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'rgba(15,56,117,0.04)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = item.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: item.color, marginBottom: '6px' }}>+ {item.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-3)', lineHeight: 1.5 }}>{item.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

function ListSection({ title, items, type, router }: {
  title: string;
  items: { id: string; name: string; description: string }[];
  type: 'palette' | 'design';
  router: ReturnType<typeof useRouter>
}) {
  const newPath = `/dashboard/admin/${type === 'palette' ? 'palettes' : 'designs'}/new`
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{title}</h2>
        <BtnOutline label={`+ ${type === 'palette' ? 'Nueva Paleta' : 'Nuevo Diseño'}`} onClick={() => router.push(newPath)} />
      </div>
      {items.length === 0 ? (
        <EmptyState label={`No hay ${title.toLowerCase()} todavía.`} action="Creá el primero →" path={newPath} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {items.map(item => (
            <div key={item.id} style={{
              padding: '20px', borderRadius: '10px',
              border: '1px solid var(--color-border)', background: 'rgba(15,56,117,0.06)',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', lineHeight: 1.5, flex: 1 }}>{item.description}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-3)', letterSpacing: '0.08em', marginBottom: '12px' }}>{item.id}</div>
              <BtnOutline label="EDITAR COPIA →" onClick={() => router.push(`${newPath}?from=${item.id}`)} small />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PortalsSection({ portals, router, onConfig, onRelease }: {
  portals: Portal[];
  router: ReturnType<typeof useRouter>;
  onConfig: (p: Portal) => void;
  onRelease: (id: string) => void;
}) {
  const statusColor: Record<string, string> = {
    live: 'var(--color-green)', dev: 'var(--color-blue)', planned: 'var(--color-text-3)'
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Apps</h2>
        <BtnOutline label="+ Nueva App" onClick={() => router.push('/dashboard/admin/portals/new')} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['ID', 'Nombre', 'Estado', 'Acceso', 'Paleta', 'Diseño', ''].map(h => (
              <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {portals.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,51,84,0.5)' }}>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-3)', padding: '12px' }}>{p.id}</td>
              <td style={{ fontSize: '13px', color: 'var(--color-text)', padding: '12px' }}>{p.name_es}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '2px 8px', borderRadius: '10px', backgroundColor: `${statusColor[p.status]}22`, color: statusColor[p.status] }}>
                  {p.status.toUpperCase()}
                </span>
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-3)', padding: '12px' }}>{p.access}</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '12px' }}>
                {p.palette_id
                  ? <span style={{ color: 'var(--color-blue)' }}>{p.palette_id}</span>
                  : <span style={{ color: 'var(--color-text-3)', opacity: 0.4 }}>—</span>}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '12px' }}>
                {p.design_id
                  ? <span style={{ color: 'var(--color-green)' }}>{p.design_id}</span>
                  : <span style={{ color: 'var(--color-text-3)', opacity: 0.4 }}>—</span>}
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => onRelease(p.id)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '4px 10px',
                      borderRadius: '4px', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-green)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-green)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)' }}
                  >
                    ▶ RELEASE
                  </button>
                  <button
                    onClick={() => onConfig(p)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '4px 10px',
                      borderRadius: '4px', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)' }}
                  >
                    ⚙ CONFIG
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BtnOutline({ label, onClick, small }: { label: string; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-mono)', fontSize: small ? '9px' : '10px',
      padding: small ? '4px 10px' : '6px 14px',
      borderRadius: '4px', border: '1px solid var(--color-text)',
      color: 'var(--color-text)', background: 'transparent', cursor: 'pointer',
      transition: 'all 0.15s', alignSelf: 'flex-start',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-gold)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-text)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
    >
      {label}
    </button>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

function EmptyState({ label, action, path }: { label: string; action: string; path: string }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '12px' }}>
      <p style={{ fontSize: '13px', color: 'var(--color-text-3)', marginBottom: '12px' }}>{label}</p>
      <a href={path} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gold)', textDecoration: 'none' }}>{action}</a>
    </div>
  )
}
