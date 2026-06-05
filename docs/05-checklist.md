# CORE Executive Experience — Checklist Maestro

Repo: https://github.com/CharlieUY711/core-presentaciones
Local: C:\CORE\apps\core-presentaciones

---

## FASE 0 — Setup inicial
- [ ] Crear repo en GitHub: CharlieUY711/core-presentaciones
- [ ] git clone en C:\CORE\apps\core-presentaciones
- [ ] npx create-next-app@latest con TypeScript + Tailwind + App Router
- [ ] Instalar dependencias: framer-motion, @supabase/supabase-js, @supabase/auth-helpers-nextjs
- [ ] Configurar .env.local con SUPABASE_URL y SUPABASE_ANON_KEY
- [ ] Configurar tailwind.config con paleta CORE (colores del design system)
- [ ] Configurar globals.css con CSS variables del tema oscuro
- [ ] Crear estructura de carpetas: app/(marketing)/, app/(platform)/, components/experience/, lib/experience/, messages/
- [ ] Primer commit y push

---

## FASE 1 — Auth y Login
- [ ] Configurar Supabase Auth en el proyecto
- [ ] Crear middleware.ts con protección de rutas
- [ ] Crear app/(marketing)/login/page.tsx (pantalla oscura, solo email/password)
- [ ] Crear usuarios de prueba en Supabase (equipo interno)
- [ ] Testear flujo login → redirige a experiencia
- [ ] Testear ruta sin sesión → redirige a /login

---

## FASE 2 — Base estructural de la experiencia
- [ ] Crear app/(marketing)/layout.tsx (dark theme provider, i18n context)
- [ ] Crear app/(marketing)/page.tsx (orquestador de secciones)
- [ ] Crear scroll context (lib/experience/scroll.ts)
- [ ] Crear i18n básico (lib/experience/i18n.ts + messages/es.json)
- [ ] Crear ExperienceNav.tsx (navbar flotante)
- [ ] Crear LanguageSwitcher.tsx
- [ ] Crear CTAButton.tsx
- [ ] Deploy preview en Vercel (o local)

---

## FASE 3 — Supabase tablas
- [ ] Crear tabla exp_knowledge_terms en Supabase
- [ ] Crear tabla exp_leads en Supabase
- [ ] Poblar exp_knowledge_terms con los 25 términos iniciales (ES/PT/EN)
- [ ] Crear lib/experience/knowledge.ts (queries)
- [ ] Crear lib/experience/leads.ts (insert)
- [ ] Testear queries desde Next.js

---

## FASE 4 — Secciones: Acto I (El Problema)
- [ ] HeroSection.tsx — CORE + tagline + red de nodos
- [ ] NetworkGraph.tsx — SVG animado, prop chaos (0–1)
- [ ] FragmentationSection.tsx — nodos con scroll-triggered chaos
- [ ] CostSection.tsx — stat cards animadas
- [ ] Textos ES/PT/EN para Acto I en messages/

---

## FASE 5 — Secciones: Acto II (La Solución)
- [ ] WhatIfSection.tsx — animación de convergencia (el giro)
- [ ] FoundationSection.tsx
- [ ] FoundationOrbit.tsx — orbital interactivo
- [ ] EcosystemSection.tsx
- [ ] EcosystemRadial.tsx — 6 capacidades
- [ ] Textos ES/PT/EN para Acto II en messages/

---

## FASE 6 — Secciones: Acto III (La Evidencia)
- [ ] LatamMap.tsx — SVG mapa LATAM
- [ ] CaseParaguaySection.tsx — flujo animado PY→UY
- [ ] CaseCardisanSection.tsx — expansión LATAM
- [ ] DifferenceSection.tsx — Many vs One tipográfico
- [ ] ManyOneContrast.tsx — animación stagger
- [ ] GlobeArcs.tsx — mapa mundial con arcos
- [ ] GlobalSection.tsx
- [ ] VisionSection.tsx — CounterStat x4
- [ ] CounterStat.tsx
- [ ] Textos ES/PT/EN para Acto III en messages/

---

## FASE 7 — Knowledge Base
- [ ] KnowledgeSection.tsx — sección final con buscador
- [ ] KnowledgeSearch.tsx — query a Supabase
- [ ] KnowledgePanel.tsx — side panel slide-in
- [ ] KnowledgeTerm.tsx — badge clickeable inline
- [ ] KnowledgeGrid.tsx — grid por categorías
- [ ] Validar que todos los términos del storyboard son clickeables

---

## FASE 8 — i18n completo
- [ ] Completar messages/es.json con TODOS los textos
- [ ] Completar messages/pt.json con terminología nativa BR
- [ ] Completar messages/en.json
- [ ] Testear switching en cada sección
- [ ] Validar Knowledge Base en los 3 idiomas

---

## FASE 9 — Polish y QA
- [ ] Revisar todas las animaciones en desktop
- [ ] Revisar todas las animaciones en mobile
- [ ] Implementar prefers-reduced-motion en todos los componentes
- [ ] Revisar contraste y legibilidad en dark mode
- [ ] Testear login flow completo
- [ ] Testear captura de leads
- [ ] Revisar SEO meta tags
- [ ] Revisar performance (Lighthouse ≥ 90)
- [ ] Cross-browser: Chrome, Safari, Firefox
- [ ] Review final del copy en los 3 idiomas

---

## FASE 10 — Deploy
- [ ] Configurar variables de entorno en Vercel/hosting
- [ ] Deploy staging — validar con equipo
- [ ] Ajustes post-validación
- [ ] Deploy producción
- [ ] Configurar dominio
- [ ] Testear en producción

---

## Orden sugerido para esta noche (validación rápida)
1. FASE 0 completa → repo funcionando
2. FASE 1 → login funcionando
3. FASE 4 parcial → Hero + Fragmentación (para mostrar la dirección visual)
4. FASE 5 parcial → WhatIf (el giro) + Foundation
5. Knowledge Base básica con 5–10 términos

Con eso es suficiente para validar la dirección completa del proyecto.
