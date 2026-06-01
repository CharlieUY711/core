export default function Page() {
  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">CORE Biblio</h2>
      <p className="text-neutral-400 text-lg leading-relaxed">
        La biblioteca oficial del ecosistema CORE.  
        Documentación, prompts, agentes y recursos para construir productos world‑class.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <a href="/docs" className="p-6 border border-neutral-800 rounded-xl hover:border-neutral-600 transition">
          <h3 className="font-semibold text-lg mb-2">Documentación</h3>
          <p className="text-neutral-400 text-sm">Arquitectura, estrategia y guías del ecosistema.</p>
        </a>

        <a href="/prompts" className="p-6 border border-neutral-800 rounded-xl hover:border-neutral-600 transition">
          <h3 className="font-semibold text-lg mb-2">Prompts</h3>
          <p className="text-neutral-400 text-sm">Prompts oficiales para Claude, GPT y agentes CORE.</p>
        </a>

        <a href="/downloads" className="p-6 border border-neutral-800 rounded-xl hover:border-neutral-600 transition">
          <h3 className="font-semibold text-lg mb-2">Descargas</h3>
          <p className="text-neutral-400 text-sm">Archivos, plantillas y recursos descargables.</p>
        </a>
      </div>
    </section>
  );
}
