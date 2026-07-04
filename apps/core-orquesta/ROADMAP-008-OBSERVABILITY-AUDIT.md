# ROADMAP-008-OBSERVABILITY-AUDIT

**Componente:** CORE Observability & Audit — telemetría y auditoría transversal del ecosistema
**Tipo:** Capa transversal (`@core/telemetry` SDK + `apps/core-observatory` + runtime de colección en Edge Functions)
**Depende de:** `ROADMAP-000`..`ROADMAP-007` (aprobados)
**Estado del documento:** Especificación técnica completa para aprobación
**Autor del rol:** Principal Software Architect
**Versión:** 0.1.0

---

## Resumen ejecutivo

CORE Observability & Audit es la capa **transversal** que consolida la telemetría (logs, métricas, trazas) y la **auditoría** de todos los componentes del ecosistema —Roadmap, Analyzer, CKG, Biblioteca, AI Gateway, Orquesta, API Gateway— en un modelo, un almacén y una superficie únicos. Provee **trazabilidad end-to-end correlacionada** (una petición que entra por el API Gateway, razona vía AI Gateway y dispara un run de Orquesta se sigue como un solo hilo) y alimenta el módulo **Insights de CORE Roadmap** con datos reales del ecosistema.

Hasta aquí, cada fase definía su propia "observabilidad y auditoría". Esta fase **unifica el contrato de emisión** (vía `@core/telemetry`) y la **consolidación/consulta/visualización**, evitando silos.

**Decisión clave:** separa **observabilidad** (operativa, muestreable, retención corta) de **auditoría** (compliance, inmutable, append-only, retención larga) — son streams con requisitos distintos (ADR-803).

**Ubicación:** `@core/telemetry` (SDK de instrumentación que todos consumen vía `workspace:*`) + `apps/core-observatory` (dashboard) + colección en **Edge Functions**, persistido en Postgres vía BEP. No se introduce infraestructura nueva (ADR-801).

---

## Nota de método y forward references

- **Editor** sigue como única forward reference viva.
- La especificación define **modelo, contratos y comportamiento**, no datos de producción.

---

## 1. Frontera: qué posee esta capa vs qué emiten los componentes

| Aspecto | Componentes (000–007) | Observability & Audit (esta fase) |
|---|---|---|
| Generar telemetría/auditoría | **Emiten** (vía `@core/telemetry`) | Define el contrato de emisión |
| Correlación end-to-end | Propagan IDs | **Consolida y correlaciona** |
| Almacenamiento unificado | — | **Posee** los almacenes |
| Consulta/visualización/alertas | — | **Posee** |
| Insights de Roadmap | — | **Provee los datos** |

**ADR-802:** Los componentes **emiten** mediante un contrato común (`@core/telemetry`); esta capa **consolida, correlaciona, consulta y visualiza**. Ningún componente implementa su propio almacén de telemetría.

---

## 2. Visión y objetivo

Dar al ecosistema **una sola verdad operativa y de cumplimiento**: saber qué está pasando (salud, costo, rendimiento), poder reconstruir qué pasó (trazas correlacionadas) y demostrar quién hizo qué (auditoría inmutable). Habilita operación, depuración, control de costos SaaS y cumplimiento, y convierte los Insights de Roadmap de hipotéticos en reales.

---

## 3. Arquitectura funcional

1. **Instrumentación** — contrato común de emisión (`@core/telemetry`).
2. **Colección** — ingesta de eventos de todos los componentes.
3. **Correlación** — hilado end-to-end por IDs de traza/tenant/run.
4. **Almacenamiento** — streams separados (observabilidad vs auditoría).
5. **Consulta** — búsqueda/agregación sobre telemetría y auditoría.
6. **Visualización** — dashboards operativos y de auditoría.
7. **Alertas** — umbrales y anomalías (salud, costo, abuso, seguridad).
8. **Provisión a Insights** — feed de datos a CORE Roadmap.

---

## 4. Arquitectura técnica

- **SDK `@core/telemetry`:** API de emisión de logs/métricas/trazas/eventos de auditoría, con propagación de **contexto de correlación** (trace_id, span_id, tenant, actor, run_id). Todos los componentes lo usan.
- **Colección (Edge Functions):** recibe eventos (batch/async), valida, redacta según política y persiste.
- **Almacenes (Postgres vía BEP, particionados y con retención):**
  - Observabilidad: `obs_logs`, `obs_metrics`, `obs_traces`.
  - Auditoría: `audit_events` (append-only, inmutable).
