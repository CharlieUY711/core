'use client'
import { useState, useCallback } from 'react'

type Checks = {
  package_json: boolean
  tsconfig: boolean
  env_local: boolean
  middleware: boolean
  vercel_json: boolean
  framework: boolean
  supabase: boolean
  registered: boolean
  vercel_linked: boolean
  palette: boolean
  design: boolean
}

type RepoResult = {
  name: string
  url: string
  branch: string
  updated_at: string
  framework: string
  checks: Checks
  score: number
  registered_as: { id: string; name: string } | null
}

type Survey = {
  env_file_found: string | null
  repo_env_keys: string[]
  vercel_env_keys: string[]
  public_values: Record<string, string>
  suggested_supabase_project_id: string | null
}

const CHECK_LABELS: Record<keyof Checks, string> = {
  package_json: 'package.json',
  tsconfig: 'tsconfig',
  env_local: '.env.local',
  middleware: 'middleware',
  vercel_json: 'vercel.json',
  framework: 'framework',
  supabase: 'supabase',
  registered: 'registrada',
  vercel_linked: 'vercel',
  palette: 'paleta',
  design: 'diseño',
}

const FRAMEWORK_LABEL: Record<string, string> = {
  nextjs: 'Next.js',
  vite: 'Vite',
  unknown: '—',
}

function scoreColor(score: number) {
  if (score >= 80) return 'var(--color-green)'
  if (score >= 50) return 'var(--color-gold)'
  return '#d9534f'
}

const mono = 'var(--font-mono)'

export default function AppScanner() {
  const [repos, setRepos] = useState<RepoResult[]>([])
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)

  // relevamiento de env por repo
  const [surveys, setSurveys] = useState<Record<string, Survey>>({})
  const [surveying, setSurveying] = useState<string | null>(null)

  const [manualUrl, setManualUrl] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualBranch, setManualBranch] = useState('main')

  const scan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/github/scan', { cache: 'no-store' })
      const text = await res.text()
      let data: { repos?: RepoResult[]; scanned_at?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          `El endpoint /api/admin/github/scan no devolvió JSON (status ${res.status}). ` +
          `¿Está desplegado app/api/admin/github/scan/route.ts?`
        )
      }
      if (!res.ok) throw new Error(data.error || 'Error al escanear')
      setRepos(data.repos || [])
      setScannedAt(data.scanned_at || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(
    async (payload: { name: string; repo_url: string; repo_branch?: string }) => {
      setImporting(payload.repo_url)
      setError(null)
      try {
        const res = await fetch('/api/admin/apps/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo registrar')
        await scan()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al importar')
      } finally {
        setImporting(null)
      }
    },
    [scan]
  )

  const importManual = useCallback(() => {
    if (!manualUrl.trim()) {
      setError('Pegá la URL del repo')
      return
    }
    const derivedName =
      manualName.trim() ||
      manualUrl.trim().split('/').pop()?.replace(/\.git$/, '') ||
      'app'
    register({ name: derivedName, repo_url: manualUrl.trim(), repo_branch: manualBranch.trim() || 'main' })
    setManualUrl('')
    setManualName('')
  }, [manualUrl, manualName, manualBranch, register])

  const runSurvey = useCallback(async (repoName: string) => {
    setSurveying(repoName)
    setError(null)
    try {
      const res = await fetch(`/api/admin/apps/env-survey?repo=${encodeURIComponent(repoName)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al relevar env')
      setSurveys(s => ({ ...s, [repoName]: data }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al relevar env')
    } finally {
      setSurveying(null)
    }
  }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Escáner de Apps</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-3)', margin: '4px 0 0' }}>
            {scannedAt
              ? `Último escaneo: ${new Date(scannedAt).toLocaleString('es-UY')}`
              : 'Lee los repos core-* de GitHub y analiza qué les falta.'}
          </p>
        </div>
        <button onClick={scan} disabled={loading} style={{
          fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', padding: '8px 16px',
          borderRadius: '4px', border: '1px solid var(--color-gold)', color: 'var(--color-gold)',
          background: 'transparent', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1,
        }}>
          {loading ? 'ESCANEANDO…' : '⟳ ESCANEAR REPOS'}
        </button>
      </div>

      {/* Alta manual */}
      <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'rgba(15,56,117,0.06)', marginBottom: '24px' }}>
        <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '12px' }}>
          IMPORTAR DESDE UN REPOSITORIO
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://github.com/CharlieUY711/core-…" style={inputStyle(1, 220)} />
          <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="nombre (opcional)" style={inputStyle(0, 150)} />
          <input value={manualBranch} onChange={e => setManualBranch(e.target.value)} placeholder="rama" style={inputStyle(0, 90)} />
          <button onClick={importManual} disabled={!!importing} style={{
            fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', padding: '9px 16px',
            borderRadius: '4px', border: '1px solid var(--color-text)', color: 'var(--color-text)',
            background: 'transparent', cursor: 'pointer',
          }}>
            IMPORTAR
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '10px', opacity: 0.7 }}>
          ¿Está solo en una carpeta local? Pusheala a un repo y después importala acá.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(217,83,79,0.1)', border: '1px solid rgba(217,83,79,0.35)', color: '#e69b98', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {repos.length === 0 && !loading && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--color-text-3)' }}>
          Tocá “ESCANEAR REPOS” para analizar tus apps.
        </div>
      )}

      {repos.map(r => {
        const isImporting = importing === r.url
        return (
          <div key={r.name} style={{ padding: '18px 20px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'rgba(15,56,117,0.06)', marginBottom: '12px' }}>
            {/* fila título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{r.name}</span>
              <Tag>{FRAMEWORK_LABEL[r.framework] ?? r.framework}</Tag>
              <Tag>{r.branch}</Tag>
              {r.registered_as
                ? <Tag color="var(--color-green)">registrada · {r.registered_as.name}</Tag>
                : <Tag color="var(--color-gold)">sin registrar</Tag>}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                <div style={{ flex: 1, height: '5px', background: 'rgba(74,96,128,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.score}%`, height: '100%', background: scoreColor(r.score) }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: '12px', fontWeight: 700, color: scoreColor(r.score) }}>{r.score}%</span>
              </div>
            </div>

            {/* checks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px', marginBottom: '14px' }}>
              {(Object.keys(CHECK_LABELS) as (keyof Checks)[]).map(k => {
                const ok = r.checks[k]
                return (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontFamily: mono, fontSize: '10px', padding: '5px 8px', borderRadius: '4px',
                    color: ok ? 'var(--color-green)' : 'var(--color-text-3)',
                    background: ok ? 'rgba(46,160,67,0.08)' : 'rgba(74,96,128,0.12)',
                    border: `1px solid ${ok ? 'rgba(46,160,67,0.25)' : 'var(--color-border)'}`,
                    opacity: ok ? 1 : 0.6,
                  }}>
                    <span>{ok ? '✓' : '✕'}</span>
                    <span>{CHECK_LABELS[k]}</span>
                  </div>
                )
              })}
            </div>

            {/* acciones */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a href={r.url} target="_blank" rel="noreferrer" style={{
                fontFamily: mono, fontSize: '9px', letterSpacing: '0.08em', padding: '5px 12px',
                borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-3)',
                textDecoration: 'none',
              }}>
                VER REPO ↗
              </a>
              <button onClick={() => runSurvey(r.name)} disabled={surveying === r.name} style={{
                fontFamily: mono, fontSize: '9px', letterSpacing: '0.08em', padding: '5px 12px',
                borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-3)',
                background: 'transparent', cursor: 'pointer',
              }}>
                {surveying === r.name ? 'RELEVANDO…' : 'RELEVAR ENV'}
              </button>
              {!r.registered_as && (
                <button onClick={() => register({ name: r.name, repo_url: r.url, repo_branch: r.branch })} disabled={isImporting} style={{
                  fontFamily: mono, fontSize: '9px', letterSpacing: '0.08em', padding: '5px 12px',
                  borderRadius: '4px', border: '1px solid var(--color-gold)', color: 'var(--color-gold)',
                  background: 'transparent', cursor: 'pointer',
                }}>
                  {isImporting ? 'IMPORTANDO…' : 'IMPORTAR COMO APP'}
                </button>
              )}
            </div>

            {surveys[r.name] && <SurveyPanel survey={surveys[r.name]} />}
          </div>
        )
      })}
    </div>
  )
}

