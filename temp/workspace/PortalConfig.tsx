'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Palette { id: string; name: string }
interface Design  { id: string; name: string }
interface Portal  {
  id: string; name_es: string; status: string; access: string
  palette_id: string | null; design_id: string | null
  features: Record<string, boolean>
}

interface Props {
  portal:   Portal
  palettes: Palette[]
  designs:  Design[]
  onClose:  () => void
  onSaved:  () => void
}

const FEATURE_LABELS: Record<string, string> = {
  i18n:       'Multilenguaje (i18n)',
  login:      'Login / Autenticación',
  analytics:  'Analytics',
  dark_mode:  'Modo oscuro',
  api:        'Integración API externa',
}

export default function PortalConfig({ portal, palettes, designs, onClose, onSaved }: Props) {
  const [paletteId, setPaletteId] = useState<string>(portal.palette_id ?? '')
  const [designId,  setDesignId]  = useState<string>(portal.design_id  ?? '')
  const [features,  setFeatures]  = useState<Record<string, boolean>>({
    i18n:      false,
    login:     false,
    analytics: false,
    dark_mode: false,
    api:       false,
    ...portal.features,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function toggleFeature(key: string) {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('portals')
      .update({
        palette_id: paletteId || null,
        design_id:  designId  || null,
        features,
      })
      .eq('id', portal.id)

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 50,
        transform: 'translate(-50%, -50%)',
        width: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px', padding: '32px',
        fontFamily: 'var(--font-base)',
      }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '4px' }}>CONFIGURACIÓN</div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{portal.name_es}</h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-3)', marginTop: '2px' }}>{portal.id}</div>
          </div>
          <button onClick={onClose} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <FieldLabel>PALETA</FieldLabel>
          <select value={paletteId} onChange={e => setPaletteId(e.target.value)} style={selectStyle}>
            <option value="">— Sin paleta —</option>
            {palettes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <FieldLabel>DISEÑO</FieldLabel>
          <select value={designId} onChange={e => setDesignId(e.target.value)} style={selectStyle}>
            <option value="">— Sin diseño —</option>
            {designs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <SectionDivider label="MÓDULOS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(FEATURE_LABELS).map(([key, label]) => (
              <label key={key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${features[key] ? 'var(--color-blue)' : 'var(--color-border)'}`,
                background: features[key] ? 'rgba(27,90,196,0.08)' : 'rgba(15,56,117,0.03)',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '12px', color: features[key] ? 'var(--color-text)' : 'var(--color-text-3)' }}>{label}</span>
                <Toggle value={features[key]} onChange={() => toggleFeature(key)} />
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '12px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '8px 16px',
            borderRadius: '6px', border: '1px solid var(--color-border)',
            color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '8px 16px',
            borderRadius: '6px', border: '1px solid var(--color-gold)',
            color: 'var(--color-gold)', background: 'rgba(201,168,76,0.1)', cursor: 'pointer',
          }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div onClick={e => { e.preventDefault(); onChange() }} style={{
      width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', flexShrink: 0,
      backgroundColor: value ? 'var(--color-blue)' : 'var(--color-border)',
      transition: 'background-color 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: '3px', left: value ? '17px' : '3px',
        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '6px' }}>
      {children}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '6px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'rgba(30,45,66,0.6)',
  color: 'var(--color-text)', fontSize: '12px',
  fontFamily: 'var(--font-base)', outline: 'none', cursor: 'pointer',
}
