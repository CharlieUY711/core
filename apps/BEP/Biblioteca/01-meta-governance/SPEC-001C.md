---
document_id: SPEC-001C
document_id_map: CN-META-0001
document_type: MetaModel
title: "SPEC-001C — Meta Model (derivado del BEP Real Slice)"
version: 0.1.0
status: Draft
flow_step: "3 — 001C → Meta Model"
derives_from:
  - "SPEC-001B (CN-KMODEL-0001) — carry-forward: arquetipos + invariantes + constraints de relacion"
  - "Registro 001B→ADC: CN-ADR-T001B-01 … T001B-08"
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-28"
updated: "2026-06-28"
validation_gate: "Pendiente — requiere validacion formal antes de pasar a Approved y antes del paso 4"
prohibitions: ["entidades futuras (Proposal/Bid/Approval)", "tablas", "implementacion", "SQL", "eventos", "politicas de infraestructura"]
---

# SPEC-001C — Meta Model

> **Qué es este documento.** El Meta Model es el **esquema del modelo de conocimiento**: define las reglas que todo modelo conforme de Core Nexus debe respetar. No describe entidades nuevas ni su esquema físico; describe **cómo se clasifican, qué invariantes obligan y qué reglas impone cada arquetipo**.
>
> **De qué se deriva.** Exclusivamente de tres fuentes ya consolidadas en SPEC-001B y su registro ADC: los **arquetipos**, los **invariantes reales** y los **constraints de relación**. Cada regla de este documento traza a su ADR de origen (§7).
>
> **Lo que este documento NO hace** (prohibido por el handoff de 001B y por SPEC-000): introducir entidades futuras (Proposal/Bid/Approval), definir tablas, escribir implementación o SQL, diseñar un sistema de eventos, o fijar políticas de infraestructura. Lo que aparece como "fuera de alcance" (§6) queda diferido, no resuelto.

---

## 0. Posición en la jerarquía

Durante la construcción (bottom-up), SPEC-001C **se deriva** del Knowledge Model (SPEC-001B). Una vez validado, **asciende** a su lugar de autoridad: en la jerarquía de SPEC-000 el Meta Model es **Tier 1 (`CN-META`)**, por encima del Knowledge Model (Tier 2, `CN-KMODEL`). Es decir: nace de lo real verificado, y luego gobierna como esquema. Esta dualidad es intencional y se cierra en el paso 4, cuando la Biblioteca re-asume como capa superior.

`status: Draft`. No pasa a `Approved` hasta superar la **compuerta de validación formal** (§5).

---

## 1. Fuentes de derivación y trazabilidad

El Meta Model integra tres partes, todas con origen acotado:

| Parte | Qué define | Origen |
|---|---|---|
| **A — Meta-Model de Arquetipos** | reglas que impone cada arquetipo | CN-ADR-T001B-05 (arquetipos) |
| **B — Esquema de Invariantes** | reglas vinculantes que todo modelo conforme cumple | CN-ADR-T001B-01/02/03/04/06/07/08 |
| **C — Meta-Model de Clasificación** | cómo se asigna arquetipo y cómo se extiende sin romper invariantes | CN-ADR-T001B-05 + invariantes |

La matriz completa regla→origen está en §7.

---

## PARTE A — META-MODEL DE ARQUETIPOS

### A.1 Meta-esquema de un arquetipo

Todo arquetipo se declara con **siete atributos meta**. Ninguna entidad pertenece a un arquetipo sin que estos siete estén definidos para ese arquetipo:

1. **identity_rule** — cómo se identifica y bajo qué scope vive.
2. **mutability** — `mutable` / `immutable` / `identity-stable`.
3. **temporal_rule** — qué marcas temporales obliga (deriva de INV-6).
4. **lifecycle_obligation** — si debe declarar una máquina de estados explícita (deriva de INV-9).
5. **relationship_role** — qué papel cumple en el grafo de relaciones (raíz de scope, padre estructural, hub, hoja operacional, actor, referido).
6. **ai_metadata_eligibility** — si puede portar atributos semánticos de IA en fila (deriva de INV-8).
7. **polymorphism_allowance** — si admite polimorfismo (deriva de INV-4: solo el arquetipo Immutable, vía Decision).

