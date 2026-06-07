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
          <label className="text-xs font-medium tracking-widest uppercase text-[#7A8FA6]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border border-[#CBD8E8] rounded-sm
            px-4 py-3 text-[#0D2B55] text-sm
            placeholder-[#A0B0C4] outline-none
            transition-all duration-200
            focus:border-[#1A4F9C] focus:ring-1 focus:ring-[#1A4F9C]/20
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-red-500 tracking-wide">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

