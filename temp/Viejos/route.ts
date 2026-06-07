// app/api/admin/apps/dp-scan/route.ts
import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const GITHUB_OWNER = process.env.GITHUB_OWNER!

// Definiciones Propias a detectar — paths relativos al root del repo
const DP_CHECKS = {
  login_propio:     { label: 'Login propio',       paths: ['app/login', 'app/auth/login'] },
  register_propio:  { label: 'Registro propio',     paths: ['app/register', 'app/signup'] },
  reset_propio:     { label: 'Reset propio',         paths: ['app/reset-password', 'app/forgot-password', 'app/reset'] },
  supabase_propio:  { label: 'Cliente Supabase propio', paths: ['lib/supabase.ts', 'lib/supabase/index.ts', 'utils/supabase.ts'] },
  middleware_propio:{ label: 'Middleware propio',   paths: ['middleware.ts'] },
  tema_propio:      { label: 'Tema/paleta propio',  paths: ['lib/theme.ts', 'lib/tokens.ts', 'styles/tokens.css', 'app/theme'] },
  config_propio:    { label: 'Config hardcodeada',  paths: ['lib/config.ts', 'lib/config/index.ts', 'config/index.ts'] },
}

export type DpKey = keyof typeof DP_CHECKS
export type DpResult = Record<DpKey, { found: boolean; path: string | null }>

async function ghGet(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  })
  return res
}

async function getRepoTree(repo: string, branch: string): Promise<Set<string>> {
  const res = await ghGet(
    `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/trees/${branch}?recursive=1`
  )
  if (!res.ok) return new Set()
  const data = await res.json()
  return new Set((data.tree as { path: string }[]).map(f => f.path))
}

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')
  const branch = req.nextUrl.searchParams.get('branch') || 'main'

  if (!repo) return NextResponse.json({ error: 'Falta ?repo=' }, { status: 400 })

  try {
    const tree = await getRepoTree(repo, branch)

    const result: DpResult = {} as DpResult

    for (const [key, def] of Object.entries(DP_CHECKS) as [DpKey, typeof DP_CHECKS[DpKey]][]) {
      let found = false
      let foundPath: string | null = null
      for (const p of def.paths) {
        // chequea match exacto O que algún path en el árbol empiece con ese prefijo (para carpetas)
        if (tree.has(p) || [...tree].some(t => t === p || t.startsWith(p + '/'))) {
          found = true
          foundPath = p
          break
        }
      }
      result[key] = { found, path: foundPath }
    }

    // También detecta si usa @charlieuy711/auth (señal de que YA adoptó el ecosistema)
    let usaEcosystemAuth = false
    try {
      const pkgRes = await ghGet(
        `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/package.json?ref=${branch}`
      )
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json()
        const content = Buffer.from(pkgData.content, 'base64').toString('utf-8')
        const pkg = JSON.parse(content)
        usaEcosystemAuth = !!(pkg.dependencies?.['@charlieuy711/auth'] || pkg.devDependencies?.['@charlieuy711/auth'])
      }
    } catch { /* si falla, no bloqueamos */ }

    const dpCount = Object.values(result).filter(v => v.found).length

    return NextResponse.json({ dp: result, dp_count: dpCount, usa_ecosystem_auth: usaEcosystemAuth })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
