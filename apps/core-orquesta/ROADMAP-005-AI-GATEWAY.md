# ROADMAP-005-AI-GATEWAY

**Componente:** CORE AI Gateway — puerta única de entrada a modelos de IA
**Tipo:** Servicio de egress de IA (`@core-ai-gateway` + runtime en Edge Functions)
**Depende de:** `ROADMAP-000`..`ROADMAP-004` (aprobados)
**Estado del documento:** Especificación técnica completa para aprobación
**Autor del rol:** Principal Software Architect
**Versión:** 0.1.0

---

## Resumen ejecutivo

CORE AI Gateway es la **única puerta de entrada a todos los modelos de IA** del ecosistema CORE. Ningún componente llama directamente a un proveedor: todos (embeddings del CKG, RAG de Biblioteca, AI Studio de CORE Roadmap, futura Orquesta) pasan por el Gateway, que abstrae proveedores, enruta, aplica fallback/balanceo, controla costos y rate limiting, resuelve claves vía ApiVault y registra todo para auditoría y observabilidad.

Esta fase **formaliza la "capa de IA agnóstica"** que ROADMAP-000/003/004 ya asumían. Con ella se completa la **tríada de puntos únicos** del ecosistema:

| Punto único | Componente | Gobierna |
|---|---|---|
| Acceso a datos | `@core-bep-supabase` | Supabase |
| Secretos | `@core-apivault` | Credenciales |
| **Egress de IA** | **CORE AI Gateway** | **Modelos de IA** |

**Proveedores soportados:** Anthropic, OpenAI, Gemini, DeepSeek y modelos locales (endpoints self-hosted compatibles).

**Ubicación:** `@core-ai-gateway` (SDK cliente tipado, consumido vía `workspace:*`) + runtime en **Edge Functions** de Supabase (las llamadas a proveedores corren del lado servidor, nunca en el frontend). Configuración/operación bajo `tools/core-ai-gateway`. No se introduce infraestructura nueva.

---

## Nota de método y alcance

- **AI Gateway ≠ API Gateway.** El **AI Gateway** (esta fase) es *south-bound*: egress de CORE hacia proveedores de IA. El **API Gateway** (forward reference de ROADMAP-004) es *north-bound*: exposición de las APIs del ecosistema hacia consumidores externos. Son componentes distintos (ADR-501).
- **Orquesta** sigue siendo forward reference; aquí se define el contrato del Gateway hacia ella (modelo de herramientas + MCP).
- La especificación define **modelo, contratos y comportamiento**, no integraciones concretas con cuentas reales de proveedores.

---

## 1. Modelo de Providers

Cada proveedor se integra mediante un **adaptador** que normaliza su API a un **contrato unificado** del Gateway (petición/respuesta canónicas), de modo que los consumidores nunca conocen las particularidades de cada proveedor.

**Proveedores y naturaleza:**

| Proveedor | Tipo | Notas |
|---|---|---|
| Anthropic | Remoto | Chat, tools, visión, streaming |
| OpenAI | Remoto | Chat, embeddings, tools, streaming |
| Gemini | Remoto | Chat, embeddings, multimodal |
| DeepSeek | Remoto | Chat, razonamiento, costo bajo |
| Local | Self-hosted | Endpoints compatibles (p. ej. OpenAI-compatible) |

**Contrato de adaptador (conceptual):** declara las **capacidades** del proveedor (chat, embeddings, tools, streaming, visión, ventana de contexto, formatos) y traduce en ambas direcciones entre el esquema canónico y el del proveedor. El Gateway mantiene una **matriz de capacidades** para enrutar sólo a proveedores aptos para cada petición.

**Esquema canónico unificado:** una sola forma de pedir *chat*, *embeddings* y *tool-calling*, independiente del proveedor; respuestas normalizadas (texto, tool-calls, uso de tokens, finish reason).

---

## 2. Modelo de Routing

El Gateway desacopla a los consumidores de los modelos concretos mediante **alias lógicos de modelo** resueltos por **políticas de enrutamiento** por workspace/caso de uso.

- **Alias lógicos** (ejemplos): `reasoning`, `fast`, `cheap`, `embeddings`, `vision`. El consumidor pide un alias; el Gateway resuelve a `proveedor + modelo` según política. Esto es lo que hace real la "IA agnóstica" de fases previas.
- **Criterios de routing:** capacidad requerida, costo, latencia, calidad/tier, disponibilidad y preferencia del tenant.
- **Políticas por tenant/caso de uso:** un workspace puede fijar "embeddings → proveedor X", "razonamiento → Anthropic con fallback a DeepSeek".
- **Pinning de versión:** una política puede fijar la versión exacta del modelo para **reproducibilidad** (clave para RAG anclado a snapshot/versión de ROADMAP-003/004).

---

## 3. Fallback

- **Cadenas de fallback** por alias: si el proveedor primario falla (error, timeout, rate limit, indisponibilidad), el Gateway reintenta en el siguiente según política.
- **Circuit breaker** por proveedor: tras N fallos consecutivos se aísla temporalmente y se enruta a alternativas.
- **Políticas de degradación:** p. ej. bajar a un modelo más barato/rápido si el primario no está disponible, con marca en la respuesta/auditoría.
- **Idempotencia y de-dup** para evitar doble cobro en reintentos.

