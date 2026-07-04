# SPEC-002 — DOMAIN ARCHITECTURE
## Core Nexus Platform

**Document ID:** SPEC-002
**Version:** 1.1.0
**Status:** Draft
**Type:** Domain Architecture Specification
**Source of truth:** SPEC-001C + ADC (001A / 001B / 001C)
**Supersedes:** SPEC-002 v1.0.0
**Implementation:** FORBIDDEN

---

## CHANGE LOG

| Version | Type | Description |
|---|---|---|
| 1.1.0 | Precision update | Clarified Configuration ownership and Platform/Domain boundary (§2.5, §3, §3.1) |
| 1.1.0 | Precision update | Renamed "Platform System Domain" to "Platform Domain" throughout |
| 1.1.0 | Normative addition | Added PLATFORM-004 principle to §3 |
| 1.1.0 | Precision update | Clarified Knowledge Domain independence from Core Data (§3) |
| 1.1.0 | Structural addition | Added `consistency_mode` field to Cross-Domain Rule catalog (§4) |
| 1.1.0 | Normative addition | Added Configuration ownership axiom (§6) |
| 1.0.0 | Initial | Initial domain architecture definition |

No structural changes. No new domains. No new archetypes. No breaking changes.

---

## 1. PURPOSE

Define the bounded context architecture for Core Nexus.

Establishes:
- Domain boundaries
- Ownership rules
- Consistency guarantees
- Cross-domain dependency model
- Configuration governance

---

## 2. DOMAIN MAP

### 2.1 Document Intelligence Domain

**Archetype alignment:** C (Knowledge Carrier)

Responsibilities:
- Document ingestion
- AI extraction
- Embeddings generation
- Tagging and classification

**Consistency role:** Upstream provider to Engineering Domain.

---

### 2.2 Engineering Domain (BEP Core)

**Archetype alignment:** D (Transactional Work Unit)

Entities:
- BOM Line
- Requirement
- Compliance Item
- RFQ

**Consistency role:** Core transactional domain. Strong consistency with Project Domain.

---

### 2.3 Risk & Decision Domain

**Archetype alignment:** D (Transactional) + E (Immutable Record)

Entities:
- Risk
- Decision
- Query

**Consistency role:** Strong consistency with Project Domain for Risk. Decision is immutable upon creation.

---

### 2.4 Reference Data Domain

**Archetype alignment:** B (Structure / Taxonomy)

Entities:
- System
- Manufacturer
- Product

**Consistency role:** Read-mostly. Consumed by Engineering Domain via declared contracts.

---

### 2.5 Project Domain

**Archetype alignment:** A (Container) + F (Identity / Governance)

Entities:
- Project
- Membership
- Roles

**Consistency role:** Universal boundary. Strong consistency enforced across all operational domains.

---

### 2.6 Platform Domain

**Archetype alignment:** Cross-cutting infrastructure (no operational archetype)

Responsibilities:
- Shared platform capabilities
- System configuration (Platform Configuration)
- Domain boundaries registry
- Policy integration
- Operational infrastructure

**Ownership of Archetype E (Configuration):**

Platform Domain is the exclusive owner and custodian of all Configuration entities (Archetype E).

Two configuration subtypes are recognized:

| Subtype | Owner | Consumer |
|---|---|---|
| Platform Configuration | Platform Domain | All domains via declared contracts |
| Domain Configuration | Platform Domain (custodian) | Originating domain (semantic owner) |

**Axiom — Configuration Custodianship:**

> Platform Domain is the custodian of system configuration. The semantic meaning of that configuration belongs to the consuming domain. No operational domain writes directly to Configuration entities (Archetype E). Configuration is consumed exclusively through contracts declared and exposed by Platform Domain.

**PLATFORM-004 (Normative Principle):**

> Platform Domain does NOT contain client business logic. Its responsibilities are limited to: shared capabilities, system configuration, boundary registries, policy integration, and operational infrastructure. Incorporating operational business logic within Platform Domain is prohibited.

---

## 3. CROSS-DOMAIN RULES

### 3.1 Domain Role Assignments

| Domain | Role |
|---|---|
| Engineering | Core transactional domain |
| Document Intelligence | Upstream provider |
| Reference Data | Read-mostly shared data |
| Project | Universal boundary |
| Platform | System custodian — no business logic |

