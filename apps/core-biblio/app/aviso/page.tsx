'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@core/auth/supabaseClient'

const warnings = [
  {
    lang: 'ES',
    title: 'Acceso Restringido',
    body: 'Este sistema contiene información confidencial de uso exclusivo para personal autorizado de CORE. El acceso, reproducción, distribución o uso no autorizado está estrictamente prohibido y puede derivar en sanciones civiles y/o penales.',
  },
  {
    lang: 'EN',
    title: 'Restricted Access',
    body: 'This system contains confidential information exclusively for authorized CORE personnel. Unauthorized access, reproduction, distribution, or use is strictly prohibited and may result in civil and/or criminal penalties.',
  },
  {
    lang: 'PT',
    title: 'Acesso Restrito',
    body: 'Este sistema contém informações confidenciais de uso exclusivo para pessoal autorizado da CORE. O acesso, reprodução, distribuição ou uso não autorizado é estritamente proibido e pode resultar em sanções civis e/ou penais.',
  },
]

export default function AvisoPage() {
  const router = useRouter()

async function handleAccept() {
    router.refresh()
    router.push('/')
  }

  async function handleCancel() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0B1E35' }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#7A8FA6 1px, transparent 1px), linear-gradient(90deg, #7A8FA6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-full max-w-lg px-8 py-12 mx-4">
        <div className="mb-10 text-center">
          <span
            className="text-2xl font-bold tracking-[0.25em] text-white"
            style={{ fontFamily: 'Calibri, Georgia, serif' }}
          >
            CORE
          </span>
          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        </div>
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full border border-[#C9A84C]/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>
        <div className="flex flex-col gap-7 mb-10">
          {warnings.map(({ lang, title, body }) => (
            <div key={lang} className="border-l-2 border-[#1A4F9C] pl-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#C9A84C]">{lang}</span>
                <span className="text-xs font-semibold tracking-wide text-white">{title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7A8FA6]">{body}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-[#1A3050] mb-8" />
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full py-3 px-6 text-sm font-semibold tracking-widest uppercase rounded-sm bg-[#0D2B55] text-white hover:bg-[#1A4F9C] transition-all duration-200 focus:outline-none"
          >
            Acepto los términos — Ingresar
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 px-6 text-sm font-semibold tracking-widest uppercase rounded-sm bg-transparent border border-[#4A6080] text-[#7A8FA6] hover:border-[#7A8FA6] hover:text-white transition-all duration-200 focus:outline-none"
          >
            Cancelar — Cerrar sesión
          </button>
        </div>
        <p className="mt-8 text-center text-[10px] tracking-widest uppercase text-[#2E4060]">
          CORE · Confidencial · 2026
        </p>
      </div>
    </main>
  )
}

