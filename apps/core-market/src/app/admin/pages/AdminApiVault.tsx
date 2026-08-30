// @charlieuy711/api-vault — componente principal (paleta core-market)

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Tabla, fecha } from '../components/Tabla'
import { supabase } from '../../../utils/supabase/client'
import { Pantalla, usePantalla } from '../components/Pantalla'
import { Asistente } from '../components/Asistente'
import { GUIAS, guiaDe } from '../ui/comoObtener'
import { requeridasDe, requerida, nadieLaLee } from '../ui/credencialesRequeridas'
import { BarraDeAccionesSuelta } from '../components/BarraDeAcciones'
import { useShop } from '../components/AdminLayout'
import { useApiVault } from '../hooks/useApiVault'
import type { ApiVaultEntry, ApiVaultInsert, VaultEnv, VaultType } from '../services/apiVaultTypes'
import {
  VAULT_TYPE_LABELS,
  VAULT_TYPE_GROUPS,
  VAULT_ENV_LABELS,
  VAULT_PLATFORM_DEFS,
  VAULT_PLATFORM_CATEGORIES,
  VAULT_PLATFORMS_FRECUENTES,
} from '../services/apiVaultTypes'
import { isExpired, isExpiringSoon } from '../services/apiVaultService'

// ── Paleta CORE Market (tokens oficiales brand.css + theme.css) ──────────────
/**
 * El Vault no define colores.
 *
 * Acá había veinte valores hexadecimales copiados de los tokens de marca, con
 * el nombre del token al lado en un comentario. Una copia que envejece sola: el
 * día que cambie la marca, el Vault se queda con los viejos.
 *
 * Y además pintaba la pantalla oscura, adentro de un panel claro. Una isla. La
 * navegación tiene que ser la misma en todos lados: si cada herramienta elige
 * su aspecto, hay que estudiar cada pantalla antes de poder usarla.
 *
 * Esto queda como el puente a los tokens, no como una paleta: los valores no
 * están acá, se leen de las variables del panel.
 */
