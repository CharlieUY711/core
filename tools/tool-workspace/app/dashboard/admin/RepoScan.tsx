'use client'
import { useEffect, useState } from 'react'

type CheckStatus = 'pass' | 'fail' | 'na'
type CheckItem = { key: string; label: string; status: CheckStatus }
type RepoResult = { name: string; framework: string; checks: CheckItem[]; score: number }

const mono = 'var(--font-mono)'
function scoreColor(s: number) { return s >= 80 ? 'var(--color-green)' : s >= 50 ? 'var(--color-gold)' : '#d9534f' }

export default function RepoScan({ repo }: { repo: string }) {
  const [data, setData] = useState<RepoResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/github/scan?repo=${encodeURIComponent(repo)}`)
        const text = await res.text()
        const j = text ? JSON.parse(text) : {}
        if (!res.ok) throw new Error(j.error || 'Error al escanear')
        if (alive) {
          const r = (j.repos ?? [])[0] ?? null
          if (!r) throw new Error(`No se encontró el repo "${repo}" (¿existe y empieza con core-?)`)
          setData(r)
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [repo])

  if (loading) return <div style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)', padding: '6px 0' }}>escaneando {repo}…</div>
  if (error)   return <div style={{ fontFamily: mono, fontSize: '10px', color: '#d9534f', padding: '6px 0' }}>{error}</div>
  if (!data)   return null

  return (
    <div style={{ padding: '4px 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontFamily: mono, fontSize: '10px', color: 'var(--color-text-3)' }}>{data.framework}</span>
        <div style={{ flex: 1, maxWidth: '160px', height: '5px', background: 'rgba(74,96,128,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${data.score}%`, height: '100%', background: scoreColor(data.score) }} />
        </div>
        <span style={{ fontFamily: mono, fontSize: '12px', fontWeight: 700, color: scoreColor(data.score) }}>{data.score}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px' }}>
        {data.checks.map(c => {
          const isPass = c.status === 'pass'
          const isNa = c.status === 'na'
          const color = isPass ? 'var(--color-green)' : isNa ? 'var(--color-text-3)' : '#d9534f'
          const bg = isPass ? 'rgba(46,160,67,0.08)' : isNa ? 'rgba(74,96,128,0.10)' : 'rgba(217,83,79,0.08)'
          const border = isPass ? 'rgba(46,160,67,0.25)' : isNa ? 'var(--color-border)' : 'rgba(217,83,79,0.3)'
          const icon = isPass ? '✓' : isNa ? '—' : '✕'
          return (
            <div key={c.key} title={isNa ? 'No aplica' : c.status} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: mono, fontSize: '10px', padding: '5px 8px', borderRadius: '4px',
              color, background: bg, border: `1px solid ${border}`, opacity: isNa ? 0.5 : 1,
            }}>
              <span>{icon}</span><span>{c.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
