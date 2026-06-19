// src/app/admin/meta-social/components/SocialPostGenerator.tsx
//
// Pantalla del Generador de Publicaciones RRSS.
//
// Flujo visual:
//   [1] Selector de producto del catálogo (recibe producto como prop o lo busca)
//   [2] Selección de canales a publicar
//   [3] Botón "Generar borrador"
//   [4] Revisión y edición por canal
//   [5] Publicar / Copiar manual
//   [6] Resultados
//
// Estilos: tokens del proyecto (misma paleta que AdminMetaSocial).
// Sin dependencias externas de UI — solo React + fetch vía el hook.

import { useState, useCallback } from 'react'
import { useSocialPostGenerator } from '../hooks/useSocialPostGenerator'
import { useMetaVault }           from '../hooks/useMetaVault'
import type { CatalogProduct, SocialChannel, ChannelDraft } from '../types/social-post.types'

// ── Tokens ────────────────────────────────────────────────────────────────────

const T = {
  bgDark:   '#0D2B55',
  bgMain:   '#F2F5FA',
  bgCard:   '#FFFFFF',
  accent:   '#C9A84C',
  accentBg: 'rgba(201,168,76,.08)',
  success:  '#2E7D32',
  error:    '#C62828',
  textDark: '#0D2B55',
  textMid:  '#3A3A3A',
  textMuted:'#7A7A7A',
  border:   '#C8D5E8',
  radius:   '10px',
  radiusSm: '6px',
  font:     "Calibri, 'Segoe UI', system-ui, sans-serif",
} as const

// ── Íconos de canal ───────────────────────────────────────────────────────────