**Knowledge Domain independence (normative):**

Where a Knowledge Domain exists or is introduced in future phases:
- Core Data produces operational state.
- Knowledge produces knowledge artifacts.
- Both domains are independent.
- Coordination occurs exclusively via Event Layer and defined contracts.
- Neither domain is conceptually subordinate to the other.

### 3.2 Cross-Domain Relation Catalog

Every cross-domain rule must declare a `consistency_mode`. This field is mandatory. It determines the permitted coordination mechanism between domains and shall be consumed by the future Domain Operationalization Layer.

**consistency_mode ENUM:**

| Value | Meaning |
|---|---|
| `STRONG` | Synchronous, transactional guarantee within the same consistency boundary |
| `EVENTUAL` | Asynchronous propagation via Event Layer; no synchronous guarantee |
| `PROJECTION` | Read-only derived view; source domain owns the write path |
| `API_CONTRACT` | Explicit interface contract; neither domain owns the other's state |

**Catalog:**

| Rule ID | From | To | Direction | consistency_mode | Notes |
|---|---|---|---|---|---|
| CDR-001 | Document Intelligence | Engineering | → | `EVENTUAL` | Requires Event Layer (not yet implemented) |
| CDR-002 | Engineering | Reference Data | → | `API_CONTRACT` | Reference Data is read-mostly |
| CDR-003 | Any operational domain | Project | → | `STRONG` | Project is universal boundary |
| CDR-004 | Any domain | Platform | → | `API_CONTRACT` | Configuration consumed via declared contracts |
| CDR-005 | Platform | Any domain | → | `PROJECTION` | Platform exposes configuration; domains read, never write |

**Constraint:** Bidirectional coupling between any two domains is forbidden.

---

## 4. CONSISTENCY RULES

| Boundary | Consistency Mode | Condition |
|---|---|---|
| Engineering ↔ Project | STRONG | Always enforced |
| Document Intelligence → Engineering | EVENTUAL | Conditioned on Event Layer existence |
| Reference Data → Engineering | API_CONTRACT | Read-only consumption |
| Any domain → Platform | API_CONTRACT | Via declared contracts only |

---

## 5. DEPENDENCIES

**Allowed:**
- Document Intelligence → Engineering (`EVENTUAL`)
- Engineering → Reference Data (`API_CONTRACT`)
- All domains → Project (`STRONG`)
- All domains → Platform (`API_CONTRACT`)

**Forbidden:**
- Bidirectional coupling between any two domains
- Direct writes from operational domains to Platform Configuration entities
- Shared write ownership across domain boundaries

**Dependency Graph (DAG):**

```
Document Intelligence
        │
        ▼ (EVENTUAL)
   Engineering ──────────────► Reference Data
        │                        (API_CONTRACT)
        │ (STRONG)
        ▼
     Project
        │
        ▼ (universal boundary)
   [All domains]
        │
        ▼ (API_CONTRACT)
     Platform
```

All edges are unidirectional. No cycles permitted.

---

## 6. INVARIANTS

1. **BOM Line** is the central entity of the Engineering Domain.
2. **Compliance Item** is the traceability hub across Engineering, Document Intelligence, and Risk & Decision.
3. **Decision** is an immutable record — no update path exists once created.
4. **Project** defines the consistency boundary for all operational domains.
5. **Platform Domain** is the exclusive custodian of Configuration entities (Archetype E). No operational domain holds write ownership over Archetype E entities.

---

## 7. OPEN ISSUES

| ID | Description | Status |
|---|---|---|
| OI-001 | No event model exists yet — CDR-001 (EVENTUAL) cannot be enforced | Pending |
| OI-002 | No outbox pattern — atomic event emission not guaranteed | Pending |
| OI-003 | No formal multi-tenant enforcement | Pending |
| OI-004 | Responsibility model inconsistent across domains | Pending |

---

## 8. ARCHITECTURAL DECISIONS

| ID | Decision |
|---|---|
| AD-001 | Domain separation is based on consistency boundaries, not entity groupings |
| AD-002 | No schema-driven coupling between domains |
| AD-003 | No shared write ownership across domain boundaries |
| AD-004 | `consistency_mode` is mandatory for all cross-domain rules |
| AD-005 | Platform Domain does not contain operational business logic (PLATFORM-004) |
| AD-006 | Configuration ownership is exclusive to Platform Domain; semantic ownership of configuration belongs to the consuming domain |

