# CORE GEO — FASE 05
## PROVIDER ADAPTER ARCHITECTURE

Implementa la capa de providers.

NO avances a FASE 06.

## OBJECTIVE

Permitir que diferentes sistemas suministren posiciones sin modificar el GEO engine.

## PROVIDER CONTRACT

Definir un contrato común:

```text
authenticate
validate
receive
normalize
healthCheck
```

El resultado final debe ser:

```text
Normalized Position
```

## PROVIDERS

Preparar adapters para:

```text
browser
mobile
MDM
external
```

No asumir que todos serán implementados inmediatamente.

## BROWSER

Preparar capacidad para recibir posiciones generadas por browser geolocation.

## MOBILE

Preparar adapter para una futura mobile app.

NO crear una app móvil en esta fase.

## MDM

Preparar adapter para servicios de device management.

No acoplarlo a un proveedor específico si no está decidido.

## EXTERNAL

Permitir recepción desde APIs externas.

## API VAULT

Cada provider debe obtener sus credentials mediante API Vault.

Nunca:

- hardcode
- .env committed
- DB secrets
- frontend secrets

## FAILURE HANDLING

Definir:

- provider unavailable
- authentication failure
- malformed payload
- stale position
- duplicate position
- provider timeout
- rate limit

## OBSERVABILITY

Registrar:

- provider status
- ingestion success
- ingestion failures
- latency
- last successful position

Nunca registrar secrets.

## TESTS

Crear tests por adapter.

Los tests deben poder ejecutarse sin credentials reales.

Utilizar mocks/stubs.

## DEFINITION OF DONE

Debe ser posible agregar un nuevo provider sin modificar:

- Position domain
- Presence Engine
- Track Engine
- Geofence Engine

STOP.