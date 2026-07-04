'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── Token definitions ── */
const COLOR_TOKENS = [
  { key: 'bg-base',       label: 'Fondo base',         group: 'Fondos' },
  { key: 'bg-surface',    label: 'Fondo superficie',    group: 'Fondos' },
  { key: 'bg-card',       label: 'Fondo card',          group: 'Fondos' },
  { key: 'bg-card-hover', label: 'Fondo card (hover)',  group: 'Fondos' },
  { key: 'primary',       label: 'Color primario',      group: 'Colores' },
  { key: 'primary-hover', label: 'Primario (hover)',    group: 'Colores' },
  { key: 'primary-light', label: 'Primario (claro)',    group: 'Colores' },
  { key: 'primary-pale',  label: 'Primario (tenue)',    group: 'Colores' },
  { key: 'accent',        label: 'Acento',              group: 'Colores' },
  { key: 'accent-light',  label: 'Acento (claro)',      group: 'Colores' },
  { key: 'green',         label: 'Verde',               group: 'Colores' },
  { key: 'border',        label: 'Borde',               group: 'Colores' },
  { key: 'text',          label: 'Texto principal',     group: 'Texto' },
  { key: 'text-2',        label: 'Texto secundario',    group: 'Texto' },
  { key: 'text-3',        label: 'Texto terciario',     group: 'Texto' },
  { key: 'danger',        label: 'Peligro',             group: 'Estados' },
  { key: 'success',       label: 'Éxito',               group: 'Estados' },
  { key: 'warning',       label: 'Advertencia',         group: 'Estados' },
]

const DEFAULTS = {
  'bg-base':       '#0A1F3D',
  'bg-surface':    '#1e2d42',
  'bg-card':       '#0f3875',
  'bg-card-hover': '#1b5ac4',
  'primary':       '#1b5ac4',
  'primary-hover': '#3b82f6',
  'primary-light': '#7db8f7',
  'primary-pale':  '#1b5ac4',
  'accent':        '#C9A84C',
  'accent-light':  '#f5c870',
  'green':         '#1D9E75',
  'border':        '#1e3354',
  'text':          '#ffffff',
  'text-2':        '#8fa3bf',
  'text-3':        '#4a6080',
  'danger':        '#ef4444',
  'success':       '#4ade80',
  'warning':       '#f5c870',
}

type ColorTokens = typeof DEFAULTS

