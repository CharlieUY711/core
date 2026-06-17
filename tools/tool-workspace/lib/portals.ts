export type PortalStatus = 'live' | 'dev' | 'planned'
export type PortalAccess = 'public' | 'restricted'

export interface Portal {
  id: string
  badge: string
  nameKey: string
  descKey: string
  url: string
  status: PortalStatus
  access: PortalAccess
  version: string
}

export const portals: Portal[] = [
  {
    id: 'landing',
    badge: 'WEB',
    nameKey: 'portal_landing_name',
    descKey: 'portal_landing_desc',
    url: process.env.NEXT_PUBLIC_URL_LANDING ?? 'https://core.com.uy',
    status: 'live',
    access: 'public',
    version: 'v1.0',
  },
  {
    id: 'biblio',
    badge: 'BIB',
    nameKey: 'portal_biblio_name',
    descKey: 'portal_biblio_desc',
    url: process.env.NEXT_PUBLIC_URL_BIBLIO ?? 'http://localhost:3001',
    status: 'live',
    access: 'restricted',
    version: 'v1.0',
  },
  {
    id: 'foundation',
    badge: 'FND',
    nameKey: 'portal_foundation_name',
    descKey: 'portal_foundation_desc',
    url: process.env.NEXT_PUBLIC_URL_FOUNDATION ?? 'http://localhost:3002',
    status: 'live',
    access: 'restricted',
    version: 'v1.0',
  },
  {
    id: 'marketing',
    badge: 'MKT',
    nameKey: 'portal_marketing_name',
    descKey: 'portal_marketing_desc',
    url: process.env.NEXT_PUBLIC_URL_MARKETING ?? 'http://localhost:3003',
    status: 'live',
    access: 'restricted',
    version: 'v1.0',
  },
  {
    id: 'market',
    badge: 'MKT',
    nameKey: 'portal_market_name',
    descKey: 'portal_market_desc',
    url: process.env.NEXT_PUBLIC_URL_MARKET ?? 'http://localhost:3004',
    status: 'dev',
    access: 'restricted',
    version: 'v0.1-dev',
  },
]
