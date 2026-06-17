# Arquitectura — API Layer

**Versión:** 1.0 · Junio 2026

## Stack

- API-first
- REST sobre HTTPS para operaciones CRUD
- GraphQL para queries complejas (futuro)
- WebSockets para tracking en tiempo real (futuro)
- Versioning explícito: `/api/v1/`

## Autenticación

- Supabase Auth con `@supabase/ssr`
- JWT en cookies gestionadas por middleware de Next.js
- RBAC por roles de usuario

## Endpoints actuales

### Biblioteca

- Autenticación delegada a Supabase Auth
- No expone endpoints propios — solo consume Supabase

## Tareas pendientes

- [ ] Documentar endpoints cuando se implemente API propia
