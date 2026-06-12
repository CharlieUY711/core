// src/app/admin/meta-social/components/InstagramMediaGrid.tsx
//
// Grilla de publicaciones de Instagram. Sin estilos propios.

import type { InstagramMedia } from '../types/instagram.types'

const T = {
  primary:     '#1A4F9C',
  primaryLight:'rgba(26,79,156,.1)',
  accent:      '#C9A84C',
  bgCard:      '#ffffff',
  bgMain:      '#F2F5FA',
  textDark:    '#0D2B55',
  textBody:    '#4A4A4A',
  textMuted:   '#7A7A7A',
  border:      '#C8D5E8',
  radiusSm:    '4px',
  radiusMd:    '8px',
  fontBase:    "Calibri, 'Segoe UI', system-ui, sans-serif",
}

function MediaTypeBadge({ type }: { type: InstagramMedia['media_type'] }) {
  const map = {
    IMAGE:         { label: 'IMG',       color: T.primary },
    VIDEO:         { label: 'VID',       color: '#8B5CF6' },
    CAROUSEL_ALBUM:{ label: 'CAROUSEL',  color: T.accent  },
    REELS:         { label: 'REEL',      color: '#E4478A' },
  }
  const m = map[type] ?? { label: type, color: T.textMuted }
  return (
    <span style={{
      background: `${m.color}22`, color: m.color,
      padding: '2px 5px', borderRadius: T.radiusSm,
      fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
      textTransform: 'uppercase',
    }}>
      {m.label}
    </span>
  )
}

interface InstagramMediaGridProps {
  media:       InstagramMedia[]
  loading:     boolean
  hasMore:     boolean
  onLoadMore:  () => void
}

export function InstagramMediaGrid({ media, loading, hasMore, onLoadMore }: InstagramMediaGridProps) {
  if (!loading && media.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 16px',
        color: T.textMuted, fontSize: 13, fontFamily: T.fontBase,
      }}>
        No hay publicaciones en esta cuenta.
      </div>
    )
  }

  return (
    <div style={{ fontFamily: T.fontBase }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {media.map(item => (
          <MediaCard key={item.id} item={item} />
        ))}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={`sk-${i}`} />
        ))}
      </div>

      {hasMore && !loading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onLoadMore} style={{
            background: 'transparent', border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm, color: T.textBody,
            padding: '6px 16px', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.08em',
            cursor: 'pointer',
          }}>
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}

function MediaCard({ item }: { item: InstagramMedia }) {
  const thumb = item.media_type === 'VIDEO'
    ? item.thumbnail_url
    : item.media_url

  return (
    <a
      href={item.permalink}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        background: T.bgMain, border: `1px solid ${T.border}`,
        borderRadius: T.radiusMd, overflow: 'hidden',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,43,85,.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingTop: '100%', background: '#E8EDF5' }}>
        {thumb ? (
          <img
            src={thumb}
            alt={item.caption?.slice(0, 60) ?? 'Post'}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textMuted, fontSize: 22,
          }}>
            {item.media_type === 'VIDEO' ? '▶' : '📷'}
          </div>
        )}
        {/* Tipo */}
        <div style={{ position: 'absolute', top: 5, left: 5 }}>
          <MediaTypeBadge type={item.media_type} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px' }}>
        {item.caption && (
          <p style={{
            margin: '0 0 4px', fontSize: 11,
            color: T.textBody, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.caption}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: T.textMuted }}>
          {item.like_count     != null && <span>♡ {item.like_count.toLocaleString()}</span>}
          {item.comments_count != null && <span>💬 {item.comments_count.toLocaleString()}</span>}
          <span style={{ marginLeft: 'auto' }}>
            {new Date(item.timestamp).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: T.bgMain, border: `1px solid ${T.border}`,
      borderRadius: T.radiusMd, overflow: 'hidden',
    }}>
      <div style={{
        paddingTop: '100%',
        background: 'linear-gradient(90deg, #E8EDF5 25%, #F2F5FA 50%, #E8EDF5 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }} />
      <div style={{ padding: 8 }}>
        <div style={{ height: 10, background: T.border, borderRadius: 4, marginBottom: 4 }} />
        <div style={{ height: 10, background: T.border, borderRadius: 4, width: '60%' }} />
      </div>
      <style>{`@keyframes shimmer{to{background-position:-200% 0}}`}</style>
    </div>
  )
}
