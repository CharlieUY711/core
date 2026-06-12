// src/app/admin/meta-social/components/MetaProfileCard.tsx
//
// Muestra el perfil de cada plataforma con métricas clave.
// Sin estilos propios — 100% tokens Core Market.

import type { InstagramProfile } from '../types/instagram.types'
import type { FacebookPage }     from '../types/facebook.types'
import type { WhatsAppPhoneNumber } from '../types/whatsapp.types'

const T = {
  primary:     '#1A4F9C',
  primaryLight:'rgba(26,79,156,.1)',
  accent:      '#C9A84C',
  accentLight: 'rgba(201,168,76,.1)',
  success:     '#1D9E75',
  successBg:   'rgba(29,158,117,.1)',
  bgCard:      '#ffffff',
  bgMain:      '#F2F5FA',
  textDark:    '#0D2B55',
  textBody:    '#4A4A4A',
  textMuted:   '#7A7A7A',
  border:      '#C8D5E8',
  borderLight: '#E8EDF5',
  radiusSm:    '4px',
  radiusMd:    '8px',
  radiusLg:    '12px',
  fontBase:    "Calibri, 'Segoe UI', system-ui, sans-serif",
  fontMono:    "'Courier New', monospace",
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.textDark, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('es') : value}
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 32, background: T.border, flexShrink: 0 }} />
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ src, name, color }: { src?: string; name: string; color: string }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden', border: `2px solid ${color}30`,
      background: `${color}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontSize: 16, fontWeight: 700,
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

// ── Quality badge (WhatsApp) ──────────────────────────────────────────────────

function QualityBadge({ rating }: { rating?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    GREEN:   { bg: T.successBg,             color: T.success,  label: 'Alta calidad'  },
    YELLOW:  { bg: 'rgba(201,168,76,.1)',    color: T.accent,   label: 'Media'         },
    RED:     { bg: 'rgba(192,57,43,.1)',     color: '#C0392B',  label: 'Baja calidad'  },
    UNKNOWN: { bg: T.bgMain,                color: T.textMuted, label: 'Desconocida'   },
  }
  const q = map[rating ?? 'UNKNOWN']
  return (
    <span style={{
      background: q.bg, color: q.color,
      padding: '3px 8px', borderRadius: T.radiusSm,
      fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      {q.label}
    </span>
  )
}

// ── Instagram Profile ─────────────────────────────────────────────────────────

interface InstagramProfileCardProps { profile: InstagramProfile }

export function InstagramProfileCard({ profile }: InstagramProfileCardProps) {
  const color = '#E4478A'
  return (
    <div style={{ fontFamily: T.fontBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Avatar src={profile.profile_picture_url} name={profile.username} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.textDark }}>
            @{profile.username}
          </div>
          {profile.name && (
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{profile.name}</div>
          )}
          {profile.account_type && (
            <span style={{
              display: 'inline-block', marginTop: 4,
              background: T.primaryLight, color: T.primary,
              padding: '2px 7px', borderRadius: T.radiusSm,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              {profile.account_type.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center',
        padding: '12px 0', borderTop: `1px solid ${T.borderLight}`,
        borderBottom: `1px solid ${T.borderLight}`, marginBottom: 12,
      }}>
        {profile.followers_count != null && <><Stat label="Seguidores" value={profile.followers_count} /><Divider /></>}
        {profile.follows_count   != null && <><Stat label="Siguiendo"  value={profile.follows_count}   /><Divider /></>}
        {profile.media_count     != null && <Stat label="Publicaciones" value={profile.media_count}    />}
      </div>

      {profile.biography && (
        <p style={{ fontSize: 12, color: T.textBody, lineHeight: 1.5, margin: 0 }}>
          {profile.biography}
        </p>
      )}
    </div>
  )
}

// ── Facebook Page ─────────────────────────────────────────────────────────────

interface FacebookPageCardProps { page: FacebookPage }

export function FacebookPageCard({ page }: FacebookPageCardProps) {
  const color   = '#1877F2'
  const picture = page.picture?.data?.url
  return (
    <div style={{ fontFamily: T.fontBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Avatar src={picture} name={page.name} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.textDark }}>{page.name}</div>
          {page.category && (
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{page.category}</div>
          )}
          {page.verification_status === 'blue_verified' && (
            <span style={{
              display: 'inline-block', marginTop: 4,
              background: T.primaryLight, color: T.primary,
              padding: '2px 7px', borderRadius: T.radiusSm,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              ✓ Verificada
            </span>
          )}
        </div>
      </div>

      {page.fan_count != null && (
        <div style={{
          display: 'flex', gap: 16, alignItems: 'center',
          padding: '12px 0',
          borderTop: `1px solid ${T.borderLight}`,
          borderBottom: page.about ? `1px solid ${T.borderLight}` : 'none',
          marginBottom: page.about ? 12 : 0,
        }}>
          <Stat label="Me gusta" value={page.fan_count} />
        </div>
      )}

      {page.about && (
        <p style={{ fontSize: 12, color: T.textBody, lineHeight: 1.5, margin: 0 }}>
          {page.about}
        </p>
      )}
    </div>
  )
}

// ── WhatsApp Number ───────────────────────────────────────────────────────────

interface WhatsAppNumberCardProps { phoneNumber: WhatsAppPhoneNumber }

export function WhatsAppNumberCard({ phoneNumber }: WhatsAppNumberCardProps) {
  const color = '#25D366'
  return (
    <div style={{ fontFamily: T.fontBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Avatar name={phoneNumber.display_phone_number} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.textDark }}>
            {phoneNumber.display_phone_number}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {phoneNumber.verified_name}
          </div>
        </div>
        <QualityBadge rating={phoneNumber.quality_rating} />
      </div>

      {/* Info grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, padding: '12px 0',
        borderTop: `1px solid ${T.borderLight}`,
      }}>
        <InfoRow label="Estado" value={phoneNumber.code_verification_status ?? '—'} />
        <InfoRow label="Plataforma" value={phoneNumber.platform_type ?? '—'} />
        {phoneNumber.throughput && (
          <InfoRow label="Throughput" value={phoneNumber.throughput.level} />
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: T.textBody, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
