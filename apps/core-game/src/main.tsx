// Host STANDALONE del panel (PWA). Monta <PrizeGame> a pantalla completa.
import React from "react";
import { createRoot } from "react-dom/client";
import { PrizeGame, createHttpClient, createMockClient } from "@core/game-ui";

// Con backend listo, usá el cliente HTTP (mismo origin: /api/...).
// Mientras no haya backend/login, USE_MOCK=true permite probar la experiencia.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const client = USE_MOCK ? createMockClient() : createHttpClient();

function App() {
  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "start center" }}>
      <div style={{ width: "100%", maxWidth: 880 }}>
        <PrizeGame
          mode="standalone"
          client={client}
          demoControls={USE_MOCK}
          // En producción real, pasá onLogin para disparar tu flujo OAuth:
          // onLogin={async (provider) => startOAuth(provider)}
        />
      </div>
    </div>
  );
}

// Registro del service worker (PWA) — no bloquea el arranque.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
