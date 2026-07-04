// Ejemplo: el panel embebido dentro de un dashboard (core-dashboard / core-market).
// La sesión viene del host (el usuario ya está logueado) y el cliente HTTP usa la
// cookie del dashboard. No se muestra barra de marca ni puerta de registro.
import { PrizeGame, createHttpClient } from "@core/game-ui";

const client = createHttpClient(); // mismo origin que el dashboard => /api/...

export function PrizePanel({ user }: { user: { id: string; name?: string } }) {
  return (
    <section style={{ maxWidth: 720 }}>
      <h3 style={{ font: "600 16px Inter, sans-serif", margin: "0 0 10px" }}>Juego de premios</h3>
      <PrizeGame
        mode="embedded"
        client={client}
        session={{ userId: user.id, name: user.name }}
        height={620}
      />
    </section>
  );
}
