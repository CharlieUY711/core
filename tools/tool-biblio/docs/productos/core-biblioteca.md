# Producto — CORE Biblioteca

**Versión:** 1.0 · Junio 2026

## Descripción

App Next.js en producción. Repositorio interno de documentación oficial del ecosistema CORE. Acceso restringido con autenticación Supabase.

## URLs

- Producción: `https://biblioteca.core.com.uy`
- Repo: `https://github.com/CharlieUY711/Core_Biblioteca`
- Local: `C:\CORE\Biblioteca`

## Stack

| Componente | Versión |
|-----------|---------|
| Next.js | 14.2.3 ⚠️ |
| React | ^18 |
| TypeScript | ^5 |
| Tailwind CSS | ^3.4.1 |
| @supabase/ssr | ^0.10.3 |

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Pantalla de autenticación |
| `/aviso` | Aviso de confidencialidad trilingual |
| `/` | Inicio — stats y secciones |
| `/docs/prompts` | Prompts oficiales |
| `/docs/architecture` | Arquitectura técnica |
| `/docs/strategy` | Estrategia |
| `/docs/roadmap` | Roadmap |
| `/docs/products` | Productos |
| `/docs/design-system` | Design System & Brand Guidelines |

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Tareas pendientes

- [ ] Actualizar Next.js a 15.x
- [ ] Migrar a `apps/core-biblioteca` en monorepo
- [ ] Sincronizar prompts reales desde `C:\CORE\docs\prompts\`
- [ ] Agregar documentos Word a `public/docs/`
