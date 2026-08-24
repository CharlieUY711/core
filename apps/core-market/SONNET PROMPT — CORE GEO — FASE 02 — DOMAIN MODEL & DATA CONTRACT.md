# CORE GEO — FASE 02
## DOMAIN MODEL & DATA CONTRACT

La arquitectura de FASE 01 está aprobada.

Ahora define e implementa el modelo de dominio de CORE Geopositioning.

NO avances a FASE 03.

## OBJETIVO

Construir el modelo persistente y los contratos internos de:

```text
Subject
Device
Provider
Place
Geofence
Position
Presence
Track
Event
```

## REGLAS

CORE GEO sigue siendo standalone.

No modificar otros módulos.

No crear foreign keys hacia bases externas.

No depender de tablas externas.

## SUBJECT

Debe permitir representar cualquier entidad trackeable:

```text
person
vehicle
equipment
asset
other
```

No crear tablas específicas de HR, Logistics o Delivery.

## DEVICE

Debe soportar:

- provider
- external_id
- subject
- status
- last_seen
- metadata no sensible
- capabilities

## PROVIDER

Debe permitir registrar proveedores sin acoplar el dominio a ellos.

## PLACE

Debe soportar:

- name
- address
- latitude
- longitude
- geometry
- metadata
- status

## GEOFENCE

Debe soportar:

- circle
- polygon

Debe definir:

- geometry
- active state
- associated place
- optional rules

## POSITION

Debe contener como mínimo conceptualmente:

```text
device_id
subject_id
timestamp
latitude
longitude
accuracy
speed
heading
altitude
source
```

Separar:

- event timestamp
- ingestion timestamp

## PRESENCE

Debe representar:

```text
subject
place/geofence
entered_at
exited_at
duration
status
```

Estados posibles:

```text
active
completed
invalidated
```

## TRACK

Debe representar un recorrido temporal.

Debe permitir reconstruir:

- route
- distance
- start
- end
- duration
- stops

## EVENTS

Definir un event model consistente.

Debe soportar:

```text
position.received
device.online
device.offline
geofence.entered
geofence.exited
presence.started
presence.ended
position.stale
accuracy.low
```

## INDEXING

Diseñar índices para:

- device + timestamp
- subject + timestamp
- place
- geofence
- active presence
- event type + timestamp

Considerar volumen alto de posiciones.

## RETENTION

Proponer estrategia de retención para:

- raw positions
- tracks
- presence
- events

No borrar información sin una política explícita.

## AUDIT

Definir qué cambios requieren audit trail.

## OUTPUT

Implementa:

- domain types
- database schema
- migrations
- constraints
- indexes
- validation
- contracts
- documentation

Incluye ERD y explicación de relaciones.

## TESTS

Crear tests para:

- entity validation
- constraints
- invalid coordinates
- timestamps
- geofence geometry validation
- presence lifecycle

## DEFINITION OF DONE

Debe existir:

- modelo completo
- migrations
- constraints
- indexes
- tests
- documentation

STOP.