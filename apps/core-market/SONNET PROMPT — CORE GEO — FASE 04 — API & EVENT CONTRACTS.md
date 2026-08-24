# CORE GEO — FASE 04
## PUBLIC API & EVENT CONTRACTS

Implementa la API pública de CORE Geopositioning.

NO avances a FASE 05.

## PRINCIPIO

Otros módulos deben poder consumir GEO sin acceder directamente a su database.

Consumers:

```text
Operations
Logistics
Deliveries
Administration
HR
FACILIA
CORE Rep
```

## API DOMAINS

Diseñar APIs para:

```text
subjects
devices
providers
places
geofences
positions
presence
tracks
events
```

## REQUIRED CAPABILITIES

Debe ser posible:

### Current location

Preguntar:

> ¿Dónde está Juan ahora?

### Presence

Preguntar:

> ¿Cuándo estuvo Juan en Cliente A?

### Track

Preguntar:

> ¿Cuál fue el recorrido de Juan hoy?

### Geofence

Crear/modificar/desactivar una zona.

### Places

Buscar/configurar lugares.

### Devices

Consultar estado.

## FILTERING

Soportar filtros por:

- subject
- device
- place
- geofence
- date
- time range
- event type

## PAGINATION

Implementar pagination adecuada para:

- positions
- tracks
- events
- presence

## AUTHORIZATION

Definir permisos por capacidad.

No permitir que cualquier consumidor acceda a toda la información.

## EVENTS

Definir contratos versionados.

Ejemplo:

```text
geo.geofence.entered.v1
geo.geofence.exited.v1
geo.presence.started.v1
geo.presence.ended.v1
geo.device.offline.v1
```

## IDEMPOTENCY

Provider ingestion debe soportar idempotency.

## API DOCUMENTATION

Generar:

- OpenAPI
- endpoint documentation
- request/response schemas
- error model
- authentication model

## TESTS

Crear:

- API integration tests
- auth tests
- authorization tests
- pagination tests
- event contract tests
- idempotency tests

## DEFINITION OF DONE

Los consumidores deben poder utilizar GEO sin acceder a su database.

STOP.