function SurveyPanel({ survey }: { survey: Survey }) {
  const publicUrl = survey.public_values['NEXT_PUBLIC_SUPABASE_URL']
  return (
    <div style={{ marginTop: '14px', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'rgba(74,96,128,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', margin: '0 0 8px' }}>
            REPO {survey.env_file_found ? `· ${survey.env_file_found}` : '· sin .env.example'}
          </p>
          {survey.repo_env_keys.length === 0
            ? <span style={{ fontSize: '11px', color: 'var(--color-text-3)', opacity: 0.6 }}>—</span>
            : survey.repo_env_keys.map(k => <KeyChip key={k}>{k}</KeyChip>)}
        </div>
        <div>
          <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-3)', margin: '0 0 8px' }}>
            VERCEL (nombres)
          </p>
          {survey.vercel_env_keys.length === 0
            ? <span style={{ fontSize: '11px', color: 'var(--color-text-3)', opacity: 0.6 }}>sin proyecto Vercel linkeado</span>
            : survey.vercel_env_keys.map(k => <KeyChip key={k}>{k}</KeyChip>)}
        </div>
      </div>
      {publicUrl && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-3)' }}>
          <span style={{ fontFamily: mono }}>NEXT_PUBLIC_SUPABASE_URL</span>: {publicUrl}{' '}
          {survey.suggested_supabase_project_id
            ? <span style={{ color: 'var(--color-green)' }}>→ matchea “{survey.suggested_supabase_project_id}”</span>
            : <span style={{ color: 'var(--color-gold)' }}>→ no matchea ninguna base registrada</span>}
        </div>
      )}
    </div>
  )
}

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: mono, fontSize: '9px', padding: '2px 7px', margin: '0 4px 4px 0',
      borderRadius: '4px', background: 'rgba(15,56,117,0.2)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)',
    }}>
      {children}
    </span>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
      backgroundColor: color ? `${color}22` : 'rgba(74,96,128,0.3)',
      color: color || 'var(--color-text-3)',
    }}>
      {children}
    </span>
  )
}

function inputStyle(flex: number, minWidth: number): React.CSSProperties {
  return {
    fontFamily: 'var(--font-base)', fontSize: '13px', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--color-border)', background: 'var(--bg-deep)', color: 'var(--color-text)',
    flex: flex ? '1' : `0 1 ${minWidth}px`, minWidth,
  }
}
