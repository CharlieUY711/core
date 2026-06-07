import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ENV_FILE_CANDIDATES = [
  '.env.example',
  '.env.template',
  '.env.sample',
  '.env.local.example',
]

function parseEnvKeys(text: string): string[] {
  const keys: string[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/)
    if (m) keys.push(m[1])
  }
  return Array.from(new Set(keys))
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const params = new URL(req.url).searchParams
  const repo = params.get('repo')
  let vercelProjectId = params.get('vercel_project_id')

  if (!repo) return NextResponse.json({ error: 'Falta repo' }, { status: 400 })

  // Si no vino el vercel_project_id, intentar resolverlo desde la app registrada
  if (!vercelProjectId) {
    const { data: app } = await supabase
      .from('portals')
      .select('vercel_project_id')
      .ilike('repo_url', `%${repo}%`)
      .maybeSingle()
    vercelProjectId = (app as { vercel_project_id: string | null } | null)?.vercel_project_id ?? null
  }

  // Tokens desde workspace_config
  const { data: cfg } = await supabase
    .from('workspace_config')
    .select('key, value')
    .in('key', ['github_token', 'github_owner', 'vercel_token'])

  const config: Record<string, string> = {}
  ;(cfg as { key: string; value: string }[] | null ?? []).forEach((r) => {
    config[r.key] = r.value
  })

  const ghToken = config['github_token'] || process.env.GITHUB_TOKEN || ''
  const ghOwner = config['github_owner'] || process.env.GITHUB_OWNER || ''
  const vcToken = config['vercel_token'] || process.env.VERCEL_TOKEN || ''

  // 1. Leer .env.example del repo (los valores secretos NO están en git)
  let repoEnvKeys: string[] = []
  let envFileFound: string | null = null
  if (ghToken && ghOwner) {
    for (const path of ENV_FILE_CANDIDATES) {
      const res = await fetch(
        `https://api.github.com/repos/${ghOwner}/${repo}/contents/${path}`,
        { headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.raw' } }
      )
      if (res.status === 200) {
        const text = await res.text()
        repoEnvKeys = parseEnvKeys(text)
        envFileFound = path
        break
      }
    }
  }

  // 2. Leer env vars reales de Vercel: SOLO nombres, salvo las NEXT_PUBLIC_*
  let vercelEnvKeys: string[] = []
  const publicValues: Record<string, string> = {}
  if (vercelProjectId && vcToken) {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/env?decrypt=true`,
      { headers: { Authorization: `Bearer ${vcToken}` } }
    )
    if (res.ok) {
      const json = (await res.json()) as { envs?: { key: string; value?: string }[] }
      for (const e of json.envs ?? []) {
        vercelEnvKeys.push(e.key)
        // Solo las NEXT_PUBLIC_* (no secretas) exponen valor, para auto-matchear
        if (e.key.startsWith('NEXT_PUBLIC_') && typeof e.value === 'string') {
          publicValues[e.key] = e.value
        }
      }
      vercelEnvKeys = Array.from(new Set(vercelEnvKeys))
    }
  }

  // 3. Auto-match de la base Supabase por la URL pública
  let suggestedSupabaseProjectId: string | null = null
  const publicUrl = publicValues['NEXT_PUBLIC_SUPABASE_URL']
  if (publicUrl) {
    const { data: projects } = await supabase
      .from('supabase_projects')
      .select('id, url')
    const match = (projects as { id: string; url: string }[] | null ?? []).find(
      (p) => p.url.replace(/\/$/, '') === publicUrl.replace(/\/$/, '')
    )
    if (match) suggestedSupabaseProjectId = match.id
  }

  return NextResponse.json({
    repo,
    env_file_found: envFileFound,
    repo_env_keys: repoEnvKeys,
    vercel_env_keys: vercelEnvKeys,
    public_values: publicValues,
    suggested_supabase_project_id: suggestedSupabaseProjectId,
  })
}