### A.2 Los seis arquetipos formalizados

#### A — Container
- **identity_rule:** raíz de scope global; todo lo demás vive bajo su ámbito.
- **mutability:** mutable.
- **temporal_rule:** `created_at` (+ `updated_at` por ser mutable).
- **lifecycle_obligation:** opcional.
- **relationship_role:** raíz de scope — todas las demás entidades son referidas a un Container.
- **ai_metadata_eligibility:** no.
- **polymorphism_allowance:** ninguno.
- *Instancia ya clasificada en 001B:* Project.

#### B — Structure
- **identity_rule:** identidad bajo el Container; admite jerarquía propia (relación padre-hijo).
- **mutability:** mutable.
- **temporal_rule:** `created_at`.
- **lifecycle_obligation:** opcional.
- **relationship_role:** árbol estructural bajo el Container; organiza, no opera.
- **ai_metadata_eligibility:** no.
- **polymorphism_allowance:** ninguno.
- *Instancia:* System.

#### C — Knowledge Carrier
- **identity_rule:** identidad bajo el Container; origen de conocimiento derivado.
- **mutability:** mutable.
- **temporal_rule:** `created_at`; `updated_at` si la instancia es mutable en el tiempo.
- **lifecycle_obligation:** sí cuando la instancia declara estados de procesamiento; explícita (INV-9).
- **relationship_role:** fuente desde la cual otras entidades derivan (p. ej. requisitos que nacen de documentos).
- **ai_metadata_eligibility:** **sí — portador primario** de atributos semánticos de IA (INV-8).
- **polymorphism_allowance:** ninguno.
- *Instancias:* Document, Circular.

#### D — Transactional
- **identity_rule:** identidad bajo el Container; registro operacional.
- **mutability:** mutable.
- **temporal_rule:** `created_at` + `updated_at`.
- **lifecycle_obligation:** **obligatoria** — toda entidad transaccional declara una máquina de estados explícita (INV-9).
- **relationship_role:** registros operacionales enlazados por FK estrictas. **El hub de trazabilidad (Compliance Item) es un subtipo sancionado** de este arquetipo (INV-5).
- **ai_metadata_eligibility:** limitada (solo si la instancia la porta de forma verificada).
- **polymorphism_allowance:** ninguno.
- *Instancias:* BOM Line, Requirement, RFQ, Risk, Compliance Item (hub).

#### E — Immutable
- **identity_rule:** identidad bajo el Container; registro que no cambia tras su creación.
- **mutability:** **immutable (append-only).** Prohibida toda mutación posterior a la creación (INV-7).
- **temporal_rule:** `created_at` + **domain timestamp** propio (p. ej. de decisión / de respuesta); **sin `updated_at`** (INV-6).
- **lifecycle_obligation:** ninguna (no hay transiciones; el registro es terminal).
- **relationship_role:** registro tipo evento (event-like **a nivel de modelo, no de sistema de eventos**).
- **ai_metadata_eligibility:** no (o mínima, verificada).
- **polymorphism_allowance:** **único permitido** — vía `Decision.linked_entities` (INV-4). Ningún otro arquetipo admite polimorfismo.
- *Instancias:* Decision, Query.

#### F — Identity
- **identity_rule:** representa actores y autorización; identidad estable en el tiempo.
- **mutability:** identity-stable (atributos pueden cambiar; la identidad no).
- **temporal_rule:** según la instancia.
- **lifecycle_obligation:** opcional.
- **relationship_role:** actores/roles referidos por otras entidades (autoría, responsabilidad, pertenencia).
- **ai_metadata_eligibility:** no.
- **polymorphism_allowance:** ninguno.
- *Instancias:* Profiles, Roles, project_members.

---

## PARTE B — ESQUEMA DE INVARIANTES

Reglas **vinculantes** (`MUST`). Todo modelo conforme las satisface. Cada una traza a su ADR y define un **criterio de verificación conceptual** (no implementación).

