# CORE GEO — FASE 03
## POSITION, GEOFENCE, PRESENCE & TRACK ENGINE

Implementa ahora el motor geográfico.

NO avances a FASE 04.

## PIPELINE

Debe funcionar conceptualmente así:

```text
Provider
   ↓
Normalized Position
   ↓
Position Processor
   ↓
Spatial Engine
   ↓
Geofence Evaluation
   ↓
Presence Engine
   ↓
Track Engine
   ↓
Events
```

## POSITION PROCESSING

Al recibir una posición:

1. validar
2. normalizar
3. registrar
4. evaluar precisión
5. evaluar freshness
6. evaluar geofences
7. actualizar presence
8. actualizar track
9. emitir eventos

## GEOFENCE

Implementar:

- circle containment
- polygon containment

Debe manejar correctamente:

- enter
- remain
- exit

No generar múltiples ENTER consecutivos por ruido GPS.

## GPS NOISE

Implementar mecanismos contra:

- jitter
- GPS drift
- inaccurate positions
- duplicate positions
- out-of-order positions

Documentar los thresholds utilizados.

No inventar valores sin justificarlos.

## PRESENCE

Implementar lifecycle:

```text
OUTSIDE
   ↓
ENTER
   ↓
ACTIVE PRESENCE
   ↓
EXIT
   ↓
COMPLETED
```

Debe calcular duración.

Debe soportar posiciones faltantes.

## TRACK

Implementar:

- track start
- points
- distance
- stops
- track end

La distancia debe calcularse geoespacialmente.

## REALTIME STATE

Mantener:

- last position
- last timestamp
- current geofence
- current presence
- device status

## EVENTS

Emitir eventos consistentes.

Los eventos deben ser idempotentes o deduplicables.

## TESTS

Crear tests de:

- enter
- exit
- dwell
- jitter
- duplicate GPS
- out-of-order GPS
- stale GPS
- inaccurate GPS
- multiple geofences
- simultaneous presence
- track distance

## DEFINITION OF DONE

Debe existir un engine funcional independiente de:

- Mapbox
- UI
- provider específico
- Operations
- Logistics
- HR

STOP.