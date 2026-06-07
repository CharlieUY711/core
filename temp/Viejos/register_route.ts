import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\.git$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: Request) {
  const supabase = await createClient()

  let body: { name?: string; repo_url?: string; repo_branch?: string; git_provider?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { name, repo_url, repo_branch = 'main', git_provider = 'github', id } = body

  if (!name || !repo_url) {
    return NextResponse.json({ error: 'Falta name o repo_url' }, { status: 400 })
  }

  const appId = id || slugify(name)
  // badge: código corto derivado del nombre (editable después en Config)
  const badge = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'APP'
  // subdominio plausible: core-market -> market.core.com.uy (editable en Config)
  const subdomain = appId.replace(/^core-/, '')
  const url = `https://${subdomain}.core.com.uy`

  // Evitar duplicados por repo_url
  const { data: existing } = await supabase
    .from('portals')
    .select('id')
    .eq('repo_url', repo_url)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ya hay una app registrada con ese repo.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('portals')
    .insert({
      id: appId,
      badge,
      name_es: name,
      name_en: name,
      name_pt: name,
      desc_es: '',
      desc_en: '',
      desc_pt: '',
      url,
      status: 'planned',
      access: 'restricted',
      repo_url,
      repo_branch,
      git_provider,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ app: data })
}