- **Dashboard (`apps/core-observatory`):** sobre `@core-shell`/`@core-ui`/`@core-design`/`@core-i18n`; vistas operativas y de auditoría; Vercel por filtros.
- **Realtime** para alertas y vistas en vivo.

```mermaid
graph LR
    COMP[Componentes 000-007] -->|@core/telemetry| COL[Colección - Edge Functions]
    COL --> RED[Validación + redacción]
    RED --> OBS[(Observabilidad: logs/metrics/traces)]
    RED --> AUD[(Auditoría: append-only inmutable)]
    OBS --> Q[Consulta/agregación]
    AUD --> Q
    Q --> DASH[Observatory dashboard]
    Q --> ALERT[Alertas]
    Q --> INS[Insights de CORE Roadmap]
```

**Umbral de revisión (ADR-801):** si el volumen de métricas/trazas excede lo que Postgres sirve dentro del SLA, se evaluará muestreo agresivo, rollups o un TSDB dedicado **como evolución justificada**, no como punto de partida.

---

## 5. Modelo de telemetría (los tres pilares + auditoría)

- **Logs:** eventos estructurados con nivel, mensaje, contexto y correlación; **sin secretos** y con redacción de contenido sensible.
- **Métricas:** series temporales (latencia, throughput, errores, costo, tokens, runs, cuotas), con dimensiones por componente/tenant/ruta/modelo.
- **Trazas:** spans correlacionados que reconstruyen el recorrido de una operación a través de componentes.
- **Auditoría:** registro **inmutable** de acciones con efecto (quién, qué, cuándo, sobre qué, con qué evidencia y aprobación), distinto de los logs operativos.

---

## 6. Correlación end-to-end

- **Contexto propagado** desde el ingress (API Gateway) a través de todos los componentes: `trace_id` único + `tenant` + `actor` + `run_id` (Orquesta) + referencias a `snapshot_id` (CKG) y versiones (Biblioteca).
- Permite responder: "esta petición externa entró por el API Gateway, autenticó al tenant X, Orquesta lanzó el run R que razonó vía AI Gateway con el modelo M, recuperó del snapshot S y propuso la acción A aprobada por el usuario U" — todo como **un solo hilo trazable**.
- Es la culminación del hilo de reproducibilidad de ROADMAP-003/005/006: trazas + auditoría + snapshots/versiones = **forense completo**.

---

## 7. Observabilidad vs Auditoría (separación deliberada)

| Dimensión | Observabilidad | Auditoría |
|---|---|---|
| Propósito | Operación/depuración | Cumplimiento/responsabilidad |
| Mutabilidad | Muestreable, agregable | **Inmutable, append-only** |
| Retención | Corta/media (configurable) | Larga (política de compliance) |
| Contenido | Métricas/logs/trazas | Acciones con efecto y su evidencia |
| Acceso | Roles operativos | Roles de auditoría/compliance |

**ADR-803:** Observabilidad y auditoría son streams separados con almacenamiento, retención y permisos distintos; la auditoría es inmutable.

---

## 8. Retención, muestreo y costo

- **Retención por stream y por plan** (observabilidad corta; auditoría larga).
- **Muestreo** configurable para trazas/logs de alto volumen (la auditoría **nunca** se muestrea).
- **Rollups/agregados** de métricas para consultas históricas eficientes.
- **Poda** automática según política; export/archivado de auditoría antes de cualquier poda regulatoria.

---

## 9. Consulta, dashboards y alertas

- **Consulta** unificada: filtros por componente/tenant/ruta/modelo/traza/periodo; agregaciones para métricas.
- **Dashboards:** salud del ecosistema, costo de IA por tenant (desde AI Gateway), runs de Orquesta, uso de API (desde API Gateway), salud del CKG/Biblioteca; **vista de auditoría** separada.
- **Alertas:** umbrales (latencia, errores, gasto vs presupuesto, cuotas, intentos de abuso) y señales de seguridad (acciones prohibidas intentadas en Orquesta, inyección detectada), vía Realtime/notificaciones.

---

## 10. Integraciones

