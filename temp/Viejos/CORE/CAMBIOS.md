# Esqueleto del monorepo CORE — qué cambió

Extraé este contenido en `C:\CORE` (raíz del monorepo). NO incluye node_modules.

## Archivos de raíz (nuevos)
- `pnpm-workspace.yaml`  → define las áreas del workspace: apps/* y packages/*
- `tsconfig.base.json`   → tsconfig base; cada app/package lo extiende con "extends"
- `package.json`         → raíz mínima (private + packageManager pnpm). Si ya tenés
                            uno en C:\CORE, fusioná en vez de reemplazar.

## packages — package.json que faltaban (creados)
- @core/ui                          (depende de @core/design)
- @core/foundation-config-types
- @core/foundation-config-runtime   (depende de @core/foundation-config-types)
- @core/foundation-shared
- @core/foundation-builder

## Renombrado
- @core/core-globe  →  @core/globe

## Limpieza
- Eliminado node_modules commiteado dentro de core-auth
- Eliminada la carpeta basura literal "{supabase,components,types}" en core-auth
- core-foundation-shared y -builder: agregado src/index.ts vacío (placeholder válido)

## Pendientes conocidos (contenido, para después)
- core-ui/src/index.ts: su contenido está obsoleto (referencia archivos de design
  que no existen ahí). Hay que rehacerlo como capa de componentes sobre @core/design.
- core-auth: declara peerDependency de Next.js y usa middleware/cookies de servidor;
  para apps Vite hay que separar la parte universal (UI/cliente) de la parte Next.
- core-design: el "exports" apunta a ./src/globals/globals.css, que no existe
  (los archivos son globals-dark.css y globals-light.css).
