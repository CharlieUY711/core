// src/app/admin/meta-social/components/MetaSocialPanel.tsx
//
// Panel unificado de las 3 plataformas Meta.
// Orquesta los 3 hooks y presenta cada sección.

import type { FacebookPost } from '../types/facebook.types'
import type { WhatsAppMessageTemplate } from '../types/whatsapp.types'
import { Tabla, Columna, Fila, Tono, useControlDeTablas } from '../../components/Tabla'
import { MetaConnectionPanel } from './MetaConnectionPanel'
import { InstagramMediaGrid }  from './InstagramMediaGrid'
import {
  InstagramProfileCard,
  FacebookPageCard,
  WhatsAppNumberCard,
} from './MetaProfileCard'

/*
 * Los tokens del panel, no una paleta propia.
 *
 * Aca habia catorce hexadecimales escritos a mano y una tipografia -Calibri-
 * que no es la del panel, asi que esta pantalla se veia de otro producto. Una
 * herramienta no elige colores: si necesita uno que no esta, falta el token.
 */
const T = {
  primary:     'var(--brand-navy)',
  accent:      'var(--brand-madre)',
  accentLight: 'color-mix(in srgb, var(--brand-madre) 10%, transparent)',
  bgCard:      '#fff',
  bgMain:      'var(--gray-50)',
  bgDark:      'var(--brand-navy)',
  textDark:    '#111',
  textMuted:   'var(--mute)',
  border:      'var(--border)',
  borderLight: 'var(--border)',
  radiusSm:    '4px',
  radiusMd:    '8px',
  radiusLg:    '12px',
  shadowCard:  '0 1px 3px rgba(0,0,0,.05)',
  fontBase:    'inherit',
}

/** Que se esta mirando. La elige la pantalla, no el panel. */
export type Seccion = 'todo' | 'instagram' | 'facebook' | 'whatsapp'

// ── Sección con título ────────────────────────────────────────────────────────

function Section({
  title, subtitle, children,
}: {
  title:     string
  subtitle?: string
  children:  React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 24, fontFamily: T.fontBase }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 700, color: T.textDark,
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.textMuted }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────

