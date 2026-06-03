# CORE-PM-MARKET-MIGRATION-0001 — Migración Market al Monorepo

**ID:** `CORE-PM-MARKET-MIGRATION-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## Objetivo

Migrar CORE Market (originalmente CORE Market Frontstore) al monorepo CORE y aplicar el CORE Visual System.

---

## Instrucciones

1. Clonar `github.com/CharlieUY711/oddyfront.core` en `C:\CORE\apps\core-market`
2. Integrar al monorepo: `pnpm-workspace.yaml`, `turbo.json`, `vercel.json`
3. Aplicar CORE Visual System en `brand.css`, `theme.css`, `core-market-patch.css`
4. Preservar identidad verde de Second Hand en `[data-sh="true"]`

---

## Reglas

- Second Hand conserva colores verdes
- No modificar funcionalidad
- No modificar rutas ni imports
- No modificar el CSS original del storefront que contiene `[data-sh="true"]`

---

## Stack del Market

- Vite 6 + React 18 + React Router 7
- Tailwind CSS 4
- Radix UI + MUI + shadcn
- Zustand + React Hook Form
- Supabase JS 2
- Mapbox GL + Leaflet
- Recharts + Motion

---

## Variables de Entorno

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=your-supabase-functions-url
```

---

*CORE-PM-MARKET-MIGRATION-0001 · v1.0 · Junio 2026 · Confidencial — Uso interno*
