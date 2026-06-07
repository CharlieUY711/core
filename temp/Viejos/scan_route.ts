import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fileExists(owner: string, repo: string, path: string, token: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  return res.status === 200
}

async function checkSupabase(owner: string, repo: string, token: string): Promise<boolean> {
  const paths = ['lib/supabase', 'lib/supabaseClient.ts', 'utils/supabase']
  for (const p of paths) {
    if (await fileExists(owner, repo, p, token)) return true
  }
  return false
}

export async function GET() {
  const supabase = await createClient()

  // Tokens desde workspace_config
  const { data: configs } = await supabase
    .from('workspace_config')
    .select('key, value')
    .in('key', ['github_token', 'github_owner'])

  const cfg: Record<string, string> = {}
  ;(configs as { key: string; value: string }[] | null ?? []).forEach((r) => { cfg[r.key] = r.value })

  const token = cfg['github_token'] || process.env.GITHUB_TOKEN || ''
  const owner = cfg['github_owner'] || process.env.GITHUB_OWNER || ''

  if (!token || !owner) {
    return NextResponse.json(
      { error: 'GitHub token u owner no configurados. Revisá Settings → Integraciones.' },
      { status: 400 }
    )
  }

  // Listar repos del owner que empiecen con core-
  const reposRes = await fetch(
    `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  )
  const allRepos = await reposRes.json()
  if (!Array.isArray(allRepos)) {
    return NextResponse.json(
      { error: 'No se pudieron leer los repos. Verificá el token y el owner.' },
      { status: 400 }
    )
  }

  const coreRepos = (allRepos as { name: string }[]).filter((r) => r.name.startsWith('core-'))

  // Apps registradas en Supabase
  const { data: registeredApps } = await supabase
    .from('portals')
    .select('id, name_es, vercel_project_id, repo_url, palette_id, design_id')

  type Reg = { id: string; name_es: string; vercel_project_id: string | null; repo_url: string | null; palette_id: string | null; design_id: string | null }
  const registeredMap: Record<string, Reg> = {}
  ;(registeredApps as Reg[] | null ?? []).forEach((a) => {
    if (a.repo_url) {
      const repoName = a.repo_url.split('/').pop()?.replace('.git', '') ?? ''
      if (repoName) registeredMap[repoName] = a
    }
  })

  // Analizar cada repo en paralelo
  const results = await Promise.all(
    (coreRepos as { name: string; html_url: string; updated_at: string; default_branch: string }[]).map(async (repo) => {
      const [
        hasPackage, hasTsconfig, hasEnvLocal, hasMiddleware,
        hasVercelJson, hasNextConfig, hasNextConfigTs, hasViteConfig, hasSupabase,
      ] = await Promise.all([
        fileExists(owner, repo.name, 'package.json', token),
        fileExists(owner, repo.name, 'tsconfig.json', token),
        fileExists(owner, repo.name, '.env.local', token),
        fileExists(owner, repo.name, 'middleware.ts', token),
        fileExists(owner, repo.name, 'vercel.json', token),
        fileExists(owner, repo.name, 'next.config.js', token),
        fileExists(owner, repo.name, 'next.config.ts', token),
        fileExists(owner, repo.name, 'vite.config.ts', token),
        checkSupabase(owner, repo.name, token),
      ])

      const framework = hasNextConfig || hasNextConfigTs ? 'nextjs' : hasViteConfig ? 'vite' : 'unknown'
      const registered = registeredMap[repo.name] ?? null

      const checks = {
        package_json:  hasPackage,
        tsconfig:      hasTsconfig,
        env_local:     hasEnvLocal,
        middleware:    hasMiddleware,
        vercel_json:   hasVercelJson,
        framework:     hasNextConfig || hasNextConfigTs || hasViteConfig,
        supabase:      hasSupabase,
        registered:    !!registered,
        vercel_linked: !!registered?.vercel_project_id,
        palette:       !!registered?.palette_id,
        design:        !!registered?.design_id,
      }

      const total = Object.keys(checks).length
      const passing = Object.values(checks).filter(Boolean).length
      const score = Math.round((passing / total) * 100)

      return {
        name: repo.name,
        url: repo.html_url,
        branch: repo.default_branch,
        updated_at: repo.updated_at,
        framework,
        checks,
        score,
        registered_as: registered ? { id: registered.id, name: registered.name_es } : null,
      }
    })
  )

  results.sort((a, b) => a.score - b.score)
  return NextResponse.json({ repos: results, scanned_at: new Date().toISOString() })
}