---

## 4. Balanceo

- **Balanceo entre proveedores/claves** aptos para un alias: por peso configurable, por cuota restante o por latencia observada.
- **Multi-key por proveedor:** distribución entre varias claves (vía ApiVault) para repartir límites de tasa.
- **Awareness de cuota:** evita enrutar a una clave/proveedor cercano a su límite.

---

## 5. Control de costos

- **Estimación previa:** estima costo por petición (según modelo y tokens) antes de ejecutar.
- **Presupuestos** por tenant, caso de uso y periodo; límites *soft* (alerta) y *hard* (bloqueo).
- **Contabilidad de tokens y costo** por llamada, persistida para métricas y **metering SaaS**.
- **Optimización:** routing consciente de costo y selección de modelo más barato apto para la tarea.
- **Alertas** por umbrales de gasto.

---

## 6. Rate limiting

- **Límites por tenant/plan/caso de uso/proveedor/clave**, con algoritmo tipo token-bucket.
- **Respeto de límites del proveedor:** el Gateway nunca excede los límites upstream; cola/backpressure cuando es necesario.
- **Colas y prioridad:** peticiones en cola con prioridad por plan; rechazo controlado con códigos claros cuando se supera la capacidad.

---

## 7. API Keys y ApiVault

- **Resolución de claves vía `@core-apivault`** por `workspace_id` (ADR-105). El Gateway **nunca almacena** claves propias ni las expone.
- **BYOK (Bring Your Own Key):** en SaaS, cada tenant puede aportar sus claves de proveedor, guardadas en ApiVault; alternativamente, claves compartidas de CORE con metering.
- **Rotación/revocación** delegada en ApiVault; el Gateway resuelve la vigente en cada llamada.
- **Ejecución server-side:** todas las llamadas corren en Edge Functions; las claves nunca llegan al cliente ni a los logs.

---

## 8. Auditoría

- **Registro de toda invocación:** tenant, usuario, alias/modelo resuelto, proveedor, tokens, costo, latencia, resultado, fallback aplicado.
- **Trazabilidad:** cada llamada referenciable desde el consumidor (CKG/Biblioteca/Roadmap/Orquesta) y, cuando aplica, anclada a `snapshot_id`/versión para reproducibilidad.
- **Redacción/privacidad:** política configurable de qué contenido de prompt/respuesta se guarda; modo de **no retención de contenido** (sólo metadatos) para casos sensibles.
- Alineado con el modelo de auditoría de CORE Roadmap y Biblioteca.

---

## 9. Logs y Observabilidad

- **Logs estructurados** por petición (sin secretos, con redacción de contenido según política).
- **Trazas** end-to-end: consumidor → Gateway → proveedor → respuesta, con correlación.
- **Health checks** por proveedor y estado de circuit breakers.
- **Persistencia** vía BEP (tablas de logs/auditoría) y exportable al dashboard/observabilidad del ecosistema.

---

## 10. Versionado

- **Versión del contrato de API del Gateway** (esquema canónico) versionada; cambios incompatibles → nueva versión.
- **Versionado de alias y políticas de routing** (qué modelo resolvía un alias en un momento dado).
- **Pinning de versión de modelo** para reproducibilidad.
- **Versionado de prompts y de tools** (secciones 14 y 15).

---

## 11. Métricas

- **Operativas:** latencia (p50/p95/p99), tasa de error, fallbacks, disponibilidad por proveedor.
- **Económicas:** costo y tokens por tenant/caso de uso/modelo; gasto vs presupuesto.
- **Calidad/uso:** volumen por alias, distribución entre proveedores, cache hit (si aplica).
- Consumibles por el dashboard y por el módulo Insights de CORE Roadmap.

---

## 12. Seguridad

- **Server-side exclusivo:** ninguna clave ni llamada de proveedor en el frontend.
- **Multi-tenant por RLS** sobre config, logs, presupuestos y métricas (`workspace_id`).
- **Claves vía ApiVault**, fuera de logs (ADR-105).
- **Defensa frente a inyección de prompts:** el contenido recuperado/ingerido (de Biblioteca/CKG/fuentes externas) se trata como no confiable; el Gateway soporta *guardrails* de entrada/salida configurables y separación de instrucciones de sistema vs contenido.
- **Content safety hooks:** puntos para políticas de seguridad de contenido por tenant.
- **Aislamiento de proveedores locales:** los endpoints self-hosted se tratan con la misma disciplina de credenciales/red.

---

## 13. Modelo de prompts

El Gateway ofrece un **registro de prompts gestionados** (no prompts hardcodeados dispersos por las apps).

