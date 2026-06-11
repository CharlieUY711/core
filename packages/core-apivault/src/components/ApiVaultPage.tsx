// @charlieuy711/api-vault — componente principal
// Acepta un cliente Supabase como prop para ser agnóstico al framework.

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useApiVault } from '../hooks/useApiVault'
import type { ApiVaultEntry, ApiVaultInsert, VaultEnv, VaultType } from '../services/apiVaultTypes'
import {
  VAULT_TYPE_LABELS,
  VAULT_ENV_LABELS,
  VAULT_PLATFORMS,
  VAULT_PLATFORM_DEFS,
  VAULT_PLATFORM_CATEGORIES,
  PLATFORM_ICONS,
} from '../services/apiVaultTypes'
import { isExpired, isExpiringSoon } from '../services/apiVaultService'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ApiVaultPageProps {
  supabase:   SupabaseClient
  tenantId?:  string
  appId?:     string
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mask(val: string) {
  if (val.length <= 8) return '•'.repeat(val.length)
  return val.slice(0, 4) + '•'.repeat(Math.min(val.length - 8, 24)) + val.slice(-4)
}

type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'none'
function expiryStatus(exp: string | null): ExpiryStatus {
  if (!exp) return 'none'
  if (isExpired(exp)) return 'expired'
  if (isExpiringSoon(exp)) return 'soon'
  return 'ok'
}

const ENV_COLORS: Record<VaultEnv, string> = {
  production:  'background:#fee2e2;color:#b91c1c',
  staging:     'background:#fef3c7;color:#b45309',
  development: 'background:#dbeafe;color:#1d4ed8',
  testing:     'background:#f3f4f6;color:#4b5563',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ApiVaultPage({ supabase, tenantId, appId, className = '' }: ApiVaultPageProps) {
  const { entries, loading, error, load, add, edit, remove, stats } = useApiVault()

  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [detail, setDetail]       = useState<ApiVaultEntry | null>(null)
  const [editing, setEditing]     = useState<ApiVaultEntry | null>(null)
  const [revealed, setRevealed]   = useState<Set<string>>(new Set())
  const [copied, setCopied]       = useState<string | null>(null)

  useEffect(() => { load(supabase, { tenantId, appId }) }, [supabase, tenantId, appId])

  const platforms = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.platform)))],
    [entries]
  )

  const filtered = useMemo(() => entries.filter((e) => {
    const matchPlatform = filter === 'all' || e.platform === filter
    const q = search.toLowerCase()
    const matchSearch = !q || [e.name, e.platform, ...e.tags].join(' ').toLowerCase().includes(q)
    return matchPlatform && matchSearch
  }), [entries, filter, search])

  const s = stats()

  function toggleReveal(id: string) {
    setRevealed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function copyValue(entry: ApiVaultEntry) {
    await navigator.clipboard.writeText(entry.value)
    setCopied(entry.id); setTimeout(() => setCopied(null), 2000)
  }

  function openEdit(entry: ApiVaultEntry) {
    setEditing(entry); setDetail(null); setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta credencial?')) return
    await remove(supabase, id)
    if (detail?.id === id) setDetail(null)
  }

  return (
    <div className={className} style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🔐</div>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>API Vault</div>
            <div style={{ fontSize:12, color:'#6b7280' }}>Gestión de tokens y credenciales</div>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#111827', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, cursor:'pointer' }}>
          + Nueva credencial
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'total',      value: s.total },
          { label:'plataformas',value: s.platforms },
          { label:'activas',    value: s.active },
          { label:'por vencer', value: s.expiring, warn: s.expiring > 0 },
        ].map((st) => (
          <div key={st.label} style={{ background:'#f9fafb', borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'#9ca3af', marginBottom:2 }}>{st.label}</div>
            <div style={{ fontSize:22, fontWeight:600, color: st.warn ? '#d97706' : '#111827' }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Search + filtros */}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, plataforma o etiqueta..."
        style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:10, boxSizing:'border-box' }} />
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {platforms.map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            style={{ padding:'4px 12px', borderRadius:20, fontSize:12, cursor:'pointer', transition:'all .15s',
              background: filter === p ? '#111827' : 'transparent',
              color: filter === p ? '#fff' : '#6b7280',
              border: filter === p ? '1px solid transparent' : '1px solid #e5e7eb' }}>
            {p === 'all' ? 'Todo' : p}
          </button>
        ))}
      </div>

      {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:12 }}>{error}</div>}

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign:'center', color:'#9ca3af', padding:'3rem' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#9ca3af' }}>
          <div style={{ fontSize:32 }}>🔑</div>
          <p style={{ marginTop:8, fontSize:14 }}>No hay credenciales guardadas</p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {filtered.map((entry) => {
            const status = expiryStatus(entry.expires_at)
            const isRev  = revealed.has(entry.id)
            return (
              <div key={entry.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{PLATFORM_ICONS[entry.platform] ?? '🔑'}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{entry.name}</div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>{entry.platform} · {VAULT_TYPE_LABELS[entry.type]}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[
                      { icon:'👁', title:'Ver detalle', action: () => setDetail(entry) },
                      { icon: copied === entry.id ? '✅' : '📋', title:'Copiar', action: () => copyValue(entry) },
                      { icon:'✏️', title:'Editar', action: () => openEdit(entry) },
                      { icon:'🗑', title:'Eliminar', action: () => handleDelete(entry.id) },
                    ].map((btn) => (
                      <button key={btn.title} onClick={btn.action} title={btn.title}
                        style={{ width:28, height:28, border:'none', background:'transparent', cursor:'pointer', borderRadius:6, fontSize:14 }}>
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <code style={{ flex:1, fontSize:12, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 10px', color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>
                    {isRev ? entry.value : mask(entry.value)}
                  </code>
                  <button onClick={() => toggleReveal(entry.id)}
                    style={{ padding:'4px 8px', border:'1px solid #e5e7eb', borderRadius:6, background:'transparent', cursor:'pointer', fontSize:12 }}>
                    {isRev ? '🙈' : '👁'}
                  </button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:500, ...Object.fromEntries((ENV_COLORS[entry.env]||'').split(';').filter(Boolean).map(p=>p.split(':').map(s=>s.trim())).map(([k,v])=>[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])) }}>
                    {VAULT_ENV_LABELS[entry.env]}
                  </span>
                  {entry.tags.map((t) => (
                    <span key={t} style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#f0fdf4', color:'#166534' }}>{t}</span>
                  ))}
                  {status === 'expired' && <span style={{ fontSize:11, color:'#dc2626' }}>⚠ Vencida</span>}
                  {status === 'soon'    && <span style={{ fontSize:11, color:'#d97706' }}>⏰ Vence pronto</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <VaultForm initial={editing} onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={async (data) => {
            const ok = editing ? await edit(supabase, editing.id, data) : await add(supabase, data as ApiVaultInsert)
            if (ok) { setShowForm(false); setEditing(null) }
          }} />
      )}

      {/* Detalle */}
      {detail && (
        <VaultDetail entry={detail} onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={() => handleDelete(detail.id)} />
      )}
    </div>
  )
}

// ── Formulario ────────────────────────────────────────────────────────────────

interface VaultFormProps {
  initial: ApiVaultEntry | null
  onClose: () => void
  onSave:  (data: ApiVaultInsert | Partial<ApiVaultInsert>) => Promise<void>
}

function VaultForm({ initial, onClose, onSave }: VaultFormProps) {
  const [name,      setName]      = useState(initial?.name ?? '')
  const [platform,  setPlatform]  = useState(initial?.platform ?? '')
  const [type,      setType]      = useState<VaultType>(initial?.type ?? 'api_key')
  const [value,     setValue]     = useState(initial?.value ?? '')
  const [env,       setEnv]       = useState<VaultEnv>(initial?.env ?? 'production')
  const [expiresAt, setExpiresAt] = useState(initial?.expires_at?.slice(0, 10) ?? '')
  const [tags,      setTags]      = useState(initial?.tags.join(', ') ?? '')
  const [notes,     setNotes]     = useState(initial?.notes ?? '')
  const [showVal,   setShowVal]   = useState(false)
  const [saving,    setSaving]    = useState(false)

  const overlay: React.CSSProperties = { position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }
  const modal:   React.CSSProperties = { background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }
  const input:   React.CSSProperties = { width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, boxSizing:'border-box' }
  const label:   React.CSSProperties = { display:'block', fontSize:12, color:'#6b7280', marginBottom:4 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !platform || !value.trim()) { alert('Completa los campos requeridos'); return }
    setSaving(true)
    await onSave({
      name: name.trim(), platform, type, value: value.trim(), env,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: notes.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 0' }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:600 }}>{initial ? 'Editar credencial' : 'Nueva credencial'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#9ca3af' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:24, display:'grid', gap:14 }}>
          <div><label style={label}>Nombre *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Produccion, Staging..." style={input} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={label}>Plataforma *</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={input}>
                <option value="">Seleccionar...</option>
                {VAULT_PLATFORM_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {VAULT_PLATFORM_DEFS.filter(p => p.category === cat).map(p => (
                      <option key={p.name} value={p.name}>{p.icon} {p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as VaultType)} style={input}>
                {Object.entries(VAULT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={label}>Valor *</label>
            <div style={{ position:'relative' }}>
              <input type={showVal ? 'text' : 'password'} value={value} onChange={(e) => setValue(e.target.value)} placeholder="sk-..." style={{ ...input, paddingRight:36, fontFamily:'monospace' }} />
              <button type="button" onClick={() => setShowVal(!showVal)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer' }}>
                {showVal ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={label}>Entorno</label>
              <select value={env} onChange={(e) => setEnv(e.target.value as VaultEnv)} style={input}>
                {Object.entries(VAULT_ENV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Vence (opcional)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={input} />
            </div>
          </div>
          <div><label style={label}>Etiquetas (separadas por coma)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="backend, chatbot..." style={input} /></div>
          <div><label style={label}>Notas</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...input, resize:'vertical' }} /></div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 16px', fontSize:13, border:'1px solid #e5e7eb', borderRadius:8, background:'transparent', cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding:'8px 16px', fontSize:13, background:'#111827', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', opacity: saving ? .6 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Detalle ───────────────────────────────────────────────────────────────────

interface VaultDetailProps {
  entry:    ApiVaultEntry
  onClose:  () => void
  onEdit:   () => void
  onDelete: () => void
}

function VaultDetail({ entry, onClose, onEdit, onDelete }: VaultDetailProps) {
  const [showVal, setShowVal] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const status = expiryStatus(entry.expires_at)

  async function copy() {
    await navigator.clipboard.writeText(entry.value)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const overlay: React.CSSProperties = { position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }

  return (
    <div style={overlay}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>{PLATFORM_ICONS[entry.platform] ?? '🔑'}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:600 }}>{entry.name}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{entry.platform} · {VAULT_TYPE_LABELS[entry.type]}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>Valor</div>
            <div style={{ display:'flex', gap:8 }}>
              <code style={{ flex:1, fontSize:12, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontFamily:'monospace', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {showVal ? entry.value : mask(entry.value)}
              </code>
              <button onClick={() => setShowVal(!showVal)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'transparent', cursor:'pointer', fontSize:13 }}>{showVal ? '🙈' : '👁'}</button>
              <button onClick={copy} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'transparent', cursor:'pointer', fontSize:13 }}>{copied ? '✅' : '📋'}</button>
            </div>
          </div>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <tbody>
              {[
                ['Entorno',    VAULT_ENV_LABELS[entry.env]],
                ['Plataforma', `${PLATFORM_ICONS[entry.platform] ?? ''} ${entry.platform}`],
                ['Tipo',       VAULT_TYPE_LABELS[entry.type]],
                entry.expires_at ? ['Vencimiento', new Date(entry.expires_at).toLocaleDateString('es-UY')] : null,
                ['Creada', new Date(entry.created_at).toLocaleDateString('es-UY')],
              ].filter(Boolean).map((row) => { const [l, v] = row as [string, string]; return (
                <tr key={l as string} style={{ borderBottom:'1px solid #f9fafb' }}>
                  <td style={{ padding:'6px 0', color:'#9ca3af', width:110 }}>{l}</td>
                  <td style={{ padding:'6px 0', color:'#374151' }}>{v}</td>
                </tr>
              )})}
            </tbody>
          </table>
          {entry.tags.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
              {entry.tags.map((t) => <span key={t} style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#f0fdf4', color:'#166534' }}>{t}</span>)}
            </div>
          )}
          {entry.notes && <p style={{ fontSize:13, background:'#f9fafb', borderRadius:8, padding:'10px 12px', color:'#6b7280', marginTop:12 }}>{entry.notes}</p>}
          {status === 'expired' && <p style={{ fontSize:12, color:'#dc2626', marginTop:8 }}>⚠ Esta credencial ha vencido</p>}
          {status === 'soon'    && <p style={{ fontSize:12, color:'#d97706', marginTop:8 }}>⏰ Vence en menos de 30 dias</p>}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'0 24px 24px' }}>
          <button onClick={onDelete} style={{ padding:'8px 14px', fontSize:13, border:'1px solid #fecaca', color:'#dc2626', borderRadius:8, background:'transparent', cursor:'pointer' }}>🗑 Eliminar</button>
          <button onClick={onEdit}   style={{ padding:'8px 16px', fontSize:13, background:'#111827', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>✏️ Editar</button>
        </div>
      </div>
    </div>
  )
}
