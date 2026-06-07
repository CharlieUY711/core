// @charlieuy711/auth — AuthForm
// Formulario reusable de auth para todo el ecosistema CORE.
// Vistas: login (email + contraseña), registro (nombre + email + contraseña),
// recuperación (email). Etiquetas como placeholder, ojito en contraseñas (vía Input).
'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../supabase/client'
import Input from './Input'
import Button from './Button'

type View = 'login' | 'register' | 'recover'

interface AuthFormProps {
  /** Vista inicial */
  view?: View
  /** Mostrar el tab de Registrarse (default true) */
  allowRegister?: boolean
  /** Ruta post-login si no viene ?redirect= (default '/dashboard') */
  defaultRedirect?: string
  /** redirectTo para el link de recuperación (default `${origin}/reset`) */
  resetRedirectTo?: string
  /** Si la app pide confirmación de email al registrarse (configurable desde Workspace) */
  emailVerification?: boolean
}

export default function AuthForm({
  view: initialView = 'login',
  allowRegister = true,
  defaultRedirect = '/dashboard',
  resetRedirectTo,
  emailVerification,
}: AuthFormProps) {
  const router = useRouter()
  const params = useSearchParams()

  const [view, setView] = useState<View>(initialView)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Resuelve si pide confirmación de email: prop > flag de Workspace > true
  const [emailVer, setEmailVer] = useState<boolean>(emailVerification ?? true)
  useEffect(() => {
    if (emailVerification !== undefined) return // la prop manda
    const ws = process.env.NEXT_PUBLIC_WORKSPACE_URL
    const appId = process.env.NEXT_PUBLIC_CORE_APP_ID
    if (!ws || !appId) return
    fetch(`${ws}/api/public/app-access?app_id=${encodeURIComponent(appId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.email_verification === 'boolean') setEmailVer(d.email_verification) })
      .catch(() => {})
  }, [emailVerification])

  const swap = (v: View) => { setView(v); setError(''); setMessage(''); setPassword('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    const supabase = createClient()

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('Credenciales incorrectas.'); return }
        const dest = params.get('redirect') || defaultRedirect
        router.refresh()          // orden crítico: refresh antes de push
        router.push(dest)
        return
      }

      if (view === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) { setError(error.message); return }

        if (emailVer) {
          setMessage('Te enviamos un email para confirmar tu cuenta.')
        } else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
          if (signInErr) { setMessage('Cuenta creada. Ya podés ingresar.'); swap('login'); return }
          router.refresh()
          router.push(defaultRedirect)
        }
        return
      }

      // recover
      const redirectTo =
        resetRedirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/reset` : undefined)
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      )
      if (error) { setError(error.message); return }
      setMessage('Te enviamos un link para restablecer la contraseña.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const cta = view === 'login' ? 'Ingresar' : view === 'register' ? 'Crear cuenta' : 'Enviar link'

  return (
    <div className="w-full max-w-sm">
      {/* Tabs */}
      {allowRegister && view !== 'recover' && (
        <div className="flex gap-1 p-1 mb-6 rounded-sm bg-[var(--c-bg)]">
          <button
            type="button"
            onClick={() => swap('login')}
            className={`flex-1 py-2.5 rounded-sm text-sm font-semibold transition-colors ${
              view === 'login' ? 'bg-[var(--c-bg-surface)] text-[var(--c-primary)]' : 'text-[var(--c-text-2)]'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => swap('register')}
            className={`flex-1 py-2.5 rounded-sm text-sm font-semibold transition-colors ${
              view === 'register' ? 'bg-[var(--c-bg-surface)] text-[var(--c-primary)]' : 'text-[var(--c-text-2)]'
            }`}
          >
            Registrarse
          </button>
        </div>
      )}

      {view === 'recover' && (
        <h2 className="text-[var(--c-text)] text-lg font-semibold mb-5">Recuperar contraseña</h2>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        {view === 'register' && (
          <Input
            placeholder="Nombre completo"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            autoFocus
          />
        )}

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus={view !== 'register'}
        />

        {view !== 'recover' && (
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        )}

        {error && <p className="text-xs text-[var(--c-danger)] tracking-wide">{error}</p>}
        {message && <p className="text-xs text-[var(--c-primary)] tracking-wide">{message}</p>}

        <Button type="submit" loading={loading}>{cta}</Button>
      </form>

      {/* Links entre vistas */}
      <div className="mt-4 flex flex-col items-center gap-1.5">
        {view === 'login' && (
          <button type="button" onClick={() => swap('recover')}
            className="text-xs text-[var(--c-text-3)] hover:text-[var(--c-text-2)] transition-colors">
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {view !== 'login' && (
          <button type="button" onClick={() => swap('login')}
            className="text-xs text-[var(--c-text-3)] hover:text-[var(--c-text-2)] transition-colors">
            ← Volver a ingresar
          </button>
        )}
      </div>
    </div>
  )
}
