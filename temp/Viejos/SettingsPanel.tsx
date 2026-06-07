'use client'
import { useState, useEffect, useCallback } from 'react'

type ConfigItem = { key: string; label: string | null; is_secret: boolean; has_value: boolean; value?: string }
type SBProject = { id: string; label: string; project_ref: string | null; url: string; anon_key: string | null }
type AppRow = {
  id: string; name_es: string; supabase_project_id: string | null
  access: string; auth_mode: string; status: string; vercel_project_id: string | null
  email_verification: boolean
}

const mono = 'var(--font-mono)'

export default function SettingsPanel() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [projects, setProjects] = useState<SBProject[]>([])
  const [apps, setApps] = useState<AppRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [np, setNp] = useState<SBProject>({ id: '', label: '', project_ref: '', url: '', anon_key: '' })
  const [vpidDrafts, setVpidDrafts] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState<string | null>(null)
  const [envBlocks, setEnvBlocks] = useState<Record<string, string>>({})

  const loadAll = useCallback(async () => {
    setError(null)
    try {
      const [c, p, a] = await Promise.all([
        fetch('/api/admin/config', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/supabase/projects', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/apps', { cache: 'no-store' }).then(r => r.json()),
      ])
      if (c.items) setConfig(c.items)
      if (p.projects) setProjects(p.projects)
      if (a.apps) setApps(a.apps)
    } catch {
      setError('No se pudo cargar la configuración.')
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const saveConfig = useCallback(async (key: string) => {
    const value = drafts[key]
    if (value === undefined) return
    setSavingKey(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar')
      setDrafts(d => { const n = { ...d }; delete n[key]; return n })
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingKey(null)
    }
  }, [drafts, loadAll])

  const addProject = useCallback(async () => {
    if (!np.id || !np.label || !np.url) { setError('Falta id, label o url del proyecto'); return }
    setError(null)
    try {
      const res = await fetch('/api/admin/supabase/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(np),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al crear')
      setNp({ id: '', label: '', project_ref: '', url: '', anon_key: '' })
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear')
    }
  }, [np, loadAll])

  const deleteProject = useCallback(async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/supabase/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al borrar')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar')
    }
  }, [loadAll])

  const updateApp = useCallback(async (appId: string, patch: Partial<AppRow>) => {
    setError(null)
    setApps(a => a.map(x => x.id === appId ? { ...x, ...patch } : x))
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, ...patch }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
      await loadAll()
    }
  }, [loadAll])

  const syncEnv = useCallback(async (appId: string) => {
    setSyncing(appId)
    setError(null)
    try {
      const res = await fetch('/api/admin/apps/configure-env', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar env')
      setEnvBlocks(b => ({ ...b, [appId]: data.env_block || '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar env')
    } finally {
      setSyncing(null)
    }
  }, [])

  return (
    <div>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' }}>Settings</h2>
      <p style={{ fontSize: '12px', color: 'var(--color-text-3)', margin: '0 0 28px' }}>
        Integraciones, proyectos de Supabase y control de acceso por app.
      </p>

      {error && (
        <div style={{ background: 'rgba(217,83,79,0.1)', border: '1px solid rgba(217,83,79,0.35)', color: '#e69b98', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* INTEGRACIONES */}
      <SectionHeader label="INTEGRACIONES" />
      <div style={{ display: 'grid', gap: '10px', marginBottom: '36px' }}>
        {config.map(item => {
          const editing = drafts[item.key] !== undefined
          return (
            <div key={item.key} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{item.label || item.key}</span>
                <span style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)' }}>{item.key}</span>
                <div style={{ flex: 1 }} />
                {item.has_value
                  ? <Tag color="var(--color-green)">configurado</Tag>
                  : <Tag color="var(--color-gold)">vacío</Tag>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type={item.is_secret ? 'password' : 'text'}
                  value={editing ? drafts[item.key] : (item.value ?? '')}
                  placeholder={item.is_secret ? (item.has_value ? '•••••••• (cargado — escribí para reemplazar)' : 'pegá el valor') : 'valor'}
                  onChange={e => setDrafts(d => ({ ...d, [item.key]: e.target.value }))}
                  style={inputStyle()}
                />
                <button onClick={() => saveConfig(item.key)} disabled={!editing || savingKey === item.key} style={btnPrimary(editing)}>
                  {savingKey === item.key ? 'GUARDANDO…' : 'GUARDAR'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* PROYECTOS SUPABASE */}
      <SectionHeader label="PROYECTOS SUPABASE" />
      <div style={{ ...cardStyle, marginBottom: '12px' }}>
        <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '12px' }}>NUEVO PROYECTO</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <input placeholder="id (ej: core-prod)" value={np.id} onChange={e => setNp({ ...np, id: e.target.value })} style={inputStyle()} />
          <input placeholder="label" value={np.label} onChange={e => setNp({ ...np, label: e.target.value })} style={inputStyle()} />
          <input placeholder="https://xxx.supabase.co" value={np.url} onChange={e => setNp({ ...np, url: e.target.value })} style={inputStyle()} />
          <input placeholder="project_ref (opcional)" value={np.project_ref ?? ''} onChange={e => setNp({ ...np, project_ref: e.target.value })} style={inputStyle()} />
          <input placeholder="anon_key (opcional)" value={np.anon_key ?? ''} onChange={e => setNp({ ...np, anon_key: e.target.value })} style={{ ...inputStyle(), gridColumn: '1 / -1' }} />
        </div>
        <button onClick={addProject} style={btnPrimary(true)}>+ AGREGAR PROYECTO</button>
      </div>
      <div style={{ display: 'grid', gap: '8px', marginBottom: '36px' }}>
        {projects.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>No hay proyectos cargados todavía.</p>}
        {projects.map(p => (
          <div key={p.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{p.label} <span style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)' }}>· {p.id}</span></div>
              <div style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)' }}>{p.url}</div>
            </div>
            <button onClick={() => deleteProject(p.id)} style={btnGhostDanger}>BORRAR</button>
          </div>
        ))}
      </div>

      {/* ACCESO Y BASE POR APP */}
      <SectionHeader label="ACCESO Y BASE POR APP" />
      <div style={{ display: 'grid', gap: '8px' }}>
        {apps.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>No hay apps registradas todavía.</p>}
        {apps.map(a => {
          const vpid = vpidDrafts[a.id] ?? (a.vercel_project_id ?? '')
          const vpidChanged = vpid !== (a.vercel_project_id ?? '')
          return (
            <div key={a.id} style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{a.name_es}</span>
                  <span style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)', marginLeft: '8px' }}>{a.id}</span>
                </div>

                <Field label="ACCESO">
                  <select value={a.access} onChange={e => updateApp(a.id, { access: e.target.value })} style={selectStyle}>
                    <option value="public">public</option>
                    <option value="restricted">restricted</option>
                  </select>
                </Field>

                <Field label="LOGIN">
                  <select
                    value={a.auth_mode}
                    onChange={e => updateApp(a.id, { auth_mode: e.target.value })}
                    disabled={a.access !== 'restricted'}
                    style={{ ...selectStyle, opacity: a.access !== 'restricted' ? 0.4 : 1 }}
                  >
                    <option value="ecosystem">ecosistema</option>
                    <option value="standalone">stand alone</option>
                  </select>
                </Field>

                <Field label="VALIDAR EMAIL">
                  <select
                    value={a.email_verification ? 'si' : 'no'}
                    onChange={e => updateApp(a.id, { email_verification: e.target.value === 'si' })}
                    style={selectStyle}
                  >
                    <option value="si">sí</option>
                    <option value="no">no</option>
                  </select>
                </Field>

                <Field label="BASE">
                  <select value={a.supabase_project_id ?? ''} onChange={e => updateApp(a.id, { supabase_project_id: e.target.value || null })} style={selectStyle}>
                    <option value="">— sin base —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Vercel project id + sync env */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>VERCEL PROJECT ID</span>
                <input
                  value={vpid}
                  placeholder="prj_…"
                  onChange={e => setVpidDrafts(d => ({ ...d, [a.id]: e.target.value }))}
                  style={{ ...inputStyle(), flex: '0 1 280px', fontFamily: mono, fontSize: '11px' }}
                />
                {vpidChanged && (
                  <button onClick={() => { updateApp(a.id, { vercel_project_id: vpid || null }); setVpidDrafts(d => { const n = { ...d }; delete n[a.id]; return n }) }} style={btnPrimary(true)}>
                    GUARDAR
                  </button>
                )}
                <button
                  onClick={() => syncEnv(a.id)}
                  disabled={syncing === a.id || !a.vercel_project_id || vpidChanged}
                  title={!a.vercel_project_id ? 'Cargá y guardá el Vercel Project ID primero' : ''}
                  style={btnPrimary(!!a.vercel_project_id && !vpidChanged)}
                >
                  {syncing === a.id ? 'SINCRONIZANDO…' : 'SYNC ENV → VERCEL'}
                </button>
              </div>

              {envBlocks[a.id] && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-green)', margin: '0 0 6px' }}>
                    ✓ ENV SETEADAS EN VERCEL · BLOQUE PARA .env.local (sensible):
                  </p>
                  <textarea
                    readOnly
                    value={envBlocks[a.id]}
                    onFocus={e => e.currentTarget.select()}
                    rows={3}
                    style={{
                      width: '100%', fontFamily: mono, fontSize: '11px', padding: '10px',
                      borderRadius: '6px', border: '1px solid var(--color-border)',
                      background: 'var(--bg-deep)', color: 'var(--color-text)', resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', color: 'var(--color-text-3)', whiteSpace: 'nowrap', margin: 0 }}>{label}</p>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '10px', backgroundColor: `${color}22`, color }}>
      {children}
    </span>
  )
}

const cardStyle: React.CSSProperties = {
  padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'rgba(15,56,117,0.06)',
}

function inputStyle(): React.CSSProperties {
  return {
    fontFamily: 'var(--font-base)', fontSize: '13px', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', flex: 1, minWidth: 0,
  }
}

const selectStyle: React.CSSProperties = {
  fontFamily: mono, fontSize: '11px', padding: '6px 10px', borderRadius: '6px',
  border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', cursor: 'pointer',
}

function btnPrimary(active: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 16px', borderRadius: '4px',
    border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
    color: active ? 'var(--color-gold)' : 'var(--color-text-3)', background: 'transparent',
    cursor: active ? 'pointer' : 'default', whiteSpace: 'nowrap',
  }
}

const btnGhostDanger: React.CSSProperties = {
  fontFamily: mono, fontSize: '9px', letterSpacing: '0.08em', padding: '5px 12px', borderRadius: '4px',
  border: '1px solid rgba(217,83,79,0.4)', color: '#e69b98', background: 'transparent', cursor: 'pointer',
}
