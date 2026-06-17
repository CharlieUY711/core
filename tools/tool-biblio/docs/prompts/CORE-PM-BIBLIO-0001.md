# CORE-PM-BIBLIO-0001 — Sincronizar y Ordenar la Biblioteca

**ID:** `CORE-PM-BIBLIO-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## Objetivo

Asegurar que la Biblioteca sea la fuente de verdad del ecosistema CORE. Recibe todos los prompts, documentación, checklists y archivos generados.

---

## Instrucciones

Realizar las siguientes tareas dentro de `C:\CORE\Biblioteca`:

1. Crear estructura oficial de documentación en `/docs`
2. Guardar cada prompt en `/docs/prompts/<ID>.md`
3. Guardar documentos estratégicos en subcarpetas correspondientes
4. Copiar documentos Word relevantes a `/public/docs/`
5. Crear `CORE-ENV.md` en `/docs/env/`
6. No modificar autenticación, middleware ni UI existente

---

## Reglas

- No modificar ningún archivo existente de la app
- No exponer claves reales
- No inventar contenido
- Entregar en formato `=== filepath: <ruta> === <contenido>`

---

## Entregables

```
/docs/prompts/README.md
/docs/arquitectura/README.md + monorepo.md + api-layer.md + globe-engine.md
/docs/estrategia/README.md + vision-2035.md + expansion.md + monetizacion.md
/docs/infraestructura/README.md + vercel.md + supabase.md + pipelines.md
/docs/checklists/README.md + checklist-maestro.md
/docs/productos/README.md + core-biblioteca.md + core-landing.md + core-globe.md
/docs/roadmap/README.md + fases.md
/docs/env/CORE-ENV.md
/public/docs/ (documentos Word)
```

---

*CORE-PM-BIBLIO-0001 · v1.0 · Junio 2026 · Confidencial — Uso interno*
