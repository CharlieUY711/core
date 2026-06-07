// app/gate/page.tsx  (en cada app)
const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_URL || 'https://workspace.core.com.uy'
const APP_ID = process.env.CORE_APP_ID || ''

async function getAppName(): Promise<string> {
  try {
    const res = await fetch(`${WORKSPACE_URL}/api/public/app-access?app_id=${encodeURIComponent(APP_ID)}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { name_es?: string }
      if (data.name_es) return data.name_es
    }
  } catch {
    /* noop */
  }
  return APP_ID || 'esta aplicación'
}

export default async function GatePage() {
  const name = await getAppName()
  const loginUrl = `${WORKSPACE_URL}/access?app=${encodeURIComponent(APP_ID)}`

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1a',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            letterSpacing: '0.35em',
            color: '#c9a84c',
            marginBottom: '32px',
          }}
        >
          C O R E
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 10px' }}>{name}</h1>

        <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 28px' }}>
          Esta aplicación es de acceso restringido. Ingresá con tu cuenta CORE para continuar.
        </p>

        <a
          href={loginUrl}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: '8px',
            border: '1px solid #c9a84c',
            color: '#c9a84c',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          INGRESAR CON CORE
        </a>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '32px', lineHeight: 1.6 }}>
          ¿No tenés acceso? Escribinos a{' '}
          <a href="mailto:hola@core.com.uy" style={{ color: '#9ca3af' }}>
            hola@core.com.uy
          </a>{' '}
          para solicitarlo.
        </p>
      </div>
    </main>
  )
}
