// src/app/admin/meta-social/components/MetaConnectionPanel.tsx
//
// Tarjeta de estado de conexión para cada plataforma.
// Sin estilos propios — usa tokens inline de Core Market.

import type { ConnectionStatus } from '../types/meta.types'

// ── Design tokens (inline, del sistema Core Market) ──────────────────────────
const T = {
  primary:      '#1A4F9C',
  primaryLight: 'rgba(26,79,156,.1)',
  accent:       '#C9A84C',
  accentLight:  'rgba(201,168,76,.1)',
  success:      '#1D9E75',
  successBg:    'rgba(29,158,117,.1)',
  danger:       '#C0392B',
  dangerBg:     'rgba(192,57,43,.1)',
  warning:      '#C9A84C',
  warningBg:    'rgba(201,168,76,.1)',
  bgCard:       '#ffffff',
  bgMain:       '#F2F5FA',
  bgDark:       '#0D2B55',
  textDark:     '#0D2B55',
  textBody:     '#4A4A4A',
  textMuted:    '#7A7A7A',
  textLight:    '#ffffff',
  border:       '#C8D5E8',
  borderLight:  '#E8EDF5',
  radiusSm:     '4px',
  radiusMd:     '8px',
  radiusLg:     '12px',
  shadowCard:   '0 2px 8px rgba(13,43,85,.08)',
  fontBase:     "Calibri, 'Segoe UI', system-ui, sans-serif",
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map = {
    idle:       { bg: T.bgMain,       color: T.textMuted,  dot: T.textMuted,  label: 'Sin configurar' },
    connecting: { bg: T.accentLight,  color: T.warning,    dot: T.warning,    label: 'Conectando…'    },
    connected:  { bg: T.successBg,    color: T.success,    dot: T.success,    label: 'Conectado'      },
    error:      { bg: T.dangerBg,     color: T.danger,     dot: T.danger,     label: 'Error'          },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: s.bg, color: s.color,
      padding: '3px 8px', borderRadius: T.radiusSm,
      fontSize: '10px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: s.dot,
        ...(status === 'connecting' ? { animation: 'pulse 1.2s infinite' } : {}),
      }} />
      {s.label}
    </span>
  )
}

// ── Platform icon (SVG inline) ────────────────────────────────────────────────

function PlatformIcon({ platform }: { platform: 'Instagram' | 'Facebook' | 'WhatsApp' }) {
  const icons = {
    Instagram: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
    Facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
    WhatsApp: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  }
  return icons[platform]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MetaConnectionPanelProps {
  platform:      'Instagram' | 'Facebook' | 'WhatsApp'
  status:        ConnectionStatus
  error?:        string | null
  isConfigured:  boolean
  onReconnect:   () => void
  onGoToVault:   () => void
  // Slot para info adicional (nombre, número, fans, etc.)
  children?:     React.ReactNode
}

// ── Componente ────────────────────────────────────────────────────────────────

export function MetaConnectionPanel({
  platform, status, error, isConfigured, onReconnect, onGoToVault, children,
}: MetaConnectionPanelProps) {

  const platformColors: Record<string, string> = {
    Instagram: '#E4478A',
    Facebook:  '#1877F2',
    WhatsApp:  '#25D366',
  }
  const color = platformColors[platform]

  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: T.radiusLg, overflow: 'hidden',
      boxShadow: T.shadowCard, fontFamily: T.fontBase,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 16px',
        borderBottom: `1px solid ${T.borderLight}`,
        background: T.bgMain,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: T.radiusMd,
          background: `${color}18`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <PlatformIcon platform={platform} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.textDark }}>{platform}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
            {platform === 'Instagram' && 'Graph API · Business Account'}
            {platform === 'Facebook'  && 'Graph API · Página de Facebook'}
            {platform === 'WhatsApp'  && 'Cloud API · WhatsApp Business'}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Sin configurar */}
        {!isConfigured && (
          <div style={{
            background: T.accentLight, border: `1px solid rgba(201,168,76,.2)`,
            borderRadius: T.radiusSm, padding: '10px 12px',
            fontSize: 12, color: T.textBody, lineHeight: 1.5,
          }}>
            <strong style={{ color: T.textDark }}>Credenciales no configuradas.</strong>
            {' '}Agrega las claves de {platform} en el API Vault para activar esta integración.
            <button onClick={onGoToVault} style={{
              display: 'block', marginTop: 8,
              background: 'transparent', border: `1px solid ${T.primary}`,
              borderRadius: T.radiusSm, color: T.primary,
              padding: '4px 10px', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.06em',
              cursor: 'pointer',
            }}>
              Ir al API Vault →
            </button>
          </div>
        )}

        {/* Error */}
        {isConfigured && status === 'error' && error && (
          <div style={{
            background: T.dangerBg, border: `1px solid rgba(192,57,43,.2)`,
            borderLeft: `3px solid ${T.danger}`,
            borderRadius: `0 ${T.radiusSm} ${T.radiusSm} 0`,
            padding: '10px 12px', fontSize: 12, color: T.textBody,
          }}>
            <strong style={{ color: T.danger }}>Error de conexión</strong>
            <p style={{ margin: '4px 0 8px', lineHeight: 1.4 }}>{error}</p>
            <button onClick={onReconnect} style={{
              background: 'transparent', border: `1px solid ${T.danger}`,
              borderRadius: T.radiusSm, color: T.danger,
              padding: '4px 10px', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.06em',
              cursor: 'pointer',
            }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Conectando */}
        {status === 'connecting' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: T.textMuted, padding: '4px 0',
          }}>
            <Spinner />
            Verificando credenciales…
          </div>
        )}

        {/* Conectado — slot para contenido adicional */}
        {status === 'connected' && children}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      style={{ width: 14, height: 14, animation: 'spin .8s linear infinite', flexShrink: 0 }}
      viewBox="0 0 24 24" fill="none" stroke="#1A4F9C" strokeWidth="2.5" strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  )
}
