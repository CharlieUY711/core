'use client'
import { useState, useCallback } from 'react'

export type Tool = {
  id: string; key: string; name: string; description: string
  source: 'package' | 'internal' | 'repo' | 'service'
  ref: string | null; category: string; status: string
}

const mono = 'var(--font-mono)'

export default function ToolConfig({ tool, onSaved }: { tool: Tool; onSaved: () => void }) {
  const [form, setForm] = useState<Tool>(tool)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<Tool>) => setForm(f => ({ ...f, ...patch }))

  const save = useCallback(async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/tools', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id, name: form.name, description: form.description,
          source: form.source, ref: form.ref, category: form.category, status: form.status,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [form, onSaved])

  return (
    <div style={{ padding: '6px 0 10px' }}>
      {error && <div style={{ fontSize: '11px', color: '#d9534f', marginBottom: '12px', fontFamily: mono }}>{error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
        <Field label="KEY">
          <input value={form.key} disabled style={{ ...inp, opacity: 0.5, cursor: 'not-allowed', width: '160px' }} />
        </Field>
        <Field label="NOMBRE">
          <input value={form.name} onChange={e => set({ name: e.target.value })} style={{ ...inp, width: '200px' }} />
        </Field>
        <Field label="SOURCE">
          <select value={form.source} onChange={e => set({ source: e.target.value as Tool['source'] })} style={sel}>
            <option value="package">package</option>
            <option value="repo">repo</option>
            <option value="service">service</option>
            <option value="internal">internal</option>
          </select>
        </Field>
        <Field label="ESTADO">
          <select value={form.status} onChange={e => set({ status: e.target.value })} style={sel}>
            <option value="live">live</option>
            <option value="dev">dev</option>
            <option value="planned">planned</option>
          </select>
        </Field>
        <Field label="CATEGORÍA">
          <input value={form.category} onChange={e => set({ category: e.target.value })} style={{ ...inp, width: '140px' }} />
        </Field>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <Field label={form.source === 'repo' ? 'REF (repo core-…)' : form.source === 'package' ? 'REF (paquete npm)' : 'REF'}>
          <input
            value={form.ref ?? ''}
            placeholder={form.source === 'repo' ? 'core-reservas' : form.source === 'package' ? '@charlieuy711/auth' : '—'}
            onChange={e => set({ ref: e.target.value || null })}
            style={{ ...inp, width: '280px', fontFamily: mono, fontSize: '11px' }}
          />
        </Field>
        <Field label="DESCRIPCIÓN">
          <input value={form.description} onChange={e => set({ description: e.target.value })} style={{ ...inp, width: '320px' }} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving} style={btn(!saving)}>
          {saving ? 'GUARDANDO…' : 'GUARDAR'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>{label}</span>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  fontFamily: 'var(--font-base)', fontSize: '13px', padding: '7px 10px', borderRadius: '6px',
  border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)',
}

const sel: React.CSSProperties = {
  fontFamily: mono, fontSize: '11px', padding: '6px 10px', borderRadius: '6px',
  border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', cursor: 'pointer',
}

function btn(active: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 16px', borderRadius: '4px',
    border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-gold)' : 'var(--color-text-3)', background: 'transparent',
    cursor: active ? 'pointer' : 'default', whiteSpace: 'nowrap',
  }
}
