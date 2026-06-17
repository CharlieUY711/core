import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Público: cada app lo consulta desde su middleware para saber cómo gatear.
// Solo devuelve campos no sensibles.
export async function GET(req: Request) {
  const appId = new URL(req.url).searchParams.get('app_id')
  if (!appId) return NextResponse.json({ error: 'Falta app_id' }, { status: 400 })

  const supabase = await createClient()
  const { data } = await supabase
    .from('portals')
    .select('access, auth_mode, name_es, email_verification')
    .eq('id', appId)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'App no encontrada' }, { status: 404 })

  return NextResponse.json(
    {
      access: data.access,
      auth_mode: data.auth_mode,
      name_es: data.name_es,
      email_verification: data.email_verification,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
        // Lo consulta el AuthForm desde el navegador de cada app (otro dominio)
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
