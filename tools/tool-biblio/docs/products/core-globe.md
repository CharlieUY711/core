# CORE — core-globe (Paquete Oficial)

**ID:** `CORE-PM-PRODUCT-GLOBE-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno

---

## 1. Descripción General

`core-globe` es el package compartido del Globe Experience del ecosistema CORE. Es un componente visual de tipo UI que renderiza el globo interactivo 3D que representa operaciones en tiempo real, rutas logísticas y expansión regional.

Su propósito es centralizar toda la lógica visual del globo en un único paquete reutilizable, consumible por cualquier app del monorepo sin duplicar código.

Dentro del ecosistema cumple tres roles:

- **Visual:** es el elemento más distintivo de la marca CORE. Transmite operaciones globales, conectividad regional y expansión.
- **Técnico:** package compartido en `packages/core-globe`, consumible por `core-landing`, la Biblioteca y futuras apps.
- **Estratégico:** representa visualmente la presencia de CORE en 5 países activos y la expansión planificada a 10 países para 2030.

Su relación con otros productos:

| Producto | Relación |
|----------|----------|
| `core-landing` | Consumidor principal — renderiza el globo en el Hero |
| `Biblioteca` | Consumidor secundario — puede integrarse en página de inicio o arquitectura |
| `core-ui` (futuro) | El globe podría formar parte del sistema de componentes compartidos |

---

## 2. Arquitectura Funcional

### Tipo de paquete

Package UI/visual. Exporta un componente React que renderiza el globo 3D usando Three.js.

### Importación desde apps

```ts
import { CoreGlobe } from '@core/globe'
```

Requiere que `packages/core-globe` esté declarado en `pnpm-workspace.yaml` y referenciado en el `package.json` de la app consumidora:

```json
{
  "dependencies": {
    "@core/globe": "workspace:*"
  }
}
```

### Renderizado

El componente se renderiza en el cliente (browser). En Next.js debe importarse con carga dinámica para evitar errores de SSR:

```tsx
import dynamic from 'next/dynamic'

