"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Workspace {
  id: string;
  name: string;
  organizations: { id: string; name: string } | null;
}

export function NewProjectForm({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    workspace_id: workspaces[0]?.id ?? "",
    code: "",
    name: "",
    description: "",
    status: "active",
    currency: "USD",
    country: "UY",
    deadline: "",
    budget: "",
  });

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("No autenticado"); setLoading(false); return; }

    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        workspace_id: form.workspace_id,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status as any,
        currency: form.currency,
        country: form.country || null,
        deadline: form.deadline || null,
        budget: form.budget ? Number(form.budget) : null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push(`/projects/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Workspace */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Workspace <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.workspace_id}
          onChange={(e) => update("workspace_id", e.target.value)}
          className="bep-input"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {(ws.organizations as any)?.name} › {ws.name}
            </option>
          ))}
        </select>
      </div>

      {/* Code + Name */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            className="bep-input font-mono"
            placeholder="P109052"
            maxLength={32}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del proyecto <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="bep-input"
            placeholder="ANTEL – Sala IV – Data Center..."
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="bep-input resize-none"
          rows={3}
          placeholder="Descripción del proyecto, alcance, objetivos..."
        />
      </div>

      {/* Status + Currency + Country */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select value={form.status} onChange={(e) => update("status", e.target.value)} className="bep-input">
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="on_hold">En pausa</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
          <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className="bep-input">
            <option value="USD">USD</option>
            <option value="UYU">UYU</option>
            <option value="EUR">EUR</option>
            <option value="BRL">BRL</option>
            <option value="ARS">ARS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className="bep-input"
            placeholder="UY"
            maxLength={3}
          />
        </div>
      </div>

      {/* Deadline + Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className="bep-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto estimado</label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) => update("budget", e.target.value)}
            className="bep-input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="bep-btn-primary">
          {loading ? "Creando..." : "Crear proyecto"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bep-btn-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
