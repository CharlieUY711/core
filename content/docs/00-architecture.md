# CORE Executive Experience — Arquitectura Completa

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase (solo Knowledge Base + leads)

## Estructura de rutas
```
app/
  (marketing)/
    layout.tsx          ← tema oscuro, i18n, NO auth
    page.tsx            ← orquesta todas las secciones
    login/
      page.tsx          ← login Supabase Auth (Biblioteque)
  (platform)/
    layout.tsx
    dashboard/
```

## Decisiones clave
- Long-scroll narrative, una sola página
- Tema oscuro exclusivo para la experiencia ejecutiva
- SVG + Framer Motion, cero video files
- Supabase solo para: exp_knowledge_terms, exp_leads
- i18n: JSON estático (ES/PT/EN), switching client-side
- NO tocar tablas operacionales existentes
