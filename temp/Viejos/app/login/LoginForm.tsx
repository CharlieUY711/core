'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@core/auth'
import { Button, Input } from '@core/ui'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) { setError('Credenciales incorrectas. Verificá tu email y contraseña.'); return }
    router.refresh()
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B1E35' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#7A8FA6 1px, transparent 1px), linear-gradient(90deg, #7A8FA6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="relative w-full max-w-sm mx-auto px-8 py-12 mx-4">
        <div className="mb-12 text-center">
          <span className="text-3xl font-bold tracking-[0.25em] text-white" style={{ fontFamily: 'Calibri, Georgia, serif' }}>CORE</span>
          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
          <p className="mt-3 text-[10px] tracking-[0.3em] uppercase text-[#4A6080]">Workspace Interno</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <Input dark label="Email" type="email" placeholder="usuario@core.lat" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <div className="flex flex-col gap-1 w-full">
            <label className="text-xs font-medium tracking-widest uppercase text-[#7A8FA6]">Contraseña</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full bg-white border border-[#CBD8E8] rounded-sm px-4 py-3 pr-11 text-[#0D2B55] text-sm placeholder-[#A0B0C4] outline-none transition-all duration-200 focus:border-[#1A4F9C] focus:ring-1 focus:ring-[#1A4F9C]/20" />
              <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0B0C4] hover:text-[#1A4F9C] transition-colors duration-200 focus:outline-none"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.477A3 3 0 0013.5 13.5M6.228 6.228A10.45 10.45 0 003 12c1.657 3.766 5.327 6 9 6a10.45 10.45 0 004.772-1.228M9.75 9.75A3 3 0 0112 9c1.657 0 3 1.343 3 3a3 3 0 01-.75 2.25M21 12c-.879 2-2.617 3.773-4.772 4.772" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400 text-center tracking-wide">{error}</p>}
          <div className="mt-2">
            <Button type="submit" loading={loading}>Ingresar</Button>
          </div>
        </form>
        <p className="mt-10 text-center text-[10px] tracking-widest uppercase text-[#2E4060]">Acceso restringido · Solo personal autorizado</p>
      </div>
    </main>
  )
}



