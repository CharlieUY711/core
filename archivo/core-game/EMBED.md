# Integrar el panel en un dashboard

El panel es el paquete `@core/game-ui`. La misma UI corre standalone y embebida.

## Standalone (PWA)
`apps/core-game` es el host: monta `<PrizeGame mode="standalone" />` con su
`index.html`, manifest y service worker. Build:

    pnpm --filter core-game build      # => apps/core-game/dist

## Embebido en un dashboard (core-dashboard / core-market)
1. Agregá la dependencia en el package.json del dashboard:

       "@core/game-ui": "workspace:*"

2. Renderizá el panel pasando la sesión del host y el cliente HTTP:

       import { PrizeGame, createHttpClient } from "@core/game-ui";
       const client = createHttpClient();          // mismo origin => /api/...
       <PrizeGame mode="embedded" client={client}
                  session={{ userId: user.id, name: user.name }} height={620} />

Ver ejemplo completo en `packages/game-ui/examples/DashboardEmbed.tsx`.

## Diferencias entre modos
| | standalone | embedded |
|---|---|---|
| Barra de marca | sí | no (tabs mínimas) |
| Tamaño | pantalla completa | se adapta al panel (`height`) |
| Login | propio (gate / `onLogin`) | sesión del host (`session`) |
| Backend | `createHttpClient()` o `createMockClient()` | el del dashboard |
