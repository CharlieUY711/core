# CORE GEO — FASE 07
## STANDALONE APPLICATION

Implementa la aplicación frontend standalone de CORE Geopositioning.

NO avances a FASE 08.

## PRINCIPLE

La UI pertenece exclusivamente a GEO.

No incrustar GEO dentro de Operations, Logistics, HR u otro módulo.

## ROUTES

Implementar como mínimo:

```text
/dashboard
/live
/subjects
/devices
/places
/geofences
/presence
/tracks
/events
/reports
```

## DASHBOARD

Mostrar:

- active subjects
- active devices
- devices offline
- active presence
- recent events
- map overview

## LIVE

Mapa Mapbox en tiempo real.

Mostrar:

- subjects
- current positions
- last update
- accuracy
- speed
- current place
- current geofence

## SUBJECT

Al seleccionar una persona/subject:

```text
Current location
Current place
Last update
Current presence
Today's visits
Today's track
```

## PLACE

Mostrar:

- address
- coordinates
- geofence
- current subjects
- historical presence

## PRESENCE

Tabla:

```text
Subject
Place
Entry
Exit
Duration
Status
```

## TRACK

Permitir:

- date selection
- time range
- subject selection
- map trace
- timeline
- stops
- distance
- duration

## EVENTS

Mostrar:

- event type
- subject
- place
- timestamp
- source
- status

## UX

Debe ser una aplicación profesional.

No crear una UI específica para HR, Logistics o Delivery.

## SECURITY

No exponer:

- provider credentials
- API Vault secrets
- internal tokens

## TESTS

Crear:

- component tests
- API integration tests
- critical user flows
- permission tests

## DEFINITION OF DONE

GEO debe poder utilizarse como aplicación independiente.

STOP.