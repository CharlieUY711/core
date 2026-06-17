import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function gh(url: string, token: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
}

export type LayerStatus = 'exists' | 'incomplete' | 'misplaced' | 'missing'
export type ActionType  = 'build' | 'extract' | 'define' | 'skip'

export type ToolScanLayer = {
  status:  LayerStatus
  files:   string[]
  missing: string[]
  notes:   string
}

export type ToolScanResult = {
  tool_id:    string
  repo:       string
  branch:     string
  scanned_at: string
  framework:  string
  layers: {
    functionality: ToolScanLayer
    design_system:  ToolScanLayer
    state:          ToolScanLayer
    contract:       ToolScanLayer
    lifecycle:      ToolScanLayer
    environment:    ToolScanLayer & { value?: string }
  }
  actions: {
    auto:   ActionType[]
    manual: ActionType[]
    details: Record<string, string>
  }
  raw_score: number
}

const LAYER_PROMPT = `Sos un analizador de arquitectura de software. Vas a recibir el árbol de archivos y el contenido de los archivos principales de un repo React/Vite o Next.js.

Tu tarea es mapear el repo contra estas 6 capas de la definición de "Tool":

1. **functionality** — La lógica específica de la tool. ¿Existe el componente principal? ¿Está completo o le faltan partes?
2. **design_system** — Tokens de color, tipografía, espaciado. ¿Existe como archivo separado o está mezclado dentro del componente?
3. **state** — Manejo de estado. ¿Usa CoreTool/useCoreToolState o implementa su propio estado ad-hoc?
4. **contract** — Props, eventos, API surface definida. ¿Hay PropTypes, TypeScript interfaces, o documentación del contrato?
5. **lifecycle** — Hooks de ciclo de vida (onInit, onReady, onDestroy, onError, onUpdate). ¿Existen explícitamente o están dispersos?
6. **environment** — ¿En qué entorno vive? standalone | integrated | embedded | headless | cli

Para cada capa devolvé:
- status: "exists" | "incomplete" | "misplaced" | "missing"
  - exists: está correctamente implementada
  - incomplete: existe pero le faltan partes
  - misplaced: existe pero en el lugar equivocado (ej: design system dentro del componente)
  - missing: no existe en absoluto
- files: lista de archivos relevantes para esta capa
- missing: lista de cosas que faltan o están mal
- notes: explicación breve (1 línea)

También devolvé:
- actions.auto: cosas que se pueden hacer automáticamente ["build", "extract", "skip"]
- actions.manual: cosas que requieren decisión humana ["define", "skip"]  
- actions.details: objeto con descripción de cada acción, key = nombre de la acción

Respondé SOLO con JSON válido, sin markdown, sin explicaciones extra. Formato exacto:
{
  "layers": {
    "functionality": { "status": "...", "files": [], "missing": [], "notes": "..." },
    "design_system":  { "status": "...", "files": [], "missing": [], "notes": "..." },
    "state":          { "status": "...", "files": [], "missing": [], "notes": "..." },
    "contract":       { "status": "...", "files": [], "missing": [], "notes": "..." },
    "lifecycle":      { "status": "...", "files": [], "missing": [], "notes": "..." },
    "environment":    { "status": "...", "files": [], "missing": [], "notes": "...", "value": "standalone|integrated|embedded|headless|cli" }
  },
  "actions": {
    "auto":    [],
    "manual":  [],
    "details": {}
  }
}`

