\---

document\_id: CN-RFC-0001

document\_type: RequestForComments

title: "CN-RFC-0001 — Evaluación del External Constraints Layer (EC-Layer): TEC / LEG / OFC"

version: 0.1.0

status: Proposed

normative\_level: INFORMATIVE

constrained\_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"

relates\_to: \["SPEC-001C (CN-META-0001) — NO se modifica", "SPEC-001B (CN-KMODEL-0001)"]

owner: "Enterprise Architecture Office (EAO)"

authors: \["Documentation Architect"]

classification: "Internal / Non-normative"

created: "2026-06-28"

updated: "2026-06-28"

evaluation\_scope: "Solo evaluación. No integra, no modifica artefactos locked."

out\_of\_scope: \["TRE (motor ALLOW/DENY)", "ADR-META (no existe en el baseline)", "lógica de ejecución/runtime"]

\---



\# CN-RFC-0001 — Evaluación del EC-Layer (TEC / LEG / OFC)



> RFC \*\*no normativa\*\*, en estado `Proposed`. Evalúa la propuesta de un \*External Constraints Layer\* declarativo. \*\*No\*\* modifica SPEC-001C ni ningún artefacto aprobado. Sirve para que se decida explícitamente: adoptar, rechazar o archivar.

>

> \*\*Fuera de alcance\*\* (por las hard constraints de la propuesta y por el baseline): el motor TRE (ALLOW/DENY), el término `ADR-META` (no existe en este sistema) y toda semántica de ejecución/autorización en runtime.



\## 1. Resumen de la propuesta



El EC-Layer propone anotar artefactos SPEC/ADC (y opcionalmente entidades) con tres categorías de constraint externo, de forma \*\*declarativa\*\*:

\- \*\*TEC\*\* — certificación técnica externa (capacidad de vendor/institución).

\- \*\*LEG\*\* — constraint legal/regulatorio (validez jurisdiccional).

\- \*\*OFC\*\* — constraint operacional/contractual (condiciones de participación).



\## 2. Veredicto de compatibilidad



\*\*PARCIALMENTE COMPATIBLE.\*\*



\- La \*\*intención\*\* (modelar marco legal, certificaciones y condiciones contractuales) es legítima y, para un dominio de licitaciones como BEP, potencialmente valiosa.

\- La \*\*forma propuesta\*\* (una capa nombrada con taxonomía paralela TEC/LEG/OFC embebida en el schema) es mayormente \*\*redundante\*\* con mecanismos que ya existen, e introduce riesgos de gobernanza.



\## 3. Conflictos clave



1\. \*\*Extensión a nivel de entidad toca artefacto locked.\*\* Las secciones 4.1/4.2/4.3 de la propuesta modifican el schema de entidades/ADC/SPEC. Cualquier cambio de entidad altera el Meta Model → exige bump `MAJOR` de SPEC-001C + nueva revisión ARB. No es "no-breaking" si se toma literal.

2\. \*\*Tensión con INV-2 / INV-3.\*\* Un bloque libre `EC-Layer: {LEG:\[], TEC:\[], OFC:\[]}` se parece a flexibilidad dinámica / casi-EAV. INV-2 prohíbe schema dinámico y INV-3 acota JSONB a una lista blanca. Un EC-Layer arbitrario violaría ambos salvo control estricto.

3\. \*\*Vocabulario paralelo.\*\* TEC/LEG/OFC crea un namespace de tres letras junto al taxonómico `CN-` y a los arquetipos. Dos formas de decir lo mismo → drift y costo de mantenimiento.

4\. \*\*Atracción gravitacional al TRE.\*\* La taxonomía nació dentro de un motor ALLOW/DENY. Adoptar el vocabulario mantiene la pendiente hacia reintroducir ejecución más adelante. Riesgo de scope creep, aunque hoy esté declarado "no ejecutivo".



\## 4. Análisis de redundancia (qué ya existe en el modelo)



La mayor parte de TEC/LEG/OFC ya es representable con lo verificado en SPEC-001B, \*\*sin schema nuevo\*\*:



| Concepto EC-Layer | Ya representable como |

|---|---|

