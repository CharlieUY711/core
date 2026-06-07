// @charlieuy711/auth — Input component
// Base: core-biblio/components/ui/Input.tsx — probado en producción
// + ojito automático cuando type="password"
'use client'
import { InputHTMLAttributes, forwardRef, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    const isPassword = type === 'password'
    const [show, setShow] = useState(false)
    const inputType = isPassword ? (show ? 'text' : 'password') : type

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-xs font-medium tracking-widest uppercase text-[var(--c-text-2)]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full bg-[var(--c-bg-surface)] border border-[var(--c-border)] rounded-sm
              px-4 py-3 ${isPassword ? 'pr-11' : ''} text-[var(--c-text)] text-sm
              placeholder-[var(--c-text-3)] outline-none
              transition-all duration-200
              focus:border-[var(--c-primary)] focus:ring-1 focus:ring-[var(--c-primary-pale)]
              ${error ? 'border-[var(--c-danger)] focus:border-[var(--c-danger)] focus:ring-[var(--c-danger)]/20' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] hover:text-[var(--c-text-2)] transition-colors"
            >
              {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-[var(--c-danger)] tracking-wide">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3 3.9M6.6 6.6A18.5 18.5 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}