const CoreGlobe = dynamic(
  () => import('@core/globe').then(m => m.CoreGlobe),
  { ssr: false }
)
```

### Props (pendiente de documentar)

La API de props está pendiente de definir formalmente. Props típicas esperadas:

| Prop | Tipo | Descripción | Requerida |
|------|------|-------------|-----------|
| `routes` | `Route[]` | Rutas a mostrar en el globo | ⬜ Opcional |
| `hubs` | `Hub[]` | Hubs logísticos activos | ⬜ Opcional |
| `mode` | `'day' \| 'night' \| 'auto'` | Modo visual del globo | ⬜ Opcional |
| `autoRotate` | `boolean` | Rotación automática | ⬜ Opcional |
| `activeCountries` | `string[]` | Códigos de países activos | ⬜ Opcional |

> Documentar props reales una vez que `src/` esté auditado.

### Animaciones y modos

| Elemento | Comportamiento definido |
|----------|------------------------|
| Rotación | Suave y constante, velocidad adaptativa |
| Rutas | Líneas animadas por arco entre países |
| Grosor de rutas | Proporcional al volumen de operaciones |
| Color de rutas | Azul=logística · Oro=rep · Verde=market |
| Hubs | Puntos brillantes con animación pulsante |
| Tamaño de hubs | Proporcional al nivel de actividad |
| Modo día/noche | Basado en UTC, gradiente dinámico |
| Iluminación | Ciudades principales iluminadas en modo noche |

### Capas del globo

| Capa | Contenido |
|------|-----------|
| 1 — Base | Continentes, límites, relieve mínimo |
| 2 — Países CORE | Uruguay, Brasil, Paraguay, Argentina, Chile |
| 3 — Rutas | Cross-border, última milla, distribución regional |
| 4 — Actividad | Envíos, inventarios, transacciones en tiempo real |

### Integración con Next.js

- Requiere carga dinámica con `ssr: false`
- Compatible con App Router de Next.js 14+
- No genera contenido para SSR ni SSG

### Integración con Design System

- Colores del globo alineados con tokens CORE: `--color-navy`, `--color-blue`, `--color-gold`
- Referencia: `CORE_DesignSystem_v1.0.docx` — Capítulo 06 Animaciones

---

## 3. Dependencias Principales

| Dependencia | Propósito | Estado |
|-------------|-----------|--------|
| `react` | Componente UI | ✅ Declarado |
| `typescript` | Tipado estático | ✅ Declarado |
| `three` | Renderizado 3D del globo | ⬜ Pendiente de verificar en `src/` |

> No se listan dependencias no confirmadas en `package.json` real de `packages/core-globe`.

---

## 4. Variables de Entorno

Este paquete no gestiona variables de entorno directamente. Las variables relacionadas con el globo son responsabilidad de la app consumidora.

Variables relacionadas declaradas en la app:

| Variable | App | Descripción |
|----------|-----|-------------|
| `NEXT_PUBLIC_GLOBE_API_URL` | `core-landing` | URL de la API que alimenta datos del globo |
| `NEXT_PUBLIC_GLOBE_REFRESH_INTERVAL` | `core-landing` | Intervalo de actualización en ms |

Referencia completa: `docs/env/CORE-ENV.md`

---

## 5. Integración con Apps

### Con `core-landing`

- Consumidor principal del paquete
- El globo se renderiza en la sección Hero
- `core-landing` provee los datos (rutas, hubs, países activos)
- `core-globe` solo renderiza — no fetcha datos directamente

### Con futuras apps

- Cualquier app del monorepo puede importar `@core/globe`
- La Biblioteca puede integrarlo en la página de inicio
- El dashboard operativo (CORE Dashboard) puede usarlo para visualizar operaciones en tiempo real

### Responsabilidades del paquete

✅ Renderizar el globo 3D  
✅ Gestionar animaciones y modos visuales  
✅ Exponer API de props para configuración  
✅ Optimizar performance de renderizado WebGL  

### Responsabilidades que NO tiene

❌ Fetchear datos de operaciones  
❌ Gestionar autenticación  
❌ Manejar estado global de la app  
❌ Definir estilos de layout o posicionamiento externo  

---

## 6. Estado Actual del Paquete

### Completo

- [x] Carpeta `packages/core-globe/` creada en monorepo
- [x] `package.json` con nombre del paquete
- [x] `tsconfig.json` configurado
- [x] Carpeta `src/` presente

### En progreso

- [ ] Auditoría del contenido de `src/`
- [ ] Definición formal de la API de props

### Pendiente

- [ ] Documentación de props
- [ ] Integración en `core-landing`
- [ ] Integración en Biblioteca
- [ ] Build configurado en `turbo.json`
- [ ] Exportaciones declaradas en `index.ts`
- [ ] README del paquete

### Planificado

- [ ] Datos del globo conectados a API real
- [ ] Modo día/noche automático por UTC
- [ ] Optimización para mobile
- [ ] Tests unitarios

---

## 7. Checklist del Paquete

### Setup

- [x] Package creado en monorepo
- [x] `package.json` con nombre `@core/globe`
- [x] `tsconfig.json` presente
- [ ] Declarado en `pnpm-workspace.yaml`
- [ ] Build task en `turbo.json`
- [ ] `index.ts` con exportaciones declaradas
- [ ] `.env.example` si aplica

### Código

- [ ] Auditoría de `src/` completada
- [ ] Componente principal exportado
- [ ] Props tipados con TypeScript
- [ ] Carga dinámica documentada para Next.js

### Documentación

- [ ] `README.md` del paquete creado
- [ ] Props documentados
- [ ] Ejemplos de uso incluidos
- [ ] `docs/products/core-globe.md` completo (este documento)

### Calidad

- [ ] Performance de WebGL optimizado
- [ ] Optimización para mobile
- [ ] Animaciones con `prefers-reduced-motion`
- [ ] Tests unitarios básicos

### Integración

- [ ] Integrado en `core-landing`
- [ ] Integrado en Biblioteca
- [ ] Integración con `core-ui` evaluada (futuro)

---

## 8. Roadmap del Paquete

### Fase 1 — MVP (Q2–Q3 2026)

- Componente funcional con rotación y países activos
- Integración en `core-landing` Hero
- Props básicos: `activeCountries`, `autoRotate`, `mode`

### Fase 2 — Mejoras visuales (Q4 2026)

- Rutas animadas con color por vertical
- Hubs pulsantes con tamaño por actividad
- Modo día/noche automático por UTC
- Optimización de performance WebGL

### Fase 3 — Datos reales (2027)

- Conexión con API de operaciones de CORE
- Rutas y hubs actualizados en tiempo real
- Visualización de inventarios globales
- Mapa de calor comercial

### Fase 4 — Expansión (2028+)

- Nuevos países al activarse (Perú, Colombia, México, Bolivia)
- Simulación de demanda
- Predicción de rutas
- Mapa de expansión 2030–2035
- Optimización completa para mobile

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |

---

*CORE — core-globe · v1.0 · Junio 2026 · Confidencial — Uso interno*
