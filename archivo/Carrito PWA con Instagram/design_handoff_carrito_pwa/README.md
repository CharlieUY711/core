# Handoff: Carrito PWA con entrada desde Instagram (core Market)

## Overview
PWA de carrito/checkout que se abre desde el link en bio / sticker de link de una
publicación de Instagram de **core Market**. Reemplaza el "carrito manual por
WhatsApp" por un checkout real integrado nativamente contra el backend existente
de core Market (Supabase: función `crear_orden_segura` vía la Edge Function
`crear-orden`). Además de catálogo/carrito/checkout, el producto final debe incluir
**registro/login de usuario** y **seguimiento de envío**, que hoy NO están
diseñados en el prototipo (ver sección "Fuera de alcance del prototipo" abajo) —
Claude debe diseñarlos e implementarlos siguiendo el mismo sistema visual.

## About the Design Files
`Carrito PWA.dc.html` es un **prototipo de referencia visual/interactivo**, hecho
en HTML/React para mostrar look & flujo — no es código de producción y no debe
copiarse tal cual. La tarea es **recrear este diseño en el entorno real de
core-market** (el framework/stack que ya usa ese codebase — a juzgar por los
nombres de archivo referenciados en el backend, `OrdenPage.tsx`, `ordenesApi.ts`,
`CarritoModule.tsx`, parece ser React/TypeScript) usando sus patrones y
componentes existentes, y conectando cada acción a la API real en vez de al
estado simulado del prototipo.

`ios-frame.jsx` es solo un bezel de iPhone usado para visualizar el prototipo — no
se traslada al producto final (que es una PWA responsive, no debe llevar un marco
de dispositivo dibujado).

## Fidelity
**Alta fidelidad de flujo e interacción, fidelidad visual media.** Layout, estados,
validaciones y textos están definidos. La paleta de color (neutros cálidos +
acento terracota) es una propuesta de este prototipo, no un sistema de marca
confirmado de core Market — si core-market ya tiene tokens de color/tipografía
definidos en su codebase, usar esos en vez de los de este prototipo.

## Integración nativa con el backend de core-market (lo más importante)
Todo dato mostrado en la PWA debe originarse en el mismo backend de core-market
(Supabase), no en datos locales/mock:

- **Catálogo**: leer productos reales desde las tablas `productos_market` /
  `productos_secondhand` (con `product_prices.price_oddy` como override de precio
  si existe — ver `crear_orden_segura` en `backend-reference/20260704_crear_orden_segura_v3.sql`),
  no la lista estática de 3 productos usada en el prototipo.
- **Autenticación**: la Edge Function `crear-orden` (`backend-reference/crear-orden.index.ts`)
  **requiere** un `Authorization` header de un usuario Supabase autenticado
  (`userClient.auth.getUser()`) — no acepta checkout anónimo hoy. Esto significa
  que el flujo de **registro/login tiene que pasar antes del checkout** (puede ser
  antes, ej. al entrar desde Instagram, o en el paso de checkout si no hay sesión).
  Confirmar con el equipo si se habilita compra como invitado (requeriría cambiar
  la función) o si login es obligatorio.
- **Crear orden**: el botón final de "Confirmar pedido" debe llamar
  `supabase.functions.invoke('crear-orden', { body: {...} })` con el mismo shape
  de body que usa el prototipo (`items`, `nombre`, `email`, `telefono`, `direccion`,
  `ciudad`, `codigo_postal`, `tipo_comprador`, `documento`, `razon_social`, y
  `origen`/`?src=` para atribuir la venta al post de Instagram de origen).
- **Pago real**: reemplazar la selección simulada de Mercado Pago/PayPal por la
  integración real de `create_preference` (mencionada en el README del backend)
  y el SDK de PayPal — la orden se crea en estado `pendiente` y pasa a pagada vía
  webhook (`mp_webhook`, `paypal-webhook`), no en el cliente.
- **Errores del backend**: mapear los mismos mensajes que ya maneja la Edge
  Function (stock insuficiente, producto no encontrado, producto pausado, RUT
  inválido) a estados de error en la UI — no inventar mensajes nuevos.
- ⚠️ **Bug de moneda conocido, no corregido**: la función real siempre escribe
  `total_uyu` sin importar `moneda`, mientras que `create_preference` sí
  distingue USD/UYU. Si hay productos en USD, revisar esto antes de exponer pagos
  reales (ver nota en `backend-reference/crear-orden-README.md`).

## Screens / Views

### 1. Entrada desde Instagram (contexto, no parte de la PWA)
- **Propósito**: mostrar de dónde viene el usuario. Un post con botón "Comprar"
  que abre la PWA con `?src=<slug>` para precargar el producto correspondiente.
- No requiere desarrollo — es solo contexto de producto (el link real vive en la
  bio/sticker de Instagram, fuera de este código).

### 2. Catálogo
- **Propósito**: ver productos y agregarlos al carrito.
- **Layout**: columna, header fijo (wordmark + botón carrito con badge de
  cantidad), lista vertical de tarjetas de producto con gap 14px.
- **Tarjeta de producto**: thumbnail 64×64 (radio 10px), nombre (14px/600),
  precio (14px, color muted), y a la derecha botón "Agregar" (si no está en el
  carrito) o stepper −/qty/+ (si ya está).
- **Datos reales**: reemplazar `catalogProducts` (hardcodeado en el prototipo)
  por fetch a Supabase de `productos_market`/`productos_secondhand` activos.

