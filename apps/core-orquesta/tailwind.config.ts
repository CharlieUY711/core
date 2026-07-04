import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/core/shell/src/**/*.{ts,tsx}',
  ],
  presets: [
    // Hereda tokens de color, tipografía y espaciado de BEP
    require('@core/bep-config/tailwind.preset'),
  ],
}

export default config
