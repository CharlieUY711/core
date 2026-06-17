'use client'
import { useEffect, useState } from 'react'
import type { ToolScanResult, LayerStatus } from '@/app/api/admin/github/tool-scan/route'

const mono = 'var(--font-mono)'

const LAYER_LABELS: Record<string, string> = {
  functionality: 'Funcionalidad',
  design_system: 'Design System',
  state:         'Estado',
  contract:      'Contrato',
  lifecycle:     'Ciclo de vida',
  environment:   'Entorno',
}

const STATUS_COLOR: Record<LayerStatus, string> = {
  exists:     'var(--color-green)',
  incomplete: 'var(--color-gold)',
  misplaced:  '#a78bfa',
  missing:    '#d9534f',
}

const STATUS_ICON: Record<LayerStatus, string> = {
  exists:     '✓',
  incomplete: '◑',
  misplaced:  '⇄',
  missing:    '✕',
}

const STATUS_LABEL: Record<LayerStatus, string> = {
  exists:     'existe',
  incomplete: 'incompleto',
  misplaced:  'mal ubicado',
  missing:    'falta',
}

export default function ToolLayerScan({ repo }: { repo: string }) {
  const [data,    setData]    = useState<ToolScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res  = await fetch(`/api/admin/github/tool-scan?repo=${encodeURIComponent(repo)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Error al escanear')
        if (alive) setData(json)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [repo])

  if (loading) return (
    <div style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)', padding: '10px 0' }}>
      analizando capas de {repo}…
    </div>
  )
  if (error) return (
    <div style={{ fontFamily: mono, fontSize: '10px', color: '#d9534f', padding: '10px 0' }}>
      {error}
    </div>
  )
  if (!data) return null

  const layers = Object.entries(data.layers) as [keyof typeof data.layers, typeof data.layers[keyof typeof data.layers]][]

  return (
    <div style={{ padding: '4px 0 12px' }}>

      {/* Header: score + framework */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)' }}>
          {data.framework}
        </span>
        <div style={{ flex: 1, maxWidth: '140px', height: '5px', background: 'rgba(74,96,128,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${data.raw_score}%`, height: '100%',
            background: data.raw_score >= 80 ? 'var(--color-green)' : data.raw_score >= 50 ? 'var(--color-gold)' : '#d9534f',
          }} />
        </div>
        <span style={{
          fontFamily: mono, fontSize: '12px', fontWeight: 700,
          color: data.raw_score >= 80 ? 'var(--color-green)' : data.raw_score >= 50 ? 'var(--color-gold)' : '#d9534f',
        }}>
          {data.raw_score}%
        </span>
        <span style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)', opacity: 0.5 }}>
          {new Date(data.scanned_at).toLocaleTimeString('es-UY')}
        </span>
      </div>

      {/* 6 capas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        {layers.map(([key, layer]) => {
          const color = STATUS_COLOR[layer.status]
          return (
            <div key={key} style={{
              padding: '10px 12px', borderRadius: '6px',
              border: `1px solid ${color}44`,
              background: `${color}0a`,
            }}>
              {/* Título + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontFamily: mono, fontSize: '10px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {LAYER_LABELS[key] ?? key}
                </span>
                <span style={{
                  fontFamily: mono, fontSize: '9px', padding: '2px 7px', borderRadius: '10px',
                  background: `${color}18`, color,
                }}>
                  {STATUS_ICON[layer.status]} {STATUS_LABEL[layer.status]}
                </span>
              </div>

              {/* Notes */}
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginBottom: 4, lineHeight: 1.4 }}>
                {layer.notes}
              </div>

              {/* Env value */}
              {'value' in layer && layer.value && (
                <div style={{ fontFamily: mono, fontSize: '9px', color, opacity: 0.8 }}>
                  {layer.value}
                </div>
              )}

              {/* Files */}
              {layer.files.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {layer.files.slice(0, 3).map(f => (
                    <div key={f} style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)', opacity: 0.7 }}>
                      {f}
                    </div>
                  ))}
                  {layer.files.length > 3 && (
                    <div style={{ fontFamily: mono, fontSize: '9px', color: 'var(--color-text-3)', opacity: 0.4 }}>
                      +{layer.files.length - 3} más
                    </div>
                  )}
                </div>
              )}

              {/* Missing */}
              {layer.missing.length > 0 && (
                <div style={{ marginTop: 5, borderTop: `1px solid ${color}22`, paddingTop: 5 }}>
                  {layer.missing.slice(0, 2).map(m => (
                    <div key={m} style={{ fontFamily: mono, fontSize: '9px', color: '#d9534f', opacity: 0.8 }}>
                      ✕ {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Acciones */}
      {(data.actions.auto.length > 0 || data.actions.manual.length > 0) && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
          {data.actions.auto.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-green)', marginBottom: 4 }}>
                AUTO
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {data.actions.auto.map(a => (
                  <span key={a} title={data.actions.details[a] ?? ''} style={{
                    fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '4px',
                    border: '1px solid var(--color-green)', color: 'var(--color-green)',
                    background: 'rgba(46,160,67,0.08)', cursor: 'help',
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.actions.manual.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.1em', color: 'var(--color-gold)', marginBottom: 4 }}>
                MANUAL
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {data.actions.manual.map(a => (
                  <span key={a} title={data.actions.details[a] ?? ''} style={{
                    fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '4px',
                    border: '1px solid var(--color-gold)', color: 'var(--color-gold)',
                    background: 'rgba(201,168,76,0.08)', cursor: 'help',
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
