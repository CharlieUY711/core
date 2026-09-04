# Rebrand Market — v1 (capa de tokens + marca)

Derivado de los specs: **Manual de Marca v1.0**, **Landing/Listado**, **Dashboard**, **Mobile**, **Second vs Gourmet**.

Cada archivo va en la **misma ruta** dentro de su repo (sobrescribir). Después: reinstalar nada, solo build normal.

## Qué cambia y por qué

El diseño de tus apps **no estaba hardcodeado por pantalla**: se gobierna por tokens
(`--c-*`) que `tool-workspace` sirve en runtime vía `/api/public/app-style`, más el
tema local de cada repo como fallback. Por eso el rebrand se hace en la capa de tokens
+ el símbolo de marca, y propaga a todas las vistas.

Marca vieja encontrada (inconsistente): "Charlie Market" naranja `#FF7A00`, dorado
`#C9A84C`, navy oscuro `#0A1F3D`, fuentes Calibri/DM Sans.
→ Reemplazada por el sistema **Market**: azul madre `#3D5689`, multirrubro, Archivo /
Archivo Black / Roboto Mono, lienzo claro `#F0EFEA`, tinta `#1C1B19`, logo **M-squircle**.

## Mapeo spec → archivo

| Archivo | Spec | Cambio |
|---|---|---|
| `market-tokens.css` | Manual de Marca | Fuente única de verdad: paleta madre + verticales + transversales + radios/sombras/fuentes + contrato `--c-*`. |
| `core-market/src/styles/brand.css` | Manual / Landing | Tokens v3 Market; nombres v2 conservados como alias (no rompe). Fuera dorado. |
| `core-market/src/styles/theme.css` | Landing / Dashboard | Sidebar/topbar navy, primario madre, lienzo claro, sin acentos dorados. |
| `core-market/src/styles/fonts.css` | Manual §04 | Importa Archivo / Archivo Black / Roboto Mono. |
| `core-market/.../brand/Brand.tsx` | Manual §01–02 | Logo **M-squircle** (antes texto naranja); precio en madre; badge Second verde. |
| `tool-dashboard/src/styles/index.css` | Dashboard | De gris/DM Sans → lienzo Market + Archivo + tokens. |
| `tool-dashboard/.../brand/Brand.tsx` | Manual §01–02 | Mismo logo/acentos Market. |
| `core-landing/app/globals.css` | Landing | Fallbacks Market para `--c-*` + Archivo. |
| `tool-workspace/.../app-style/route.ts` | Todos | `BASE_TOKENS` → Market: **toda app consumidora arranca on-brand por defecto**. |
| `tool-workspace/.../palettes/new/PaletteEditor.tsx` | Manual §03 | La paleta nueva del admin arranca con valores Market. |

## Tokens clave (referencia rápida)

- Madre `#3D5689` · hover `#46639B` · navy `#0D2B55`
- Verticales: tech `#1C6E86` · home `#A85636` · vestimenta `#7E3A70` · entret `#C2611F` · servicios `#50617F`
- Transversales: second `#2E7D57` · gourmet `#9B3326`
- Tinta `#1C1B19` · texto `#34322C`/`#56544C` · mute `#8A8678` · borde `#E4E1D8` · lienzo `#F0EFEA` · card `#FFFFFF`
- Radios: input 7 · control 9 · card 14 · Fuentes: Archivo / Archivo Black / Roboto Mono

## Lo que NO está en esta v1 (queda como siguiente paso, por pantalla)

Esto es re-layout de componentes, no solo color, y conviene hacerlo verificando cada vista:

1. **Chrome propio de `tool-workspace`** (hoy dark navy/gold): falta el flip completo a Market claro de su `globals.css`/`tailwind.config` y sus paneles inline.
2. **Anatomías exactas** de los specs: grid 4-col gap 20, panel filtros 248px, paginación, franja superior de tarjeta por contexto, KPIs con franja+pill, switch de plataforma mobile (apretado/relieve).
3. **Second vs Gourmet**: aplicar la decisión (Second = pill global transversal; Gourmet = vidriera dentro de Tienda, no pill global) en navegación/rutas.
4. **Logo como asset** (SVG/PNG) para favicons y `logo_url` del Workspace, además del componente React.

## Logos (assets reales)

Tus PNG por plataforma viven en `public/logos/`. `BrandLogo` los usa por nombre y,
si el archivo falta, dibuja la M-squircle por CSS (no rompe). Convención esperada:

`Market.png` · `Market-Tech.png` · `Market-Home.png` · `Market-Vestimenta.png` ·
`Market-Entretenimiento.png` · `Market-Servicios.png` · `Market-Second.png` · `Market-Gourmet.png`

Uso: `<BrandLogo size="lg" />` (madre) · `<BrandLogo vertical="second" />` (skin Second), etc.

Además se reemplazaron los `public/{favicon,logo,logo-white}.svg` viejos ("CORE"/"C"/"W")
por el **símbolo Market** (M blanca en squircle azul madre) para favicons y fallback SVG.
