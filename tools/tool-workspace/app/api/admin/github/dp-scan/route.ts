import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TreeItem = { path: string; type: string }
type DpRule = { key: string; label: string; pattern: string; flags: string | null; sort_order: number; enabled: boolean }

async function gh(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } })
}

export async function GET(req: Request) {
  const supabase = await createClient()

  // Guard admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  const repo = new URL(req.url).searchParams.get('repo')
  if (!repo) return NextResponse.json({ error: 'Falta repo' }, { status: 400 })

  const { data: cfg } = await supabase
    .from('workspace_config').select('key, value').in('key', ['github_token', 'github_owner'])
  const config: Record<string, string> = {}
  ;(cfg as { key: string; value: string }[] | null ?? []).forEach((r) => { config[r.key] = r.value })
  const token = config['github_token'] || process.env.GITHUB_TOKEN || ''
  const owner = config['github_owner'] || process.env.GITHUB_OWNER || ''
  if (!token || !owner) return NextResponse.json({ error: 'GitHub no configurado en Settings.' }, { status: 400 })

  // Reglas de detección (desde la base — configurables, nada fijo)
  const { data: ruleRows } = await supabase
    .from('dp_rules').select('*').eq('enabled', true).order('sort_order', { ascending: true })
  const rules = (ruleRows as DpRule[] | null) ?? []
  const compiled = rules.map(r => {
    let re: RegExp | null = null
    try { re = new RegExp(r.pattern, r.flags || 'i') } catch { re = null }
    return { key: r.key, label: r.label, re }
  })

  // Branch por defecto
  const repoRes = await gh(`https://api.github.com/repos/${owner}/${repo}`, token)
  if (!repoRes.ok) return NextResponse.json({ error: 'No se pudo leer el repo.' }, { status: 400 })
  const repoInfo = (await repoRes.json()) as { default_branch: string }

  // Árbol completo
  const treeRes = await gh(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`, token
  )
  if (!treeRes.ok) return NextResponse.json({ error: 'No se pudo leer el árbol del repo.' }, { status: 400 })
  const treeJson = (await treeRes.json()) as { tree?: TreeItem[] }
  const paths = (treeJson.tree ?? [])
    .filter(t => t.type === 'blob')
    .map(t => t.path)
    .filter(p => !p.startsWith('node_modules/') && !p.startsWith('.next/') && !p.startsWith('dist/') && !p.startsWith('build/'))

  const items = compiled.map(rule => {
    const files = rule.re ? paths.filter(p => rule.re!.test(p)).slice(0, 20) : []
    return { key: rule.key, label: rule.label, present: files.length > 0, files }
  })

  // ¿Usa el paquete compartido de auth?
  let usesSharedAuth = false
  const pkgRes = await gh(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, token)
  if (pkgRes.ok) {
    try {
      const pkgFile = (await pkgRes.json()) as { content?: string; encoding?: string }
      if (pkgFile.content) {
        const decoded = Buffer.from(pkgFile.content, (pkgFile.encoding as BufferEncoding) || 'base64').toString('utf-8')
        usesSharedAuth = /@charlieuy711\/auth/.test(decoded)
      }
    } catch { /* noop */ }
  }

  return NextResponse.json({
    repo,
    branch: repoInfo.default_branch,
    uses_shared_auth: usesSharedAuth,
    items,
    total_files: paths.length,
  })
}
