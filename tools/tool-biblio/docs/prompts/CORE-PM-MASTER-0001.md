# CORE-PM-MASTER-0001 — Protocolo Maestro de Trabajo

**ID:** `CORE-PM-MASTER-0001`  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Clasificación:** Confidencial — Uso interno  
**Aplica a:** Todos los prompts futuros del ecosistema CORE, sin excepción.

---

## Objetivo

Establecer las reglas permanentes de trabajo dentro del ecosistema CORE. Define dónde guardar código, documentación y prompts, cómo versionar, cómo sincronizar CORE y Biblioteca, y cómo entregar archivos.

---

## 1. Estructura del Ecosistema CORE

### Repositorio CORE (código)

Ubicación: `C:\CORE`

| Carpeta | Contenido |
|---------|-----------|
| `/apps` | Aplicaciones del ecosistema |
| `/packages` | Paquetes compartidos |
| `/scripts` | Scripts internos |
| `/infrastructure` | Infraestructura |
| `/audit` | Auditorías |
| `/docs` | Documentación técnica del repo |

### Biblioteca CORE (documentación + prompts)

Ubicación: `C:\CORE\Biblioteca`

App Next.js en producción. Contiene toda la documentación oficial del ecosistema.

Documentación oficial en: `C:\CORE\Biblioteca\docs`

---

## 2. Reglas para Generar Código

- Guardar SIEMPRE en `C:\CORE\apps\NOMBRE-DE-LA-APP` o `C:\CORE\packages\NOMBRE-DEL-PAQUETE`
- NUNCA guardar código dentro de `/Biblioteca`, `/Biblioteca/docs`, `/Biblioteca/components` o `/Biblioteca/app`
- Entregar SIEMPRE los archivos en formato:

```
=== filepath: /ruta/del/archivo ===
<contenido>
```

- No mezclar narrativa con código
- No inventar apps ni paquetes que no existan

---

## 3. Reglas para Generar Documentación

Toda documentación va en: `C:\CORE\Biblioteca\docs`

### Subcarpetas oficiales

| Carpeta | Contenido |
|---------|-----------|
| `/docs/prompts` | Prompts oficiales |
| `/docs/products` | Documentación de productos y apps |
| `/docs/architecture` | Arquitectura técnica |
| `/docs/env` | Variables de entorno |
| `/docs/maintenance` | Mantenimiento y operaciones |
| `/docs/legal` | Legal y cumplimiento |
| `/docs/roadmap` | Planificación y roadmap |

- Cada documento en formato Markdown
- No incluir código salvo que sea estrictamente necesario
- No inventar contenido no solicitado

---

## 4. Reglas para Prompts Oficiales

Ubicación: `C:\CORE\Biblioteca\docs\prompts`

### Nomenclatura obligatoria

```
CORE-PM-[ÁREA]-[NÚMERO].md
```

Ejemplos:
- `CORE-PM-BIBLIO-LOGIN-0001.md`
- `CORE-PM-LANDING-0001.md`
- `CORE-PM-ARCH-0001.md`

### Estructura requerida en cada prompt

```markdown
# CORE-PM-[ÁREA]-[NÚMERO] — Nombre del Prompt

**ID:** CORE-PM-[ÁREA]-[NÚMERO]
**Versión:** X.X
**Fecha:** Mes Año

## Objetivo
## Instrucciones
## Reglas
## Entregables
## Formato
```

---

## 5. Reglas para Variables de Entorno

Documentar en: `C:\CORE\Biblioteca\docs\env\CORE-ENV.md`

- No exponer claves reales — usar placeholders
- Documentar propósito de cada variable
- Documentar en qué app se usa
- Indicar si es requerida u opcional

---

## 6. Reglas de Versionado

- Nunca borrar documentación previa
- Siempre versionar con `vX.X`
- Siempre mantener historial
- Si se reemplaza un documento: agregar sección `## Cambios en esta versión`

---

## 7. Reglas de Sincronización CORE ↔ Biblioteca

| Acción | Actualización requerida |
|--------|------------------------|
| Código nuevo | `/docs/products` o `/docs/architecture` |
| Prompt nuevo | `/docs/prompts` |
| Variable nueva | `/docs/env/CORE-ENV.md` |
| Feature nueva | Checklist maestro `CORE-PM-BIBLIO-CHECKLIST-0001` |
| App nueva | `/docs/products/NOMBRE-DE-LA-APP.md` |
| Package nuevo | `/docs/architecture/NOMBRE-DEL-PACKAGE.md` |

---

## 8. Reglas de Entrega

Formato obligatorio para todos los archivos:

```
=== filepath: /ruta/del/archivo ===
<contenido>
```

- Nunca entregar archivos sin ruta
- Nunca mezclar narrativa con archivos
- Nunca inventar rutas

---

## 9. Reglas de Seguridad

- No exponer claves reales
- No exponer tokens
- No exponer passwords
- No exponer datos sensibles
- Usar placeholders en toda documentación

---

## 10. Tono y Estilo

- Preciso
- Técnico
- Sin narrativa innecesaria
- Sin opiniones
- Sin especulación
- Sin inventar contenido

---

## Prompts Relacionados

| ID | Descripción |
|----|-------------|
| `CORE-PM-BIBLIO-SETUP-V2` | Setup del proyecto Biblioteca |
| `CORE-PM-BIBLIO-LOGIN-0001` | Sistema de login + advertencia + protección |
| `CORE-PM-BIBLIO-CHECKLIST-0001` | Checklist maestro del ecosistema |
| `CORE-PM-BIBLIO-STRUCTURE-0001` | Estructura de documentación de la Biblioteca |

---

*CORE-PM-MASTER-0001 · v1.0 · Junio 2026 · Confidencial — Uso interno*
