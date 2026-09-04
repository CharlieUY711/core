# ROADMAP-001-FOUNDATION

**Fase:** Foundation — Consolidación de paquetes base
**Ecosistema:** CORE (monorepo pnpm + Vercel)
**Depende de:** `ROADMAP-000-FOUNDATION` (aprobado)
**Estado del documento:** Especificación técnica para aprobación
**Autor del rol:** Principal Software Architect
**Versión:** 0.1.0

---

## Propósito de la fase

Consolidar y dejar en estado canónico los siete paquetes base sobre los que se construyen todas las aplicaciones del ecosistema CORE. Esta fase no entrega features de usuario: entrega **contratos estables, fronteras claras y un grafo de dependencias sano** para que las apps (`core-market`, `core-dashboard`, `core-roadmap`, futuras) consuman los paquetes mediante `workspace:*` sin acoplamientos indebidos ni duplicación.

**Alcance:** `@core-design`, `@core-i18n`, `@core-bep-supabase`, `@core-ui`, `@core-auth`, `@core-apivault`, `@core-shell`.

**Fuera de alcance:** lógica de negocio de aplicaciones, modelo de datos de productos (eso vive en cada app o en paquetes de dominio), e infraestructura nueva.

---

## Nota de método sobre "Estado actual"

Este documento define la **línea base canónica objetivo** de cada paquete. Donde se indica "Estado actual" se asume una línea base razonable que **debe verificarse contra el repositorio** mediante la acción de auditoría incluida en cada paquete. Cualquier divergencia entre lo asumido aquí y lo que exista en `C:\CORE\packages\*` se resuelve a favor de este contrato (o se documenta como excepción justificada).

---

## Grafo de dependencias (capas)

Los paquetes se ordenan en capas. Una capa sólo puede depender de capas inferiores. Está **prohibida cualquier dependencia ascendente o circular**.

```mermaid
graph TD
    %% Capa 0 - Hojas
    DESIGN[@core-design]
    I18N[@core-i18n]
    BEP[@core-bep-supabase]

    %% Capa 1
    UI[@core-ui]
    AUTH[@core-auth]

    %% Capa 2
    VAULT[@core-apivault]

    %% Capa 3 - Tope
    SHELL[@core-shell]

    UI --> DESIGN
    UI --> I18N
    AUTH --> BEP
    VAULT --> BEP
    VAULT --> AUTH
    SHELL --> UI
    SHELL --> DESIGN
    SHELL --> I18N
    SHELL --> AUTH
```

| Capa | Paquetes | Naturaleza |
|---|---|---|
| 0 (hojas) | `@core-design`, `@core-i18n`, `@core-bep-supabase` | No dependen de otros paquetes CORE |
| 1 | `@core-ui`, `@core-auth` | Dependen sólo de capa 0 |
| 2 | `@core-apivault` | Depende de capa 0 y 1 |
| 3 (tope) | `@core-shell` | Orquesta el resto |

Regla de oro de la fase: **el grafo debe permanecer acíclico y respetar el orden de capas.**

---

## @core-design

**Estado actual (línea base asumida — verificar):** existe como fuente de tokens visuales; posible riesgo de tokens duplicados o valores hardcodeados en las apps que lo bypassean.

**Responsabilidad:** ser la única fuente de verdad del lenguaje visual del ecosistema. Define tokens de diseño (color, tipografía, espaciado, radios, sombras, breakpoints, z-index) y el contrato de tema (claro/oscuro, branding por tenant para SaaS). No contiene componentes ni lógica.

**Dependencias:** ninguna (paquete hoja).

**Contratos:**
- Conjunto de tokens semánticos estable y versionado (nombres semánticos, no valores crudos: `color.surface.default`, no `#FFFFFF`).
- Contrato de tema: estructura de un tema válido y mecanismo de override por tenant.
- Exposición de tokens como variables CSS y como objeto tipado para consumo programático.

