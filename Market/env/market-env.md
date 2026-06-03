# CORE Market — Variables de Entorno

**ID:** `CORE-PM-MARKET-ENV-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

> ⚠️ Este archivo documenta variables con placeholders. Nunca registrar claves reales aquí.  
> Referencia completa del ecosistema: `C:\CORE\Biblioteca\docs\env\CORE-ENV.md`

---

## Variables Requeridas

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase | ✅ Sí |
| `VITE_API_URL` | URL base de Supabase Edge Functions | ✅ Sí |

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-project-id.supabase.co/functions/v1
```

---

## Variables Opcionales

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SITE_URL` | URL pública del marketplace en producción | ⬜ Opcional |
| `VITE_MAPBOX_TOKEN` | Token de Mapbox para mapas | ⬜ Opcional |
| `VITE_GOOGLE_MAPS_KEY` | API Key de Google Maps | ⬜ Opcional |
| `VITE_MP_PUBLIC_KEY` | Public key de MercadoPago | ⬜ Opcional |
| `VITE_GA_ID` | ID de Google Analytics | ⬜ Opcional |

```env
VITE_SITE_URL=https://market.core.com.uy
VITE_MAPBOX_TOKEN=pk.your-mapbox-token
VITE_GOOGLE_MAPS_KEY=your-google-maps-key
VITE_MP_PUBLIC_KEY=your-mercadopago-public-key
VITE_GA_ID=G-XXXXXXXXXX
```

---

## Prefijo VITE_

> En Vite, solo las variables con prefijo `VITE_` son expuestas al cliente.  
> Variables sin prefijo solo están disponibles en el servidor de build.

| Regla | Descripción |
|-------|-------------|
| `VITE_*` | Visible en el browser — nunca usar para datos sensibles |
| Sin prefijo | Solo disponible en build time |
| `VITE_` + clave secreta | ❌ Estrictamente prohibido |

---

## Archivos por entorno

| Archivo | Commiteado | Uso |
|---------|-----------|-----|
| `.env.example` | ✅ Sí | Template con placeholders |
| `.env.local` | ❌ No (.gitignore) | Valores reales en desarrollo |
| `.env.production` | ❌ No | Valores reales en producción |

---

## Configuración en Vercel

Cargar en: Vercel Dashboard → Project → Settings → Environment Variables  
Activar para: **Production**, **Preview** y **Development**

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |

---

*CORE Market — Variables de Entorno v1.0 · Junio 2026 · Confidencial — Uso interno*
