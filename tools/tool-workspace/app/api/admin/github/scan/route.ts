import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CheckDef = {
  key: string
  label: string
  kind: 'file' | 'dep' | 'meta' | 'framework' | 'conditional_file'
  paths: string[] | null
  dep_match: string | null
  meta_field: string | null
  frameworks: string[]
  optional: boolean
  scored: boolean
  sort_order: number
  fix_hint: string | null
}

type Status = 'pass' | 'fail' | 'na'

type Reg = {
  id: string; name_es: string
  vercel_project_id: string | null; repo_url: string | null
  palette_id: string | null; design_id: string | null
}

async function gh(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } })
}

export async function GET(req: Request) {
  const supabase = await createClient()

  // Guard admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  // Config: tokens
  const { data: configs } = await supabase
    .from('workspace_config').select('key, value').in('key', ['github_token', 'github_owner'])
  const cfg: Record<string, string> = {}
  ;(configs as { key: string; value: string }[] | null ?? []).forEach(r => { cfg[r.key] = r.value })
  const token = cfg['github_token'] || process.env.GITHUB_TOKEN || ''
  const owner = cfg['github_owner'] || process.env.GITHUB_OWNER || ''
  if (!token || !owner) {
    return NextResponse.json({ error: 'GitHub token u owner no configurados. Revisá Settings → Integraciones.' }, { status: 400 })
  }

  // Definiciones de checks (desde la base — nada hardcodeado)
  const { data: checkRows } = await supabase
    .from('scanner_checks').select('*').order('sort_order', { ascending: true })
  const checks = (checkRows as CheckDef[] | null) ?? []
  const hintByKey: Record<string, string> = {}
  checks.forEach(c => { hintByKey[c.key] = c.fix_hint || '' })

  // Repo(s) objetivo
  type RepoLite = { name: string; html_url: string; updated_at: string; default_branch: string }
  const repoFilter = new URL(req.url).searchParams.get('repo')
  let targetRepos: RepoLite[] = []

  if (repoFilter) {
    // Cualquier repo del owner (no solo core-): se busca directo
    const oneRes = await gh(`https://api.github.com/repos/${owner}/${repoFilter}`, token)
    if (!oneRes.ok) {
      const j = await oneRes.json().catch(() => ({}))
      const msg = (j && typeof j === 'object' && 'message' in j) ? String((j as { message: unknown }).message) : 'no encontrado'
      return NextResponse.json({ error: `GitHub: ${msg}. Verificá el repo "${repoFilter}" y el token.` }, { status: 400 })
    }
    const r = await oneRes.json() as RepoLite
    targetRepos = [{ name: r.name, html_url: r.html_url, updated_at: r.updated_at, default_branch: r.default_branch }]
  } else {
    // Bulk: lista los repos del owner (incluye privados). Prefijo core- por defecto en la vista de importación.
    const reposRes = await gh('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner', token)
    const allRepos = await reposRes.json()
    if (!Array.isArray(allRepos)) {
      const msg = (allRepos && typeof allRepos === 'object' && 'message' in allRepos)
        ? String((allRepos as { message: unknown }).message) : 'respuesta inesperada'
      return NextResponse.json({ error: `GitHub: ${msg}. Verificá el token (scope repo) y el owner.` }, { status: 400 })
    }
    targetRepos = (allRepos as RepoLite[]).filter(r => r.name.startsWith('core-'))
  }

  // Apps registradas
  const { data: registeredApps } = await supabase
    .from('portals').select('id, name_es, vercel_project_id, repo_url, palette_id, design_id')
  const registeredMap: Record<string, Reg> = {}
  ;(registeredApps as Reg[] | null ?? []).forEach(a => {
    if (a.repo_url) {
      const n = a.repo_url.split('/').pop()?.replace('.git', '') ?? ''
      if (n) registeredMap[n] = a
    }
  })

  const results = await Promise.all(
    (targetRepos as { name: string; html_url: string; updated_at: string; default_branch: string }[]).map(async (repo) => {
      // Árbol del repo (un solo fetch para todos los checks de archivos)
      const treeRes = await gh(
        `https://api.github.com/repos/${owner}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`, token
      )
      const treeJson = treeRes.ok ? ((await treeRes.json()) as { tree?: { path: string; type: string }[] }) : { tree: [] }
      const paths = (treeJson.tree ?? []).filter(t => t.type === 'blob').map(t => t.path)
      const pathSet = new Set(paths)
      const fileExists = (p: string) => pathSet.has(p) || paths.some(x => x.startsWith(p + '/'))

      // Framework
      const framework =
        ['next.config.js', 'next.config.ts', 'next.config.mjs'].some(fileExists) ? 'nextjs'
        : ['vite.config.ts', 'vite.config.js'].some(fileExists) ? 'vite'
        : 'unknown'

      // Deps del package.json (para checks dep / conditional_file)
      let deps: string[] = []
      const pkgRes = await gh(`https://api.github.com/repos/${owner}/${repo.name}/contents/package.json`, token)
      if (pkgRes.ok) {
        try {
          const pf = (await pkgRes.json()) as { content?: string; encoding?: string }
          if (pf.content) {
            const json = JSON.parse(Buffer.from(pf.content, (pf.encoding as BufferEncoding) || 'base64').toString('utf-8'))
            deps = [...Object.keys(json.dependencies ?? {}), ...Object.keys(json.devDependencies ?? {})]
          }
        } catch { /* noop */ }
      }
      const hasDep = (m: string) => deps.some(d => d.includes(m))

      const reg = registeredMap[repo.name] ?? null
      const metaVal = (f: string | null): boolean => {
        switch (f) {
          case 'registered': return !!reg
          case 'vercel':     return !!reg?.vercel_project_id
          case 'palette':    return !!reg?.palette_id
          case 'design':     return !!reg?.design_id
          default:           return false
        }
      }

      const evaluated = checks.map((c): { key: string; label: string; status: Status; scored: boolean } => {
        // Aplicabilidad por framework
        const applies = c.frameworks.includes('any') || c.frameworks.includes(framework)
        if (!applies) return { key: c.key, label: c.label, status: 'na', scored: c.scored }

        let ok: boolean
        switch (c.kind) {
          case 'file':
            ok = (c.paths ?? []).some(fileExists); break
          case 'dep':
            ok = !!c.dep_match && hasDep(c.dep_match); break
          case 'framework':
            ok = framework !== 'unknown'; break
          case 'meta':
            ok = metaVal(c.meta_field); break
          case 'conditional_file':
            if (c.dep_match && !hasDep(c.dep_match)) return { key: c.key, label: c.label, status: 'na', scored: c.scored }
            ok = (c.paths ?? []).some(fileExists); break
          default:
            ok = false
        }
        if (!ok && c.optional) return { key: c.key, label: c.label, status: 'na', scored: c.scored }
        return { key: c.key, label: c.label, status: ok ? 'pass' : 'fail', scored: c.scored }
      })

      const scoredItems = evaluated.filter(e => e.scored && e.status !== 'na')
      const passing = scoredItems.filter(e => e.status === 'pass').length
      const score = scoredItems.length ? Math.round((passing / scoredItems.length) * 100) : 0

      return {
        name: repo.name,
        url: repo.html_url,
        branch: repo.default_branch,
        updated_at: repo.updated_at,
        framework,
        checks: evaluated.map(({ key, label, status }) => ({ key, label, status, fix_hint: hintByKey[key] || '' })),
        score,
        registered_as: reg ? { id: reg.id, name: reg.name_es } : null,
      }
    })
  )

  results.sort((a, b) => a.score - b.score)
  return NextResponse.json({ repos: results, scanned_at: new Date().toISOString() })
}