**API pública (canónica):**
- Exportación de tokens tipados.
- Definición y tipos de tema; tema por defecto del ecosistema.
- Utilidades de resolución de token → valor.

**Riesgos:**
- Tokens hardcodeados en apps que evaden el sistema (deriva visual).
- Cambios de token sin versionado que rompen apps silenciosamente.
- Acoplar branding de un tenant específico dentro del paquete base.

**Acciones necesarias:**
1. Auditar el paquete real y catalogar todos los tokens existentes.
2. Detectar y listar valores visuales hardcodeados en `apps/*` que deberían usar tokens.
3. Establecer naming semántico y política de versionado (semver) para tokens.
4. Documentar el contrato de tema y el override por tenant (preparación SaaS).

**Criterios de finalización:**
- Catálogo de tokens publicado y semánticamente nombrado.
- Cero valores visuales hardcodeados críticos en las apps consumidoras (o lista de excepciones aprobada).
- Contrato de tema documentado y consumible por `@core-ui` y `@core-shell`.

---

## @core-i18n

**Estado actual (línea base asumida — verificar):** provee internacionalización; riesgo de claves faltantes y de namespaces sin convención clara entre apps.

**Responsabilidad:** proveer el sistema de internacionalización y localización del ecosistema: carga de locales, función de traducción, formateo de fechas/números/monedas, y cambio de idioma en runtime. Habilitador clave de la estrategia SaaS internacional.

**Dependencias:** ninguna (paquete hoja).

**Contratos:**
- Convención de namespaces de claves por dominio/app (`common.*`, `roadmap.*`, `market.*`).
- Contrato de proveedor de idioma (locale activo, fallback, lista de locales soportados).
- Contrato de formateo regional (fechas, números, moneda).

**API pública (canónica):**
- Proveedor/contexto de i18n.
- Función de traducción con soporte de interpolación y pluralización.
- Selector/cambiador de locale en runtime.
- Utilidades de formato regional.

**Riesgos:**
- Claves faltantes que degradan la UI a texto crudo.
- Colisión de namespaces entre apps.
- Locales cargados de forma no perezosa (bundle pesado).

**Acciones necesarias:**
1. Auditar locales y claves existentes; medir cobertura por idioma.
2. Establecer convención de namespaces y proceso para agregar claves.
3. Definir estrategia de carga perezosa por locale.
4. Definir política de fallback y detección de claves faltantes en CI.

**Criterios de finalización:**
- Convención de namespaces aprobada y aplicada.
- Cobertura de traducción medida y umbral mínimo definido.
- Carga perezosa de locales verificada.
- Chequeo de claves faltantes integrable en CI.

---

## @core-bep-supabase

**Estado actual (línea base asumida — verificar):** capa de acceso a Supabase; riesgo crítico de exposición de claves de servicio y de queries no RLS-aware.

**Responsabilidad:** ser la **única** capa de acceso a Supabase del ecosistema (Backend Endpoint Provider). Provee el cliente tipado, el patrón de queries, la invocación de Edge Functions y la suscripción a Realtime. Ninguna app ni paquete debe instanciar el cliente Supabase por su cuenta.

**Dependencias:** SDK de Supabase (externo). Ningún paquete CORE (hoja).

**Contratos:**
- Factory de cliente (separando cliente de navegador con clave anon de cliente de servidor con clave de servicio).
- Tipos generados del esquema de base de datos como contrato compartido.
- Contrato de invocación de Edge Functions.
- Contrato de suscripción Realtime.
- Garantía de operación RLS-aware: el cliente de navegador opera siempre bajo la sesión del usuario.

**API pública (canónica):**
- Creación de cliente (browser / server) con la configuración correcta de claves.
- Acceso tipado a tablas y RPCs.
- Invocador de Edge Functions.
- Helpers de Realtime.

**Riesgos:**
- **Crítico:** clave de servicio expuesta al frontend.
- Esquema desincronizado de los tipos generados (drift).
- Punto único de fallo: un error aquí afecta a todo el ecosistema.
- Bypass: una app instancia su propio cliente y rompe la garantía RLS.

