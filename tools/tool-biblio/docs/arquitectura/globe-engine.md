# Arquitectura — Globe Engine

**Versión:** 1.0 · Junio 2026

## Paquete

`packages/core-globe`

## Propósito

Componente visual del Globe Experience de CORE. Representa operaciones en tiempo real, rutas logísticas, países activos y expansión futura.

## Comportamiento definido

- Rotación suave y constante
- Rutas animadas por arco entre países
- Hubs pulsantes por nivel de actividad
- Modo día/noche basado en UTC
- Color por tipo de operación: azul=logística, oro=rep, verde=market

## Capas

1. Base — continentes, límites, relieve mínimo
2. Países CORE — Uruguay, Brasil, Paraguay, Argentina, Chile
3. Rutas — cross-border, última milla, distribución
4. Actividad en tiempo real — envíos, inventarios, transacciones

## Estado actual

- [ ] Package creado en `packages/core-globe/src/`
- [ ] Integración en `core-landing` pendiente
- [ ] Integración en Biblioteca pendiente
- [ ] Documentación de API del componente pendiente
