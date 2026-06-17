# Infraestructura — CI/CD y Pipelines

**Versión:** 1.0 · Junio 2026

## Build actual

- Orquestador: Turbo 2.3.3
- Package manager: pnpm 9.0.0
- Deploy: Vercel (push a main)

## Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Dev | `pnpm dev` | Corre todas las apps en paralelo |
| Build landing | `turbo run build --filter=core-landing` | Build solo de landing |
| Build all | `turbo run build` | Build de todas las apps |

## Scripts internos (`C:\CORE\scripts`)

| Archivo | Descripción |
|---------|-------------|
| `fix_favicons.js` | Corrección de favicons |
| `fix.js` | Corrección general |

## Tareas pendientes

- [ ] Agregar `core-biblioteca` al build script de turbo
- [ ] Configurar GitHub Actions para CI
- [ ] Agregar `lint` y `type-check` a turbo tasks
- [ ] Documentar `fix_favicons.js` y `fix.js`
