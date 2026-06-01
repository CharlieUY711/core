export default function PromptsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Prompts</h2>
      <p className="text-neutral-400 mb-6">Descargá los prompts oficiales del ecosistema CORE.</p>

      <ul className="space-y-3">
        <li><a className="text-blue-400 hover:underline" href="/prompts/agente-ventas.md">Agente de Ventas</a></li>
        <li><a className="text-blue-400 hover:underline" href="/prompts/agente-marketing.md">Agente de Marketing</a></li>
        <li><a className="text-blue-400 hover:underline" href="/prompts/claude.md">Claude Prompt</a></li>
      </ul>
    </div>
  );
}