### 3. Carrito
- **Propósito**: revisar/editar cantidades antes de checkout.
- **Layout**: header con back + título, lista de items (thumb, nombre, precio
  unitario, stepper, subtotal), footer fijo con total y CTA "Continuar"
  (deshabilitado/no se muestra si el carrito está vacío).

### 4. Checkout — datos de contacto
- **Propósito**: capturar los datos que pide `crear_orden_segura`.
- **Campos**: toggle segmentado Persona/Empresa; nombre, email, teléfono,
  dirección, ciudad, código postal (siempre); razón social + RUT (12 dígitos,
  validado con regex `^\d{12}$`) solo si Empresa.
- **Validación**: nombre y email obligatorios siempre; si Empresa, razón social
  y RUT válido también obligatorios. CTA "Ir a pago" deshabilitado hasta que sea
  válido — mismas reglas que la función SQL (para no depender solo de la
  validación del backend).

### 5. Pago
- **Propósito**: elegir método de pago y confirmar.
- **Layout**: tarjetas seleccionables (radio) para Mercado Pago y PayPal +
  resumen (cantidad de artículos, total). CTA "Confirmar pedido" deshabilitado
  sin método elegido.
- **Producción**: acá se dispara la creación real de la preferencia de pago y
  se redirige al checkout del proveedor; la orden queda en estado `pendiente`
  hasta que el webhook confirme el pago.

### 6. Confirmación
- **Propósito**: cierre del flujo.
- **Layout**: check circular verde, "¡Pedido confirmado!", número de orden real
  (`order_id` que devuelve la Edge Function), lista de items con subtotal, total,
  aviso de que se va a escribir al email/teléfono con detalles de envío, CTA
  "Volver al catálogo".

## Fuera de alcance del prototipo — a diseñar/implementar
Estas dos secciones las pidió el usuario para la app final pero **no están
dibujadas en el prototipo HTML** — Claude debe diseñarlas siguiendo la misma
paleta/tipografía (neutros cálidos, acento terracota `oklch(62% 0.16 35)`,
`-apple-system` como fuente) y patrones de layout (cards blancas, radios 10–14px,
botones pill) usados en las pantallas de arriba:

- **Registro / login**: pantalla de autenticación de Supabase (email/password o
  magic link — a definir con el equipo) que deje al usuario autenticado antes del
  checkout, dado que la Edge Function exige `Authorization` header de un usuario
  real.
- **Seguimiento de envío**: pantalla que lea `ordenes.estado` (y cualquier otra
  columna de tracking que exista o se agregue) para mostrar el estado del pedido
  del usuario (ej. pendiente → confirmado → en camino → entregado). Confirmar
  con el equipo cuáles son los valores reales de `estado` que usa el backend hoy
  (la migración de referencia solo confirma el valor inicial `'pendiente'`) antes
  de construir la UI de estados.

## Interactions & Behavior
- Todas las transiciones de pantalla son instantáneas (sin animación) en el
  prototipo — está bien mantenerlo así, o agregar una transición simple
  (200–250ms ease) si el codebase ya tiene un patrón de transición de pantallas.
- Steppers de cantidad: `−` en 1 elimina el ítem del carrito.
- El toggle Persona/Empresa oculta/muestra razón social + RUT sin perder los
  demás campos ya tipeados.
- Botones deshabilitados se muestran con fondo gris (`oklch(80% 0.01 70)`) en
  vez de color de acento.

## State Management
- `screen`: catálogo | carrito | checkout | pago | confirmación (router simple).
- `cart`: mapa `productId → cantidad`.
- `buyerType`: persona | empresa.
- `form`: nombre, email, telefono, direccion, ciudad, codigoPostal, razonSocial,
  documento.
- `paymentMethod`: mercadopago | paypal.
- `order`: resultado de `crear-orden` (id real, items, total) tras confirmar.
- En producción, sumar: sesión de usuario (Supabase auth) y datos de tracking
  del pedido.

## Design Tokens
- **Colores**: fondo `oklch(96–98% 0.005–0.01 80)`; texto principal
  `oklch(20% 0.01 70)`; texto muted `oklch(40–45% 0.01 70)`; bordes
  `oklch(88–91% 0.01 70)`; acento primario `oklch(62% 0.16 35)` (terracota);
  éxito/confirmación `oklch(58% 0.13 155)` (verde).
- **Tipografía**: `-apple-system, "SF Pro", system-ui, sans-serif`; tamaños 12–20px;
  pesos 400/600/700.
- **Radios**: 10px (inputs), 14px (cards), 100px (pills/botones/badges).
- **Espaciado**: gaps de 8–14px entre elementos relacionados, 20–24px de padding
  de pantalla.

## Assets
Sin imágenes reales — los placeholders de producto son rayados diagonales
generados por CSS (`repeating-linear-gradient`), a reemplazar por fotos reales
de producto desde el backend.

## Files
- `Carrito PWA.dc.html` — prototipo completo (todas las pantallas).
- `ios-frame.jsx` — bezel usado solo para visualizar el prototipo (no se lleva a producción).
- `backend-reference/` — código y migraciones reales del backend de core-market
  que definen el contrato de datos: `crear-orden.index.ts` (Edge Function),
  `20260703_ordenes_persona_empresa.sql` y `20260704_crear_orden_segura_v3.sql`
  (función `crear_orden_segura` y columnas de `ordenes`), y
  `crear-orden-README.md` (notas y bug conocido de moneda).