**Acciones necesarias:**
1. Auditar dónde y cómo se instancia hoy el cliente Supabase en el monorepo; eliminar instanciaciones fuera de este paquete.
2. Establecer la separación estricta browser/server y verificar que las claves de servicio nunca lleguen al bundle de cliente.
3. Definir pipeline de generación de tipos desde el esquema y su sincronización.
4. Documentar contratos de Edge Functions y Realtime.

**Criterios de finalización:**
- Única fuente de instanciación del cliente confirmada (cero bypass).
- Clave de servicio nunca presente en bundles de cliente (verificado).
- Tipos del esquema generados y sincronizados.
- Contratos de Edge Functions y Realtime documentados.

---

## @core-ui

**Estado actual (línea base asumida — verificar):** biblioteca de componentes; riesgo de componentes con lógica de negocio embebida y de estilos que no consumen tokens.

**Responsabilidad:** proveer la biblioteca de componentes de interfaz reutilizables, accesibles y temables. Consume tokens de `@core-design` y textos de `@core-i18n`. No contiene lógica de negocio ni acceso a datos.

**Dependencias:** `@core-design` (tokens/tema), `@core-i18n` (textos de componentes localizables).

**Contratos:**
- Contrato de props por componente (estable, versionado).
- Cumplimiento de accesibilidad (roles, foco, teclado, contraste).
- Theming exclusivamente vía tokens de `@core-design` (sin valores crudos).

**API pública (canónica):**
- Catálogo de componentes (primitivos y compuestos) con props tipadas.
- Componentes de layout reutilizables.
- Hooks/utilidades de UI sin estado de negocio.

**Riesgos:**
- Lógica de negocio o llamadas a datos filtradas dentro de componentes.
- Estilos que no usan tokens (deriva visual).
- Props inestables que rompen apps al actualizar.

**Acciones necesarias:**
1. Auditar el catálogo de componentes y clasificar cuáles tienen lógica indebida.
2. Verificar que todo el theming pase por `@core-design`.
3. Establecer baseline de accesibilidad y política de versionado de props.
4. Documentar el catálogo (idealmente con un entorno de componentes aislado).

**Criterios de finalización:**
- Catálogo documentado con props estables.
- Cero lógica de negocio/acceso a datos en componentes.
- Theming 100% basado en tokens.
- Baseline de accesibilidad definido.

---

## @core-auth

**Estado actual (línea base asumida — verificar):** maneja autenticación apoyada en Supabase Auth; riesgo de manejo de sesión inconsistente y de fuga de contexto de tenant.

**Responsabilidad:** gestionar identidad, sesión, contexto de usuario y **contexto de tenant (workspace)** del ecosistema. Expone el estado de autenticación, los claims de rol y los guards de acceso. Es la única autoridad de autenticación; las apps no implementan login propio.

**Dependencias:** `@core-bep-supabase` (Supabase Auth).

**Contratos:**
- Contrato de sesión (usuario, expiración, refresh).
- Contrato de contexto de tenant (workspace activo, membresía, rol).
- Contrato de claims/roles consumible por el modelo de permisos (definido en ROADMAP-000).
- Contrato de guards (proteger rutas/acciones por rol).

**API pública (canónica):**
- Proveedor/contexto de autenticación.
- Hooks de sesión y de usuario/tenant actual.
- Guards/utilidades de autorización por rol.
- Operaciones de login/logout/refresh delegadas a Supabase Auth.

**Riesgos:**
- Manejo inconsistente de refresh/expiración de sesión.
- **Fuga de tenant:** exponer datos de un workspace al usuario de otro.
- Roles evaluados sólo en UI sin respaldo de RLS (debe complementarse en base).

**Acciones necesarias:**
1. Auditar el flujo de sesión actual y unificar manejo de expiración/refresh.
2. Formalizar el contexto de tenant y su propagación a las apps.
3. Alinear los claims de rol con el modelo de permisos de ROADMAP-000.
4. Documentar la relación entre guards de UI y políticas RLS (defensa en profundidad).

