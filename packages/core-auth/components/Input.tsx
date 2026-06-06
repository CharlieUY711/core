// @core/auth — Input component
// Base: core-biblio/components/ui/Input.tsx — probado en producción
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-xs font-medium tracking-widest uppercase text-[var(--c-text-2)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-[var(--c-bg-surface)] border border-[var(--c-border)] rounded-sm
            px-4 py-3 text-[var(--c-text)] text-sm
            placeholder-[var(--c-text-3)] outline-none
            transition-all duration-200
            focus:border-[var(--c-primary)] focus:ring-1 focus:ring-[var(--c-primary-pale)]
            ${error ? 'border-[var(--c-danger)] focus:border-[var(--c-danger)] focus:ring-[var(--c-danger)]/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-[var(--c-danger)] tracking-wide">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
