# CORE-PM-MARKET-RESTRUCTURE-0001 — Reestructurar Market

**ID:** `CORE-PM-MARKET-RESTRUCTURE-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## Objetivo

Reestructurar CORE Market como producto independiente dentro del ecosistema CORE, creando la estructura oficial de documentación y aplicando el CORE Visual System.

---

## Instrucciones

1. Crear estructura `C:\CORE\Market\` con subcarpetas `docs`, `prompts`, `design`, `roadmap`, `env`
2. Generar documentación oficial en cada subcarpeta
3. Mantener código en `C:\CORE\apps\core-market` sin modificar rutas ni imports
4. Aplicar CORE Visual System al Market (excepto Second Hand)
5. Preservar identidad verde de Second Hand en `[data-sh="true"]`

---

## Reglas

- Second Hand conserva colores verdes — no aplicar CORE colors
- No modificar el CSS original del storefront — contiene el scope `[data-sh="true"]`
- No renombrar clases en archivos `.tsx` sin auditar imports primero
- No mover archivos del código fuente

---

## Entregables

```
C:\CORE\Market\design\visual-system.md
C:\CORE\Market\docs\architecture.md
C:\CORE\Market\roadmap\2026.md
C:\CORE\Market\env\market-env.md
C:\CORE\Market\prompts\CORE-PM-MARKET-RESTRUCTURE-0001.md
C:\CORE\Market\prompts\CORE-PM-MARKET-MIGRATION-0001.md
C:\CORE\apps\core-market\src\styles\brand.css
C:\CORE\apps\core-market\src\styles\theme.css
C:\CORE\apps\core-market\src\styles\core-market-patch.css
```

---

## Prompts Relacionados

| ID | Descripción |
|----|-------------|
| `CORE-PM-MARKET-MIGRATION-0001` | Migración inicial del Market al monorepo |
| `CORE-PM-MASTER-0001` | Protocolo maestro del ecosistema |

---

*CORE-PM-MARKET-RESTRUCTURE-0001 · v1.0 · Junio 2026 · Confidencial — Uso interno*
