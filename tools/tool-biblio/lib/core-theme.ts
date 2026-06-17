// Drop-in: copiar a lib/core-theme.ts en cada app.
// Trae el estilo asignado desde Workspace y lo aplica en el layout (server-side, sin FOUC).
export type CoreStyle = {
  vars: Record<string, string>
  logo_url: string | null
  favicon_url: string | null
  name: string
}

export async function getCoreStyle(): Promise<CoreStyle | null> {
  const base = process.env.NEXT_PUBLIC_WORKSPACE_URL
  const appId = process.env.NEXT_PUBLIC_CORE_APP_ID
  if (!base || !appId) return null
  try {
    const res = await fetch(
      `${base}/api/public/app-style?app_id=${encodeURIComponent(appId)}`,
      { next: { revalidate: 60 } } // los cambios del admin se reflejan en ~1 min, sin redeploy
    )
    if (!res.ok) return null
    return (await res.json()) as CoreStyle
  } catch {
    return null // si falla, la app usa los defaults de @charlieuy711/design
  }
}
