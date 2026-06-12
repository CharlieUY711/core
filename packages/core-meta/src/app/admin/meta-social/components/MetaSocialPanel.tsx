// src/app/admin/meta-social/components/MetaSocialPanel.tsx
//
// Panel unificado de las 3 plataformas Meta.
// Orquesta los 3 hooks y presenta cada sección.

import { useMetaVault }        from '../hooks/useMetaVault'
import { useInstagram }        from '../hooks/useInstagram'
import { useFacebook }         from '../hooks/useFacebook'
import { useWhatsApp }         from '../hooks/useWhatsApp'
import { MetaConnectionPanel } from './MetaConnectionPanel'
import { InstagramMediaGrid }  from './InstagramMediaGrid'
import {
  InstagramProfileCard,
  FacebookPageCard,
  WhatsAppNumberCard,
} from './MetaProfileCard'

const T = {
  primary:     '#1A4F9C',
  accent:      '#C9A84C',
  accentLight: 'rgba(201,168,76,.1)',
  bgCard:      '#ffffff',
  bgMain:      '#F2F5FA',
  bgDark:      '#0D2B55',
  textDark:    '#0D2B55',
  textMuted:   '#7A7A7A',
  border:      '#C8D5E8',
  borderLight: '#E8EDF5',
  radiusSm:    '4px',
  radiusMd:    '8px',
  radiusLg:    '12px',
  shadowCard:  '0 2px 8px rgba(13,43,85,.08)',
  fontBase:    "Calibri, 'Segoe UI', system-ui, sans-serif",
}

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
  onNavigateToVault: () => void
}

export function MetaSocialPanel({ onNavigateToVault }: MetaSocialPanelProps) {
  const vault = useMetaVault()

  const ig = useInstagram(vault.instagramCredentials)
  const fb = useFacebook(vault.facebookCredentials)
  const wa = useWhatsApp(vault.whatsappCredentials)

  if (vault.loading) return <VaultLoading />

  return (
    <div style={{ fontFamily: T.fontBase, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Estado de conexiones ─────────────────────────────────────────── */}
      <Section title="Conexiones" subtitle="Estado de cada plataforma Meta">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {/* Instagram */}
          <MetaConnectionPanel
            platform="Instagram"
            status={ig.status}
            error={ig.error}
            isConfigured={ig.isConfigured}
            onReconnect={ig.reconnect}
            onGoToVault={onNavigateToVault}
          >
            {ig.profile && <InstagramProfileCard profile={ig.profile} />}
          </MetaConnectionPanel>

          {/* Facebook */}
          <MetaConnectionPanel
            platform="Facebook"
            status={fb.status}
            error={fb.error}
            isConfigured={fb.isConfigured}
            onReconnect={fb.reconnect}
            onGoToVault={onNavigateToVault}
          >
            {fb.page && <FacebookPageCard page={fb.page} />}
          </MetaConnectionPanel>

          {/* WhatsApp */}
          <MetaConnectionPanel
            platform="WhatsApp"
            status={wa.status}
            error={wa.error}
            isConfigured={wa.isConfigured}
            onReconnect={wa.reconnect}
            onGoToVault={onNavigateToVault}
          >
            {wa.phoneNumber && <WhatsAppNumberCard phoneNumber={wa.phoneNumber} />}
          </MetaConnectionPanel>
        </div>
      </Section>

      {/* ── Galería de Instagram ─────────────────────────────────────────── */}
      {ig.isConfigured && (
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
      {fb.isConfigured && fb.posts.length > 0 && (
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
            {fb.posts.map(post => (
              <FacebookPostRow key={post.id} post={post} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Templates WhatsApp ────────────────────────────────────────── */}
      {wa.isConfigured && wa.templates.length > 0 && (
        <Section
          title="Templates de WhatsApp"
          subtitle={`${wa.templates.length} templates disponibles`}
        >
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding: '16px',
            boxShadow: T.shadowCard,
          }}>
            <TemplateTable templates={wa.templates} />
          </div>
        </Section>
      )}

    </div>
  )
}

// ── Facebook post row ─────────────────────────────────────────────────────────

function FacebookPostRow({ post }: { post: import('../types/facebook.types').FacebookPost }) {
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

// ── WhatsApp template table ───────────────────────────────────────────────────

function TemplateTable({ templates }: { templates: import('../types/whatsapp.types').WhatsAppMessageTemplate[] }) {
  const statusColor = {
    APPROVED: { bg: 'rgba(29,158,117,.1)', color: '#1D9E75' },
    PENDING:  { bg: 'rgba(201,168,76,.1)', color: '#C9A84C' },
    REJECTED: { bg: 'rgba(192,57,43,.1)',  color: '#C0392B' },
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: T.fontBase }}>
      <thead>
        <tr style={{ background: T.bgDark }}>
          {['Nombre', 'Categoría', 'Idioma', 'Estado'].map(h => (
            <th key={h} style={{
              padding: '7px 10px', textAlign: 'left',
              color: '#fff', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {templates.map((tpl, i) => {
          const s = statusColor[tpl.status] ?? statusColor.PENDING
          return (
            <tr key={tpl.id} style={{ background: i % 2 === 1 ? T.bgMain : T.bgCard }}>
              <td style={{ padding: '7px 10px', color: T.textDark, fontWeight: 600, fontFamily: "'Courier New',monospace", fontSize: 11 }}>{tpl.name}</td>
              <td style={{ padding: '7px 10px', color: '#4A4A4A' }}>{tpl.category}</td>
              <td style={{ padding: '7px 10px', color: '#4A4A4A' }}>{tpl.language}</td>
              <td style={{ padding: '7px 10px' }}>
                <span style={{
                  background: s.bg, color: s.color,
                  padding: '2px 7px', borderRadius: T.radiusSm,
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                }}>
                  {tpl.status}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