export default function PaletteEditor({ userId }: { userId: string }) {
  const router = useRouter()
  const [id,   setId]   = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [colors, setColors] = useState<ColorTokens>({ ...DEFAULTS })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const groups = COLOR_TOKENS.map(t => t.group).filter((g, i, arr) => arr.indexOf(g) === i)

  async function handleSave() {
    if (!id.trim() || !name.trim()) { setError('ID y nombre son obligatorios.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('palettes').insert({
      id:          id.trim().toLowerCase().replace(/\s+/g, '-'),
      name:        name.trim(),
      description: desc.trim(),
      tokens:      { color: colors, font: { base: "Calibri, 'Segoe UI', system-ui, sans-serif", mono: 'Courier New, monospace', scale: '1rem' }, radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', pill: '9999px' }, shadow: { card: '0 2px 8px rgba(0,0,0,.2)', hover: '0 8px 24px rgba(0,0,0,.3)', focus: '0 0 0 3px rgba(27,90,196,.4)' } },
      created_by:  userId,
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/dashboard/admin?section=palettes')
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>NUEVA PALETA</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {error && <span style={{ fontSize: '11px', color: 'var(--color-danger, #ef4444)' }}>{error}</span>}
            <button onClick={() => router.push('/dashboard/admin')} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--color-gold)', color: 'var(--color-gold)', background: 'rgba(201,168,76,0.1)', cursor: 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar Paleta'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px' }}>

        {/* Form */}
        <div>
          {/* Meta */}
          <div style={{ marginBottom: '32px' }}>
            <SectionHeader label="IDENTIFICACIÓN" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Field label="ID (único, sin espacios)" value={id} onChange={setId} placeholder="palette-dark" />
              <Field label="Nombre" value={name} onChange={setName} placeholder="Dark Navy" />
            </div>
            <Field label="Descripción" value={desc} onChange={setDesc} placeholder="Paleta oscura para apps internas" />
          </div>

          {/* Color tokens por grupo */}
          {groups.map(group => (
            <div key={group} style={{ marginBottom: '28px' }}>
              <SectionHeader label={group.toUpperCase()} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {COLOR_TOKENS.filter(t => t.group === group).map(token => (
                  <ColorField
                    key={token.key}
                    label={token.label}
                    tokenKey={token.key}
                    value={colors[token.key as keyof ColorTokens]}
                    onChange={v => setColors(prev => ({ ...prev, [token.key]: v }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{ position: 'sticky', top: '72px', height: 'fit-content' }}>
          <SectionHeader label="PREVIEW" />
          <PalettePreview colors={colors} name={name || 'Mi Paleta'} />
        </div>
      </div>
    </div>
  )
}

/* ── Preview card ── */
function PalettePreview({ colors, name }: { colors: ColorTokens; name: string }) {
  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${colors.border}`, backgroundColor: colors['bg-base'] }}>
      {/* Mini navbar */}
      <div style={{ padding: '10px 16px', backgroundColor: colors['bg-surface'], borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: colors['text-3'] }}>WORKSPACE</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ES', 'EN'].map(l => (
            <span key={l} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', padding: '2px 6px', borderRadius: '3px', border: `1px solid ${colors.border}`, color: colors['text-3'] }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '3px' }}>{name}</div>
          <div style={{ fontSize: '11px', color: colors['text-3'] }}>Preview del sistema de diseño</div>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Portal Live',  status: 'live',  statusColor: colors.green },
            { label: 'En Dev',       status: 'dev',   statusColor: colors.primary },
          ].map(card => (
            <div key={card.label} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors['bg-card'] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: card.statusColor, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: colors.text }}>{card.label}</span>
              </div>
              <div style={{ fontSize: '9px', color: colors['text-3'] }}>Descripción del portal</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <span style={{ fontSize: '9px', padding: '4px 10px', borderRadius: '4px', backgroundColor: colors.primary, color: '#fff' }}>Primario</span>
          <span style={{ fontSize: '9px', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${colors.accent}`, color: colors.accent }}>Acento</span>
          <span style={{ fontSize: '9px', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${colors.border}`, color: colors['text-3'] }}>Neutro</span>
        </div>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { label: 'SUCCESS', color: colors.success },
            { label: 'DANGER',  color: colors.danger },
            { label: 'WARNING', color: colors.warning },
          ].map(b => (
            <span key={b.label} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', padding: '2px 6px', borderRadius: '10px', backgroundColor: `${b.color}22`, color: b.color }}>
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors['bg-surface'] }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: colors['text-3'] }}>CORE — Global Supply. Regional Growth.</span>
      </div>
    </div>
  )
}

/* ── Field components ── */
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '5px' }}>
        {label.toUpperCase()}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 10px', borderRadius: '6px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'rgba(30,45,66,0.5)',
          color: 'var(--color-text)',
          fontSize: '12px',
          fontFamily: 'var(--font-base)',
          outline: 'none',
        }}
      />
    </div>
  )
}

function ColorField({ label, tokenKey, value, onChange }: { label: string; tokenKey: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(30,45,66,0.3)' }}>
      <input
        type="color"
        value={value.startsWith('#') ? value : '#1b5ac4'}
        onChange={e => onChange(e.target.value)}
        style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: 'var(--color-text-2)', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-3)', background: 'none', border: 'none', outline: 'none', width: '100%', padding: 0 }}
        />
      </div>
    </div>
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