export async function GET(req: Request) {
  const supabase = await createClient()

  // Guard admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })

  const repoName = new URL(req.url).searchParams.get('repo')
  if (!repoName) return NextResponse.json({ error: 'Falta parámetro repo' }, { status: 400 })

  // Tokens desde workspace_config (mismo patrón que scan/route.ts)
  const { data: configs } = await supabase
    .from('workspace_config').select('key, value')
    .in('key', ['github_token', 'github_owner', 'anthropic_api_key'])
  const cfg: Record<string, string> = {}
  ;(configs as { key: string; value: string }[] | null ?? []).forEach(r => { cfg[r.key] = r.value })

  const ghToken    = cfg['github_token']      || process.env.GITHUB_TOKEN      || ''
  const ghOwner    = cfg['github_owner']      || process.env.GITHUB_OWNER      || ''
  const claudeKey  = cfg['anthropic_api_key'] || process.env.ANTHROPIC_API_KEY || ''

  if (!ghToken || !ghOwner)  return NextResponse.json({ error: 'GitHub token u owner no configurados.' }, { status: 400 })
  if (!claudeKey)            return NextResponse.json({ error: 'Anthropic API key no configurada en Settings → API Vault.' }, { status: 400 })

  // 1. Árbol del repo
  const repoRes = await gh(`https://api.github.com/repos/${ghOwner}/${repoName}`, ghToken)
  if (!repoRes.ok) return NextResponse.json({ error: `Repo "${repoName}" no encontrado.` }, { status: 404 })
  const repoData = await repoRes.json() as { default_branch: string; html_url: string }
  const branch = repoData.default_branch

  const treeRes = await gh(
    `https://api.github.com/repos/${ghOwner}/${repoName}/git/trees/${branch}?recursive=1`,
    ghToken
  )
  const treeJson = treeRes.ok
    ? ((await treeRes.json()) as { tree?: { path: string; type: string }[] })
    : { tree: [] }
  const allPaths = (treeJson.tree ?? []).filter(t => t.type === 'blob').map(t => t.path)

  // Framework
  const framework =
    allPaths.some(p => p.match(/^next\.config\.(js|ts|mjs)$/)) ? 'nextjs'
    : allPaths.some(p => p.match(/^vite\.config\.(ts|js)$/))   ? 'vite'
    : 'unknown'

  // 2. Leer archivos clave (máx ~8000 tokens de código)
  const PRIORITY_PATTERNS = [
    /\.(jsx|tsx)$/,
    /designSystem\.(js|ts)$/,
    /effectsEngine\.(js|ts)$/,
    /CoreTool\.(js|ts|jsx|tsx)$/,
    /^package\.json$/,
    /^README\.md$/i,
  ]

  const filesToRead = allPaths
    .filter(p => PRIORITY_PATTERNS.some(rx => rx.test(p)))
    .filter(p => !p.includes('node_modules') && !p.includes('.next'))
    .slice(0, 12) // límite para no exceder contexto

  const fileContents: Record<string, string> = {}
  await Promise.all(filesToRead.map(async (filePath) => {
    try {
      const res = await gh(
        `https://api.github.com/repos/${ghOwner}/${repoName}/contents/${filePath}`,
        ghToken
      )
      if (!res.ok) return
      const data = await res.json() as { content?: string; encoding?: string; size?: number }
      if (!data.content || (data.size ?? 0) > 60000) return // saltar archivos muy grandes
      const decoded = Buffer.from(data.content, (data.encoding as BufferEncoding) || 'base64').toString('utf-8')
      fileContents[filePath] = decoded.slice(0, 4000) // máx 4000 chars por archivo
    } catch { /* noop */ }
  }))

  // 3. Construir prompt para Claude
  const codeBlock = [
    `## Árbol de archivos (${allPaths.length} archivos)`,
    allPaths.filter(p => !p.includes('node_modules')).join('\n'),
    '',
    '## Contenido de archivos principales',
    ...Object.entries(fileContents).map(([path, content]) =>
      `### ${path}\n\`\`\`\n${content}\n\`\`\``
    ),
  ].join('\n')

  // 4. Llamar Claude API
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: LAYER_PROMPT,
      messages: [{ role: 'user', content: codeBlock }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.json().catch(() => ({}))
    return NextResponse.json({ error: `Claude API error: ${JSON.stringify(err)}` }, { status: 502 })
  }

  const claudeData = await claudeRes.json() as { content?: { type: string; text: string }[] }
  const rawText = claudeData.content?.find(b => b.type === 'text')?.text ?? ''

  let parsed: { layers: ToolScanResult['layers']; actions: ToolScanResult['actions'] }
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Claude devolvió respuesta inválida', raw: rawText }, { status: 502 })
  }

  // 5. Score simple: contar capas con status "exists"
  const layerValues = Object.values(parsed.layers)
  const existsCount = layerValues.filter(l => l.status === 'exists').length
  const raw_score   = Math.round((existsCount / layerValues.length) * 100)

  const result: ToolScanResult = {
    tool_id:    repoName,
    repo:       `${ghOwner}/${repoName}`,
    branch,
    scanned_at: new Date().toISOString(),
    framework,
    layers:     parsed.layers,
    actions:    parsed.actions,
    raw_score,
  }

  return NextResponse.json(result)
}
