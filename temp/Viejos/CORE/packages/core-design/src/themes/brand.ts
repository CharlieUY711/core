import { colors } from '../tokens/tokens'

export const brand = {
  name:      'CORE',
  tagline:   'Global Supply. Regional Growth.',
  claim:     'Others integrate software. CORE integrates operations.',
  primary:   colors.navy,
  secondary: colors.blue,
  accent:    colors.gold,
  assets: {
    favicon:   '/favicon.svg',
    logo:      '/logo.svg',
    logoWhite: '/logo-white.svg',
    logoMark:  '/favicon.svg',
  },
  products: {
    market:        { name: 'CORE Market',        badge: 'MKT', color: colors.blue },
    logistics:     { name: 'CORE Logistics',      badge: 'LOG', color: colors.blue },
    customs:       { name: 'CORE Customs',        badge: 'CST', color: colors.gold },
    rep:           { name: 'CORE Rep',            badge: 'REP', color: colors.navy },
    directshipment:{ name: 'CORE DirectShipment', badge: 'DS',  color: colors.navyLight },
    intelligence:  { name: 'CORE Intelligence',   badge: 'INT', color: colors.blueLight },
    finance:       { name: 'CORE Finance',        badge: 'FIN', color: colors.gold },
  },
  apps: {
    biblio:        { name: 'Biblioteca CORE', badge: 'BIB' },
    foundation:    { name: 'Foundation',       badge: 'FND' },
    presentaciones:{ name: 'Presentaciones',   badge: 'DEC' },
    workspace:           { name: 'CORE workspace',         badge: 'workspace' },
  },
} as const

export type Brand = typeof brand

