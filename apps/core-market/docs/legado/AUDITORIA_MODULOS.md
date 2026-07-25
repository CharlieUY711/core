# 🔍 Auditoría Agnóstica de Módulos - ODDY Constructor

**Fecha**: 2025-01-27  
**Proyecto**: ODDY Marketplace Builder  
**Versión**: v1.5.0

---

## 📋 Resumen Ejecutivo

Esta auditoría identifica problemas estructurales y de configuración que pueden estar impidiendo el funcionamiento correcto de los módulos recientemente configurados.

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Inconsistencia en Rutas de Importación de Supabase**

**Problema**: Existen dos patrones diferentes para importar la configuración de Supabase:

- **Patrón A** (Ruta absoluta): `import { projectId, publicAnonKey } from '/utils/supabase/info';`
  - Usado en: `enviosApi.ts`, `roadmapApi.ts`, `rrssApi.ts`, `personasApi.ts`, y otros servicios
  
- **Patrón B** (Ruta relativa): `import { projectId, publicAnonKey } from '../../../../utils/supabase/info';`
  - Usado en: `ChecklistRoadmap.tsx`, `ERPInventarioView.tsx`, `ModuleFilesPanel.tsx`, y otros componentes

**Impacto**: 
- Puede causar errores de módulo no encontrado en tiempo de ejecución
- Depende de la configuración de alias de Vite (`@/` → `./src`)
- Las rutas absolutas con `/` pueden no funcionar si el alias no está configurado correctamente

**Archivos afectados**:
```
src/app/services/*.ts (15 archivos)
src/app/components/admin/**/*.tsx (múltiples archivos)
```

**Solución recomendada**: Estandarizar todas las importaciones a usar el alias `@/utils/supabase/info` o rutas relativas consistentes.

---

### 2. **Archivos de Configuración Duplicados**

**Problema**: Existen múltiples archivos `info.ts` / `info.tsx`:

1. `Constructor/src/utils/supabase/info.ts` ✅ (Principal)
2. `Constructor/utils/supabase/info.tsx` ⚠️ (Duplicado en raíz)
3. `ODDY_Front2/src/utils/supabase/info.ts` (Proyecto diferente)

**Impacto**:
- Confusión sobre cuál archivo se está usando
- Posibles inconsistencias en las credenciales
- El archivo `.tsx` en la raíz puede no estar siendo usado

**Solución recomendada**: 
- Eliminar el archivo duplicado `Constructor/utils/supabase/info.tsx`
- Verificar que todas las importaciones apunten al archivo correcto

---

### 3. **Manejo de Errores Inconsistente en APIs**

**Problema**: Los servicios de API tienen diferentes niveles de manejo de errores:

**Ejemplo 1 - `enviosApi.ts`** (Buen manejo):
```typescript
// Verifica content-type antes de parsear JSON
const contentType = res.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await res.text();
  return { ok: false, error: `Error ${res.status}: ${text}` };
}
```

**Ejemplo 2 - `roadmapApi.ts`** (Manejo básico):
```typescript
// Asume que siempre será JSON, puede fallar
const json = await res.json();
if (!res.ok) {
  return { ok: false, error: json.error || 'Error en la petición' };
}
```

**Ejemplo 3 - `rrssApi.ts`** (Manejo mínimo):
```typescript
// No verifica content-type, puede fallar silenciosamente
const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
return await res.json();
```

**Impacto**:
- Errores de red o respuestas no-JSON pueden causar crashes silenciosos
- Dificulta el debugging
- Los usuarios no reciben feedback claro sobre qué falló

**Solución recomendada**: Estandarizar el manejo de errores en todos los servicios usando el patrón de `enviosApi.ts`.

---

### 4. **Falta de Validación de Credenciales**

**Problema**: No hay validación inicial de que las credenciales de Supabase sean válidas antes de hacer llamadas.

**Archivo**: `src/utils/supabase/info.ts`
```typescript
export const projectId = "qhnmxvexkizcsmivfuam";
export const publicAnonKey = "sb_publishable_sB3F5T731PMqPXMOFq8pVg_Trg4AbeW";
```

**Impacto**:
- Si las credenciales son inválidas, todas las llamadas fallarán
- No hay feedback temprano sobre problemas de configuración
- Los errores aparecen solo cuando se intenta usar un módulo

**Solución recomendada**: 
- Agregar validación en tiempo de inicialización
- Mostrar error claro si las credenciales no están configuradas

---

### 5. **Edge Functions - Verificación de Despliegue**

**Problema**: No está claro si todas las Edge Functions están desplegadas y funcionando.

**Funciones identificadas** (24 archivos en `supabase/functions/api/`):
- `roadmap.tsx` ✅
- `envios.tsx` ✅
- `rrss.tsx` ✅
- `personas.tsx` ✅
- `pedidos.tsx` ✅
- `metodos_envio.tsx` ✅
- `metodos_pago.tsx` ✅
- ... y 17 más

**Problemas potenciales**:
- `roadmap5.tsx` parece ser una versión duplicada/antigua de `roadmap.tsx`
- No hay verificación automática de que los endpoints respondan
- El sistema de auditoría existe pero puede no estar ejecutándose

