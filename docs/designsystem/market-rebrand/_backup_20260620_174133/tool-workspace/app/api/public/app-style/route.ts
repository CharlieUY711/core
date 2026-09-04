import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Contrato base (set completo inicial; se amplía después).
// Los valores de palette/design override-ean estos defaults en runtime.
const BASE_TOKENS: Record<string, string> = {
  // Color
  '--c-primary':        '#1b5ac4',
  '--c-primary-hover':  '#1747a0',
  '--c-on-primary':     '#ffffff',
  '--c-accent':         '#c9a84c',
  '--c-bg':             '#0a1220',
  '--c-bg-surface':     '#0f1a2e',
  '--c-bg-elev':        '#16243d',
  '--c-text':           '#e6edf6',
  '--c-text-2':         '#9fb0c6',
  '--c-text-3':         '#5b6f8a',
  '--c-border':         '#1e3354',
  '--c-border-strong':  '#2a4a78',
  '--c-success':        '#2ea043',
  '--c-warning':        '#c9a84c',
  '--c-danger':         '#d9534f',
  '--c-info':           '#1b5ac4',
  // Tipografía
  '--font-base':        "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  '--font-mono':        "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  '--font-size-base':   '15px',
  '--line-height-base': '1.5',
  // Radios
  '--radius-sm':        '4px',
  '--radius':           '8px',
  '--radius-lg':        '14px',
  // Espaciado base
  '--space-unit':       '4px',
  // Sombras
  '--shadow-sm':        '0 1px 2px rgba(0,0,0,0.25)',
  '--shadow':           '0 4px 16px rgba(0,0,0,0.35)',
  '--shadow-lg':        '0 12px 40px rgba(0,0,0,0.45)',
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: Request) {
  const appId = new URL(req.url).searchParams.get('app_id')
  if (!appId) return NextResponse.json({ error: 'Falta app_id' }, { status: 400, headers: CORS })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Sin service-role: devolvemos al menos el contrato base para no romper la app
    return NextResponse.json({ vars: BASE_TOKENS, logo_url: null, favicon_url: null, name: 'base' }, { headers: CORS })
  }

  const sb = admin()

  // App → su estilo (o palette/design directos como fallback)
  const { data: app } = await sb
    .from('portals').select('style_id, palette_id, design_id').eq('id', appId).maybeSingle()

  // Resolver estilo: el de la app, si no el default
  let style: { name: string; palette_id: string | null; design_id: string | null; logo_url: string | null; favicon_url: string | null } | null = null
  if (app?.style_id) {
    const { data } = await sb.from('styles').select('name, palette_id, design_id, logo_url, favicon_url').eq('id', app.style_id).maybeSingle()
    style = data
  }
  if (!style) {
    const { data } = await sb.from('styles').select('name, palette_id, design_id, logo_url, favicon_url').eq('is_default', true).limit(1)
    style = (data && data[0]) || null
  }

  const paletteId = style?.palette_id ?? app?.palette_id ?? null
  const designId  = style?.design_id  ?? app?.design_id  ?? null

  const [pal, des] = await Promise.all([
    paletteId ? sb.from('palettes').select('tokens').eq('id', paletteId).maybeSingle() : Promise.resolve({ data: null }),
    designId  ? sb.from('designs').select('tokens').eq('id', designId).maybeSingle()   : Promise.resolve({ data: null }),
  ])

  const designTokens  = (des.data?.tokens as Record<string, string> | undefined) ?? {}
  const paletteTokens = (pal.data?.tokens as Record<string, string> | undefined) ?? {}

  // base ← design ← palette  (palette manda en color; design aporta layout/tipografía)
  const vars = { ...BASE_TOKENS, ...designTokens, ...paletteTokens }

  return NextResponse.json({
    vars,
    logo_url: style?.logo_url ?? null,
    favicon_url: style?.favicon_url ?? null,
    name: style?.name ?? 'base',
  }, { headers: CORS })
}