| \*\*LEG\*\* (legal/regulatorio) | `Requirement` de tipo legal/normativo, trazado por el \*\*Compliance Item\*\* (hub, INV-5); referencias normativas ya viven en `Document.ai\_norms\[]`. |

| \*\*TEC\*\* (certificación técnica) | Evidencia en `Compliance Item` (`evidence`/`status`) y atributo de `manufacturers`/`products` (entidades referenciadas, hoy \*\*no verificadas\*\* — 001B §3.13). |

| \*\*OFC\*\* (contractual/procurement) | `Requirement` de tipo contractual, con su `compliance\_status`, trazado por el hub. |

| \*\*Anotación de aplicabilidad a nivel documento\*\* | Metadata standard de SPEC-000 §3 (`classification`, `audience`, `tags`, campos nuevos opcionales) — sin "capa" nueva. |



Conclusión de redundancia: el constraint-tracking del dominio \*\*ya es\*\* el `Compliance Item` + tipos de `Requirement`. El EC-Layer reinventa, con otro nombre, lo que el hub de trazabilidad hace.



\## 5. Impacto de gobernanza



\- \*\*¿Segundo sistema de autoridad?\*\* Como metadata pura, no — \*si\* se mantiene declarativo y gobernado por el metadata standard de SPEC-000. El riesgo aparece si reaparece el TRE.

\- \*\*¿Redefine jerarquía?\*\* La propuesta original sí (con `ADR-META`). Removido ese término, el EC-Layer como metadata no altera la jerarquía SPEC-000 → Specs → Decisions.

\- \*\*Regla de open issues respetada:\*\* esto se evalúa como RFC, no se integra. Correcto.



\## 6. Opciones de adopción segura (de menor a mayor cambio)



\- \*\*Opción 0 — Archivar como research.\*\* Si no hay un driver concreto de BEP que lo exija hoy, queda como `CN-RES`/RFC en backlog. Cero cambios.

\- \*\*Opción 1 — Vocabulario controlado declarativo (recomendada si hay necesidad).\*\* Definir LEG/TEC/OFC como \*\*categorías de `Requirement.type`\*\* en el Glossary (`CN-GLOS`), trazadas por el `Compliance Item` existente. No toca arquetipos, no toca 001C, usa entidades verificadas. Solo decisión de vocabulario.

\- \*\*Opción 2 — Metadata de documento opcional.\*\* Añadir al metadata standard de SPEC-000 campos opcionales declarativos (p. ej. `jurisdictional\_scope`, `capability\_refs`, `contractual\_refs`) para anotar SPEC/ADC. Cambio acotado al estándar de metadata (bump de SPEC-000), no al Meta Model.

\- \*\*Rechazado:\*\* la extensión a nivel de entidad (4.1) y cualquier rastro de TRE/ALLOW-DENY.



> Las opciones 1 y 2 son \*\*no-breaking\*\* para SPEC-001C. La extensión de entidad de la propuesta \*\*no\*\* lo es.



\## 7. Recomendación



\*\*ARCHIVAR como research, con adopción condicional de la Opción 1\*\* si y solo si surge un requisito real de BEP (p. ej. un pliego que exija certificación de fabricante o validez jurisdiccional explícita). En ese caso, implementarlo como vocabulario controlado sobre `Requirement` + `Compliance Item`, \*\*no\*\* como capa ni motor paralelo. No adoptar la forma propuesta.



\## 8. Conclusión (una frase)



El EC-Layer captura una necesidad real del dominio de licitaciones, pero tal como está propuesto es mayormente redundante con el `Compliance Item` y los tipos de `Requirement` ya existentes, y solo debería adoptarse —si acaso— como vocabulario controlado declarativo, nunca como capa o motor paralelo.



\## 9. Trazabilidad

\- Evalúa: propuesta EC-Layer (origen externo).

\- No modifica: SPEC-001C (`CN-META-0001`, Approved v1.0.0).

\- Apoya en: SPEC-001B §3.4 (Requirement), §3.6 (Compliance Item), §3.13 (manufacturers/products no verificados); SPEC-000 §3 (metadata standard); INV-2/INV-3/INV-5.

