import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Contrato base (set completo inicial; se amplía después).
// Los valores de palette/design override-ean estos defaults en runtime.
const BASE_TOKENS: Record<string, string> = {
  // Color · Market (Manual de Marca v1.0)
  '--c-primary':        '#3D5689',
  '--c-primary-hover':  '#46639B',
  '--c-on-primary':     '#ffffff',
  '--c-accent':         '#2E7D57',
  '--c-bg':             '#F0EFEA',
  '--c-bg-surface':     '#F6F4EF',
  '--c-bg-elev':        '#FFFFFF',
  '--c-text':           '#1C1B19',
  '--c-text-2':         '#56544C',
  '--c-text-3':         '#8A8678',
  '--c-border':         '#E4E1D8',
  '--c-border-strong':  '#D9D6CC',
  '--c-success':        '#2E7D57',
  '--c-warning':        '#C2611F',
  '--c-danger':         '#B23B30',
  '--c-info':           '#1C6E86',
  // Tipografía
  '--font-base':        "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  '--font-display':     "'Archivo Black', 'Archivo', sans-serif",
  '--font-mono':        "'Roboto Mono', ui-monospace, Menlo, Consolas, monospace",
  '--font-size-base':   '15px',
  '--line-height-base': '1.55',
  // Radios (spec: input 7 · control 9 · card 14)
  '--radius-sm':        '7px',
  '--radius':           '9px',
  '--radius-lg':        '14px',
  // Espaciado base
  '--space-unit':       '4px',
  // Sombras
  '--shadow-sm':        '0 1px 3px rgba(0,0,0,.05)',
  '--shadow':           '0 8px 24px rgba(0,0,0,.08)',
  '--shadow-lg':        '0 18px 50px rgba(0,0,0,.16)',
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