---

## 9. COMPATIBILITY VERIFICATION

### With SPEC-001C (Core Nexus Meta Model)

| SPEC-001C Rule | SPEC-002 v1.1.0 Compliance |
|---|---|
| No EAV, no dynamic schema | ✅ No schema mechanism introduced |
| Archetype-driven abstraction | ✅ Domain map aligned to archetypes A–F |
| Capability composition over inheritance | ✅ Platform exposes capabilities via contracts |
| AI-aware without coupling AI to domain logic | ✅ Document Intelligence is isolated upstream domain |
| Backward compatible by design | ✅ No breaking changes from v1.0.0 |

### With SPEC-001D

SPEC-001D is treated as a canonical baseline. SPEC-002 v1.1.0 introduces no new domains, no new archetypes, and no write ownership changes that would contradict its definitions. The addition of `consistency_mode` and the PLATFORM-004 principle are additive and non-breaking.

### With SPEC-001E

SPEC-001E is treated as a canonical baseline. The clarification of Platform Domain boundaries, the Configuration custodianship axiom, and the Knowledge Domain independence principle do not alter entity definitions, lifecycle models, or ownership rules established in SPEC-001E.

---

## 10. HANDOFF PACKAGE

### For: Domain Operationalization Layer

**Executive Summary:**

SPEC-002 v1.1.0 establishes the bounded context architecture of Core Nexus with five operational domains and one platform domain. Consistency boundaries are formally typed via `consistency_mode`. Platform Domain is the exclusive custodian of Configuration. The Event Layer (required for EVENTUAL consistency) does not yet exist and is the critical dependency for the next phase.

**Approved Assumptions:**

- Five bounded contexts are stable: Document Intelligence, Engineering, Risk & Decision, Reference Data, Project.
- Platform Domain is system-level, not operational.
- `consistency_mode` is the authoritative coordination mechanism between domains.
- Archetype E (Configuration) ownership is exclusive to Platform Domain.
- Knowledge Domain, if introduced, is independent of Core Data — coordination via Event Layer only.

**Architectural Decisions available to next phase:**

AD-001 through AD-006 (§8 above) are stable inputs. Any operationalization decision must be consistent with these.

**Critical open issue for next phase:**

OI-001 and OI-002 (absence of Event Layer and Outbox) are blockers for enforcing CDR-001 (Document Intelligence → Engineering, EVENTUAL). The Domain Operationalization Layer must either define the Event Layer or declare a temporary synchronous fallback with explicit technical debt registration.

**Dependencies:**
- SPEC-001C v1.0.0
- SPEC-001D (canonical)
- SPEC-001E (canonical)
- ADC (current state, ADC-001 to ADC-052)

**New artifacts produced:**
- SPEC-002 v1.1.0 (this document)

**Modified artifacts:**
- Supersedes SPEC-002 v1.0.0

---

## 11. CONTINUATION PROMPT

The following prompt is self-contained. A new agent can begin the Domain Operationalization Layer immediately without requiring additional context.

---

