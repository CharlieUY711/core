# CoreGlobe — Comparación de enfoques de implementación

## A. Canvas 2D (implementado en CoreGlobe.tsx)

**Ventajas**
- Sin dependencias externas → bundle size 0 KB extra
- Control total del renderizado frame a frame
- Fácil de debuggear (todo en drawFrame)
- Performance consistente en hardware moderno
- Drag + inertia con física propia
- Compatible con Next.js SSR (canvas solo en useEffect)

**Desventajas**
- Todo el código de proyección es manual (lat/lng → pantalla)
- Sin soporte nativo de picking (hay que calcular hit-test a mano)
- Más código que Three.js para efectos avanzados (bloom, refraction)
- Anti-aliasing manual requerido en líneas diagonales

**Complejidad**: Media  
**Performance**: Excelente en desktop/mobile (60fps con 20 rutas)  
**Bundle add**: 0 KB  
**SSR**: Seguro (useEffect)

---

## B. react-three-fiber (Three.js)

```bash
npm install three @react-three/fiber @react-three/drei
```

```tsx
// components/CoreGlobeThree.tsx
"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => { if (meshRef.current) meshRef.current.rotation.y += 0.002; });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial color="#0D1B38" wireframe={false} />
    </mesh>
  );
}

export function CoreGlobeThree() {
  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[-2, 2, 2]} intensity={0.8} color="#00E5FF" />
      <GlobeMesh />
      {/* Rutas como THREE.CatmullRomCurve3 */}
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
```

**Ventajas**
- Efectos 3D reales: bloom, refraction, depth-of-field (post-processing)
- Arc rendering con CatmullRomCurve3 nativo
- OrbitControls listo para uso con inertia
- Shaders GLSL para efectos únicos (atmosphere glow)
- Perfecta para experiencias "wow" tipo Stripe Globe

**Desventajas**
- ~750 KB extra (three.js + fiber + drei)
- Curva de aprendizaje alta para shaders
- Más difícil integrar con Canvas 2D (texto, tooltips HTML)
- SSR requiere `dynamic(() => ..., { ssr: false })`
- Performance en dispositivos de gama baja puede caer

**Complejidad**: Alta  
**Performance**: Excelente en WebGL / limitada en iOS Safari < 16  
**Bundle add**: ~750 KB  
**SSR**: Solo con dynamic import

---

## C. SVG animado

```tsx
// components/CoreGlobeSVG.tsx
// Solo para casos donde Canvas/WebGL no es opción (email, PDF, thumbnails)

export function CoreGlobeSVG() {
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g">
          <stop offset="0%" stopColor="#122554" />
          <stop offset="100%" stopColor="#07101E" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Globe base */}
      <circle cx="200" cy="200" r="160" fill="url(#g)" />
      <circle cx="200" cy="200" r="160" fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeOpacity="0.3" />

      {/* Graticule */}
      <ellipse cx="200" cy="200" rx="160" ry="50" fill="none" stroke="#0EA5E9" strokeWidth="0.5" strokeOpacity="0.2" />

      {/* Route — animated dash */}
      <path
        d="M 120 100 Q 160 140 192 196"
        fill="none" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="6 4"
        filter="url(#glow)"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Uruguay hub — pulse */}
      <circle cx="196" cy="200" r="24" fill="none" stroke="#F5C26B" strokeWidth="1">
        <animate attributeName="r" values="10;22;10" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="196" cy="200" r="7" fill="#fff" filter="url(#glow)" />
      <circle cx="196" cy="200" r="3.5" fill="#F5C26B" />
    </svg>
  );
}
```

**Ventajas**
- Funciona en SSR sin dynamic import
- Ninguna dependencia
- Escala perfectamente (vector)
- Compatible con accesibilidad (role="img", title, desc)
- Ideal para versión estática mobile

**Desventajas**
- Sin proyección esférica real (no rota en 3D)
- Animaciones CSS limitadas vs Canvas
- No hay interactividad de hover/click granular
- DOM pesado con muchas rutas (>20 paths)
- No transmite la ilusión de globo 3D

**Complejidad**: Baja  
**Performance**: Excelente (GPU-accelerated CSS transforms)  
**Bundle add**: 0 KB  
**SSR**: Nativo

---

## Recomendación por caso de uso

| Caso                          | Enfoque         |
|-------------------------------|-----------------|
| Landing hero desktop          | **Canvas 2D**   |
| Landing hero con bloom/shaders | Three.js        |
| Mobile < 640px                | SVG estático    |
| Email / PDF / thumbnail       | SVG estático    |
| Performance crítica           | Canvas 2D       |
| Máximo impacto visual         | Three.js        |

---

## Estructura de datos — JSON de rutas y hubs

```typescript
// types/globe.ts

export interface Hub {
  id:       string;   // "uy", "cn", "nl"
  name:     string;   // "Uruguay"
  role:     string;   // "HQ · Hub principal"
  lat:      number;   // -33
  lng:      number;   // -56
  r:        number;   // radio visual (px lógicos)
  color:    string;   // "#F5C26B"
  layer:    "cono" | "origins" | "expansion" | "direct";
  primary?: boolean;  // hub central (Uruguay)
}

export interface Route {
  from:    string;    // hub id
  to:      string;    // hub id
  color:   string;    // "#00E5FF"
  width:   number;    // stroke en px
  speed:   number;    // 0.003–0.008 (velocidad de animación)
  layer:   "origins" | "cono" | "direct" | "expansion";
  glow?:   boolean;   // bloom effect
  dashed?: boolean;   // para expansion (futuro)
}
```

---

## Estrategia mobile

```tsx
// app/page.tsx — uso recomendado

import dynamic from "next/dynamic";
import { CoreGlobeStatic } from "@/components/CoreGlobe";

// Solo carga el canvas en cliente, con fallback estático
const CoreGlobe = dynamic(
  () => import("@/components/CoreGlobe").then(m => m.CoreGlobe),
  {
    ssr: false,
    loading: () => <CoreGlobeStatic />,  // SSR + mobile fallback
  }
);

// En el Hero:
<div className="hidden sm:block">   {/* Canvas en desktop */}
  <CoreGlobe
    activeLayer="all"
    autoRotate
    highlightCountry="uy"
    onHubClick={(hub) => console.log(hub)}
  />
</div>
<div className="sm:hidden">         {/* SVG estático en mobile */}
  <CoreGlobeStatic />
</div>
```
