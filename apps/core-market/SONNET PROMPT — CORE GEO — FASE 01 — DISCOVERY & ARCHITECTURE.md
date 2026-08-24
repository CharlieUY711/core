# CORE GEO — FASE 01
## DISCOVERY, AUDIT & ARCHITECTURE

Actúa como Principal Software Architect.

Debes establecer la arquitectura de un nuevo módulo:

**CORE Geopositioning**

El módulo será una infraestructura geográfica reutilizable para:

- Operations
- Logistics
- Deliveries
- Administration
- HR
- FACILIA
- CORE Rep
- futuros módulos

## PRINCIPIO FUNDAMENTAL

CORE GEO NO es:

- un módulo de entregas
- un módulo de logística
- un módulo de RRHH
- un módulo de asistencia
- un sistema de fleet management

Es una infraestructura independiente de:

- negocio
- proveedor de GPS
- aplicación móvil
- proveedor cartográfico

Su responsabilidad es:

```text
Devices
Subjects
Positions
Places
Geofences
Presence
Tracks
Events
```

## STANDALONE

Debe poder ejecutarse y desplegarse independientemente.

Debe tener:

- backend propio
- frontend propio
- dominio propio
- API propia
- database schema propio
- tests propios
- documentación propia
- configuración propia
- deployment propio

NO modificar otros módulos.

NO crear dependencias directas con bases de datos de otros módulos.

Las integraciones futuras serán exclusivamente mediante API y/o eventos.

## PROVIDER AGNOSTIC

Debe poder recibir posiciones desde:

- Browser
- Mobile App
- Android MDM
- iOS MDM
- GPS provider
- External API
- futuros providers

Todos deben entrar mediante adapters.

El core debe recibir un contrato normalizado de Position.

## MAPBOX

Mapbox puede utilizarse para:

- mapas
- geocoding
- reverse geocoding
- búsqueda de direcciones
- visualización
- tracks
- geofences

Mapbox NO es el system of record.

## API VAULT

Todos los secretos externos se obtienen exclusivamente desde API Vault.

Incluye:

- Mapbox keys
- MDM credentials
- OAuth credentials
- API tokens
- client secrets
- refresh tokens

Nunca almacenar secretos en:

- código
- Git
- database
- frontend
- logs
- events
- API responses
- documentación

Utilizar credential references.

Ejemplo conceptual:

```text
vault://mapbox/core-geo
```

## DOMAIN

Define arquitectónicamente:

### Subject

Persona, vehículo, equipo, asset u otra entidad trackeable.

### Device

Dispositivo que produce posiciones.

### Provider

Fuente de localización.

### Position

Observación geográfica normalizada.

### Place

Lugar configurado.

### Geofence

Área geográfica.

Soportar conceptualmente:

- circle
- polygon

### Presence

Presencia derivada dentro de un lugar.

### Track

Secuencia temporal de posiciones.

### Event

Evento geográfico.

Ejemplos:

```text
position.received
device.online
device.offline
geofence.entered
geofence.exited
presence.started
presence.ended
accuracy.low
position.stale
```

## PRESENCE

Debe soportar:

```text
Subject: Juan
Place: Cliente A

ENTER: 09:14:27
EXIT: 10:51:43
DURATION: 01:37:16
```

Position, Event, Presence y Track son conceptos diferentes.

## REALTIME

Debe soportar:

- current position
- device status
- last update
- accuracy
- stale position

## HISTORY

Debe soportar:

- historical positions
- historical presence
- historical tracks
- events

## SECURITY

Definir:

- authentication
- authorization
- tenant isolation
- audit
- retention
- deletion
- access control
- provider secret isolation

## DISCOVERY

Antes de implementar:

1. inspecciona el repository
2. identifica estructura
3. identifica stack
4. identifica infraestructura reutilizable
5. identifica API Vault existente
6. identifica auth existente
7. identifica database conventions
8. identifica deployment conventions

No asumas.

No inventes.

No copies arquitectura de otros módulos sin justificarla.

## NO IMPLEMENTATION

No implementar todavía:

- migrations
- providers
- Mapbox
- tracking
- UI funcional
- production services

Esta fase es exclusivamente arquitectura.

## OUTPUT

Produce:

1. Repository audit
2. Architecture
3. Domain boundaries
4. Provider architecture
5. API Vault architecture
6. Mapbox boundary
7. Data flow
8. Integration architecture
9. Security architecture
10. ADRs
11. Risks
12. Open questions

## DEFINITION OF DONE

La fase termina cuando:

- los límites están definidos
- provider abstraction está definida
- API Vault está definida
- Mapbox está desacoplado
- Position/Event/Presence/Track están separados
- API boundaries están definidas
- integration boundaries están definidas
- security boundaries están definidas

STOP.

NO avances a FASE 02 automáticamente.