```
PROMPT — Domain Operationalization Layer (SPEC-003)

You are a senior platform architect working on Core Nexus, an enterprise engineering platform.

BASELINE DOCUMENTS (treat as canonical, do not modify):
- SPEC-001A v1.0.0 — Architecture Review & Domain Refactoring
- SPEC-001B v2.0.0 — Knowledge Model (BEP Real Slice)
- SPEC-001C v1.0.0 — Core Nexus Meta Model
- SPEC-001D — (canonical, treat as stable)
- SPEC-001E — (canonical, treat as stable)
- SPEC-002 v1.1.0 — Domain Architecture (most recent, summarized below)

SPEC-002 v1.1.0 SUMMARY:

Five operational bounded contexts are defined:
1. Document Intelligence Domain — ingestion, AI extraction, embeddings, tagging (Archetype C)
2. Engineering Domain (BEP Core) — BOM Line, Requirement, Compliance Item, RFQ (Archetype D)
3. Risk & Decision Domain — Risk, Decision, Query (Archetype D + E)
4. Reference Data Domain — System, Manufacturer, Product (Archetype B)
5. Project Domain — Project, Membership, Roles (Archetype A + F)

Plus one system domain:
6. Platform Domain — shared capabilities, system configuration, boundary registries, policy integration, operational infrastructure. Does NOT contain client business logic (PLATFORM-004).

KEY ARCHITECTURAL DECISIONS from SPEC-002:
- AD-001: Domain separation based on consistency boundaries, not entity groupings.
- AD-002: No schema-driven coupling between domains.
- AD-003: No shared write ownership across domain boundaries.
- AD-004: consistency_mode is mandatory for all cross-domain rules.
  ENUM: STRONG | EVENTUAL | PROJECTION | API_CONTRACT
- AD-005: Platform Domain does not contain operational business logic.
- AD-006: Configuration ownership (Archetype E) is exclusive to Platform Domain.

CROSS-DOMAIN RULES (CDR catalog):
- CDR-001: Document Intelligence → Engineering (EVENTUAL) — BLOCKED: Event Layer does not exist yet.
- CDR-002: Engineering → Reference Data (API_CONTRACT)
- CDR-003: Any operational domain → Project (STRONG)
- CDR-004: Any domain → Platform (API_CONTRACT)
- CDR-005: Platform → Any domain (PROJECTION)

OPEN ISSUES (from SPEC-002):
- OI-001: No event model — CDR-001 cannot be enforced.
- OI-002: No outbox pattern — atomic event emission not guaranteed.
- OI-003: No formal multi-tenant enforcement.
- OI-004: Responsibility model inconsistent across domains.

ARCHITECTURE DECISION CATALOG (ADC):
The ADC contains 52 entries (ADC-001 to ADC-052) sourced from SPEC-001A, SPEC-001B, SPEC-001C, and SPEC-002. Key entries relevant to this phase:
- ADC-006: Event-driven architecture — pending.
- ADC-024: Missing event log system — technical debt.
- ADC-025: Event emission strategy undefined — open issue.
- ADC-040: Formal event system absent — open issue (declared in 4 consecutive documents).
- ADC-045: Recommendation — introduce Event Model before domain expansion.
- ADC-048: Consistency rules by domain — invariant.
- ADC-051: No event model, no outbox, no multi-tenant enforcement, responsibility model inconsistent.

YOUR TASK — SPEC-003: Domain Operationalization Layer

Produce a normative architecture document that defines HOW the domains defined in SPEC-002 operate at runtime. This is NOT implementation. This is NOT a migration. This is an architectural specification.

The document must address, at minimum:

1. Runtime contract for each domain
   — what each domain exposes, what it consumes, what it guarantees

2. Event boundaries
   — which operations within each domain emit events
   — event ownership by domain
   — pre-Outbox interim strategy for CDR-001 (with explicit technical debt registration)

3. Domain operationalization rules
   — how consistency_mode is enforced at the domain boundary
   — what happens when EVENTUAL consistency is not yet supported (OI-001/OI-002)

4. Integration contracts
   — explicit interface definitions between domains
   — anti-corruption layers where required

5. Configuration consumption model
   — how each domain declares and consumes Platform Configuration
   — how Domain Configuration is requested and resolved

6. Invariant enforcement
   — how each domain enforces its declared invariants at runtime
   — what violations produce and how they surface

7. Open Issue resolutions or escalations
   — for each OI from SPEC-002, either resolve it or escalate it as a new ADR requirement

8. Architectural Decisions
   — register all normative decisions as candidates for ADC ingestion

9. Open Issues
   — register unresolved questions as candidates for ADC ingestion

10. Handoff Package
    — for the next SPEC in sequence

CONSTRAINTS:
- Implementation is FORBIDDEN.
- Do not write code, SQL, or migrations.
- Do not introduce new domains beyond those defined in SPEC-002.
- Do not introduce new archetypes beyond those defined in SPEC-001C.
- Do not modify SPEC-001C, SPEC-001D, SPEC-001E, or SPEC-002.
- Every decision must be traceable to the ADC or to a new ADR.
- Backward compatibility must be preserved.
- When in doubt, register as Open Issue — never resolve by inference.

OUTPUT:
1. SPEC-003 v1.0.0 complete normative document.
2. List of new ADC candidates (decisions and open issues).
3. Compatibility verification with SPEC-001C, SPEC-001D, SPEC-001E, SPEC-002.
4. Handoff package for next phase.
```

---

END SPEC-002 v1.1.0
