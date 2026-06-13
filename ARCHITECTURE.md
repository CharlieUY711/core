# CORE ARCHITECTURE RULES

## apps/
Deployable units (Vercel projects)
- Must contain routing
- Must be independent build
- Must NOT be imported as libraries

## packages/
Reusable modules
- domain logic
- UI components
- infra adapters
- MUST NOT be deployable

## tools/
Hybrid modules
- Can run standalone OR be embedded
- Must declare mode explicitly
  - standalone
  - embedded
