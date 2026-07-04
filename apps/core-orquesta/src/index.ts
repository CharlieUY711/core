// supabase/functions/orquesta-generate/index.ts
// Deploy: supabase functions deploy orquesta-generate

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── 1. Verificar JWT ────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado' }, 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    if (authError || !user) return json({ error: 'Token inválido' }, 401)

    // ── 2. Body ─────────────────────────────────────────────────────────────
    const { prompt, motorId, companyId } = await req.json()
    if (!prompt) return json({ error: 'prompt requerido' }, 400)

    // ── 3. Leer keys del vault ───────────────────────────────────────────────
    const { data: vaultEntries } = await supabaseAdmin
      .from('api_vault')
      .select('platform, api_key')
      .in('platform', ['Anthropic', 'OpenAI'])

    const keys: Record<string, string> = {}
    for (const entry of vaultEntries ?? []) {
      keys[entry.platform] = entry.api_key
    }

    // ── 4. Anthropic primero ────────────────────────────────────────────────
    if (keys['Anthropic']) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method:  'POST',
          headers: {
            'x-api-key':         keys['Anthropic'],
            'anthropic-version': '2023-06-01',
            'content-type':      'application/json',
          },
          body: JSON.stringify({
            model:      'claude-sonnet-4-6',
            max_tokens: 2048,
            messages:   [{ role: 'user', content: prompt }],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const text = data.content?.[0]?.text ?? ''
          return json({ text, model: 'claude-sonnet-4-6', provider: 'anthropic' })
        }
      } catch (_) { /* fallback */ }
    }

    // ── 5. OpenAI fallback ──────────────────────────────────────────────────
    if (keys['OpenAI']) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${keys['OpenAI']}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:    'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content ?? ''
        return json({ text, model: 'gpt-4o-mini', provider: 'openai' })
      }
    }

    return json({ error: 'No hay keys de IA configuradas en el vault' }, 503)

  } catch (err) {
    console.error('orquesta-generate error:', err)
    return json({ error: 'Error interno' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
