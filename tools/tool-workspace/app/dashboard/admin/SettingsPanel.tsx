'use client'
import { useState, useEffect, useCallback } from 'react'

type ConfigItem = { key: string; label: string | null; is_secret: boolean; has_value: boolean; value?: string }
type SBProject = { id: string; label: string; project_ref: string | null; url: string; anon_key: string | null }

const mono = 'var(--font-mono)'

export default function SettingsPanel() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [projects, setProjects] = useState<SBProject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [np, setNp] = useState<SBProject>({ id: '', label: '', project_ref: '', url: '', anon_key: '' })
  const [nk, setNk] = useState({ key: '', label: '', value: '', is_secret: true })
  const [addingKey, setAddingKey] = useState(false)
  const [tab, setTab] = useState<'vault' | 'supabase'>('vault')

  const loadAll = useCallback(async () => {
    setError(null)
    try {
      const [c, p] = await Promise.all([
        fetch('/api/admin/config', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/supabase/projects', { cache: 'no-store' }).then(r => r.json()),
      ])
      if (c.items) setConfig(c.items)
      if (p.projects) setProjects(p.projects)
    } catch {
      setError('No se pudo cargar la configuración.')
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const saveConfig = useCallback(async (key: string) => {
    const value = drafts[key]
    if (value === undefined) return
    setSavingKey(key); setError(null)
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

  const addKey = useCallback(async () => {
    if (!nk.key || !nk.value) { setError("Falta key o valor"); return }
    setAddingKey(true); setError(null)
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: nk.key, value: nk.value, label: nk.label || null, is_secret: nk.is_secret }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar")
      setNk({ key: "", label: "", value: "", is_secret: true })
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setAddingKey(false)
    }
  }, [nk, loadAll])

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

  return (
    <div>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' }}>Settings de Workspace</h2>
      <p style={{ fontSize: '12px', color: 'var(--color-text-3)', margin: '0 0 28px' }}>
        Integraciones y proyectos de Supabase del ecosistema. La config por app/tool vive en su botón CONFIG.
      </p>

      {error && (
        <div style={{ background: 'rgba(217,83,79,0.1)', border: '1px solid rgba(217,83,79,0.35)', color: '#e69b98', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        {([['vault', 'API VAULT'], ['supabase', `PROYECTOS SUPABASE (${projects.length})`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em', padding: '6px 14px',
            borderRadius: '6px', border: '1px solid', cursor: 'pointer',
            borderColor: tab === id ? 'var(--color-gold)' : 'var(--color-border)',
            color: tab === id ? 'var(--color-gold)' : 'var(--color-text-3)',
            background: tab === id ? 'rgba(201,168,76,0.08)' : 'transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* API VAULT · INTEGRACIONES */}
      {tab === 'vault' && (
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ ...cardStyle, marginBottom: "2px" }}>
          <p style={{ fontFamily: mono, fontSize: "9px", letterSpacing: "0.1em", color: "var(--color-text-3)", marginBottom: "12px", marginTop: 0 }}>NUEVA KEY</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input value={nk.key}   placeholder="key (ej. anthropic_api_key)"  onChange={e => setNk(v => ({ ...v, key: e.target.value }))}   style={inputStyle()} />
            <input value={nk.label} placeholder="label (ej. Anthropic API Key)" onChange={e => setNk(v => ({ ...v, label: e.target.value }))} style={inputStyle()} />
            <input value={nk.value} placeholder="valor / secret"                onChange={e => setNk(v => ({ ...v, value: e.target.value }))}  style={{ ...inputStyle(), gridColumn: "1 / -1" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: mono, fontSize: "10px", color: "var(--color-text-3)", cursor: "pointer" }}>
              <input type="checkbox" checked={nk.is_secret} onChange={e => setNk(v => ({ ...v, is_secret: e.target.checked }))} />
              secret
            </label>
            <button onClick={addKey} disabled={addingKey || !nk.key || !nk.value} style={btnPrimary(!addingKey && !!nk.key && !!nk.value)}>
              {addingKey ? "GUARDANDO…" : "+ AGREGAR KEY"}
            </button>
          </div>
        </div>
        {config.length === 0 && <p style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>No hay keys cargadas todavía.</p>}
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
      )}

      {/* PROYECTOS SUPABASE */}
      {tab === 'supabase' && (
      <div>
      <div style={{ ...cardStyle, marginBottom: '12px' }}>
        <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '12px' }}>NUEVO PROYECTO</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <input value={np.id}          placeholder="id (ej. core-main)"  onChange={e => setNp(v => ({ ...v, id: e.target.value }))}          style={inputStyle()} />
          <input value={np.label}       placeholder="label"               onChange={e => setNp(v => ({ ...v, label: e.target.value }))}       style={inputStyle()} />
          <input value={np.url}         placeholder="url (https://…)"     onChange={e => setNp(v => ({ ...v, url: e.target.value }))}         style={inputStyle()} />
          <input value={np.project_ref ?? ''} placeholder="project_ref"   onChange={e => setNp(v => ({ ...v, project_ref: e.target.value }))} style={inputStyle()} />
          <input value={np.anon_key ?? ''}    placeholder="anon_key"      onChange={e => setNp(v => ({ ...v, anon_key: e.target.value }))}    style={{ ...inputStyle(), gridColumn: '1 / -1' }} />
        </div>
        <button onClick={addProject} style={btnPrimary(true)}>+ AGREGAR PROYECTO</button>
      </div>
      <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
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
      </div>
      )}
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
