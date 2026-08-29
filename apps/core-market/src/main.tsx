import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { instalarEnterComoTab } from "./app/ui/enterComoTab";
import "./styles/index.css";

// Enter se comporta como Tab en todo el sistema: cierra el campo y pasa al
// siguiente. Se instala una vez, en el documento, para que valga tambien para
// lo que se agregue despues sin que nadie tenga que acordarse.
instalarEnterComoTab();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);


