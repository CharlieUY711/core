import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build => apps/core-game/dist (lo que Vercel publica, igual que core-market).
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
  server: { port: 5174 },
});