const C = {
  bg:        'transparent',
  surface:   '#fff',
  surfaceAlt:'var(--gray-50)',
  border:    'var(--border)',
  borderAlt: 'var(--border)',
  text:      '#111',
  textMuted: 'var(--mute)',
  textDim:   'var(--gray-400)',
  green:     'var(--color-success)',
  greenDim:  'color-mix(in srgb, var(--color-success) 12%, transparent)',
  blue:      'var(--brand-navy)',
  blueDim:   'color-mix(in srgb, var(--brand-navy) 12%, transparent)',
  accent:    'var(--brand-madre)',
  accentDim: 'color-mix(in srgb, var(--brand-madre) 10%, transparent)',
  red:       'var(--color-danger)',
  amber:     'var(--color-warning)',
  overlay:   'rgba(0,0,0,0.45)',
  font:      "DM Sans, sans-serif",
  mono:      "ui-monospace, 'SF Mono', Menlo, monospace",
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ApiVaultPageProps {
  supabase:   SupabaseClient
  tenantId?:  string
  appId?:     string
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────


type ExpiryStatus = 'ok' | 'soon' | 'expired' | 'none'
function expiryStatus(exp: string | null): ExpiryStatus {
  if (!exp) return 'none'
  if (isExpired(exp)) return 'expired'
  if (isExpiringSoon(exp)) return 'soon'
  return 'ok'
}



// ── Page ──────────────────────────────────────────────────────────────────────

// `supabase` se sigue aceptando para no romper a quien ya monta este
// componente, pero no se usa: el acceso a datos va por el hook, que usa el
// cliente compartido de la app.
// `className` se sigue aceptando en las props para no romper a quien ya monta
// este componente, pero no se usa: el ancho y el contenedor los define
// `Pantalla`, igual que en todas las vistas.
export default function AdminApiVault({ tenantId, appId }: ApiVaultPageProps) {
  const { entries, loading, error, load, add, edit, remove, stats } = useApiVault()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  /* Qué plataforma se está guiando. `''` es el elegidor; null, cerrado. */
  const [guiando,  setGuiando]  = useState<string | null>(null)

  /*
   * Las de servidor no las devuelve la lectura normal —las políticas de lectura
   * las excluyen a propósito— así que sin esto DESAPARECEN: se cargan, se
   * guardan bien, y el Vault se ve igual que antes.
   *
   * Se piden aparte, por una función que devuelve todo MENOS el valor. Poder
   * decir "está cargada y desde cuándo" es lo que hace que el Vault sirva; el
   * valor no hace falta para eso, y es justamente lo que no puede salir.
   */
  const [deServidor, setDeServidor] = useState<
    { plataforma: string; nombre: string; cargada: string; largo: number }[]>([])

  useEffect(() => {
    supabase.rpc('credenciales_de_servidor').then(({ data, error }: {
      data: { plataforma: string; nombre: string; cargada: string; largo: number }[] | null
      error: unknown
    }) => {
      // Una tienda no las ve y no es un error: son de la plataforma.
      if (!error) setDeServidor(data ?? [])
    })
  }, [])
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<ApiVaultEntry | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [copied,   setCopied]   = useState<string | null>(null)
  const pantalla = usePantalla()
  const tablas = pantalla.tablas
  const { setTopStats } = useShop()

  // El hook toma sus propias dependencias: usa el cliente compartido y no
  // recibe filtros. Pasarle argumentos que no espera fue la causa de que el
  // alta insertara una fila vacia.
  useEffect(() => { load() }, [])

  /* Los contadores van a la barra de arriba: son del módulo, no de la lista, y
     acá adentro ocupaban una fila entera arriba de lo que se vino a ver. */
  useEffect(() => {
    const st = stats()
    setTopStats([
      { label:'Credenciales', value: st.total,    color:'#fff' },
      { label:'Plataformas',  value: st.platforms, color:'#38BDF8' },
      { label:'Por vencer',   value: st.expiring, color: st.expiring > 0 ? '#FBBF24' : '#4ADE80' },
    ])
    return () => setTopStats([])
  }, [entries, setTopStats])


  const filtered = useMemo(() => entries.filter((e) => {
    const grupo = VAULT_TYPE_GROUPS.find((g) => g.id === filter)
    const matchPlatform = filter === 'all' || (grupo?.tipos.includes(e.type) ?? false)
    const q = search.toLowerCase()
    const matchSearch = !q || [e.name, e.platform, ...e.tags].join(' ').toLowerCase().includes(q)
    return matchPlatform && matchSearch
  }), [entries, filter, search])


  function toggleReveal(id: string) {
    setRevealed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function copyValue(entry: ApiVaultEntry) {
    await navigator.clipboard.writeText(entry.value)
    setCopied(entry.id); setTimeout(() => setCopied(null), 2000)
  }

  function openEdit(entry: ApiVaultEntry) {
    setEditing(entry); setShowForm(true)
  }


  /* Se declara ANTES de dibujar: si viviera adentro del JSX, la barra —que va
     arriba— no sabría qué se puede hacer hasta un render después. */
  const nivelCredenciales = tablas.nivel("credenciales", {
          columnas: [
            { id: "nombre",     label: "Credencial", ancho: 240 },
            { id: "plataforma", label: "Plataforma", ancho: 150 },
            { id: "tipo",       label: "Tipo",       ancho: 120 },
            { id: "entorno",    label: "Entorno",    ancho: 100 },
            { id: "estado", label: "Estado", ancho: 140,
              // La herramienta dice QUE pasa; como se ve lo decide la tabla.
              chip: f => {
                /* Las de servidor no tienen fila propia en el Vault: se sabe
                   que están, no cuánto duran. */
                if (f.servidor) {
                  return { tono: 'ok' as const, texto: 'Sólo servidor' }
                }
                const e = f.entry as ApiVaultEntry
                const st = expiryStatus(e.expires_at)
                /* Vencida o por vencer es lo primero que hay que ver: una
                   credencial vencida falla en silencio del otro lado. */
                if (st === 'expired') return { tono: 'error' as const,    texto: 'Vencida' }
                if (st === 'soon')    return { tono: 'atencion' as const, texto: 'Vence pronto' }

                /* Y esto es peor que vencida: cargada, vigente, y con un nombre
                   que el código no busca. No la lee nadie y no se nota — la
                   pantalla que la necesita dice que falta justo eso que está
                   acá. Pasó con "META App ID" en vez de "META_APP_ID". */
                if (nadieLaLee(e.platform, e.name)) {
                  return { tono: 'atencion' as const, texto: 'No la lee nadie' }
                }
                return { tono: 'ok' as const, texto: 'Vigente' }
              } },
            { id: "vence",      label: "Vence",      rastro: true, ancho: 80 },
            { id: "creado",     label: "Creada",     rastro: true, ancho: 80,
              ver: f => fecha(f.creado) },
          ],
          filas: [
            ...filtered.map((e) => ({
              clave: e.id,
              nombre: e.name,
              plataforma: e.platform,
              tipo: VAULT_TYPE_LABELS[e.type],
              entorno: e.env,
              vence: e.expires_at
                ? new Date(e.expires_at).toLocaleDateString('es-UY',
                    { day:'2-digit', month:'2-digit', year:'2-digit' })
                : "—",
              creado: e.created_at,
              entry: e,
            })),

            /* Las de servidor, en la MISMA lista. Aparte serían dos lugares
               donde mirar si una credencial está cargada, y la pregunta es una
               sola. No traen valor ni se pueden abrir: no hay `entry`, así que
               Editar y Eliminar quedan apagados sobre ellas. */
            ...deServidor
              .filter(c => {
                const q = search.toLowerCase()
                return !q || `${c.nombre} ${c.plataforma}`.toLowerCase().includes(q)
              })
              .map(c => ({
                clave: `servidor:${c.plataforma}:${c.nombre}`,
                nombre: c.nombre,
                plataforma: c.plataforma,
                tipo: 'Del servidor',
                entorno: 'production',
                vence: "—",
                creado: c.cargada,
                servidor: true,
              })),
          ],
          nombreDe: f => String(f.nombre),
          onAgregar: () => { setEditing(null); setShowForm(true) },
          /* Sobre una de servidor no se puede: el navegador no tiene su valor
             para editarla, y borrarla desde acá dejaría al sistema sin
             conectar sin que nadie lo relacione. Se cambian donde se cargan. */
          onEditar:  f => { if (!f.servidor) openEdit(f.entry as ApiVaultEntry) },
          onBorrar: async (fs) => {
            for (const f of fs) if (!f.servidor) await remove(f.clave)
          },
          detalle: f => {
            const e = f.entry as ApiVaultEntry
            const revelada = revealed.has(f.clave)
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:720 }}>
                <div>
                  <div style={{ fontSize:'0.74rem', fontWeight:800, color:'#374151' }}>Secreto</div>
                  <div style={{ fontSize:'0.72rem', color:C.textDim, marginBottom:6 }}>
                    Se muestra sólo si lo pedís. Queda a la vista hasta que cierres la fila.
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <code style={{ flex:1, fontFamily:C.mono, fontSize:12, padding:'0.45rem 0.6rem',
                      background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:7,
                      wordBreak:'break-all', color:C.text }}>
                      {revelada ? e.value : '•'.repeat(Math.min(e.value?.length ?? 12, 40))}
                    </code>
                    <BarraDeAccionesSuelta acciones={[
                      { label: revelada ? 'Ocultar' : 'Ver', color: C.blue,
                        onClick: () => toggleReveal(f.clave) },
                      { label: copied === f.clave ? 'Copiado' : 'Copiar', color: C.accent,
                        onClick: () => { void copyValue(e) } },
                    ]} />
                  </div>
                </div>

                {e.notes && (
                  <div>
                    <div style={{ fontSize:'0.74rem', fontWeight:800, color:'#374151' }}>Notas</div>
                    <div style={{ fontSize:'0.8rem', color:C.textMuted }}>{e.notes}</div>
                  </div>
                )}

                {e.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {e.tags.map(t => (
                      <span key={t} style={{ fontSize:'0.72rem', padding:'2px 9px', borderRadius:999,
                        background:C.blueDim, color:C.blue }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          },
  })

  return (
    /* La barra, el buscador, el aviso, el error y el ancho los define
       `Pantalla`. Acá había un contenedor propio con `maxWidth: 960` centrado,
       así que el Vault se veía más angosto que todo el resto sin razón. */
    <Pantalla p={pantalla}
      /* El menú son TIPOS, no entradas, y AGRUPADOS.
         Antes estaban las plataformas —Mapbox, MercadoLibre…— que son datos y
         crecen con lo que se carga: con ese criterio, en la Biblioteca el menú
         serían las imágenes una por una.
         Y ocho tipos eran ocho botones: nadie necesita separar un JWT de un
         OAuth token para mirar sus credenciales. El tipo exacto sigue en su
         columna. */
      /* Los tipos, UNA sola vez: `Pantalla` los dibuja en el menú y adentro
         del buscador. La plataforma -Mapbox, MercadoLibre- es una columna y se
         busca; el menú es el puñado de categorías que no cambia. */
      secciones={{
        valor: filter,
        opciones: [
          { valor: 'all', label: 'Todo' },
          ...VAULT_TYPE_GROUPS.map((g) => ({ valor: g.id, label: g.label })),
        ],
        onCambio: setFilter,
      }}
      buscador={{ valor: search, onCambio: setSearch }}

      /* "Cómo la consigo" antes que "Agregar": el que no tiene la clave no
         necesita un formulario, necesita la clave. Ese es el orden real del
         problema, y por eso está primero. */
      extra={[
        { label: 'Cómo la consigo', color: 'var(--brand-navy)',
          title: 'Te llevo paso a paso hasta la credencial',
          onClick: () => setGuiando('') },
      ]}
      error={error}>


      {/* ── La lista ─────────────────────────────────────────────────────
          La misma tabla que el resto del panel: check por fila y los botones
          en la barra.

          AGREGAR Y EDITAR ABREN EL FORMULARIO, NO UNA FILA
          Una credencial no es un renglón de datos: tiene un secreto, un tipo,
          un entorno y un vencimiento, y el secreto no se escribe en una celda
          entre otras celdas. Lo que NO cambia es dónde está el botón — que es
          lo que importa: se aprieta "Agregar" en el mismo lugar de siempre y
          lo que se abre después es asunto de esta herramienta.
       ──────────────────────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ textAlign:'center', color:C.textMuted, padding:'3rem',
          fontFamily:C.mono, fontSize:12 }}>Cargando...</p>
      ) : (
        <Tabla {...nivelCredenciales} />
      )}

      {showForm && (
        <VaultForm initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={async (data) => {
            const ok = editing
              ? await edit(editing.id, data)
              : await add({ ...(data as ApiVaultInsert),
                  tenant_id: tenantId ?? null,
                  tags: [...((data as ApiVaultInsert).tags ?? []), ...(appId ? [appId] : [])] })
            if (ok) { setShowForm(false); setEditing(null) }
          }} />
      )}

      {/* El elegidor: qué credencial. Sale de la misma lista de guías, así que
          no puede ofrecer una para la que no hay pasos. */}
      {guiando === '' && (
        <div onClick={e => { if (e.target === e.currentTarget) setGuiando(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
            zIndex: 9998, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%',
            maxWidth: 460, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>
                ¿Cuál necesitás?
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--mute)', marginTop: 2 }}>
                Te llevo paso a paso hasta conseguirla.
              </div>
            </div>
            <div style={{ padding: '0.5rem' }}>
              {GUIAS.map(g => (
                <button key={g.plataforma} onClick={() => setGuiando(g.plataforma)}
                  style={{ display: 'block', width: '100%', textAlign: 'left',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    padding: '0.6rem 0.75rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111' }}>
                    {g.plataforma}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--mute)' }}>
                    {g.para}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {guiando && guiaDe(guiando) && (
        <Asistente
          guia={guiaDe(guiando)!}
          onCerrar={() => setGuiando(null)}
          onIr={ruta => { window.location.href = ruta }}
          avisar={pantalla.avisar} />
      )}
    </Pantalla>
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
  /*
   * La lista arranca CORTA.
   *
   * Son noventa y dos plataformas en quince categorías. Ponerlas todas —aunque
   * sea con las usadas arriba— sigue siendo una lista de noventa y dos: hay que
   * frenar a leer para no pasarse de largo lo que buscabas.
   *
   * Se abre entera si la editada no está entre las cortas: si no, el selector
   * se vería vacío sobre una credencial que tiene plataforma.
   */
  const [todasLasPlataformas, setTodasLasPlataformas] = useState(
    !!initial?.platform && !VAULT_PLATFORMS_FRECUENTES.includes(initial.platform))
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
          {/* La PLATAFORMA primero: de ella depende qué nombres tienen sentido.
              Al revés obligaba a escribir el nombre a ciegas y después elegir
              contra qué. */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>PLATAFORMA *</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar...</option>

                {todasLasPlataformas
                  ? VAULT_PLATFORM_CATEGORIES.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {VAULT_PLATFORM_DEFS.filter(p => p.category === cat).map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </optgroup>
                    ))
                  : VAULT_PLATFORMS_FRECUENTES.map(n => {
                      const p = VAULT_PLATFORM_DEFS.find(x => x.name === n)
                      return p ? <option key={p.name} value={p.name}>{p.name}</option> : null
                    })}
              </select>

              {/* Las otras ochenta y cuatro, a un click. No se sacan: alguna vez
                  va a hacer falta una. Pero no se muestran hasta que se pidan. */}
              {!todasLasPlataformas && (
                <button type="button" onClick={() => setTodasLasPlataformas(true)}
                  style={{ marginTop: 5, background:'none', border:'none', padding:0,
                    cursor:'pointer', fontSize:11, color:C.textMuted,
                    textDecoration:'underline' }}>
                  Ver las {VAULT_PLATFORM_DEFS.length} plataformas
                </button>
              )}
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

          {/*
            * EL NOMBRE SE ELIGE, NO SE ESCRIBE.
            *
            * Sólo cuando la plataforma tiene nombres definidos. Para las demás
            * sigue siendo un campo libre: no todas las claves las lee nuestro
            * código, y obligar a elegir de una lista vacía sería peor.
            */}
          <div>
            <label style={labelStyle}>NOMBRE *</label>
            {requeridasDe(platform).length > 0 ? (<>
              <select value={name} onChange={(e) => setName(e.target.value)}
                style={inputStyle}>
                <option value="">Seleccionar...</option>
                {requeridasDe(platform).map(c => (
                  <option key={c.name} value={c.name}>
                    {c.etiqueta}{c.porBoton ? ' · la escribe Conectar' : ''}
                  </option>
                ))}
              </select>
              {(() => {
                const c = requerida(platform, name)
                if (!c) return null
                return (
                  <div style={{ marginTop: 5, fontSize: 11, color: C.textMuted,
                    lineHeight: 1.5 }}>
                    {c.para} Se guarda como <b>{c.name}</b>.
                    {c.porBoton && (
                      /* Cargarla a mano no está prohibido, pero la próxima
                         conexión la pisa. Decirlo ahora evita el "la cargué y
                         se borró sola". */
                      <> <span style={{ color:'#B45309', fontWeight:600 }}>
                        La escribe el botón Conectar: si la cargás a mano, la
                        próxima conexión la reemplaza.
                      </span></>
                    )}
                  </div>
                )
              })()}
            </>) : (
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={platform ? 'Un nombre para reconocerla' : 'Elegí primero la plataforma'}
                style={inputStyle} />
            )}
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
