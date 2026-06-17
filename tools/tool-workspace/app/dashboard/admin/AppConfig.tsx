'use client'
import { useEffect, useState, useCallback } from 'react'

interface Named { id: string; name: string }
type AppFull = {
  id: string; name_es: string; access: string; auth_mode: string
  email_verification: boolean; supabase_project_id: string | null
  vercel_project_id: string | null; palette_id: string | null; design_id: string | null
}
type SBProject = { id: string; label: string }
type Tool = { id: string; key: string; name: string; status: string; category: string }

const mono = 'var(--font-mono)'

export default function AppConfig({ app, palettes, designs, onSaved }: {
  app: { id: string; name_es: string }
  palettes: Named[]
  designs: Named[]
  onSaved: () => void
}) {
  const [form, setForm] = useState<AppFull | null>(null)
  const [projects, setProjects] = useState<SBProject[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [toolIds, setToolIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [envBlock, setEnvBlock] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [a, p, t, at] = await Promise.all([
          fetch(`/api/admin/apps?id=${encodeURIComponent(app.id)}`, { cache: 'no-store' }).then(r => r.json()),
          fetch('/api/admin/supabase/projects', { cache: 'no-store' }).then(r => r.json()),
          fetch('/api/admin/tools', { cache: 'no-store' }).then(r => r.json()),
          fetch(`/api/admin/app-tools?app_id=${encodeURIComponent(app.id)}`, { cache: 'no-store' }).then(r => r.json()),
        ])
        if (!alive) return
        if (a.app) setForm(a.app)
        if (p.projects) setProjects(p.projects)
        if (t.tools) setTools((t.tools as Tool[]).filter(x => x.status === 'live'))
        if (at.tool_ids) setToolIds(at.tool_ids)
      } catch {
        if (alive) setError('No se pudo cargar la configuración.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [app.id])

  const set = (patch: Partial<AppFull>) => setForm(f => f ? { ...f, ...patch } : f)
  const toggleTool = (id: string) => setToolIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const save = useCallback(async () => {
    if (!form) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id, access: form.access, auth_mode: form.auth_mode,
          email_verification: form.email_verification, supabase_project_id: form.supabase_project_id,
          vercel_project_id: form.vercel_project_id, palette_id: form.palette_id, design_id: form.design_id,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      const res2 = await fetch('/api/admin/app-tools', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: form.id, tool_ids: toolIds }),
      })
      if (!res2.ok) throw new Error((await res2.json()).error || 'Error al guardar tools')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [form, toolIds, onSaved])

  const syncEnv = useCallback(async () => {
    if (!form) return
    setSyncing(true); setError(null)
    try {
      const res = await fetch('/api/admin/apps/configure-env', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: form.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar env')
      setEnvBlock(data.env_block || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar env')
    } finally {
      setSyncing(false)
    }
  }, [form])

  if (loading) return <div style={{ fontFamily: mono, fontSize: '11px', color: 'var(--color-text-3)', padding: '8px 0' }}>cargando configuración…</div>
  if (!form)   return <div style={{ fontFamily: mono, fontSize: '11px', color: '#d9534f', padding: '8px 0' }}>{error || 'No se encontró la app.'}</div>

  return (
    <div style={{ padding: '6px 0 10px' }}>
      {error && <div style={{ fontSize: '11px', color: '#d9534f', marginBottom: '12px', fontFamily: mono }}>{error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <Field label="PALETA">
          <select value={form.palette_id ?? ''} onChange={e => set({ palette_id: e.target.value || null })} style={sel}>
            <option value="">— sin paleta —</option>
            {palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="DISEÑO">
          <select value={form.design_id ?? ''} onChange={e => set({ design_id: e.target.value || null })} style={sel}>
            <option value="">— sin diseño —</option>
            {designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="ACCESO">
          <select value={form.access} onChange={e => set({ access: e.target.value })} style={sel}>
            <option value="public">public</option>
            <option value="restricted">restricted</option>
          </select>
        </Field>
        <Field label="LOGIN">
          <select value={form.auth_mode} disabled={form.access !== 'restricted'}
            onChange={e => set({ auth_mode: e.target.value })}
            style={{ ...sel, opacity: form.access !== 'restricted' ? 0.4 : 1 }}>
            <option value="ecosystem">ecosistema</option>
            <option value="standalone">stand alone</option>
          </select>
        </Field>
        <Field label="VALIDAR EMAIL">
          <select value={form.email_verification ? 'si' : 'no'} onChange={e => set({ email_verification: e.target.value === 'si' })} style={sel}>
            <option value="si">sí</option>
            <option value="no">no</option>
          </select>
        </Field>
        <Field label="BASE">
          <select value={form.supabase_project_id ?? ''} onChange={e => set({ supabase_project_id: e.target.value || null })} style={sel}>
            <option value="">— sin base —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
      </div>

      {/* TOOLS */}
      <Divider label="TOOLS INTEGRADAS" />
      {tools.length === 0
        ? <p style={{ fontSize: '11px', color: 'var(--color-text-3)', margin: '0 0 18px' }}>No hay tools listas (status live) para asignar.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px', marginBottom: '18px' }}>
            {tools.map(t => {
              const on = toolIds.includes(t.id)
              return (
                <label key={t.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--color-blue)' : 'var(--color-border)'}`,
                  background: on ? 'rgba(27,90,196,0.08)' : 'rgba(15,56,117,0.03)',
                }}>
                  <span style={{ fontSize: '12px', color: on ? 'var(--color-text)' : 'var(--color-text-3)' }}>{t.name}</span>
                  <Toggle value={on} onChange={() => toggleTool(t.id)} />
                </label>
              )
            })}
          </div>
        )}

      {/* VERCEL + SYNC */}
      <Divider label="DEPLOY / ENV" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <span style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>VERCEL PROJECT ID</span>
        <input value={form.vercel_project_id ?? ''} placeholder="prj_…"
          onChange={e => set({ vercel_project_id: e.target.value || null })}
          style={{ fontFamily: mono, fontSize: '11px', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', flex: '0 1 280px' }} />
        <button onClick={syncEnv} disabled={syncing || !form.vercel_project_id}
          title={!form.vercel_project_id ? 'Cargá y guardá el Vercel Project ID primero' : ''}
          style={btn(!!form.vercel_project_id && !syncing)}>
          {syncing ? 'SINCRONIZANDO…' : 'SYNC ENV → VERCEL'}
        </button>
      </div>

      {envBlock && (
        <textarea readOnly value={envBlock} onFocus={e => e.currentTarget.select()} rows={3}
          style={{ width: '100%', fontFamily: mono, fontSize: '11px', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', resize: 'vertical', marginBottom: '14px' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving} style={btn(!saving)}>
          {saving ? 'GUARDANDO…' : 'GUARDAR CONFIG'}
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

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div onClick={e => { e.preventDefault(); onChange() }} style={{
      width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', flexShrink: 0,
      backgroundColor: value ? 'var(--color-blue)' : 'var(--color-border)', transition: 'background-color 0.2s',
    }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '17px' : '3px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
    </div>
  )
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
