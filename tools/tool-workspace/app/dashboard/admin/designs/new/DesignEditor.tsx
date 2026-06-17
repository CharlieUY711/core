'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavbarStyle = 'minimal' | 'full'

interface DesignTokens {
  layout: {
    'max-width':     string
    'navbar-height': string
    'sidebar-width': string
    'padding-x':     string
    'padding-y':     string
  }
  navbar: {
    style:      NavbarStyle
    position:   'top' | 'side'
    search:     boolean
    cart:       boolean
    categories: boolean
  }
  card: {
    style:   'bordered' | 'elevated' | 'flat'
    radius:  string
    padding: string
  }
  motion: {
    duration: string
    easing:   string
  }
}

const DEFAULTS: DesignTokens = {
  layout: {
    'max-width':     '1152px',
    'navbar-height': '56px',
    'sidebar-width': '220px',
    'padding-x':     '32px',
    'padding-y':     '48px',
  },
  navbar: {
    style:      'minimal',
    position:   'top',
    search:     false,
    cart:       false,
    categories: false,
  },
  card: {
    style:   'bordered',
    radius:  'xl',
    padding: '24px',
  },
  motion: {
    duration: '200ms',
    easing:   'ease-in-out',
  },
}

export default function DesignEditor({ userId }: { userId: string }) {
  const router = useRouter()
  const [id,     setId]     = useState('')
  const [name,   setName]   = useState('')
  const [desc,   setDesc]   = useState('')
  const [tokens, setTokens] = useState<DesignTokens>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setLayout(key: keyof DesignTokens['layout'], val: string) {
    setTokens(p => ({ ...p, layout: { ...p.layout, [key]: val } }))
  }
  function setNavbar(key: keyof DesignTokens['navbar'], val: unknown) {
    setTokens(p => ({ ...p, navbar: { ...p.navbar, [key]: val } }))
  }
  function setCard(key: keyof DesignTokens['card'], val: string) {
    setTokens(p => ({ ...p, card: { ...p.card, [key]: val } }))
  }
  function setMotion(key: keyof DesignTokens['motion'], val: string) {
    setTokens(p => ({ ...p, motion: { ...p.motion, [key]: val } }))
  }

  async function handleSave() {
    if (!id.trim() || !name.trim()) { setError('ID y nombre son obligatorios.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('designs').insert({
      id:          id.trim().toLowerCase().replace(/\s+/g, '-'),
      name:        name.trim(),
      description: desc.trim(),
      tokens,
      created_by:  userId,
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/dashboard/admin')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', color: 'var(--color-text)', fontFamily: 'var(--font-base)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-deep)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => router.push('/dashboard/admin')} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← ADMIN
            </button>
            <span style={{ color: 'var(--color-border)' }}>|</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>NUEVO DISEÑO</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {error && <span style={{ fontSize: '11px', color: '#ef4444' }}>{error}</span>}
            <button onClick={() => router.push('/dashboard/admin')} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--color-gold)', color: 'var(--color-gold)', background: 'rgba(201,168,76,0.1)', cursor: 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar Diseño'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 32px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>

        {/* Form */}
        <div>
          {/* Meta */}
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label="IDENTIFICACIÓN" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Field label="ID (único, sin espacios)" value={id} onChange={setId} placeholder="design-internal" />
              <Field label="Nombre" value={name} onChange={setName} placeholder="Internal" />
            </div>
            <Field label="Descripción" value={desc} onChange={setDesc} placeholder="Apps internas — layout simple" />
          </div>

          {/* Layout */}
          <div style={{ marginBottom: '28px' }}>
            <SectionHeader label="LAYOUT" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {(Object.entries(tokens.layout) as [keyof DesignTokens['layout'], string][]).map(([key, val]) => (
                <Field key={key} label={key} value={val} onChange={v => setLayout(key, v)} />
              ))}
            </div>
          </div>

          {/* Navbar */}
          <div style={{ marginBottom: '28px' }}>
            <SectionHeader label="NAVBAR" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <SelectField
                label="Estilo"
                value={tokens.navbar.style}
                options={['minimal', 'full']}
                onChange={v => setNavbar('style', v as NavbarStyle)}
              />
              <SelectField
                label="Posición"
                value={tokens.navbar.position}
                options={['top', 'side']}
                onChange={v => setNavbar('position', v)}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {(['search', 'cart', 'categories'] as const).map(key => (
                <ToggleField
                  key={key}
                  label={key}
                  value={tokens.navbar[key]}
                  onChange={v => setNavbar(key, v)}
                />
              ))}
            </div>
          </div>

          {/* Card */}
          <div style={{ marginBottom: '28px' }}>
            <SectionHeader label="CARDS" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              <SelectField
                label="Estilo"
                value={tokens.card.style}
                options={['bordered', 'elevated', 'flat']}
                onChange={v => setCard('style', v as 'bordered' | 'elevated' | 'flat')}
              />
              <SelectField
                label="Radio"
                value={tokens.card.radius}
                options={['sm', 'md', 'lg', 'xl', '2xl', 'pill']}
                onChange={v => setCard('radius', v)}
              />
              <Field label="Padding" value={tokens.card.padding} onChange={v => setCard('padding', v)} placeholder="24px" />
            </div>
          </div>

          {/* Motion */}
          <div style={{ marginBottom: '28px' }}>
            <SectionHeader label="MOTION" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              <Field label="Duración" value={tokens.motion.duration} onChange={v => setMotion('duration', v)} placeholder="200ms" />
              <SelectField
                label="Easing"
                value={tokens.motion.easing}
                options={['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']}
                onChange={v => setMotion('easing', v)}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{ position: 'sticky', top: '72px', height: 'fit-content' }}>
          <SectionHeader label="PREVIEW" />
          <DesignPreview tokens={tokens} name={name || 'Mi Diseño'} />
        </div>
      </div>
    </div>
  )
}

