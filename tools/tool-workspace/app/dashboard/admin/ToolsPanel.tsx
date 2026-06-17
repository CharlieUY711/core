'use client'
import { useEffect, useState, useCallback, Fragment } from 'react'
import ToolLayerScan from './ToolLayerScan'
import ToolConfig from './ToolConfig'

type Tool = {
  id: string; key: string; name: string; description: string
  source: 'package' | 'internal' | 'repo' | 'service'
  ref: string | null; category: string; status: string
}

const mono = 'var(--font-mono)'
const statusColor: Record<string, string> = { live: 'var(--color-green)', dev: 'var(--color-blue)', planned: 'var(--color-text-3)' }
const sourceColor: Record<string, string> = { package: 'var(--color-blue)', repo: 'var(--color-green)', service: 'var(--color-gold)', internal: 'var(--color-text-3)' }

function repoName(ref: string | null): string | null {
  if (!ref) return null
  const n = ref.split('/').pop()?.replace('.git', '') ?? ''
  return n || null
}

const COLS = 6

export default function ToolsPanel() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<{ id: string; kind: 'scan' | 'config' } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tools', { cache: 'no-store' })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el catálogo')
      setTools(data.tools ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Tools</h2>
        <span style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)' }}>
          {loading ? 'cargando…' : `${tools.length} tools`}
        </span>
      </div>

      {error && (
        <div style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', color: '#d9534f', fontFamily: mono, fontSize: '11px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!loading && !error && tools.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '12px', color: 'var(--color-text-3)', fontSize: '13px' }}>
          No hay tools en el catálogo todavía.
        </div>
      )}

      {tools.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['Nombre', 'Key', 'Source', 'Ref', 'Estado', ''].map(h => (
                <th key={h} style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', textAlign: 'left', padding: '8px 12px', fontWeight: 500 }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.map(t => {
              const repo = t.source === 'repo' ? repoName(t.ref) : null
              const scanOpen = expanded?.id === t.id && expanded.kind === 'scan'
              const configOpen = expanded?.id === t.id && expanded.kind === 'config'
              const open = scanOpen || configOpen
              return (
                <Fragment key={t.id}>
                  <tr style={{ borderBottom: open ? 'none' : '1px solid rgba(30,51,84,0.5)' }}>
                    <td style={{ fontSize: '13px', color: 'var(--color-text)', padding: '12px' }}>{t.name}</td>
                    <td style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)', padding: '12px' }}>{t.key}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '10px', color: sourceColor[t.source], background: `${sourceColor[t.source]}1f` }}>
                        {t.source}
                      </span>
                    </td>
                    <td style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-blue)', padding: '12px' }}>
                      {t.ref || <span style={{ color: 'var(--color-text-3)', opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '10px', backgroundColor: `${statusColor[t.status]}22`, color: statusColor[t.status] }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <RowBtn
                          label={scanOpen ? '▲ ESCÁNER' : '⟳ ESCÁNER'}
                          color="var(--color-gold)"
                          disabled={!repo}
                          title={repo ? `Escanear ${repo}` : 'Esta tool no tiene repo vinculado'}
                          onClick={() => setExpanded(scanOpen ? null : { id: t.id, kind: 'scan' })}
                        />
                        <RowBtn
                          label={configOpen ? '▲ CONFIG' : '⚙ CONFIG'}
                          color="var(--color-gold)"
                          title="Editar tool"
                          onClick={() => setExpanded(configOpen ? null : { id: t.id, kind: 'config' })}
                        />
                      </div>
                    </td>
                  </tr>
                  {scanOpen && repo && (
                    <tr style={{ borderBottom: '1px solid rgba(30,51,84,0.5)' }}>
                      <td colSpan={COLS} style={{ padding: '4px 12px 16px', background: 'rgba(15,56,117,0.06)' }}>
                        <ToolLayerScan repo={repo} />
                      </td>
                    </tr>
                  )}
                  {configOpen && (
                    <tr style={{ borderBottom: '1px solid rgba(30,51,84,0.5)' }}>
                      <td colSpan={COLS} style={{ padding: '4px 16px 16px', background: 'rgba(15,56,117,0.06)' }}>
                        <ToolConfig tool={t} onSaved={() => { setExpanded(null); load() }} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RowBtn({ label, color, onClick, disabled, title }: {
  label: string; color: string; onClick: () => void; disabled?: boolean; title?: string
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        fontFamily: mono, fontSize: '9px', padding: '4px 10px', borderRadius: '4px',
        border: '1px solid var(--color-border)', background: 'transparent',
        color: disabled ? 'rgba(74,96,128,0.5)' : 'var(--color-text-3)',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = disabled ? 'rgba(74,96,128,0.5)' : 'var(--color-text-3)' }}
    >
      {label}
    </button>
  )
}