- **Plantillas versionadas y parametrizadas:** prompts con variables, identificados y versionados; pinning por caso de uso para reproducibilidad.
- **Separación de roles:** instrucciones de sistema vs contenido de usuario/recuperado, para mitigar inyección.
- **Evaluación/experimentación:** soporte para A/B de versiones de prompt y comparación de resultados/costos.
- **Relación con Biblioteca:** las plantillas pueden gestionarse como documentos versionados en Biblioteca (un prompt es conocimiento), enlazadas por referencia; el Gateway las resuelve en ejecución. (Frontera respetada: Biblioteca guarda, Gateway ejecuta.)

---

## 14. Modelo de herramientas (tool calling)

Abstracción **unificada de tool/function calling** sobre las diferencias de cada proveedor.

- **Registro de herramientas:** definición canónica de cada tool (nombre, descripción, esquema de entrada/salida), independiente del proveedor.
- **Normalización bidireccional:** el Gateway traduce la definición canónica al formato de cada proveedor y normaliza los *tool-calls* y resultados de vuelta al esquema canónico.
- **Orquestación de turnos:** soporte para el ciclo petición → tool-call → ejecución → resultado → continuación, con límites y auditoría.
- **Base para Orquesta:** este modelo es el cimiento sobre el que la futura Orquesta construirá agentes; Orquesta define *qué* herramientas/flujos, el Gateway provee *cómo* se invocan los modelos con tools.

---

## 15. Modelo MCP Ready

El Gateway nace **preparado para Model Context Protocol (MCP)**.

- **Cliente MCP:** capacidad de conectarse a servidores MCP y exponer sus herramientas dentro del modelo unificado de tools (sección 14), por tenant.
- **Mapeo canónico ↔ MCP:** las herramientas MCP se representan en el registro canónico; un consumidor no distingue si una tool es nativa o proviene de un servidor MCP.
- **Credenciales y permisos:** las conexiones MCP se credencializan vía ApiVault y respetan el tenant/permisos.
- **Forward-compat con Orquesta:** los agentes de Orquesta consumirán herramientas (nativas o MCP) a través del Gateway, sin acoplarse a un proveedor ni a un transporte concreto.

---

## 16. Integraciones

- **Consumidores (todos vía `@core-ai-gateway`):** CKG (embeddings), Biblioteca (embeddings/RAG), CORE Roadmap (AI Studio/Insights), Orquesta (agentes). **ADR-502:** ningún componente llama a un proveedor de IA fuera del Gateway.
- **ApiVault:** resolución de claves por tenant (sección 7).
- **BEP:** persistencia de config, prompts (refs), logs, auditoría, presupuestos y métricas; Realtime para alertas.
- **API Gateway (north-bound, forward ref):** si las capacidades de IA se exponen externamente como producto, el API Gateway las publica/autentica/limita; el AI Gateway permanece como egress interno.

---

## 17. Modelo SaaS

- **Multi-tenant** por RLS; CORE es un tenant más.
- **BYOK vs claves CORE:** el tenant aporta claves (sin markup) o usa las de CORE con **metering** y facturación por uso.
- **Planes (hipótesis):** límites de tasa, presupuestos, proveedores habilitados y acceso a modelos por tier.
- **Diferenciador:** una sola integración de IA con routing/fallback/costos/observabilidad y MCP-ready, reutilizable por todo el ecosistema y vendible como capa de IA gobernada.
- **Metering** de tokens/costo por tenant como base de billing (expuesto vía API Gateway).

---

## 18. Decisiones de arquitectura de esta fase (ADR)

- **ADR-501:** AI Gateway (egress de IA, south-bound) es distinto del API Gateway (exposición externa, north-bound).
- **ADR-502:** **Punto único de egress de IA:** ningún componente del ecosistema llama a un proveedor de IA fuera del AI Gateway (simetría con BEP y ApiVault).
- **ADR-503:** Los consumidores piden **alias lógicos de modelo**; el Gateway resuelve proveedor/modelo por política, con pinning para reproducibilidad.
- **ADR-504:** Todas las llamadas corren server-side (Edge Functions); claves vía ApiVault, nunca en frontend ni logs.
- **ADR-505:** Modelo de tools **unificado y MCP-ready**; las herramientas (nativas o MCP) se exponen en un registro canónico común.
- **ADR-506:** Prompts gestionados y versionados (no hardcodeados); Biblioteca los almacena, el Gateway los ejecuta.

---

## 19. Criterios de finalización de ROADMAP-005

La fase se cierra cuando la especificación permite, sin ambigüedad:

1. Integrar Anthropic, OpenAI, Gemini, DeepSeek y modelos locales tras un contrato canónico unificado.
2. Resolver alias lógicos por política con routing, fallback, balanceo y pinning de versión.
3. Aplicar control de costos, rate limiting y resolución de claves vía ApiVault, todo server-side.
4. Registrar auditoría, logs, métricas y observabilidad por tenant, con privacidad configurable.
5. Ofrecer modelo de prompts versionado y modelo de herramientas unificado **MCP-ready**, como base de Orquesta.
6. Ser el **punto único de egress de IA** para CKG, Biblioteca, CORE Roadmap y Orquesta (ADR-502).

**Siguiente fase habilitada:** `ROADMAP-006`.