function VaultLoading() {
  return (
    <div style={{
      padding: '32px', textAlign: 'center',
      color: T.textMuted, fontSize: 13, fontFamily: T.fontBase,
    }}>
      Cargando credenciales del API Vault…
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────

interface MetaSocialPanelProps {
  seccion: Seccion
  cargandoVault: boolean
  /* Los hooks los llama la PANTALLA y los pasa hechos. La barra necesita saber
     si hay credenciales y poder llamar a `verifyConnection`, y la barra va
     arriba en el arbol: con los hooks aca adentro no tenia forma de enterarse. */
  ig: any
  fb: any
  wa: any
}

export function MetaSocialPanel({
  seccion, cargandoVault, ig, fb, wa,
}: MetaSocialPanelProps) {
  if (cargandoVault) return <VaultLoading />

  /* Una seccion elegida muestra solo la suya. "Todo" muestra las tres. */
  const ver = (cual: Seccion) => seccion === 'todo' || seccion === cual

  return (
    <div style={{ fontFamily: T.fontBase, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Estado de conexiones ─────────────────────────────────────────── */}
      <Section title="Conexiones" subtitle="Estado de cada plataforma Meta">
        {/* `auto-fit` con un minimo: con tres columnas fijas, al mirar una sola
            plataforma quedaban dos huecos al costado. */}
        <div style={{ display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {/* Instagram */}
          {ver('instagram') && <MetaConnectionPanel
            platform="Instagram"
            status={ig.status}
            error={ig.error}
            isConfigured={ig.isConfigured}
            onReconnect={ig.reconnect}
          >
            {ig.profile && <InstagramProfileCard profile={ig.profile} />}
          </MetaConnectionPanel>}

          {/* Facebook */}
          {ver('facebook') && <MetaConnectionPanel
            platform="Facebook"
            status={fb.status}
            error={fb.error}
            isConfigured={fb.isConfigured}
            onReconnect={fb.reconnect}
          >
            {fb.page && <FacebookPageCard page={fb.page} />}
          </MetaConnectionPanel>}

          {/* WhatsApp */}
          {ver('whatsapp') && <MetaConnectionPanel
            platform="WhatsApp"
            status={wa.status}
            error={wa.error}
            isConfigured={wa.isConfigured}
            onReconnect={wa.reconnect}
          >
            {wa.phoneNumber && <WhatsAppNumberCard phoneNumber={wa.phoneNumber} />}
          </MetaConnectionPanel>}
        </div>
      </Section>

      {/* ── Galería de Instagram ─────────────────────────────────────────── */}
      {ver('instagram') && ig.isConfigured && (
        <Section
          title="Publicaciones de Instagram"
          subtitle={ig.profile ? `@${ig.profile.username} · ${ig.media.length} cargadas` : undefined}
        >
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding: '16px',
            boxShadow: T.shadowCard,
          }}>
            <InstagramMediaGrid
              media={ig.media}
              loading={ig.loadingMedia}
              hasMore={ig.hasMore}
              onLoadMore={ig.loadMore}
            />
          </div>
        </Section>
      )}

      {/* ── Últimos posts de Facebook ──────────────────────────────────── */}
      {ver('facebook') && fb.isConfigured && fb.posts.length > 0 && (
        <Section
          title="Últimas publicaciones de Facebook"
          subtitle={fb.page ? `Página: ${fb.page.name}` : undefined}
        >
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding: '16px',
            boxShadow: T.shadowCard,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {fb.posts.map((post: FacebookPost) => (
              <FacebookPostRow key={post.id} post={post} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Templates WhatsApp ────────────────────────────────────────── */}
      {ver('whatsapp') && wa.isConfigured && wa.templates.length > 0 && (
        <Section
          title="Plantillas de WhatsApp"
          subtitle={`${wa.templates.length} aprobadas o en revisión`}
        >
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding: '16px',
            boxShadow: T.shadowCard,
          }}>
            <TablaDePlantillas templates={wa.templates} />
          </div>
        </Section>
      )}

    </div>
  )
}

// ── Facebook post row ─────────────────────────────────────────────────────────

function FacebookPostRow({ post }: { post: FacebookPost }) {
  const likes    = post.likes?.summary?.total_count ?? 0
  const comments = post.comments?.summary?.total_count ?? 0
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: `1px solid ${T.borderLight}`,
    }}>
      {post.full_picture && (
        <img
          src={post.full_picture}
          alt=""
          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: T.radiusSm, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: '0 0 4px', fontSize: 12, color: '#4A4A4A', lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {post.message ?? post.story ?? '(Sin texto)'}
        </p>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.textMuted }}>
          <span>♡ {likes.toLocaleString()}</span>
          <span>💬 {comments.toLocaleString()}</span>
          <span style={{ marginLeft: 'auto' }}>
            {new Date(post.created_time).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
          </span>
          {post.permalink_url && (
            <a href={post.permalink_url} target="_blank" rel="noopener noreferrer"
              style={{ color: T.primary, textDecoration: 'none', fontWeight: 600 }}>
              Ver →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Plantillas de WhatsApp ────────────────────────────────────────────────────

/**
 * La tabla del panel, la misma que Tiendas, el Vault y Pedidos.
 *
 * Acá había una dibujada a mano, con encabezado azul oscuro, filas cebradas y
 * su propio verde y su propio rojo para el estado. Tres decisiones que ya
 * estaban tomadas en otro lado, tomadas de nuevo.
 *
 * El estado va como `chip`: la herramienta dice QUÉ pasa —aprobada, pendiente,
 * rechazada— y la tabla decide cómo se ve.
 */
function TablaDePlantillas({ templates }: { templates: WhatsAppMessageTemplate[] }) {
  const t = useControlDeTablas()

  const columnas: Columna[] = [
    { id: 'nombre',    label: 'Nombre' },
    { id: 'categoria', label: 'Categoría' },
    { id: 'idioma',    label: 'Idioma', ancho: 70 },
    {
      id: 'estado', label: 'Estado',
      chip: (f): { tono: Tono; texto: string } => {
        const e = String(f.estado)
        /* Un estado que Meta agregue mañana se muestra crudo en vez de
           esconderse: si aparece uno nuevo hay que verlo. */
        return {
          tono: e === 'APPROVED' ? 'ok' : e === 'REJECTED' ? 'error' : 'atencion',
          texto: e === 'APPROVED' ? 'APROBADA'
               : e === 'REJECTED' ? 'RECHAZADA'
               : e === 'PENDING'  ? 'PENDIENTE' : e,
        }
      },
    },
  ]

  const filas: Fila[] = templates.map(tpl => ({
    clave: tpl.id,
    nombre: tpl.name,
    categoria: tpl.category,
    idioma: tpl.language,
    estado: tpl.status,
  }))

  /* Sin acciones: una plantilla se crea y se aprueba del lado de Meta, no acá.
     Por eso la barra de esta tabla no trae ninguna de las cuatro. */
  return <Tabla {...t.nivel('plantillas', { columnas, filas, anidada: true })} />
}
