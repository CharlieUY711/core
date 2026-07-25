# ✅ Checklist de Correcciones - Módulos ODDY

## 🔴 Prioridad ALTA (Hacer primero)

### 1. Estandarizar Importaciones de Supabase
- [ ] Identificar todos los archivos que importan `info.ts`
- [ ] Decidir patrón estándar: `@/utils/supabase/info` o ruta relativa
- [ ] Actualizar `vite.config.ts` si es necesario para el alias `@/`
- [ ] Cambiar todas las importaciones al patrón elegido
- [ ] Probar que el build funciona: `npm run build`

**Archivos a revisar** (15+ servicios + múltiples componentes):
```
src/app/services/*.ts
src/app/components/admin/**/*.tsx
```

---

### 2. Estandarizar Headers de Autenticación
- [ ] Probar endpoint `/api/roadmap/modules` con header `apikey`
- [ ] Probar endpoint `/api/roadmap/modules` sin header `apikey`
- [ ] Probar endpoint `/api/envios` con header `apikey`
- [ ] Probar endpoint `/api/envios` sin header `apikey`
- [ ] Documentar cuál funciona para cada endpoint
- [ ] Estandarizar todos los servicios al patrón que funciona

**Servicios a actualizar**:
- [ ] `roadmapApi.ts` (tiene `apikey`)
- [ ] `enviosApi.ts` (tiene `apikey`)
- [ ] `rrssApi.ts` (no tiene `apikey`)
- [ ] `personasApi.ts` (no tiene `apikey`)
- [ ] `pedidosApi.ts` (no tiene `apikey`)
- [ ] Todos los demás servicios

---

### 3. Mejorar Manejo de Errores
- [ ] Copiar patrón robusto de `enviosApi.ts` a todos los servicios
- [ ] Agregar verificación de `content-type` antes de `res.json()`
- [ ] Agregar manejo de respuestas no-JSON
- [ ] Probar con errores de red simulados
- [ ] Probar con respuestas 404/500

**Servicios a actualizar**:
- [ ] `roadmapApi.ts`
- [ ] `rrssApi.ts`
- [ ] `personasApi.ts`
- [ ] `pedidosApi.ts`
- [ ] Todos los demás servicios

---

### 4. Verificar Edge Functions
- [ ] Verificar que todas las funciones estén desplegadas en Supabase
- [ ] Probar endpoint `/functions/v1/api/health`
- [ ] Probar cada endpoint manualmente desde la consola del navegador
- [ ] Eliminar `roadmap5.tsx` si es duplicado
- [ ] Ejecutar auditoría automática desde `ChecklistRoadmap`

**Endpoints a verificar**:
```
GET /functions/v1/api/health
GET /functions/v1/api/roadmap/modules
GET /functions/v1/api/envios
GET /functions/v1/api/rrss/status
GET /functions/v1/api/personas
GET /functions/v1/api/pedidos
... (todos los demás)
```

---

## 🟡 Prioridad MEDIA

### 5. Limpiar Archivos Duplicados
- [ ] Verificar si `Constructor/utils/supabase/info.tsx` se usa
- [ ] Buscar referencias a ese archivo
- [ ] Eliminar si no se usa
- [ ] Confirmar que solo existe `src/utils/supabase/info.ts`

---

### 6. Agregar Validación de Credenciales
- [ ] Crear función `validateSupabaseConfig()` en `client.ts`
- [ ] Llamar al inicio de la app (en `App.tsx` o `AdminDashboard.tsx`)
- [ ] Mostrar error claro si las credenciales son inválidas
- [ ] Probar con credenciales inválidas

---

### 7. Limpiar Logs de Debug
- [ ] Reemplazar `console.log` por sistema de logging condicional
- [ ] Solo mostrar logs en desarrollo (`import.meta.env.DEV`)
- [ ] Mantener `console.error` para errores críticos

---

## 📝 Notas de Pruebas

### Cómo Probar Headers
```javascript
// En la consola del navegador:
// Con apikey
fetch('https://qhnmxvexkizcsmivfuam.supabase.co/functions/v1/api/roadmap/modules', {
  headers: {
    'Authorization': 'Bearer TU_KEY',
    'apikey': 'TU_KEY',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);

// Sin apikey
fetch('https://qhnmxvexkizcsmivfuam.supabase.co/functions/v1/api/roadmap/modules', {
  headers: {
    'Authorization': 'Bearer TU_KEY',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);
```

### Cómo Probar Manejo de Errores
1. Desconectar internet y probar cada módulo
2. Simular respuesta 404 modificando temporalmente la URL
3. Simular respuesta no-JSON (cambiar endpoint a uno que no existe)

---

## 🎯 Objetivo Final

Después de completar este checklist:
- ✅ Todas las importaciones funcionan correctamente
- ✅ Todos los headers son consistentes y funcionan
- ✅ Todos los errores se manejan adecuadamente
- ✅ Todas las Edge Functions están desplegadas y funcionando
- ✅ No hay archivos duplicados
- ✅ Las credenciales se validan al inicio

---

**Última actualización**: 2025-01-27