const CHANNEL_META: Record<SocialChannel, { label: string; icon: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C' },
  facebook:  { label: 'Facebook',  icon: '📘', color: '#1877F2' },
  whatsapp:  { label: 'WhatsApp',  icon: '💬', color: '#25D366' },
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: '20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: T.font, fontWeight: 700, fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '.08em',
      color: T.textMuted, marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function Btn({
  children, onClick, disabled, variant = 'primary', style,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    fontFamily: T.font, fontWeight: 700, fontSize: 13,
    borderRadius: T.radiusSm, padding: '9px 18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', opacity: disabled ? 0.5 : 1,
    transition: 'opacity .15s',
    ...style,
  }
  const variants = {
    primary:   { background: T.bgDark, color: '#fff' },
    secondary: { background: T.accent, color: T.bgDark },
    ghost:     { background: 'transparent', border: `1px solid ${T.border}`, color: T.textDark },
    danger:    { background: T.error, color: '#fff' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

// ── Panel de producto ─────────────────────────────────────────────────────────

function ProductPanel({
  product,
  onClear,
}: {
  product: CatalogProduct
  onClear: () => void
}) {
  const price = `${product.currency} ${product.price.toLocaleString('es-UY')}`
  return (
    <Card>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {product.images[0] && (
          <img
            src={product.images[0]}
            alt={product.title}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: T.radiusSm, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, color: T.textDark, marginBottom: 2 }}>
            {product.title}
          </div>
          <div style={{ fontFamily: T.font, fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
            {price} · Stock: {product.stock} · {product.sku ?? 'Sin SKU'}
          </div>
          {product.description && (
            <div style={{
              fontFamily: T.font, fontSize: 12, color: T.textMid,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {product.description}
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.textMuted, fontSize: 18, flexShrink: 0,
          }}
          title="Cambiar producto"
        >
          ✕
        </button>
      </div>
    </Card>
  )
}

// ── Panel de selección de canales ─────────────────────────────────────────────

function ChannelSelector({
  selectedChannels,
  channelAvailable,
  onToggle,
}: {
  selectedChannels: SocialChannel[]
  channelAvailable: Record<SocialChannel, boolean>
  onToggle: (c: SocialChannel) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {(Object.entries(CHANNEL_META) as [SocialChannel, typeof CHANNEL_META[SocialChannel]][]).map(
        ([channel, meta]) => {
          const available = channelAvailable[channel]
          const selected  = selectedChannels.includes(channel)
          return (
            <button
              key={channel}
              onClick={() => available && onToggle(channel)}
              title={!available ? `${meta.label} no está configurado en el API Vault` : undefined}
              style={{
                fontFamily: T.font, fontWeight: 700, fontSize: 13,
                borderRadius: T.radiusSm, padding: '8px 16px',
                cursor: available ? 'pointer' : 'not-allowed',
                border: `2px solid ${selected && available ? meta.color : T.border}`,
                background: selected && available ? `${meta.color}18` : T.bgCard,
                color: selected && available ? meta.color : T.textMuted,
                opacity: available ? 1 : 0.45,
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              {!available && <span style={{ fontSize: 10 }}>(sin creds)</span>}
            </button>
          )
        }
      )}
    </div>
  )
}

// ── Editor de un borrador por canal ───────────────────────────────────────────

function DraftEditor({
  draft,
  onUpdateText,
  onUpdateHashtags,
  onToggleEnabled,
  onSetImage,
  productImages,
}: {
  draft: ChannelDraft
  onUpdateText:     (text: string) => void
  onUpdateHashtags: (tags: string[]) => void
  onToggleEnabled:  () => void
  onSetImage:       (url: string | null) => void
  productImages:    string[]
}) {
  const meta = CHANNEL_META[draft.channel]
  const [hashtagInput, setHashtagInput] = useState(draft.hashtags.join(' '))

  const handleHashtagBlur = () => {
    const tags = hashtagInput
      .split(/[\s,]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean)
    onUpdateHashtags(tags)
  }

  const fullCaption = draft.hashtags.length
    ? `${draft.text}\n\n${draft.hashtags.map(h => `#${h}`).join(' ')}`
    : draft.text

  return (
    <Card style={{ opacity: draft.enabled ? 1 : 0.5 }}>
      {/* Header del canal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <span style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 14,
          color: meta.color,
        }}>
          {meta.label}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Contador de caracteres */}
          <span style={{ fontFamily: T.font, fontSize: 11, color: T.textMuted }}>
            {fullCaption.length} car.
          </span>
          {/* Toggle habilitado */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={onToggleEnabled}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted }}>
              Publicar
            </span>
          </label>
        </div>
      </div>

      {/* Selector de imagen */}
      {productImages.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Imagen</SectionLabel>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {productImages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Imagen ${i + 1}`}
                onClick={() => onSetImage(url)}
                style={{
                  width: 56, height: 56, objectFit: 'cover',
                  borderRadius: T.radiusSm, flexShrink: 0,
                  cursor: 'pointer',
                  border: `2px solid ${draft.imageUrl === url ? meta.color : T.border}`,
                  transition: 'border-color .15s',
                }}
              />
            ))}
            <button
              onClick={() => onSetImage(null)}
              style={{
                width: 56, height: 56, flexShrink: 0,
                border: `2px dashed ${!draft.imageUrl ? meta.color : T.border}`,
                borderRadius: T.radiusSm, background: 'none',
                cursor: 'pointer', color: T.textMuted, fontSize: 11,
                fontFamily: T.font,
              }}
            >
              Sin<br/>img
            </button>
          </div>
        </div>
      )}

      {/* Editor de texto */}
      <div style={{ marginBottom: 12 }}>
        <SectionLabel>Texto</SectionLabel>
        <textarea
          value={draft.text}
          onChange={e => onUpdateText(e.target.value)}
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: T.font, fontSize: 13, color: T.textMid,
            border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
            padding: '8px 10px', resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      {/* Editor de hashtags (solo si el canal los usa) */}
      {draft.channel !== 'whatsapp' && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Hashtags (separados por espacio o coma)</SectionLabel>
          <textarea
            value={hashtagInput}
            onChange={e => setHashtagInput(e.target.value)}
            onBlur={handleHashtagBlur}
            rows={2}
            placeholder="#producto #oferta #tienda"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: T.font, fontSize: 12, color: T.textMid,
              border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
              padding: '6px 10px', resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {draft.hashtags.map(tag => (
              <span key={tag} style={{
                background: T.accentBg, border: `1px solid ${T.accent}`,
                borderRadius: '4px', padding: '2px 7px',
                fontFamily: T.font, fontSize: 11, color: T.accent,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preview del caption completo */}
      <details>
        <summary style={{
          fontFamily: T.font, fontSize: 11, color: T.textMuted,
          cursor: 'pointer', userSelect: 'none',
        }}>
          Ver preview completo
        </summary>
        <div style={{
          marginTop: 8,
          background: T.bgMain,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm,
          padding: '10px 12px',
          fontFamily: T.font, fontSize: 13, color: T.textMid,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {fullCaption || '(vacío)'}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fullCaption).catch(() => {})
          }}
          style={{
            marginTop: 6,
            background: 'none', border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm, padding: '4px 10px',
            fontFamily: T.font, fontSize: 11, color: T.textMuted,
            cursor: 'pointer',
          }}
        >
          📋 Copiar
        </button>
      </details>
    </Card>
  )
}

// ── Resultados de publicación ─────────────────────────────────────────────────

function PublishResults({
  results,
  onReset,
}: {
  results: ReturnType<typeof useSocialPostGenerator>['state']['results']
  onReset: () => void
}) {
  const allOk = results.every(r => r.ok)
  return (
    <Card>
      <div style={{
        fontFamily: T.font, fontWeight: 700, fontSize: 15,
        color: allOk ? T.success : T.error, marginBottom: 14,
      }}>
        {allOk ? '✅ Publicado correctamente' : '⚠️ Publicado con errores'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(r => {
          const meta = CHANNEL_META[r.channel]
          return (
            <div key={r.channel} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: r.ok ? '#E8F5E9' : '#FFEBEE',
              border: `1px solid ${r.ok ? '#A5D6A7' : '#FFCDD2'}`,
              borderRadius: T.radiusSm,
            }}>
              <span style={{ fontSize: 18 }}>{meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 13, color: meta.color }}>
                  {meta.label}
                </div>
                {r.ok
                  ? <div style={{ fontFamily: T.font, fontSize: 12, color: T.success }}>
                      Publicado · ID: {r.externalId ?? 'N/A'}
                    </div>
                  : <div style={{ fontFamily: T.font, fontSize: 12, color: T.error }}>
                      {r.error}
                    </div>
                }
              </div>
              <span style={{ fontSize: 18 }}>{r.ok ? '✅' : '❌'}</span>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <Btn variant="ghost" onClick={onReset}>Nueva publicación</Btn>
      </div>
    </Card>
  )
}

// ── Selector de producto (placeholder — integrar con catálogo real) ────────────
// En producción este componente buscará en v_catalog_variants_full via Supabase.
// Por ahora muestra un formulario simple para ingresar los datos del producto.

function ProductSelector({ onSelect }: { onSelect: (p: CatalogProduct) => void }) {
  const [title,    setTitle]    = useState('')
  const [price,    setPrice]    = useState('')
  const [currency, setCurrency] = useState('UYU')
  const [imageUrl, setImageUrl] = useState('')
  const [desc,     setDesc]     = useState('')
  const [stock,    setStock]    = useState('1')

  const handleSubmit = () => {
    if (!title || !price) return
    onSelect({
      variantId:   `manual-${Date.now()}`,
      itemId:      `manual-${Date.now()}`,
      storeId:     '',
      title:       title.trim(),
      description: desc.trim() || null,
      price:       parseFloat(price),
      currency,
      images:      imageUrl.trim() ? [imageUrl.trim()] : [],
      attributes:  {},
      stock:       parseInt(stock) || 0,
      sku:         null,
    })
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: T.font, fontSize: 13, color: T.textMid,
    border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
    padding: '8px 10px', width: '100%', boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <Card>
      <SectionLabel>Ingresá los datos del producto</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
            Título *
          </label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Zapatillas Nike Air Max 90"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
              Precio *
            </label>
            <input
              type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="2990"
              style={inputStyle}
            />
          </div>
          <div style={{ width: 90 }}>
            <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
              Moneda
            </label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              <option>UYU</option>
              <option>USD</option>
              <option>ARS</option>
            </select>
          </div>
          <div style={{ width: 80 }}>
            <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
              Stock
            </label>
            <input
              type="number" value={stock} onChange={e => setStock(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
            URL de imagen (opcional)
          </label>
          <input
            type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
            Descripción (opcional)
          </label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            rows={3} placeholder="Descripción del producto..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <Btn
          variant="primary"
          onClick={handleSubmit}
          disabled={!title || !price}
        >
          Continuar →
        </Btn>
      </div>
      <div style={{
        marginTop: 12, fontFamily: T.font, fontSize: 11, color: T.textMuted,
        fontStyle: 'italic',
      }}>
        💡 Próximamente: buscador de publicaciones del catálogo integrado con la base de datos.
      </div>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function SocialPostGenerator() {
  const vault = useMetaVault()

  const gen = useSocialPostGenerator({
    instagramCreds:        vault.instagramCredentials,
    facebookCreds:         vault.facebookCredentials,
    whatsappCreds:         vault.whatsappCredentials,
    isInstagramConfigured: vault.isInstagramConfigured,
    isFacebookConfigured:  vault.isFacebookConfigured,
    isWhatsAppConfigured:  vault.isWhatsAppConfigured,
  })

  const { state, selectedChannels, canGenerate, canPublish } = gen

  if (vault.loading) {
    return (
      <div style={{ fontFamily: T.font, color: T.textMuted, padding: 20 }}>
        Cargando credenciales del vault…
      </div>
    )
  }

  // ── Paso 6: resultados finales ─────────────────────────────────────────────
  if (state.step === 'done') {
    return <PublishResults results={state.results} onReset={gen.reset} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: T.font }}>

      {/* Header */}
      <div style={{
        background: T.bgDark, borderRadius: T.radius,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>✨</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            Generador de publicaciones para RRSS
          </div>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, marginTop: 2 }}>
            Seleccioná un producto y generá un borrador con IA para Instagram, Facebook y WhatsApp
          </div>
        </div>
      </div>

      {/* Error del vault */}
      {vault.error && (
        <div style={{
          background: '#FFEBEE', border: `1px solid #FFCDD2`,
          borderRadius: T.radius, padding: '12px 16px',
          fontFamily: T.font, fontSize: 13, color: T.error,
        }}>
          ⚠️ Error al cargar el API Vault: {vault.error}
        </div>
      )}

      {/* Paso 1: Selección de producto */}
      <div>
        <SectionLabel>1 · Producto</SectionLabel>
        {state.product
          ? <ProductPanel product={state.product} onClear={gen.reset} />
          : <ProductSelector onSelect={gen.setProduct} />
        }
      </div>

      {/* Paso 2: Canales (solo si hay producto) */}
      {state.product && (
        <div>
          <SectionLabel>2 · Canales a publicar</SectionLabel>
          <Card>
            <ChannelSelector
              selectedChannels={selectedChannels}
              channelAvailable={gen.channelAvailable}
              onToggle={gen.toggleChannel}
            />
            {!vault.isInstagramConfigured && !vault.isFacebookConfigured && !vault.isWhatsAppConfigured && (
              <div style={{
                marginTop: 12, fontFamily: T.font, fontSize: 12, color: T.error,
              }}>
                ⚠️ No hay canales configurados. Cargá las credenciales en el{' '}
                <strong>API Vault</strong> primero.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Error de generación */}
      {state.generateError && (
        <div style={{
          background: '#FFEBEE', border: `1px solid #FFCDD2`,
          borderRadius: T.radius, padding: '12px 16px',
          fontFamily: T.font, fontSize: 13, color: T.error,
        }}>
          ⚠️ {state.generateError}
        </div>
      )}

      {/* Paso 3: Botón Generar */}
      {state.product && state.step !== 'review' && state.step !== 'publishing' && (
        <Btn
          variant="secondary"
          onClick={gen.generate}
          disabled={!canGenerate || state.step === 'generating'}
          style={{ alignSelf: 'flex-start' }}
        >
          {state.step === 'generating' ? '⏳ Generando borrador…' : '✨ Generar borrador con IA'}
        </Btn>
      )}

      {/* Paso 4: Revisión y edición de borradores */}
      {state.step === 'review' && state.drafts.length > 0 && (
        <div>
          <SectionLabel>3 · Revisá y editá el borrador</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {state.drafts.map(draft => (
              <DraftEditor
                key={draft.channel}
                draft={draft}
                productImages={state.product?.images ?? []}
                onUpdateText={text => gen.updateDraftText(draft.channel, text)}
                onUpdateHashtags={tags => gen.updateDraftHashtags(draft.channel, tags)}
                onToggleEnabled={() => gen.toggleDraftEnabled(draft.channel)}
                onSetImage={url => gen.setDraftImage(draft.channel, url)}
              />
            ))}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Btn
              variant="primary"
              onClick={gen.publish}
              disabled={!canPublish}
            >
              🚀 Publicar ({gen.activeDraftCount} {gen.activeDraftCount === 1 ? 'canal' : 'canales'})
            </Btn>
            <Btn variant="ghost" onClick={gen.regenerate}>
              ↩ Regenerar borrador
            </Btn>
          </div>
        </div>
      )}

      {/* Paso 5: Publicando */}
      {state.step === 'publishing' && (
        <Card>
          <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 14, color: T.textDark, marginBottom: 12 }}>
            ⏳ Publicando…
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.results.map(r => (
              <div key={r.channel} style={{ fontFamily: T.font, fontSize: 13, color: r.ok ? T.success : T.error }}>
                {r.ok ? '✅' : '❌'} {CHANNEL_META[r.channel].label}: {r.ok ? 'OK' : r.error}
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  )
}
