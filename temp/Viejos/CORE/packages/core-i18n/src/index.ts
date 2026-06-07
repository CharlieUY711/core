'use client'

// ═══════════════════════════════════════════════════════════════
// @core/i18n — Única fuente de verdad para textos del ecosistema
//
// USO EN CUALQUIER APP:
//
//   // 1. Envolver la app con el provider (layout.tsx o App.tsx)
//   import { I18nProvider } from '@core/i18n'
//   <I18nProvider><App /></I18nProvider>
//
//   // 2. Usar en cualquier componente
//   import { useI18n } from '@core/i18n'
//   const { t, locale, setLocale } = useI18n()
//   <p>{t('brand_tagline')}</p>
//
//   // 3. Sin contexto (server components, utilidades)
//   import { translate } from '@core/i18n'
//   translate('es', 'brand_tagline')
// ═══════════════════════════════════════════════════════════════

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

import { es, type TranslationKeys } from './locales/es'
import { en } from './locales/en'
import { pt } from './locales/pt'

// ── Tipos ─────────────────────────────────────────────────────
export const LOCALES = ['es', 'en', 'pt'] as const
export type Locale = typeof LOCALES[number]
export type { TranslationKeys }
export const DEFAULT_LOCALE: Locale = 'es'

// ── Mapa de traducciones ──────────────────────────────────────
export const translations: Record<Locale, Record<TranslationKeys, string>> = {
  es,
  en,
  pt,
}

// ── Función de traducción sin contexto ───────────────────────
export function translate(
  locale: Locale,
  key: TranslationKeys
): string {
  return translations[locale]?.[key] ?? translations['es'][key] ?? key
}

// ── Alias corto ───────────────────────────────────────────────
export const tr = translate

// ── Context ───────────────────────────────────────────────────
interface I18nContextType {
  locale:    Locale
  setLocale: (locale: Locale) => void
  t:         (key: TranslationKeys) => string
}

const I18nContext = createContext<I18nContextType>({
  locale:    DEFAULT_LOCALE,
  setLocale: () => {},
  t:         (key) => translations[DEFAULT_LOCALE][key] ?? key,
})

// ── Provider ──────────────────────────────────────────────────
export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children:      ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
  }, [])

  const t = useCallback(
    (key: TranslationKeys): string =>
      translations[locale]?.[key] ?? translations['es'][key] ?? key,
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext)
}

// ── LanguageSwitcher component ────────────────────────────────
export interface LanguageSwitcherProps {
  // Estilos visuales según la estética de la app
  variant?: 'dark' | 'light' | 'navbar-light'
  className?: string
}

export function LanguageSwitcher({ variant = 'dark' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()

  const styles: Record<string, React.CSSProperties> = {
    dark: {
      active:   { color: '#c9993a', borderColor: '#7a5f2a', background: 'rgba(201,153,58,0.08)' },
      inactive: { color: '#4a6080', borderColor: '#1e3354', background: 'transparent' },
    },
    light: {
      active:   { color: '#0D2B55', borderColor: '#0D2B55', background: 'rgba(13,43,85,0.08)' },
      inactive: { color: '#94a3b8', borderColor: '#e2e8f0', background: 'transparent' },
    },
    'navbar-light': {
      active:   { color: '#ffffff', borderColor: '#ffffff', background: 'rgba(255,255,255,0.2)' },
      inactive: { color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' },
    },
  }

  const s = styles[variant]

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid',
            cursor: 'pointer',
            transition: 'all 0.15s',
            ...(locale === l ? s.active : s.inactive),
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