- **`@core/telemetry`** instrumenta todos los componentes con un contrato común.
- **AI Gateway:** ingiere su metering de costo/tokens y su auditoría de invocaciones (sin recalcular; coherente con ADR-703).
- **Orquesta:** ingiere runs, efectos y aprobaciones (auditoría de acciones gobernadas).
- **API Gateway:** ingiere uso/cuotas/accesos externos.
- **CKG/Biblioteca/Analyzer:** salud de snapshots, ingestas, reglas de CI.
- **CORE Roadmap (Insights):** **provee el feed real** que el módulo Insights consume (trazabilidad y salud del ecosistema con datos verdaderos).
- **BEP/ApiVault:** persistencia y secretos.

---

## 11. Modelo de permisos

Multi-tenant por RLS (`workspace_id`), con planos separados por la naturaleza observabilidad/auditoría:
- **Roles operativos:** ven observabilidad de su tenant (logs/métricas/trazas).
- **Roles de auditoría/compliance:** ven la auditoría inmutable; acceso registrado (auditar al auditor).
- **Admin:** configura retención, alertas y políticas de redacción.

Defensa en profundidad: RLS + scope de rol + redacción por sensibilidad.

---

## 12. Seguridad y privacidad

- **Redacción en la colección:** secretos nunca persistidos; contenido sensible redactado según política (coherente con la no-retención de contenido del AI Gateway).
- **Auditoría inmutable** y a prueba de manipulación (append-only, integridad verificable).
- **Aislamiento multi-tenant** por RLS en todos los almacenes.
- **Acceso mínimo** a auditoría; toda lectura de auditoría es auditada.
- **Telemetría como dato no confiable** para quien la consulta: no se ejecutan instrucciones embebidas en logs/trazas.

---

## 13. Escalabilidad

- **Ingesta asíncrona/batch** para no impactar a los componentes emisores.
- **Particionado por tenant/tiempo/stream**; índices orientados a consultas frecuentes.
- **Muestreo y rollups** para contener volumen (sección 8).
- **Degradación controlada:** si la colección se satura, prioriza **auditoría** sobre observabilidad (nunca se pierde un evento de cumplimiento).

---

## 14. Extensibilidad

- **Nuevos tipos de evento/métrica** se declaran en el contrato `@core/telemetry` sin tocar la colección.
- **Dashboards y alertas configurables** por tenant.
- **Exportadores** opcionales (a destinos externos) como plugins, sin alterar el núcleo.

---

## 15. Modelo SaaS

- **Multi-tenant** por RLS; CORE es un tenant más.
- **Planes:** profundidad de retención, granularidad de métricas, alertas avanzadas, acceso a auditoría extendida.
- **Diferenciador:** observabilidad **y** auditoría de cumplimiento unificadas y correlacionadas end-to-end sobre roadmap + conocimiento + IA + agentes — trazabilidad forense reproducible.
- **Sinergia con billing:** las métricas de costo/uso (consolidadas por el API Gateway) se visualizan aquí para el cliente y para finanzas.

---

## 16. Decisiones de arquitectura de esta fase (ADR)

- **ADR-801:** Telemetría y auditoría se persisten en Postgres/Supabase existente; TSDB dedicado sólo ante incumplimiento de SLA (no como punto de partida).
- **ADR-802:** Los componentes **emiten** vía `@core/telemetry`; esta capa **consolida/correlaciona/consulta/visualiza**; sin almacenes de telemetría por componente.
- **ADR-803:** Observabilidad (muestreable, retención corta) y auditoría (inmutable, retención larga) son streams separados con permisos distintos.
- **ADR-804:** Contexto de correlación end-to-end (trace/tenant/actor/run + refs a snapshot/versión) propagado desde el ingress; base del forense reproducible.
- **ADR-805:** Redacción en la colección; secretos nunca persistidos; auditoría a prueba de manipulación.
- **ADR-806:** Esta capa es la **fuente real** de datos para el módulo Insights de CORE Roadmap.

---

## 17. Criterios de finalización de ROADMAP-008

La fase se cierra cuando la especificación permite, sin ambigüedad:

1. Instrumentar todos los componentes con un contrato común (`@core/telemetry`).
2. Colectar, correlacionar y almacenar telemetría y auditoría en streams separados, con redacción y RLS.
3. Reconstruir cualquier operación end-to-end (trazas + auditoría + snapshots/versiones).
4. Consultar, visualizar y alertar sobre salud, costo, uso y señales de seguridad por tenant.
5. Proveer el feed real al módulo Insights de CORE Roadmap.

**Siguiente fase habilitada:** `ROADMAP-009`.