**Criterios de finalización:**
- Flujo de sesión unificado y documentado.
- Contexto de tenant formalizado y propagado de forma segura.
- Claims de rol alineados al modelo de permisos.
- Documentada la doble capa UI + RLS.

---

## @core-apivault

**Estado actual (línea base asumida — verificar):** bóveda de credenciales; riesgo crítico de exposición de secretos y de control de acceso insuficiente.

**Responsabilidad:** ser la **única fuente de credenciales** del ecosistema (tokens de GitHub, claves de IA, claves de servicio, integraciones). Resuelve credenciales con alcance por workspace y controla quién puede acceder. Ninguna app debe leer secretos desde `.env` dispersos.

**Dependencias:** `@core-bep-supabase` (almacenamiento), `@core-auth` (quién accede, en qué tenant).

**Contratos:**
- Contrato de resolución de credencial por clave y por `workspace_id`.
- Contrato de alcance/permiso: sólo roles autorizados (Owner/Admin) gestionan credenciales.
- Contrato de rotación/revocación.
- Garantía de no exposición al frontend (resolución preferente del lado servidor / Edge Functions).

**API pública (canónica):**
- Resolver credencial (scope por workspace).
- Crear/actualizar/rotar/revocar credencial (sólo roles autorizados).
- Listar metadatos de credenciales (sin exponer el secreto).

**Riesgos:**
- **Crítico:** filtración de secretos al cliente o a logs.
- Control de acceso insuficiente (un rol no autorizado lee credenciales).
- Acoplamiento con `@core-auth` mal definido (dependencia de capa que debe quedar acíclica).

**Acciones necesarias:**
1. Auditar dónde se consumen secretos hoy; migrar cualquier secreto en `.env` disperso hacia ApiVault.
2. Definir el patrón de resolución del lado servidor (Edge Functions) para credenciales sensibles.
3. Alinear control de acceso con roles de `@core-auth` y RLS.
4. Documentar rotación/revocación y garantizar exclusión de secretos en logs.

**Criterios de finalización:**
- Cero secretos en `.env` dispersos del ecosistema (o lista de excepciones aprobada).
- Resolución de secretos sensibles confinada al servidor.
- Control de acceso por rol verificado.
- Procedimiento de rotación/revocación documentado.

---

## @core-shell

**Estado actual (línea base asumida — verificar):** shell de aplicación; riesgo de convertirse en "god package" acoplando lógica de apps.

**Responsabilidad:** proveer el armazón común de toda app del ecosistema: layout, chrome de navegación, routing base, montaje/ciclo de vida y composición de proveedores (auth, i18n, tema). Es el punto de entrada que las apps envuelven; orquesta los demás paquetes sin contener lógica de negocio.

**Dependencias:** `@core-ui`, `@core-design`, `@core-i18n`, `@core-auth`.

**Contratos:**
- Contrato de montaje de una app dentro del shell.
- Contrato de registro de navegación (cómo una app declara sus rutas/secciones).
- Composición ordenada de proveedores (tema → i18n → auth → app).
- Contrato de slots/regiones del layout (header, sidebar, contenido).

**API pública (canónica):**
- Componente/proveedor Shell que envuelve la app.
- Mecanismo de registro de navegación y rutas.
- Slots de layout configurables.

**Riesgos:**
- **God package:** absorber lógica que pertenece a las apps o a otros paquetes.
- Acoplamiento que obligue a versionar el shell ante cualquier cambio de app.
- Composición de proveedores frágil (orden incorrecto rompe auth/i18n).

**Acciones necesarias:**
1. Auditar el shell y extraer cualquier lógica de negocio que no le corresponda.
2. Formalizar el contrato de registro de navegación (clave para que `core-roadmap` se integre limpio).
3. Documentar el orden de composición de proveedores.
4. Definir slots de layout estables.

