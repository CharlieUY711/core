# CORE GEO — FASE 06
## MAPBOX INTEGRATION

Implementa la integración cartográfica con Mapbox.

NO avances a FASE 07.

## PRINCIPLE

Mapbox es un external geographic provider.

No es el system of record.

CORE GEO mantiene:

- places
- positions
- tracks
- geofences
- presence
- events

## MAPBOX CAPABILITIES

Implementar donde corresponda:

- geocoding
- reverse geocoding
- address search
- map rendering
- track rendering
- geofence rendering

## CREDENTIALS

Mapbox credentials MUST come from API Vault.

Nunca exponerlas al frontend si no es estrictamente necesario.

Si alguna credencial debe llegar al browser por diseño de Mapbox, implementar el mecanismo seguro correspondiente y documentarlo.

## GEOCODING

Una dirección como:

```text
Av. Italia 1234, Montevideo
```

debe poder convertirse en:

```text
latitude
longitude
```

Reverse geocoding debe permitir convertir coordenadas en una dirección legible.

## MAP

Implementar:

- markers
- subjects
- devices
- geofences
- tracks
- current position
- selected subject
- selected place

## PERFORMANCE

No cargar miles de puntos individualmente cuando pueda utilizarse:

- simplification
- clustering
- line layers
- aggregation

## TESTS

Testear:

- geocoding
- reverse geocoding
- provider failures
- credential resolution
- map data transformation

## DEFINITION OF DONE

Mapbox debe ser intercambiable sin modificar el GEO domain.

STOP.