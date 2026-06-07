// src/app/admin/pages/AdminApiVault.tsx
// Página de gestión de API keys y tokens para core-market.
// Stack: React 18 + Tailwind v4 + Radix UI + Lucide + Zustand + Supabase

import { useEffect, useState, useMemo } from 'react'
import { useApiVault } from '../hooks/useApiVault'
import type { ApiVaultEntry, ApiVaultInsert, VaultEnv, VaultType } from '../services/apiVaultTypes'
import {
  VAULT_TYPE_LABELS,
  VAULT_ENV_LABELS,
  VAULT_PLATFORMS,
  PLATFORM_ICONS,
} from '../services/apiVaultTypes'
import { isExpired, isExpiringSoon } from '../services/apiVaultService'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mask(val: string) {
  if (val.length <= 8) return '•'.repeat(val.length)
  return val.slice(0, 4) + '•'.repeat(Math.min(val.length - 8, 24)) + val.slice(-4)
}

function expiryStatus(exp: string | null): 'ok' | 'soon' | 'expired' | 'none' {
  if (!exp) return 'none'
  if (isExpired(exp)) return 'expired'
  if (isExpiringSoon(exp)) return 'soon'
  return 'ok'
}

const ENV_COLORS: Record<VaultEnv, string> = {
  production: 'bg-red-50 text-red-700',
  staging:    'bg-amber-50 text-amber-700',
  development:'bg-blue-50 text-blue-700',
  testing:    'bg-gray-100 text-gray-600',
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function AdminApiVault() {
  const { entries, loading, error, load, add, edit, remove, stats } = useApiVault()

  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<ApiVaultEntry | null>(null)
  const [editing, setEditing] = useState<ApiVaultEntry | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [load])

  const platforms = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.platform)))],
    [entries]
  )

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchPlatform = filterPlatform === 'all' || e.platform === filterPlatform
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.platform.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      return matchPlatform && matchSearch
    })
  }, [entries, filterPlatform, search])

  const s = stats()

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copyValue(entry: ApiVaultEntry) {
    await navigator.clipboard.writeText(entry.value)
    setCopied(entry.id)
    setTimeout(() => setCopied(null), 2000)
  }

  function openEdit(entry: ApiVaultEntry) {
    setEditing(entry)
    setDetail(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta credencial?')) return
    await remove(id)
    if (detail?.id === id) setDetail(null)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
            🔐
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">API Vault</h1>
            <p className="text-sm text-gray-500">Gestión de tokens y credenciales</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <span className="text-base leading-none">+</span> Nueva credencial
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'total', value: s.total },
          { label: 'plataformas', value: s.platforms },
          { label: 'activas', value: s.active },
          { label: 'por vencer', value: s.expiring, warn: s.expiring > 0 },
        ].map((st) => (
          <div key={st.label} className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">{st.label}</p>
            <p className={`text-2xl font-medium ${st.warn ? 'text-amber-600' : 'text-gray-900'}`}>
              {st.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search + filtros */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, plataforma o etiqueta..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                filterPlatform === p
                  ? 'bg-gray-900 text-white border-transparent'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {p === 'all' ? 'Todo' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">🔑</p>
          <p className="text-sm">No hay credenciales guardadas</p>
          <p className="text-xs mt-1">Haz clic en "Nueva credencial" para empezar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const status = expiryStatus(entry.expires_at)
            const isRev = revealed.has(entry.id)
            return (
              <div
                key={entry.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{PLATFORM_ICONS[entry.platform] ?? '🔑'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                      <p className="text-xs text-gray-400">
                        {entry.platform} · {VAULT_TYPE_LABELS[entry.type]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetail(entry)}
                      title="Ver detalle"
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      👁
                    </button>
                    <button
                      onClick={() => copyValue(entry)}
                      title="Copiar"
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {copied === entry.id ? '✅' : '📋'}
                    </button>
                    <button
                      onClick={() => openEdit(entry)}
                      title="Editar"
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Eliminar"
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Valor */}
                <div className="flex items-center gap-2 mb-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {isRev ? entry.value : mask(entry.value)}
                  </code>
                  <button
                    onClick={() => toggleReveal(entry.id)}
                    className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-400 text-xs transition-colors"
                  >
                    {isRev ? '🙈' : '👁'}
                  </button>
                </div>

                {/* Tags + env + vencimiento */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENV_COLORS[entry.env]}`}>
                    {VAULT_ENV_LABELS[entry.env]}
                  </span>
                  {entry.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                      {tag}
                    </span>
                  ))}
                  {status === 'expired' && (
                    <span className="text-xs text-red-500 ml-1">⚠ Vencida</span>
                  )}
                  {status === 'soon' && (
                    <span className="text-xs text-amber-500 ml-1">
                      ⏰ Vence pronto ({new Date(entry.expires_at!).toLocaleDateString('es-UY')})
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <VaultForm
          initial={editing}
          onClose={closeForm}
          onSave={async (data) => {
            const ok = editing
              ? await edit(editing.id, data)
              : await add(data as ApiVaultInsert)
            if (ok) closeForm()
          }}
        />
      )}

      {/* Panel de detalle */}
      {detail && (
        <VaultDetail
          entry={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={() => handleDelete(detail.id)}
        />
      )}
    </div>
  )
}

// ─── Formulario ────────────────────────────────────────────────────────────────

interface VaultFormProps {
  initial: ApiVaultEntry | null
  onClose: () => void
  onSave: (data: ApiVaultInsert | Partial<ApiVaultInsert>) => Promise<void>
}

function VaultForm({ initial, onClose, onSave }: VaultFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [platform, setPlatform] = useState(initial?.platform ?? '')
  const [type, setType] = useState<VaultType>(initial?.type ?? 'api_key')
  const [value, setValue] = useState(initial?.value ?? '')
  const [env, setEnv] = useState<VaultEnv>(initial?.env ?? 'production')
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at?.slice(0, 10) ?? '')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [showVal, setShowVal] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !platform || !value.trim()) {
      alert('Completa los campos requeridos (*)')
      return
    }
    setSaving(true)
    await onSave({
      name: name.trim(),
      platform,
      type,
      value: value.trim(),
      env,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: notes.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold">{initial ? 'Editar credencial' : 'Nueva credencial'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Producción, Staging..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plataforma *</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="">Seleccionar...</option>
                {VAULT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VaultType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {Object.entries(VAULT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Valor *</label>
            <div className="relative">
              <input
                type={showVal ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk-..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowVal(!showVal)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showVal ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entorno</label>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as VaultEnv)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {Object.entries(VAULT_ENV_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vence (opcional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Etiquetas (separadas por coma)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ej. backend, chatbot, billing"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Documentación, permisos, contexto..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Panel de detalle ──────────────────────────────────────────────────────────

interface VaultDetailProps {
  entry: ApiVaultEntry
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function VaultDetail({ entry, onClose, onEdit, onDelete }: VaultDetailProps) {
  const [showVal, setShowVal] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(entry.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const status = expiryStatus(entry.expires_at)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{PLATFORM_ICONS[entry.platform] ?? '🔑'}</span>
            <div>
              <p className="text-base font-semibold">{entry.name}</p>
              <p className="text-xs text-gray-400">{entry.platform} · {VAULT_TYPE_LABELS[entry.type]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Valor</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                {showVal ? entry.value : mask(entry.value)}
              </code>
              <button onClick={() => setShowVal(!showVal)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                {showVal ? '🙈' : '👁'}
              </button>
              <button onClick={copy} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                {copied ? '✅' : '📋'}
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Entorno', VAULT_ENV_LABELS[entry.env]],
                ['Plataforma', `${PLATFORM_ICONS[entry.platform] ?? ''} ${entry.platform}`],
                ['Tipo', VAULT_TYPE_LABELS[entry.type]],
                entry.expires_at
                  ? ['Vencimiento', new Date(entry.expires_at).toLocaleDateString('es-UY')]
                  : null,
                ['Creada', new Date(entry.created_at).toLocaleDateString('es-UY')],
              ].filter(Boolean).map(([label, val]) => (
                <tr key={label as string} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-400 text-xs w-32">{label}</td>
                  <td className="py-2 text-gray-700 text-xs">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{t}</span>
              ))}
            </div>
          )}
          {entry.notes && (
            <p className="text-xs bg-gray-50 rounded-lg p-3 text-gray-500">{entry.notes}</p>
          )}
          {status === 'expired' && (
            <p className="text-xs text-red-500 font-medium">⚠ Esta credencial ha vencido</p>
          )}
          {status === 'soon' && (
            <p className="text-xs text-amber-500 font-medium">⏰ Vence en menos de 30 días</p>
          )}
        </div>
        <div className="flex justify-between px-5 pb-5">
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            🗑 Eliminar
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ✏️ Editar
          </button>
        </div>
      </div>
    </div>
  )
}
