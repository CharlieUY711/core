
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { AuthGuard } from "./components/auth/AuthGuard";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <AuthGuard>
      <App />
    </AuthGuard>
  );
  