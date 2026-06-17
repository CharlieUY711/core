# Arquitectura — Monorepo CORE

**Versión:** 1.0 · Junio 2026

## Estructura

```
C:\CORE\
├── apps/
│   ├── core-landing/       ← Landing page pública
│   └── core-biblio/        ← DEPRECATED
├── packages/
│   └── core-globe/         ← Globe Experience compartido
├── docs/                   ← Documentación técnica del repo
├── scripts/                ← Scripts internos
├── audit/                  ← Reportes de auditoría
├── infrastructure/         ← Infraestructura
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Orquestador

- Turbo 2.3.3
- pnpm 9.0.0
- Node >=20

## Build

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["apps/core-landing/.next/**", "apps/core-biblio/.next/**"]
    }
  }
}
```

## Tareas pendientes

- [ ] Migrar `C:\CORE\Biblioteca` a `apps/core-biblioteca`
- [ ] Actualizar `turbo.json` con core-biblioteca
- [ ] Deprecar `apps/core-biblio`
- [ ] Crear `packages/core-ui`
