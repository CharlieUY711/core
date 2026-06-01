import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CORE Biblio",
  description: "Documentación, prompts y agentes del ecosistema CORE",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={\\ bg-neutral-950 text-neutral-100\}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-neutral-800 px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">CORE Biblio</h1>
            <nav className="flex gap-6 text-sm text-neutral-400">
              <a href="/" className="hover:text-white transition">Inicio</a>
              <a href="/docs" className="hover:text-white transition">Docs</a>
              <a href="/prompts" className="hover:text-white transition">Prompts</a>
              <a href="/downloads" className="hover:text-white transition">Descargas</a>
            </nav>
          </header>

          <main className="flex-1 px-8 py-12 max-w-4xl mx-auto">
            {children}
          </main>

          <footer className="border-t border-neutral-800 px-8 py-6 text-sm text-neutral-500">
            CORE Ecosystem — 
          </footer>
        </div>
      </body>
    </html>
  );
}