**Solución recomendada**:
- Verificar que todas las funciones estén desplegadas
- Eliminar funciones duplicadas (`roadmap5.tsx`)
- Ejecutar auditoría automática de endpoints

---

### 6. **Headers de Autenticación Inconsistentes**

**Problema**: Diferentes servicios usan diferentes combinaciones de headers:

**Patrón 1** (con `apikey`):
```typescript
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
  'apikey': publicAnonKey,  // ← Extra
};
```
Usado en: `roadmapApi.ts`, `enviosApi.ts`

**Patrón 2** (sin `apikey`):
```typescript
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};
```
Usado en: `rrssApi.ts`, `personasApi.ts`, `pedidosApi.ts`

**Impacto**:
- Algunos endpoints pueden requerir el header `apikey` y otros no
- Inconsistencia puede causar errores 401/403 en algunos módulos

**Solución recomendada**: 
- Verificar documentación de Supabase Edge Functions
- Estandarizar headers en todos los servicios
- Probar ambos patrones para determinar cuál funciona

---

## ⚠️ PROBLEMAS MENORES

### 7. **Logs de Debug en Producción**

**Problema**: Múltiples `console.log` y `console.error` en código de producción:

```typescript
console.log(`[enviosApi] GET ${url}`);
console.error(`[enviosApi] Error ${res.status}:`, json);
```

**Impacto**: 
- Ruido en la consola del navegador
- Posible exposición de información sensible
- Impacto mínimo en rendimiento

**Solución recomendada**: Usar un sistema de logging configurable (ej: solo en desarrollo).

---

### 8. **TODOs y Comentarios de FIXME**

**Encontrados**:
- `EnviosView.tsx`: `// TODO: calcular total desde pedidos reales`
- `ChecklistRoadmap.tsx`: Múltiples comentarios sobre fixes y workarounds

**Impacto**: Indica funcionalidad incompleta o workarounds temporales.

---

## 📊 ESTADO DE MÓDULOS

### Módulos con Backend Implementado ✅
- Roadmap/Checklist
- Envíos
- Personas
- Organizaciones
- Pedidos
- Métodos de Pago
- Métodos de Envío
- RRSS (Redes Sociales)
- Productos
- Carrito
- Categorías
- Subcategorías
- Departamentos
- Disputas
- Etiquetas
- Roles

### Módulos con Problemas Potenciales ⚠️
- **Todos los módulos** pueden estar afectados por los problemas de importación y headers

---

## 🔧 RECOMENDACIONES PRIORITARIAS

### Prioridad ALTA 🔴

1. **Estandarizar importaciones de Supabase**
   - Cambiar todas a usar `@/utils/supabase/info` o rutas relativas consistentes
   - Verificar que el alias `@/` esté configurado en `vite.config.ts`

2. **Estandarizar headers de autenticación**
   - Probar ambos patrones (con/sin `apikey`)
   - Documentar cuál funciona para cada endpoint
   - Unificar todos los servicios

3. **Mejorar manejo de errores**
   - Implementar el patrón robusto de `enviosApi.ts` en todos los servicios
   - Agregar validación de content-type antes de parsear JSON

4. **Verificar despliegue de Edge Functions**
   - Confirmar que todas las funciones estén desplegadas
   - Eliminar duplicados (`roadmap5.tsx`)
   - Ejecutar auditoría de endpoints

### Prioridad MEDIA 🟡

5. **Eliminar archivos duplicados**
   - Eliminar `Constructor/utils/supabase/info.tsx` si no se usa

6. **Agregar validación de credenciales**
   - Validar al inicio de la aplicación
   - Mostrar error claro si faltan credenciales

7. **Limpiar logs de debug**
   - Implementar sistema de logging condicional

---

## 🧪 PLAN DE PRUEBAS SUGERIDO

1. **Test de Importaciones**
   ```bash
   # Verificar que todas las importaciones resuelvan correctamente
   npm run build
   ```

2. **Test de Endpoints**
   - Probar cada endpoint manualmente desde la consola del navegador
   - Verificar respuestas y códigos de estado

3. **Test de Headers**
   - Probar cada servicio con y sin header `apikey`
   - Documentar qué funciona

4. **Test de Manejo de Errores**
   - Simular errores de red (desconectar internet)
   - Simular respuestas no-JSON
   - Verificar que los errores se manejen correctamente

---

## 📝 NOTAS ADICIONALES

- El proyecto usa **React Router v7**
- **Supabase** como backend (Edge Functions + PostgreSQL)
- **Vite** como bundler
- **TypeScript** en todo el proyecto
- **Tailwind CSS** para estilos

---

## ✅ PRÓXIMOS PASOS

1. Revisar y aplicar las recomendaciones de Prioridad ALTA
2. Ejecutar el plan de pruebas
3. Documentar los hallazgos específicos por módulo
4. Crear un checklist de verificación para nuevos módulos

---

**Generado por**: Auditoría Automática  
**Última actualización**: 2025-01-27
