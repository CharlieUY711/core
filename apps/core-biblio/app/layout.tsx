import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Biblioteca CORE',
  description: 'Documentación oficial del ecosistema CORE — Blueprint Estratégico 2026–2035',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[260px] min-h-screen">
            <div className="max-w-4xl mx-auto px-8 py-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}