/* ── Design Preview ── */
function DesignPreview({ tokens, name }: { tokens: DesignTokens; name: string }) {
  const radiusMap: Record<string, string> = { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', pill: '9999px' }
  const cardRadius = radiusMap[tokens.card.radius] ?? '12px'
  const isElevated = tokens.card.style === 'elevated'

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-deep)' }}>
      {/* Navbar preview */}
      <div style={{
        height: tokens.layout['navbar-height'],
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-3)', flex: 1 }}>{name.toUpperCase()}</span>
        {tokens.navbar.search && (
          <div style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-3)' }}>Buscar...</div>
        )}
        {tokens.navbar.cart && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-3)' }}>🛒</span>
        )}
      </div>

      {/* Categories */}
      {tokens.navbar.categories && (
        <div style={{ height: '28px', backgroundColor: 'rgba(30,45,66,0.6)', borderBottom: '1px solid var(--color-border)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {['Cat 1', 'Cat 2', 'Cat 3'].map(c => (
            <span key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-text-3)' }}>{c}</span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {['Portal A', 'Portal B', 'Portal C', 'Portal D'].map(p => (
          <div key={p} style={{
            padding: tokens.card.padding.replace('px', '') > '16' ? '12px' : '8px',
            borderRadius: cardRadius,
            border: tokens.card.style !== 'flat' ? '1px solid var(--color-border)' : 'none',
            boxShadow: isElevated ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
            backgroundColor: 'rgba(15,56,117,0.08)',
            transition: `all ${tokens.motion.duration} ${tokens.motion.easing}`,
          }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '3px' }}>{p}</div>
            <div style={{ fontSize: '9px', color: 'var(--color-text-3)' }}>Descripción</div>
          </div>
        ))}
      </div>

      {/* Token summary */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'rgba(30,45,66,0.4)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-text-3)', lineHeight: 1.8 }}>
          <div>max-width: {tokens.layout['max-width']}</div>
          <div>navbar: {tokens.navbar.style} · card: {tokens.card.style}/{tokens.card.radius}</div>
          <div>motion: {tokens.motion.duration} {tokens.motion.easing}</div>
        </div>
      </div>
    </div>
  )
}

/* ── Field helpers ── */
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(30,45,66,0.5)', color: 'var(--color-text)', fontSize: '12px', fontFamily: 'var(--font-base)', outline: 'none' }}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(30,45,66,0.8)', color: 'var(--color-text)', fontSize: '12px', fontFamily: 'var(--font-base)', outline: 'none', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: '28px', height: '16px', borderRadius: '8px', position: 'relative', cursor: 'pointer',
          backgroundColor: value ? 'var(--color-blue)' : 'var(--color-border)',
          transition: 'background-color 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: '2px', left: value ? '14px' : '2px',
          width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: value ? 'var(--color-text)' : 'var(--color-text-3)' }}>
        {label}
      </span>
    </label>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}