| ID | Invariante | Enunciado | Origen | Verificación (conceptual) |
|---|---|---|---|---|
| **INV-1** | Anclaje a esquema real | El modelo se ancla solo a entidades verificadas; nada ideal/futuro. | T001B-01 | Toda entidad tiene respaldo en el esquema real verificado. |
| **INV-2** | Integridad referencial estricta | Relaciones por FK estrictas; sin EAV; sin schema dinámico. | T001B-03 | No existen atributos-valor genéricos ni estructuras dinámicas. |
| **INV-3** | JSONB acotado | JSONB solo para extensiones controladas (cantidades IA, linked_entities). | T001B-03 | Todo uso de JSONB está en la lista blanca declarada. |
| **INV-4** | Polimorfismo único | El único polimorfismo permitido es `Decision.linked_entities`. | T001B-04 | Ninguna otra relación es polimórfica. |
| **INV-5** | Hub de trazabilidad | La trazabilidad cruzada entre entidades converge en el Compliance Item. | T001B-02 | Toda cadena de trazabilidad cruzada pasa por el hub. |
| **INV-6** | Modelo temporal | `created_at` universal; `updated_at` solo en mutables; domain timestamps en inmutables. | T001B-08 | Cada entidad declara marcas temporales según su arquetipo. |
| **INV-7** | Inmutabilidad | Las entidades del arquetipo Immutable son append-only. | T001B-08 | No existe vía de mutación posterior a la creación. |
| **INV-8** | Localidad de metadata IA | La metadata de IA vive como atributo semántico en la propia entidad. | T001B-07 | No hay almacenes separados de metadata IA. |
| **INV-9** | Lifecycle explícito | Cada entidad transaccional declara una máquina de estados explícita. | T001B-06 | No existen estados implícitos ni ad hoc. |
| **INV-10** | Membresía única de arquetipo | Toda entidad pertenece a **exactamente un** arquetipo. | T001B-05 | La clasificación (§C.1) asigna uno y solo uno. |

> **Nota sobre INV-9:** se obliga lifecycle *explícito por entidad*. **No** se impone un lifecycle unificado entre arquetipos — eso queda fuera de alcance (§6), conforme a CN-ADR-T001B-06.

---

## PARTE C — META-MODEL DE CLASIFICACIÓN

### C.1 Procedimiento de clasificación

Dada una entidad **ya verificada**, se le asigna arquetipo evaluando estos predicados **en orden**; gana el primero que se cumple (garantiza INV-10, membresía única):

1. ¿Es la raíz de scope global? → **Container**
2. ¿Es append-only (no se actualiza tras crearse)? → **Immutable**
3. ¿Representa actores/autorización con identidad estable? → **Identity**
4. ¿Su propósito primario es portar conocimiento derivado / atributos semánticos de IA? → **Knowledge Carrier**
5. ¿Forma una jerarquía estructural bajo el Container sin ser operacional? → **Structure**
6. En otro caso (registro operacional con lifecycle explícito) → **Transactional**

Si una entidad parece encajar en dos, **el predicado de mayor precedencia decide**. Si persiste ambigüedad real, se resuelve con una ADR de desempate (no se permite membresía múltiple).

### C.2 Excepción sancionada (no es precedente)

El **Compliance Item** es Transactional **y** cumple el rol de hub (INV-5). Esto es un **rol dual explícitamente sancionado** dentro de un único arquetipo (Transactional), **no** una violación de INV-10 ni un precedente para membresía múltiple.

### C.3 Reglas de extensión (cómo crece el modelo sin romperse)

- Toda entidad nueva **MUST** clasificarse en **exactamente un** arquetipo existente vía §C.1.
- Toda entidad nueva **MUST** satisfacer **todos** los invariantes (§B).
- Si una entidad no encaja en ningún arquetipo, **NO** se la fuerza: requiere **RFC + ADR** que (a) la reclasifique, o (b) excepcionalmente proponga un arquetipo nuevo —el cual debe preservar todos los invariantes y versionar este documento (SPEC-001C `MAJOR`).
- **Prohibido** (reasserción del handoff de 001B): introducir entidades futuras/ideales (Proposal, Bid, Approval), tablas, implementación, SQL, eventos o políticas de infraestructura como parte de la extensión.

