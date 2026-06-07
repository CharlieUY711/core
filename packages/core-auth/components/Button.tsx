// @charlieuy711/auth — Button component
// Base: core-biblio/components/ui/Button.tsx — probado en producción
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'w-full py-3 px-6 text-sm font-semibold tracking-widest uppercase transition-all duration-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants: Record<string, string> = {
    primary: [
      'text-white',
      'bg-[var(--c-primary)]',
      'hover:bg-[var(--c-primary-hover)]',
      'focus:ring-[var(--c-primary)]',
      'focus:ring-offset-[var(--c-bg)]',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'border border-[var(--c-text-3)]',
      'text-[var(--c-text-2)]',
      'hover:border-[var(--c-text-2)]',
      'hover:text-[var(--c-text)]',
      'focus:ring-[var(--c-text-3)]',
      'focus:ring-offset-[var(--c-bg)]',
    ].join(' '),
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Verificando...
        </span>
      ) : children}
    </button>
  )
}

