\# SPEC-001B — KNOWLEDGE MODEL (BEP REAL SLICE)



\## Core Nexus Platform



\*\*Document ID:\*\* SPEC-001B

\*\*Version:\*\* 2.0.0

\*\*Status:\*\* Draft

\*\*Type:\*\* Knowledge Model Definition

\*\*Scope:\*\* BEP (Bid Engineering Process) — verified operational slice

\*\*Source of truth:\*\* BEP-master.md (§4)

\*\*Implementation:\*\* FORBIDDEN



\---



\# CHANGE NOTE



Esta versión 2.0.0 reemplaza el modelo previo 1.0.0, que contenía entidades no verificadas.



Se elimina la dependencia de modelos ideales (Proposal, Bid, Approval) y se reancla el sistema exclusivamente al esquema real existente en BEP-master.md.



El objetivo es corregir la fuente de verdad del modelo de conocimiento.



\---



\# PURPOSE



Definir el modelo de conocimiento real del dominio BEP dentro de Core Nexus.



Este documento describe cómo el sistema representa, relaciona y estructura la información existente en la base de datos real.



No define arquitectura futura ni meta modelo.



\---



\# DOMAIN SCOPE (REAL BEP SLICE)



El dominio BEP cubre:



\* Ingesta de documentos técnicos (pliegos, planos, normas)

\* Extracción de requisitos

\* Construcción de Master BOM

\* Matriz de cumplimiento

\* RFQ a proveedores

\* Evaluación de riesgos

\* Circulares de licitación

\* Registro de decisiones



No cubre:



\* Proposal generation

\* Bid submission

\* Approval workflows como entidades



\---



\# CORE ENTITIES (VERIFIED)



\## 3.1 Project (projects)



Contenedor de ejecución.



\* id (uuid)

\* project\_id como scope global



\---



\## 3.2 System (systems)



Jerarquía técnica.



\* id

\* project\_id

\* parent\_id

\* code

\* name

\* discipline

\* description

\* created\_at



\---



\## 3.3 Document (documents)



Entidad central de conocimiento.



\* id

\* project\_id

\* system\_id

\* name

\* type

\* mime\_type

\* storage\_path

\* size\_bytes

\* version

\* status

\* discipline

\* extracted\_text

\* ai\_summary

\* ai\_tags\[]

\* ai\_manufacturers\[]

\* ai\_norms\[]

\* ai\_quantities (jsonb)

\* embedding

\* uploaded\_by

\* created\_at

\* updated\_at



\---



\## 3.4 Requirement (requirements)



Derivado de documentos.



\* id

\* project\_id

\* document\_id

\* article\_ref

\* text

\* type

\* discipline

\* status

\* compliance\_status

\* responsible\_id

\* notes

\* created\_at

\* updated\_at



\---



\## 3.5 BOM Line (bom\_lines)



Entidad central del sistema.



\* id

\* project\_id

\* parent\_id

\* level

\* code

\* description

\* quantity

\* unit

\* system\_id

\* discipline

\* manufacturer\_id

\* product\_id

\* status

\* version

\* notes

\* created\_by

\* created\_at

\* updated\_at



\---



\## 3.6 Compliance Item (compliance\_matrix)



Hub de trazabilidad.



\* id

\* project\_id

\* requirement\_id

\* document\_id

\* bom\_line\_id

\* manufacturer\_id

\* evidence

\* status

\* responsible\_id

\* notes

\* reviewed\_at

\* created\_at

\* updated\_at



\---



\## 3.7 RFQ (rfqs)



\* id

\* project\_id

\* code

\* title

\* status

\* sent\_at

\* due\_at

\* version

\* notes

\* created\_by

\* created\_at

\* updated\_at



\---



\## 3.8 Risk (risks)



\* id

\* project\_id

\* title

\* description

\* probability

\* impact

\* status

\* mitigation

\* owner\_id

\* due\_date

\* created\_at

\* updated\_at



\---



\## 3.9 Circular (circulars)



\* id

\* project\_id

\* ref

\* title

\* content

\* source\_url

\* issued\_at

\* affects\_bom

\* affects\_compliance

\* ai\_summary

\* created\_at



\---



\## 3.10 Query (project\_queries)



\* id

\* project\_id

\* circular\_id

\* question

\* answer

\* status (free text)

\* submitted\_by

\* answered\_at

\* created\_at



\---



\## 3.11 Decision (decisions)



Registro inmutable.



\* id

\* project\_id

\* title

\* rationale

\* decided\_by

\* decided\_at

\* linked\_entities (jsonb)

\* created\_at



\---



\## 3.12 Supporting Entities



Profiles, project\_members, project\_roles.



\---



\## 3.13 Referenced Entities (NOT VERIFIED)



\* manufacturers

\* products



\---



\# RELATIONSHIP MODEL



\* FK estructurales estrictas

\* Compliance Item como hub central

\* Decision.linked\_entities como único polimorfismo permitido



\---



\# ARQUETYPES



A. Container → Project

B. Structure → System

C. Knowledge Carrier → Document, Circular

D. Transactional → BOM, Requirement, RFQ, Risk, Compliance

E. Immutable → Decision, Query

F. Identity → Profiles, Roles



\---



\# LIFECYCLE MODEL



\* BOM Line: draft → under\_review → approved → rfq\_sent → quoted → ordered → delivered

\* Document: pending → processing → indexed → error

\* Requirement: pending → in\_review → compliant → non\_compliant

\* RFQ: draft → sent → partial → complete → closed

\* Risk: open → mitigating → closed → accepted



\---



\# QUERY MODEL



\* BOM state tracking

\* Requirement compliance

\* RFQ status

\* Risk exposure

\* Circular impact analysis

\* Traceability chains



\---



\# DATA MODEL CONSTRAINTS



\* Relational first

\* Strict FK

\* No EAV

\* No dynamic schema

\* JSONB solo para extensiones controladas



\---



\# TEMPORAL MODEL



\* created\_at universal

\* updated\_at en entidades mutables

\* domain timestamps en entidades inmutables



\---



\# AI METADATA MODEL



\* ai\_summary

\* ai\_tags

\* ai\_manufacturers

\* embedding

\* ai\_quantities



\---



\# KNOWLEDGE GRAPH FOUNDATION



\* Node = entity

\* Edge = FK

\* Compliance Item = hub node

\* Decision = event-like node

\* AI fields = semantic attributes



\---



\# SEMANTIC READINESS



\* embedding-based retrieval

\* traceability inference

\* circular impact propagation



\---



\# TECHNICAL DEBT



\* missing event log system

\* inconsistent responsibility fields

\* compliance-status coupling issue

\* query.status untyped



\---



\# OPEN ISSUES



\* Event emission strategy undefined

\* manufacturers/products schema not verified

\* no unified lifecycle model across arquetypes

\* no multi-tenant enforcement clarity



\---



\# OUTPUT



\* Entity catalog

\* Relationship model

\* Archetype model

\* Lifecycle definitions

\* Open issues

\* Technical debt

\* AI readiness model

\* Knowledge graph mapping



\---



\# HANDOFF PACKAGE



El Meta Model (001C) debe derivarse exclusivamente de:



\* Archetypes (§12)

\* Invariants reales

\* Relationship constraints



Prohibido usar entidades futuras (Proposal, Bid, Approval).