### C.4 Niveles de conformidad

| Nivel | Significado |
|---|---|
| **L0 — No conforme** | hay entidades sin arquetipo o que violan invariantes. |
| **L1 — Clasificado** | toda entidad tiene exactamente un arquetipo (INV-10). |
| **L2 — Invariante-conforme** | además satisface INV-1…INV-10. |
| **L3 — Meta-conforme pleno** | además declara lifecycles explícitos y traza cada elemento a su origen. |

El objetivo del modelo BEP real es **L3**.

---

## 5. Compuerta de validación formal

SPEC-001C **no** pasa a `Approved` hasta superar este checklist (gobernanza de SPEC-000 §5/§6):

- [ ] Los seis arquetipos están completos en los siete atributos meta (§A).
- [ ] Las diez entidades verificadas de 001B clasifican sin ambigüedad por §C.1.
- [ ] Cada invariante (§B) tiene enunciado, origen y criterio de verificación.
- [ ] La excepción del hub (§C.2) está documentada y acotada.
- [ ] No se introdujo nada de la lista de prohibiciones.
- [ ] La matriz de trazabilidad (§7) cubre toda regla.
- [ ] Revisión registrada (`CN-REV`) por el ARB.

Mientras el checklist no esté completo, el estado permanece `Draft`.

---

## 6. Fuera de alcance (diferido, NO resuelto)

Estos puntos **no** se resuelven en el Meta Model; permanecen como backlog/RFC tal como los dejó 001B:

- **Event log / estrategia de emisión de eventos** — el arquetipo Immutable es *event-like a nivel de modelo*, pero el Meta Model **no** define un sistema de eventos.
- **Esquema de `manufacturers` / `products`** — no verificado (001B §3.13); el Meta Model no lo clasifica hasta su verificación.
- **Lifecycle unificado entre arquetipos** — RFC abierta por CN-ADR-T001B-06.
- **Enforcement multi-tenant** — requiere decisión propia (candidata a `CN-SEC`).

---

## 7. Matriz de trazabilidad (regla → origen)

| Elemento del Meta Model | Origen |
|---|---|
| Meta-esquema de arquetipo (7 atributos) | CN-ADR-T001B-05 + INV-6/7/8/9 |
| Arquetipos A–F | CN-ADR-T001B-05 |
| INV-1 Anclaje real | CN-ADR-T001B-01 |
| INV-2 / INV-3 (FK estrictas, JSONB acotado) | CN-ADR-T001B-03 |
| INV-4 Polimorfismo único | CN-ADR-T001B-04 |
| INV-5 Hub de trazabilidad | CN-ADR-T001B-02 |
| INV-6 / INV-7 (temporal, inmutabilidad) | CN-ADR-T001B-08 |
| INV-8 Localidad metadata IA | CN-ADR-T001B-07 |
| INV-9 Lifecycle explícito | CN-ADR-T001B-06 |
| INV-10 Membresía única | CN-ADR-T001B-05 |
| Procedimiento de clasificación (§C.1) | CN-ADR-T001B-05 + INV-10 |
| Reglas de extensión (§C.3) | handoff 001B + invariantes |

---

## 8. Handoff → Paso 4 (Biblioteca como capa superior)

Cuando SPEC-001C esté validado, la Biblioteca (SPEC-000) re-asume como capa superior. El checkpoint de integración debe verificar:

1. **Ascenso de autoridad:** SPEC-001C ocupa Tier 1 (`CN-META-0001`) y gobierna al Knowledge Model (Tier 2, `CN-KMODEL-0001`).
2. **Conformidad inversa:** SPEC-001B se evalúa contra el Meta Model y debe alcanzar **L3**.
3. **Coherencia de ADC:** las decisiones T001B-01…08 siguen siendo el origen trazable de cada regla del Meta Model.
4. **Numeración final:** asignar IDs `CN-` definitivos contra el catálogo maestro (sin offsets), incluyendo el `CN-META-0001` para este documento.
5. **Prohibiciones intactas:** ningún elemento diferido (§6) fue resuelto prematuramente.

> No avanzar al paso 4 sin que la compuerta §5 esté cerrada.
