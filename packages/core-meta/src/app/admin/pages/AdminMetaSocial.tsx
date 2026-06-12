// src/app/admin/pages/AdminMetaSocial.tsx
//
// Página del módulo Meta Social dentro del AdminLayout.
// Sin estilos propios — usa únicamente tokens de Core Market.

import { useNavigate } from 'react-router-dom'
import PageContent     from '../components/PageContent'
import { MetaSocialPanel } from './meta-social/components/MetaSocialPanel'

const T = {
  bgDark:   '#0D2B55',
  bgMain:   '#F2F5FA',
  accent:   '#C9A84C',
  textDark: '#0D2B55',
  textMuted:'#7A7A7A',
  border:   '#C8D5E8',
  radiusLg: '12px',
  fontBase: "Calibri, 'Segoe UI', system-ui, sans-serif",
}

export default function AdminMetaSocial() {
  const navigate = useNavigate()

  return (
    <PageContent>
      {/* Sub-header descriptivo */}
      <div style={{
        background: T.bgDark,
        borderRadius: T.radiusLg,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: T.fontBase,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '8px',
          background: 'rgba(201,168,76,.15)',
          border: '1px solid rgba(201,168,76,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {/* Meta "infinity" logo simplificado */}
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
            <path
              d="M12 12C10.5 9.5 8.5 8 6.5 8C4.5 8 3 9.5 3 12C3 14.5 4.5 16 6.5 16C8.5 16 10.5 14.5 12 12ZM12 12C13.5 14.5 15.5 16 17.5 16C19.5 16 21 14.5 21 12C21 9.5 19.5 8 17.5 8C15.5 8 13.5 9.5 12 12Z"
              stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            Meta Social — Instagram · Facebook · WhatsApp
          </div>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, marginTop: 2 }}>
            Módulo de gestión unificada. Las credenciales se leen del API Vault.
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/api-vault')}
          style={{
            marginLeft: 'auto', flexShrink: 0,
            background: 'transparent',
            border: '1px solid rgba(201,168,76,.4)',
            borderRadius: '4px',
            color: T.accent,
            padding: '5px 12px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.08em',
            cursor: 'pointer',
            fontFamily: T.fontBase,
          }}
        >
          API Vault →
        </button>
      </div>

      {/* Panel principal */}
      <MetaSocialPanel onNavigateToVault={() => navigate('/admin/api-vault')} />
    </PageContent>
  )
}
