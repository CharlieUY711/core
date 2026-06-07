'use client'
import { useState, useEffect, useCallback } from 'react'

type AppRow = { id: string; name_es: string; vercel_project_id: string | null }
type Deployment = {
  uid: string
  state: string
  created: number
  url: string | null
  target: string | null
  branch: string | null
  commit_message: string | null
}

const mono = 'var(--font-mono)'

function stateColor(state: string): string {
  const s = state.toUpperCase()
  if (s === 'READY') return 'var(--color-green)'
  if (s === 'ERROR' || s === 'CANCELED') return '#d9534f'
  return 'var(--color-gold)' // BUILDING / QUEUED / INITIALIZING
}

export default function ReleasePanel() {
  const [apps, setApps] = useState<AppRow[]>([])
  const [selected, setSelected] = useState<string>('')
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedApp = apps.find(a => a.id === selected) || null

  useEffect(() => {
    fetch('/api/admin/apps', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.apps) setApps(d.apps) })
      .catch(() => setError('No se pudieron cargar las apps.'))
  }, [])

  const loadDeployments = useCallback(async (projectId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vercel/deployments?project_id=${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al leer deploys')
      setDeployments(data.deployments || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer deploys')
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onSelect = useCallback((id: string) => {
    setSelected(id)
    setNotice(null)
    setDeployments([])
    const app = apps.find(a => a.id === id)
    if (app?.vercel_project_id) loadDeployments(app.vercel_project_id)
  }, [apps, loadDeployments])

  const release = useCallback(async () => {
    if (!selectedApp?.vercel_project_id) return
    setReleasing(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/vercel/deploy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedApp.vercel_project_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo disparar el deploy')
      setNotice('Release disparado. El build está en curso.')
      setTimeout(() => loadDeployments(selectedApp.vercel_project_id as string), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al disparar el release')
    } finally {
      setReleasing(false)
    }
  }, [selectedApp, loadDeployments])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Release</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-3)', margin: '4px 0 0' }}>
            Estado de los deploys de Vercel y disparo de releases por app.
          </p>
        </div>
        <select value={selected} onChange={e => onSelect(e.target.value)} style={{
          fontFamily: mono, fontSize: '12px', padding: '8px 12px', borderRadius: '6px',
          border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)', cursor: 'pointer', minWidth: '200px',
        }}>
          <option value="">— elegí una app —</option>
          {apps.map(a => (
            <option key={a.id} value={a.id} disabled={!a.vercel_project_id}>
              {a.name_es}{!a.vercel_project_id ? ' (sin proyecto Vercel)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: 'rgba(217,83,79,0.1)', border: '1px solid rgba(217,83,79,0.35)', color: '#e69b98', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.35)', color: '#86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {!selectedApp && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--color-text-3)' }}>
          Elegí una app para ver su estado de deploy.
        </div>
      )}

      {selectedApp && !selectedApp.vercel_project_id && (
        <div style={{ padding: '24px', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--color-text-3)' }}>
          Esta app no tiene <span style={{ fontFamily: mono }}>vercel_project_id</span>. Cargalo en Settings → Acceso y base por App.
        </div>
      )}

      {selectedApp?.vercel_project_id && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <button onClick={() => loadDeployments(selectedApp.vercel_project_id as string)} disabled={loading} style={btnOutline}>
              {loading ? 'CARGANDO…' : '⟳ ACTUALIZAR'}
            </button>
            <button onClick={release} disabled={releasing} style={btnGold}>
              {releasing ? 'DISPARANDO…' : '▶ RELEASE'}
            </button>
          </div>

          {deployments.length === 0 && !loading && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Sin deploys para mostrar.</p>
          )}

          <div style={{ display: 'grid', gap: '8px' }}>
            {deployments.map((d, i) => (
              <div key={d.uid} style={{
                padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)',
                background: 'rgba(15,56,117,0.06)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <span style={{
                  fontFamily: mono, fontSize: '9px', padding: '3px 9px', borderRadius: '10px',
                  backgroundColor: `${stateColor(d.state)}22`, color: stateColor(d.state),
                }}>
                  {d.state.toUpperCase()}
                </span>
                {i === 0 && <span style={{ fontFamily: mono, fontSize: '8px', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>ÚLTIMO</span>}
                <span style={{ fontFamily: mono, fontSize: '11px', color: 'var(--color-text-3)' }}>{d.branch || '—'}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text)', flex: 1, minWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.commit_message || ''}
                </span>
                <span style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)' }}>
                  {new Date(d.created).toLocaleString('es-UY')}
                </span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" style={{
                    fontFamily: mono, fontSize: '9px', padding: '4px 10px', borderRadius: '4px',
                    border: '1px solid var(--color-border)', color: 'var(--color-text-3)', textDecoration: 'none',
                  }}>
                    VER ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const btnOutline: React.CSSProperties = {
  fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 16px', borderRadius: '4px',
  border: '1px solid var(--color-border)', color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer',
}

const btnGold: React.CSSProperties = {
  fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 20px', borderRadius: '4px',
  border: '1px solid var(--color-gold)', color: 'var(--color-gold)', background: 'transparent', cursor: 'pointer',
}
