# 📚 Índice de Prompts para Cursor

**Proyecto:** ODDY Market v1.5  
**Última actualización:** Febrero 17, 2026

Esta carpeta contiene prompts profesionales para reproducir módulos aprobados en Cursor u otros editores con IA.

---

## 📂 Estructura de Carpetas

```
/DOCS/
  /CURSOR_PROMPTS/
    README.md                    (este archivo)
    checklist-roadmap.md         (Prompt Checklist & Roadmap)
    quotation-generator.md       (Prompt Generador de Presupuestos)
```

---

## 📋 Prompts Disponibles

### ✅ **1. Checklist & Roadmap**
**Archivo:** `checklist-roadmap.md`  
**Módulo:** Sistema de gestión de progreso y roadmap  
**Estado:** ✅ Aprobado y en Producción  
**Versión:** v1.0.0  
**Fecha:** Febrero 17, 2026

**Características:**
- 3 vistas interactivas (Lista, Kanban, Estadísticas)
- 80+ módulos trackeados
- Persistencia en backend con Supabase
- Sistema de filtros avanzado
- Auto-save con timeout y fallback
- Offline-ready

**Tecnologías:**
- React + TypeScript
- Tailwind CSS v4
- Motion (Framer Motion)
- Supabase Backend
- Sonner

**Complejidad:** ⭐⭐⭐⭐ (Alta)  
**Tiempo estimado de implementación:** 6-8 horas

---

### ✅ **2. Generador de Presupuestos**
**Archivo:** `quotation-generator.md`  
**Módulo:** Sistema de cotización profesional  
**Estado:** ✅ Aprobado y en Producción  
**Versión:** v1.0.0  
**Fecha:** Febrero 17, 2026

**Características:**
- 20+ módulos cotizables
- 3 paquetes predefinidos (Starter, Professional, Enterprise)
- Cálculo automático de precios y descuentos
- Layout profesional en 3 columnas
- Selección por paquete o individual
- Resumen sticky
- Export PDF y envío por email (placeholders)

**Tecnologías:**
- React + TypeScript
- Tailwind CSS v4
- Motion (Framer Motion)
- Sonner

**Complejidad:** ⭐⭐⭐ (Media)  
**Tiempo estimado de implementación:** 4-6 horas

---

## 🚀 Cómo Usar los Prompts

### Método 1: Copiar y Pegar en Cursor

1. Abre el archivo del prompt (ej: `checklist-roadmap.md`)
2. Copia el contenido completo del prompt (desde "Necesito crear..." hasta el final)
3. Abre Cursor en tu proyecto
4. Presiona `Cmd/Ctrl + K` para abrir el chat de Cursor
5. Pega el prompt
6. Presiona Enter
7. Cursor generará el código completo

### Método 2: Usar como Referencia

Si prefieres escribir tu propio código:

1. Abre el archivo del prompt
2. Revisa la estructura de datos, interfaces y funcionalidades
3. Usa los ejemplos de código como referencia
4. Implementa paso a paso siguiendo las secciones

---

## 📊 Convenciones de los Prompts

### Estructura Estándar

Todos los prompts siguen esta estructura:

1. **Objetivo** - Qué se va a construir
2. **Contexto** - Información del proyecto y stack tecnológico
3. **Requerimientos Funcionales** - Qué debe hacer el módulo
4. **Requerimientos Técnicos** - Librerías, imports, estilos
5. **Estructura del Componente** - Código skeleton
6. **Testing** - Lista de verificación
7. **Output Esperado** - Qué debe generar Cursor
8. **Mockups** - Ejemplos visuales ASCII
9. **Archivos Generados** - Qué archivos se crearán
10. **Próximos Pasos** - Qué hacer después

### Niveles de Complejidad

- ⭐ **Básica:** 1-2 horas
- ⭐⭐ **Media-Baja:** 2-4 horas
- ⭐⭐⭐ **Media:** 4-6 horas
- ⭐⭐⭐⭐ **Alta:** 6-8 horas
- ⭐⭐⭐⭐⭐ **Muy Alta:** 8+ horas

### Estado de los Módulos

