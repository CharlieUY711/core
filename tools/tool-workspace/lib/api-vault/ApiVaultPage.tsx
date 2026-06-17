// @charlieuy711/api-vault — componente principal (paleta core-market)

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useApiVault } from './useApiVault'
import type { ApiVaultEntry, ApiVaultInsert, VaultEnv, VaultType } from './apiVaultTypes'
import {
  VAULT_TYPE_LABELS,
  VAULT_ENV_LABELS,
  VAULT_PLATFORM_DEFS,
  VAULT_PLATFORM_CATEGORIES,
  PLATFORM_ICONS,
} from './apiVaultTypes'
import { isExpired, isExpiringSoon } from './apiVaultService'

// ── Paleta CORE Market (tokens oficiales brand.css + theme.css) ──────────────
const C = {
  bg:        '#081C38',   // --brand-secondary-dark
  surface:   '#0D2B55',   // --brand-secondary / --color-bg-sidebar
  surfaceAlt:'#0F3060',   // variante intermedia
  border:    '#1A3A6A',   // borde sutil azul
  borderAlt: '#C8D5E8',   // --color-border (para modales claros)
  text:      '#E8EDF5',   // --gray-100
  textMuted: '#7A8FAA',   // intermedio
  textDim:   '#3D5C7A',   // apagado
  green:     '#1D9E75',   // --color-success
  greenDim:  'rgba(29,158,117,0.12)',
  blue:      '#1A4F9C',   // --brand-primary
  blueDim:   'rgba(26,79,156,0.15)',
  accent:    '#C9A84C',   // --brand-accent (dorado)
  accentDim: 'rgba(201,168,76,0.1)',
  red:       '#C0392B',   // --color-danger
  amber:     '#C9A84C',   // --color-warning
  overlay:   'rgba(8,28,56,0.82)',
  font:      "Calibri, 'Segoe UI', system-ui, sans-serif",
  mono:      "'Courier New', monospace",
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ApiVaultPageProps {
  supabase:   SupabaseClient
  tenantId?:  string
  appId?:     string
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mask(val: string) {
  if (val.length <= 8) return '\u2022'.repeat(val.length)
  return val.slice(0, 4) + '\u2022'.repeat(Math.min(val.length - 8, 24)) + val.slice(-4)
}

type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'none'
function expiryStatus(exp: string | null): ExpiryStatus {
  if (!exp) return 'none'
  if (isExpired(exp)) return 'expired'
  if (isExpiringSoon(exp)) return 'soon'
  return 'ok'
}

const ENV_BADGE: Record<VaultEnv, { bg: string; color: string; label: string }> = {
  production:  { bg:'rgba(229,62,62,0.12)',  color:'#FC8181', label:'PROD'  },
  staging:     { bg:'rgba(217,119,6,0.15)',  color:'#FBBF24', label:'STAGE' },
  development: { bg:'rgba(27,90,196,0.18)',  color:'#60A5FA', label:'DEV'   },
  testing:     { bg:'rgba(107,130,168,0.15)',color:'#94A3B8', label:'TEST'  },
}

function EnvBadge({ env }: { env: VaultEnv }) {
  const b = ENV_BADGE[env] || ENV_BADGE.testing
  return (
    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontFamily:C.mono,
      fontWeight:700, letterSpacing:'0.06em', background:b.bg, color:b.color }}>
      {b.label}
    </span>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4,
      background:C.greenDim, color:C.green, fontFamily:C.mono }}>
      {children}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ApiVaultPage({ supabase, tenantId, appId, className = '' }: ApiVaultPageProps) {
  const { entries, loading, error, load, add, edit, remove, stats } = useApiVault()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [detail,   setDetail]   = useState<ApiVaultEntry | null>(null)
  const [editing,  setEditing]  = useState<ApiVaultEntry | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [copied,   setCopied]   = useState<string | null>(null)

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
    <div className={className} style={{ padding:'1.5rem 2rem', maxWidth:960, margin:'0 auto', color:C.text }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.75rem' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>🔐</span>
            <span style={{ fontSize:17, fontWeight:700, letterSpacing:'-0.02em' }}>API Vault</span>
          </div>
          <div style={{ fontSize:12, color:C.textMuted }}>Gestion de tokens y credenciales</div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          style={{ display:'flex', alignItems:'center', gap:6, background:C.blue, color:'#fff',
            border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + Nueva credencial
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'TOTAL',      value: s.total },
          { label:'PLATAFORMAS',value: s.platforms },
          { label:'ACTIVAS',    value: s.active },
          { label:'POR VENCER', value: s.expiring, warn: s.expiring > 0 },
        ].map((st) => (
          <div key={st.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:'12px 16px' }}>
            <div style={{ fontSize:9, color:C.textDim, fontFamily:C.mono,
              letterSpacing:'0.1em', marginBottom:6 }}>{st.label}</div>
            <div style={{ fontSize:24, fontWeight:700,
              color: st.warn ? C.amber : C.text }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, plataforma o etiqueta..."
        style={{ width:'100%', background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:6, padding:'9px 14px', fontSize:13, color:C.text,
          marginBottom:10, boxSizing:'border-box', outline:'none' }} />

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        {platforms.map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            style={{ padding:'4px 12px', borderRadius:4, fontSize:12, cursor:'pointer',
              fontFamily:C.mono, letterSpacing:'0.04em', transition:'all .15s',
              background: filter === p ? C.green    : 'transparent',
              color:      filter === p ? '#061A0E'  : C.textMuted,
              border:     filter === p ? `1px solid ${C.green}` : `1px solid ${C.border}` }}>
            {p === 'all' ? 'TODO' : p}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background:'rgba(229,62,62,0.1)', border:`1px solid rgba(229,62,62,0.3)`,
          borderRadius:6, padding:'10px 14px', fontSize:13, color:'#FC8181', marginBottom:12 }}>
          {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign:'center', color:C.textMuted, padding:'3rem',
          fontFamily:C.mono, fontSize:12 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem 1rem', color:C.textDim,
          border:`1px dashed ${C.border}`, borderRadius:10 }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔑</div>
          <p style={{ fontSize:14, color:C.textMuted }}>No hay credenciales guardadas</p>
          <p style={{ fontSize:12, color:C.textDim, marginTop:4 }}>
            Hace clic en "Nueva credencial" para empezar
          </p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:8 }}>
          {filtered.map((entry) => {
            const status = expiryStatus(entry.expires_at)
            const isRev  = revealed.has(entry.id)
            return (
              <div key={entry.id} style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:8, padding:'14px 16px', transition:'border-color .15s' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:6, background:C.surfaceAlt,
                      border:`1px solid ${C.borderAlt}`, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:15, flexShrink:0 }}>
                      {PLATFORM_ICONS[entry.platform] ?? '🔑'}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{entry.name}</div>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>
                        {entry.platform} &middot; {VAULT_TYPE_LABELS[entry.type]}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[
                      { icon:'👁', title:'Ver detalle',  action: () => setDetail(entry) },
                      { icon: copied === entry.id ? '✅' : '📋', title:'Copiar', action: () => copyValue(entry) },
                      { icon:'✏️', title:'Editar',        action: () => openEdit(entry) },
                      { icon:'🗑', title:'Eliminar',      action: () => handleDelete(entry.id) },
                    ].map((btn) => (
                      <button key={btn.title} onClick={btn.action} title={btn.title}
                        style={{ width:28, height:28, border:`1px solid ${C.border}`,
                          background:'transparent', cursor:'pointer', borderRadius:5, fontSize:13,
                          color:C.textMuted, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <code style={{ flex:1, fontSize:11, background:C.bg, border:`1px solid ${C.border}`,
                    borderRadius:5, padding:'6px 10px', color:C.textMuted, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:C.mono }}>
                    {isRev ? entry.value : mask(entry.value)}
                  </code>
                  <button onClick={() => toggleReveal(entry.id)}
                    style={{ padding:'4px 8px', border:`1px solid ${C.border}`, borderRadius:5,
                      background:'transparent', cursor:'pointer', fontSize:12, color:C.textMuted }}>
                    {isRev ? '🙈' : '👁'}
                  </button>
                </div>

                {/* Tags + env */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                  <EnvBadge env={entry.env} />
                  {entry.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                  {status === 'expired' && (
                    <span style={{ fontSize:11, color:C.red, fontFamily:C.mono }}>⚠ VENCIDA</span>
                  )}
                  {status === 'soon' && (
                    <span style={{ fontSize:11, color:C.amber, fontFamily:C.mono }}>⏰ VENCE PRONTO</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <VaultForm initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={async (data) => {
            const ok = editing
              ? await edit(supabase, editing.id, data)
              : await add(supabase, { ...data as ApiVaultInsert,
                  tenant_id: tenantId ?? null,
                  tags: [...((data as ApiVaultInsert).tags ?? []), ...(appId ? [appId] : [])] })
            if (ok) { setShowForm(false); setEditing(null) }
          }} />
      )}

      {detail && (
        <VaultDetail entry={detail}
          onClose={() => setDetail(null)}
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

  const inputStyle: React.CSSProperties = {
    width:'100%', background:C.surfaceAlt, border:`1px solid ${C.border}`,
    borderRadius:6, padding:'9px 12px', fontSize:13, color:C.text,
    boxSizing:'border-box', outline:'none',
  }
  const labelStyle: React.CSSProperties = {
    display:'block', fontSize:10, color:C.textMuted,
    fontFamily:C.mono, letterSpacing:'0.08em', marginBottom:5,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !platform || !value.trim()) {
      alert('Completa los campos requeridos'); return
    }
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
    <div style={{ position:'fixed', inset:0, zIndex:50, background:C.overlay,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
        width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>

        {/* Header modal */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize:9, color:C.textDim, fontFamily:C.mono,
              letterSpacing:'0.1em', marginBottom:3 }}>
              {initial ? 'EDITAR' : 'NUEVA'} CREDENCIAL
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>
              {initial ? initial.name : 'Nueva credencial'}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:18, color:C.textMuted, lineHeight:1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:24, display:'grid', gap:16 }}>
          <div>
            <label style={labelStyle}>NOMBRE *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ej. Produccion, Staging..." style={inputStyle} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>PLATAFORMA *</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {VAULT_PLATFORM_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {VAULT_PLATFORM_DEFS.filter(p => p.category === cat).map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>TIPO</label>
              <select value={type} onChange={(e) => setType(e.target.value as VaultType)} style={inputStyle}>
                {Object.entries(VAULT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>VALOR *</label>
            <div style={{ position:'relative' }}>
              <input type={showVal ? 'text' : 'password'} value={value}
                onChange={(e) => setValue(e.target.value)} placeholder="sk-..."
                style={{ ...inputStyle, paddingRight:38, fontFamily:C.mono }} />
              <button type="button" onClick={() => setShowVal(!showVal)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:C.textMuted, fontSize:15 }}>
                {showVal ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>ENTORNO</label>
              <select value={env} onChange={(e) => setEnv(e.target.value as VaultEnv)} style={inputStyle}>
                {Object.entries(VAULT_ENV_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>VENCE (OPCIONAL)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>ETIQUETAS (separadas por coma)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="backend, chatbot..." style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>NOTAS</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Documentacion, permisos, contexto..."
              style={{ ...inputStyle, resize:'vertical' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:4 }}>
            <button type="button" onClick={onClose}
              style={{ padding:'9px 18px', fontSize:13, border:`1px solid ${C.border}`,
                borderRadius:6, background:'transparent', cursor:'pointer', color:C.textMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding:'9px 20px', fontSize:13, fontWeight:700,
                background: saving ? C.borderAlt : C.blue,
                color: saving ? C.textMuted : '#fff',
                border:'none', borderRadius:6, cursor: saving ? 'not-allowed' : 'pointer' }}>
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

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:C.overlay,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
        width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,.6)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:7, background:C.surfaceAlt,
              border:`1px solid ${C.borderAlt}`, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:18 }}>
              {PLATFORM_ICONS[entry.platform] ?? '🔑'}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{entry.name}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                {entry.platform} &middot; {VAULT_TYPE_LABELS[entry.type]}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:18, color:C.textMuted }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          {/* Valor */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:9, color:C.textDim, fontFamily:C.mono,
              letterSpacing:'0.1em', marginBottom:8 }}>VALOR</div>
            <div style={{ display:'flex', gap:8 }}>
              <code style={{ flex:1, fontSize:11, background:C.bg, border:`1px solid ${C.border}`,
                borderRadius:6, padding:'8px 12px', fontFamily:C.mono, color:C.textMuted,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {showVal ? entry.value : mask(entry.value)}
              </code>
              <button onClick={() => setShowVal(!showVal)}
                style={{ padding:'6px 10px', border:`1px solid ${C.border}`, borderRadius:6,
                  background:'transparent', cursor:'pointer', fontSize:13, color:C.textMuted }}>
                {showVal ? '🙈' : '👁'}
              </button>
              <button onClick={copy}
                style={{ padding:'6px 10px', border:`1px solid ${copied ? C.green : C.border}`,
                  borderRadius:6, background: copied ? C.greenDim : 'transparent',
                  cursor:'pointer', fontSize:13, color: copied ? C.green : C.textMuted }}>
                {copied ? '✅' : '📋'}
              </button>
            </div>
          </div>

          {/* Metadata */}
          <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
            <tbody>
              {[
                ['Entorno',    <EnvBadge env={entry.env} />],
                ['Plataforma', entry.platform],
                ['Tipo',       VAULT_TYPE_LABELS[entry.type]],
                entry.expires_at ? ['Vencimiento', new Date(entry.expires_at).toLocaleDateString('es-UY')] : null,
                ['Creada', new Date(entry.created_at).toLocaleDateString('es-UY')],
              ].filter(Boolean).map((row) => {
                const [l, v] = row as [string, React.ReactNode]
                return (
                  <tr key={l} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'8px 0', color:C.textDim, width:110,
                      fontSize:10, fontFamily:C.mono, letterSpacing:'0.06em' }}>
                      {(l as string).toUpperCase()}
                    </td>
                    <td style={{ padding:'8px 0', color:C.text }}>{v}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {entry.tags.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:14 }}>
              {entry.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
          )}
          {entry.notes && (
            <p style={{ fontSize:12, background:C.surfaceAlt, border:`1px solid ${C.border}`,
              borderRadius:6, padding:'10px 12px', color:C.textMuted, marginTop:14, lineHeight:1.6 }}>
              {entry.notes}
            </p>
          )}
          {status === 'expired' && (
            <p style={{ fontSize:12, color:C.red, marginTop:10, fontFamily:C.mono }}>
              ⚠ CREDENCIAL VENCIDA
            </p>
          )}
          {status === 'soon' && (
            <p style={{ fontSize:12, color:C.amber, marginTop:10, fontFamily:C.mono }}>
              ⏰ VENCE EN MENOS DE 30 DIAS
            </p>
          )}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between',
          padding:'0 24px 24px' }}>
          <button onClick={onDelete}
            style={{ padding:'8px 16px', fontSize:13, border:`1px solid rgba(229,62,62,0.4)`,
              color:C.red, borderRadius:6, background:'transparent', cursor:'pointer' }}>
            Eliminar
          </button>
          <button onClick={onEdit}
            style={{ padding:'8px 20px', fontSize:13, fontWeight:700,
              background:C.blue, color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}
