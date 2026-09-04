# CORE Executive Experience — Sistema de Diseño

## Paleta de Color
```
Void:     #0A0A0A  (fondo principal)
Deep:     #141414  (fondo secundario)
Surface:  #1E1E1E  (superficies elevadas)
Raised:   #2A2A2A  (cards, paneles)
White:    #FFFFFF  (texto principal, acento supremo)
Muted:    #9B9B9B  (texto secundario)
Subtle:   #E8EAF0  (texto terciario)
Signal:   #4A90E8  (activaciones, hovers)
Danger:   #D14520  (fragmentación — usar con precisión)
Confirm:  #2E7D32  (flujos CORE exitosos)
```

Regla: La experiencia vive en el mundo oscuro.
El blanco es el acento supremo. El azul Signal
solo para activación/hover. El rojo solo en S01-S02.

## Tipografía
```
Fuente: Inter o Geist
Display:   72px / weight 300 / tracking -0.02em
Headline:  48px / weight 400 / tracking -0.01em
Title:     28px / weight 400
Body:      16px / weight 300 / line-height 1.7
Label:     12px / weight 500 / tracking 0.1em / uppercase
```

Regla: No existe bold mayor a 500.
La jerarquía se logra con tamaño y espaciado, no con peso.

## Motion

### Principios
- Scroll-triggered: cada elemento anima al entrar al viewport
- Convergencia/divergencia: caos = dispersión, orden = convergencia
- Easing: easeOutExpo para entradas, easeInOutQuart para transiciones
- Duración: 300–800ms. Máximo 1.2s para transiciones de sección
- Stagger: 80–120ms entre elementos del mismo grupo
- prefers-reduced-motion: siempre respetado con fallbacks

### Animaciones por sección
| Sección | Técnica | Timing |
|---------|---------|--------|
| Hero entry | fadeIn | 600ms · delay 200ms |
| Nodos caos (S01) | staggerChildren | 80ms · scroll-triggered |
| Conexiones rotas | pathLength 0→1 | 400ms · easeInOut · dashedStroke |
| CONVERGENCIA (S03) | todos los nodos → center | spring stiffness:60 |
| Foundation orbit | rotate continuo | 40s · pausa en hover |
| Ecosystem activate | scale + glow ring | 200ms |
| Route draw (S06) | SVG pathLength 0→1 | 1.2s easeOut |
| Many→One (S08) | text stagger + crossout | 60ms stagger |
| Globe arcs (S09) | arc draw por continente | stagger |
| Counters (S10) | 0 → valor final | 1.5s easeOut |
| Knowledge panel | slideInRight spring | — |

## Lenguaje Visual por Capacidad

### CORE Foundation
- ✓ Centro de gravedad. Geometría radial. Luz que irradia.
- ✗ Íconos de base de datos. Servers. Cloud symbols.

### CORE Market
- ✓ Flujos comerciales. Oferta y demanda como fuerzas.
- ✗ Carrito de compras. Screenshots de marketplace.

### CORE Logistics
- ✓ Rutas sobre mapa. Nodos territoriales. Densidad de red.
- ✗ Camiones. Flechas genéricas.

### CORE Rep
- ✓ Marcas como nodos. Canales como conexiones.
- ✗ Vendedores. Personas. CRM screenshots.

### CORE Finance
- ✓ Flujos de capital. Liquidez como movimiento.
- ✗ Billetes. Bancos. Gráficos de barras genéricos.

### CORE Intelligence
- ✓ Patrones que emergen. Señal vs ruido.
- ✗ Dashboards. Gráficos de torta. Métricas flotando.

### CORE DirectShipment
- ✓ Línea directa origen-destino. Velocidad como geometría.
- ✗ Íconos de paquetes. Cadenas logísticas multicapa.

### Fragmentación (S01)
- ✓ Nodos desconectados. Líneas que no llegan.
- ✗ Logos de terceros. Screenshots de integrations.

## Iconografía
- Sin íconos decorativos. Los íconos solo si son funcionales.
- No usar íconos de módulos/features.
- Las secciones se identifican por tipografía y visual, no por íconos.

## NO usar
- Stock photos
- Logos de terceros (Salesforce, SAP, ML, etc.)
- Videos
- Gradients decorativos
- Bordes redondeados exagerados
- Sombras flotantes
- Glassmorphism
- "Futuristic sci-fi" aesthetics