- ✅ **Aprobado:** Listo para producción
- 🚧 **En Desarrollo:** Work in progress
- ⏸️ **En Pausa:** Temporalmente pausado
- 📝 **Draft:** Borrador inicial

---

## 🎯 Stack Tecnológico del Proyecto

Todos los prompts asumen este stack:

### Frontend
- **Framework:** React 18+ con TypeScript
- **Estilos:** Tailwind CSS v4
- **Animaciones:** Motion (Framer Motion)
- **Notificaciones:** Sonner (Toast)
- **Icons:** Lucide React
- **Build:** Vite

### Backend
- **Plataforma:** Supabase
- **Edge Functions:** Deno runtime
- **Database:** PostgreSQL (Supabase)
- **API:** REST (Supabase Edge Functions)
- **Auth:** Supabase Auth (cuando aplique)

### Paleta de Colores
- **Principal:** Naranja `#FF6B35`
- **Secundario:** Celeste `#00A8E8`
- **Terciario:** Verde claro pastel `#A8E6CF`
- **Cuaternario:** Gris `#6B7280`

---

## 📝 Crear un Nuevo Prompt

Si necesitas crear un prompt para un nuevo módulo:

### 1. Usa esta plantilla:

```markdown
# [Emoji] Prompt Cursor: [Nombre del Módulo]

**Módulo:** [Nombre]  
**Versión:** v1.0.0  
**Proyecto:** ODDY Market v1.5  
**Fecha:** [Fecha actual]

---

## 🎯 Objetivo

[Descripción breve de qué hace el módulo]

---

## 📋 Prompt para Cursor

\```
Necesito crear un componente React llamado [ComponentName] para ODDY Market v1.5...

## CONTEXTO
[Información del proyecto]

## REQUERIMIENTOS FUNCIONALES
[Lista de funcionalidades]

## REQUERIMIENTOS TÉCNICOS
[Librerías, imports, estilos]

## ESTRUCTURA DEL COMPONENTE
[Código skeleton]

## TESTING
[Checklist de verificación]

## OUTPUT ESPERADO
[Qué debe generar]
\```

---

## 🎨 Mockup de Referencia

[Diagramas ASCII del UI]

---

## 📦 Archivos Generados

[Lista de archivos que se crearán]

---

## 🚀 Próximos Pasos

[Qué hacer después de generar el código]
```

### 2. Guarda el archivo con el formato:

`nombre-del-modulo.md` (kebab-case)

### 3. Actualiza este README agregando el módulo a la lista

### 4. Actualiza `/DOCS/MODULE_MARKETPLACE.md` con la entrada del nuevo módulo

---

## 🔗 Referencias Útiles

### Documentación del Proyecto
- **Module Marketplace:** `/DOCS/MODULE_MARKETPLACE.md`
- **Documentación Técnica:** (a crear)
- **Manual de Usuario:** (a crear)

### Documentación Externa
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Motion (Framer Motion)](https://motion.dev/)
- [Lucide React Icons](https://lucide.dev/)
- [Sonner Toast](https://sonner.emilkowal.ski/)
- [Supabase Docs](https://supabase.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## 📊 Estadísticas

**Total de prompts:** 2  
**Estado:**
- ✅ Aprobados: 2 (100%)
- 🚧 En Desarrollo: 0 (0%)

**Por Categoría:**
- Admin/Sistema: 2 prompts

**Complejidad Promedio:** ⭐⭐⭐.5 (Media-Alta)

---

## 🤝 Contribuir

Para agregar un nuevo prompt:

1. Crea el archivo `.md` siguiendo la plantilla
2. Asegúrate de que el módulo esté aprobado primero
3. Prueba el prompt en Cursor para verificar que funciona
4. Actualiza este README
5. Actualiza MODULE_MARKETPLACE.md
6. Commit con mensaje: `docs: add [módulo] cursor prompt`

---

## 📜 Changelog

### v1.0.0 - Febrero 17, 2026
- ✅ Prompt inicial: Checklist & Roadmap
- ✅ Prompt inicial: Generador de Presupuestos
- ✅ Estructura de carpetas y README

---

**Mantenido por:** Martín (con asistencia de Claude)  
**Última revisión:** Febrero 17, 2026
