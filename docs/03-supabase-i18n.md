# CORE Executive Experience — Supabase + i18n

## Supabase — Principio de separación

La experiencia ejecutiva usa Supabase SOLO para:
1. Knowledge Base (exp_knowledge_terms)
2. Captura de leads (exp_leads)
3. Analytics opcionales (exp_analytics_events) — fase 2

NO TOCAR las tablas operacionales existentes.
NO acceso directo al schema operacional desde el frontend público.
Si se necesitan métricas reales → Edge Function pública de solo lectura.

## Tablas nuevas (prefijo exp_)

### exp_knowledge_terms
```sql
create table exp_knowledge_terms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- "free-zone", "last-mile"
  category text not null,              -- "logistics", "finance", etc.
  definition_es text,
  definition_pt text,
  definition_en text,
  example_es text,
  example_pt text,
  example_en text,
  business_context text,
  created_at timestamptz default now()
);
```

### exp_leads
```sql
create table exp_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  profile_type text,                   -- "ceo", "investor", "distributor"
  language text,                       -- "es", "pt", "en"
  source_section text,                 -- desde qué sección convirtió
  created_at timestamptz default now()
);
```

### exp_analytics_events (fase 2)
```sql
create table exp_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,                     -- "section_view", "term_click", "cta_click"
  section text,
  language text,
  device text,
  session_id text,                     -- anónimo
  created_at timestamptz default now()
);
```

## Auth — Login con Supabase Auth

Provider: Supabase Email/Password (o Magic Link)
Uso: proteger el acceso a la experiencia ejecutiva
Rutas protegidas: toda la experiencia bajo (marketing)

Middleware:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient({ request, response: NextResponse.next() })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!login|_next|favicon).*)']
}
```

Login screen: minimal, oscuro, solo email/password o magic link.
Branding CORE. Sin register público. Solo acceso por invitación.

---

## i18n — Estrategia

Arquitectura: JSON estáticos en /messages/{locale}.json
Sin dependencia de BD para la narrativa.
Detección: Accept-Language header en middleware Next.js.
Fallback: ES.
Preferencia: localStorage.

Switching: client-side, sin network request.
El JSON del idioma destino ya está en el bundle.
Swap = re-render de strings, fade de 150ms.

### Fases
- Fase 1: ES, PT, EN
- Fase 2: FR, DE, IT
- Fase 3: JA, ZH, AR

### Terminología localizada por mercado (ejemplos)
| Término     | ES           | PT (BR)       | EN                   |
|-------------|--------------|----------------|----------------------|
| Free Zone   | Zona Franca  | Zona Franca    | Free Trade Zone      |
| Last Mile   | Última Milla | Última Milha   | Last Mile            |
| Horeca      | HoReCa       | Food Service   | HoReCa / Food Service|
| Customs     | Aduana       | Alfândega      | Customs              |
| Factoring   | Factoring    | Factoring      | Invoice Factoring    |

Nota: NO es traducción automática. Es localización de negocio.
