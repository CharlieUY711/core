# CORE Executive Experience — Component Tree

```
app/(marketing)/
  layout.tsx              ← dark theme, i18n provider, no auth dependency
  page.tsx                ← orquesta secciones, scroll context provider
  login/
    page.tsx              ← Supabase Auth login screen

components/experience/

  ExperienceNav.tsx       ← navbar flotante, aparece scroll ≥10%
                            language switcher, CTA "Request Access"

  sections/
    HeroSection.tsx
    FragmentationSection.tsx
    CostSection.tsx
    WhatIfSection.tsx     ← animación de convergencia (más compleja)
    FoundationSection.tsx
    EcosystemSection.tsx
    CaseParaguaySection.tsx
    CaseCardisanSection.tsx
    DifferenceSection.tsx ← Many vs One tipográfico
    GlobalSection.tsx
    VisionSection.tsx
    KnowledgeSection.tsx

  visuals/
    NetworkGraph.tsx      ← SVG + Framer Motion, prop: chaos (0.0–1.0)
    FoundationOrbit.tsx   ← orbital interactivo, hover states
    EcosystemRadial.tsx   ← 6 capabilities, active/inactive state
    LatamMap.tsx          ← SVG map, animateRoute(from, to)
    GlobeArcs.tsx         ← proyección simplificada, arc animation
    CounterStat.tsx       ← animated number counter, fetchValue? prop
    ManyOneContrast.tsx   ← tipografía animada stagger

  knowledge/
    KnowledgeSearch.tsx   ← buscador con Supabase query
    KnowledgePanel.tsx    ← side panel, slide-in animation
    KnowledgeTerm.tsx     ← badge clickeable inline en cualquier sección
    KnowledgeGrid.tsx     ← grid de términos por categoría

  ui/
    LanguageSwitcher.tsx
    CTAButton.tsx
    SectionLabel.tsx      ← "01 · Fragmentación" labels
    ScrollIndicator.tsx

lib/experience/
  i18n.ts                 ← translations object, useTranslation hook
  knowledge.ts            ← Supabase queries para términos
  scroll.ts               ← scroll progress context
  leads.ts                ← submit lead a Supabase

messages/
  es.json
  pt.json
  en.json
```

## Props críticas de componentes visuales

### NetworkGraph
```typescript
interface NetworkGraphProps {
  chaos: number       // 0 = ordenado, 1 = caótico máximo
  animated?: boolean  // activar/pausar animación
  onNodeClick?: (nodeId: string) => void
}
```

### LatamMap
```typescript
interface LatamMapProps {
  routes?: Array<{ from: string; to: string; active: boolean }>
  highlightCountries?: string[]
  onRouteComplete?: () => void
}
```

### EcosystemRadial
```typescript
interface EcosystemRadialProps {
  activeCapability?: string | null
  capabilities: CapabilityNode[]
  onCapabilityClick?: (id: string) => void
}
```

### CounterStat
```typescript
interface CounterStatProps {
  target: number
  suffix?: string       // "K", "M", "+", "B"
  duration?: number     // ms, default 1500
  fetchValue?: () => Promise<number>  // para métricas reales en fase 2
}
```