**Criterios de finalización:**
- Shell libre de lógica de negocio.
- Contrato de registro de navegación documentado y probado con al menos una app.
- Orden de proveedores documentado.
- Slots de layout estables y versionados.

---

## Matriz de reutilización (paquete × aplicación)

Aplicaciones consideradas: `core-market` y `core-dashboard` (mencionadas en la configuración oficial), `core-roadmap` (definida en ROADMAP-000) y futuras apps del ecosistema.

| Paquete | core-market | core-dashboard | core-roadmap | Apps futuras |
|---|:---:|:---:|:---:|:---:|
| `@core-design` | ✅ | ✅ | ✅ | ✅ (obligatorio) |
| `@core-i18n` | ✅ | ✅ | ✅ | ✅ (obligatorio) |
| `@core-ui` | ✅ | ✅ | ✅ | ✅ (obligatorio) |
| `@core-shell` | ✅ | ✅ | ✅ | ✅ (obligatorio) |
| `@core-auth` | ✅ | ✅ | ✅ | ✅ si requiere sesión |
| `@core-bep-supabase` | ✅ | ✅ | ✅ | ✅ si requiere datos |
| `@core-apivault` | ⚠️ según integraciones | ⚠️ según integraciones | ✅ | ✅ si maneja credenciales |

**Leyenda:** ✅ uso esperado · ⚠️ uso condicionado a que la app maneje integraciones/credenciales.

**Nota:** la columna de cada app debe confirmarse contra su `package.json` real durante la auditoría. La matriz es el **estado objetivo**: todo paquete de capa 0–1 (design, i18n, ui, shell) es de uso obligatorio para garantizar consistencia visual y de navegación; auth/bep/vault dependen de las necesidades funcionales de cada app.

### Matriz de dependencias inter-paquete (referencia)

| Paquete ↓ usa → | design | i18n | bep | ui | auth | vault | shell |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `@core-design` | — | | | | | | |
| `@core-i18n` | | — | | | | | |
| `@core-bep-supabase` | | | — | | | | |
| `@core-ui` | ✅ | ✅ | | — | | | |
| `@core-auth` | | | ✅ | | — | | |
| `@core-apivault` | | | ✅ | | ✅ | — | |
| `@core-shell` | ✅ | ✅ | | ✅ | ✅ | | — |

---

## Decisiones de arquitectura de esta fase (ADR)

- **ADR-101:** El grafo de dependencias entre paquetes es estrictamente acíclico y por capas (0→3). Prohibidas dependencias ascendentes o circulares.
- **ADR-102:** `@core-bep-supabase` es la única fuente de instanciación del cliente Supabase. Cualquier otra instanciación es deuda a eliminar.
- **ADR-103:** Todo theming pasa por `@core-design`; valores visuales crudos en apps/`@core-ui` son deuda.
- **ADR-104:** `@core-shell` no contiene lógica de negocio; sólo orquesta y expone contratos de montaje/navegación.
- **ADR-105:** `@core-apivault` es la única fuente de credenciales; secretos sensibles se resuelven del lado servidor.
- **ADR-106:** Todos los paquetes se consumen con `workspace:*` (consistente con ROADMAP-000 y la config oficial del monorepo); prohibido `file:../../...`.

---

## Criterios de finalización de ROADMAP-001

La fase Foundation se considera cerrada cuando:

1. Cada uno de los siete paquetes cumple sus **criterios de finalización** individuales.
2. La **auditoría** de cada paquete está hecha y las divergencias con esta línea base están resueltas o documentadas como excepción.
3. El **grafo de dependencias** está verificado como acíclico y por capas (ADR-101).
4. La **matriz de reutilización** está confirmada contra los `package.json` reales de las apps.
5. No existen instanciaciones de Supabase fuera de `@core-bep-supabase` ni secretos en `.env` dispersos (ADR-102, ADR-105).

**Siguiente fase habilitada:** `ROADMAP-002` — integración y scaffolding sobre esta base consolidada.
