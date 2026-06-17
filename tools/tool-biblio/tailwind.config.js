/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CORE Design System — paleta oficial
        'core-navy':       '#0D2B55',
        'core-blue':       '#1A4F9C',
        'core-blue-light': '#2E6FC4',
        'core-blue-pale':  '#D8E8F8',
        'core-gold':       '#C9A84C',
        'core-gold-light': '#E4C97A',
        'core-gray-body':  '#4A4A4A',
        'core-gray-mid':   '#7A7A7A',
        'core-gray-light': '#F2F5FA',
        'core-red':        '#C0392B',
        'core-green':      '#1D9E75',
        // Aliases legacy
        navy: {
          DEFAULT: '#0D2B55',
          light:   '#1A3F72',
          dark:    '#081C38',
        },
      },
      fontFamily: {
        // Tipografía oficial CORE
        sans:    ['Calibri', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono:    ["'Courier New'", "'JetBrains Mono'", 'monospace'],
        // Mantiene variables Next.js como fallback
        geist:   ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'core-sm': '4px',
        'core-md': '8px',
        'core-lg': '12px',
      },
      boxShadow: {
        'core-card': '0 2px 8px rgba(13, 43, 85, 0.08)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-in':  'slideIn 0.35s ease-out',
        'fade-up':   'fadeInUp 0.4s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      spacing: {
        // Base 8px grid
        '4.5': '1.125rem',
        '18':  '4.5rem',
      },
    },
  },
  plugins: [],
}
