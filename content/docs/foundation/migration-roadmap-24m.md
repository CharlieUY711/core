# CORE Foundation — Migration Roadmap 24 Months

**Versión:** 1.0 · Junio 2026 · Confidencial — Uso interno

---

## Q2 2026 — Foundation (este sprint)

- [x] Phase 1: `countries`, `territories`, `entities`, `brands`, `core_services`, `entity_services`
- [x] Phase 2: Product Domain Assessment
- [x] Phase 3: Trade Engine schemas
- [x] Phase 4: CORE Rep schemas
- [x] Phase 5: Multi-Country Readiness Report

---

## Q3 2026 — Market + Logistics Base

- [ ] Agregar `country_code` + `entity_id` a `warehouses`
- [ ] Agregar `country_code` + `entity_id` a `articulos`
- [ ] Vincular `profiles` existentes a `entities`
- [ ] Primer deployment de CORE Market en `market.core.com.uy`
- [ ] Configurar RLS multi-tenant en tablas Foundation
- [ ] Seed de entidades reales (primeras empresas en plataforma)

---

## Q4 2026 — Orders + Payments Multi-Country

- [ ] Agregar `country_code` + `entity_id` a `orders`
- [ ] Agregar `country_code` a `payments`
- [ ] Primer flujo cross-border UY ↔ AR
- [ ] CORE Rep: primeras marcas cargadas en `brands`
- [ ] Primeros distribuidores en `distributors`
- [ ] APIs públicas v1 de Foundation

---

## Q1 2027 — Trade Engine Live

- [ ] `trade_operations` primer uso real (importación UY)
- [ ] `hs_codes` seed con códigos relevantes (alimentos, bebidas, electro)
- [ ] Integración con DGI Uruguay (CFE)
- [ ] Primer documento aduanero generado en plataforma
- [ ] CORE Rep: primeras `opportunities` activas

---

## Q2 2027 — Multi-Country Expansion

- [ ] Onboarding Paraguay — `territory_id` en inventario
- [ ] Onboarding Argentina — `entity_id` AR en órdenes
- [ ] `inventory_items` con `territory_id` para zona franca
- [ ] Primer fulfillment cross-border documentado
- [ ] CORE Intelligence: data lake con eventos de Foundation

---

## Q3–Q4 2027 — Scale

- [ ] Particionamiento de `orders` por `country_code + year`
- [ ] Particionamiento de `inventory_movements` por `country_code`
- [ ] Brasil Sur onboarding
- [ ] Integración Receita Federal (NF-e)
- [ ] 10.000 SKUs activos en plataforma

---

## 2028 — Leadership

- [ ] Chile onboarding
- [ ] CORE Finance schemas activos
- [ ] Factoring primera operación
- [ ] 50.000 empresas en `entities`
- [ ] 500.000 SKUs
- [ ] 10 países en `countries`

---

## Domain Boundary Proposal

```
CORE Foundation (master domain)
├── entities          ← companies, orgs
├── brands            ← CORE Rep
├── countries         ← reference
├── territories       ← fiscal/customs
├── core_services     ← verticals
└── entity_services   ← subscriptions

CORE Market (consumes Foundation)
├── articulos         ← product master
├── productos_market  ← read model
├── productos_secondhand ← read model SH
├── orders
├── payments
└── inventory_*

CORE Logistics (consumes Foundation)
├── warehouses
├── inventory_*
└── trade_operations (Phase 3)

CORE Rep (consumes Foundation)
├── brands
├── channels
├── distributors
├── opportunities
└── activities

CORE Finance (future)
└── TBD

CORE Intelligence (future)
└── data lake + ML
```

---

*CORE Foundation — Migration Roadmap v1.0 · Junio 2026*
