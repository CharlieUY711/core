import { getCoreStyle } from '@/lib/core-theme'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CORE Workspace',
  description: 'Portal interno del ecosistema CORE',
  robots: 'noindex, nofollow',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const style = await getCoreStyle()
  return (
    <html lang="es" style={style?.vars as React.CSSProperties | undefined}>
      <body className="min-h-screen bg-[#0a0a0a] text-neutral-200 antialiased">
        {children}
      </body>
    </html>
  )
}
