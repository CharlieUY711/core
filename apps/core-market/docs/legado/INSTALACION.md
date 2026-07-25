# 📦 Guía de Instalación - ODDY Frontstore Standalone

## ⚠️ Importante: Problema con Workspace

Este proyecto está ubicado en `C:\Carlos\Marketplace\ODDY_Front2`, que está dentro de un directorio que contiene un **workspace de pnpm** (`C:\Carlos\Marketplace\pnpm-workspace.yaml`).

Por esta razón, cuando ejecutas `pnpm install` directamente, pnpm intenta buscar proyectos en el workspace padre y muestra el error:
```
No projects found in "C:\Carlos\Marketplace"
```

## ✅ Soluciones

### Solución 1: Usar el script incluido (Recomendada)

```powershell
pnpm run install:standalone
```

Este script ejecuta `pnpm install --ignore-workspace` automáticamente.

### Solución 2: Usar el flag directamente

```powershell
pnpm install --ignore-workspace
```

### Solución 3: Usar npm en su lugar

Si prefieres evitar el problema del workspace completamente:

```powershell
npm install
```

## 🚀 Después de instalar

Una vez instaladas las dependencias, puedes ejecutar el proyecto normalmente:

```powershell
pnpm dev
```

O si usaste npm:

```powershell
npm run dev
```

## 📝 Nota

Las dependencias ya están instaladas (se instalaron anteriormente con `--ignore-workspace`). Si necesitas reinstalar o actualizar dependencias en el futuro, usa uno de los métodos arriba.

---

**Última actualización**: 2025-01-27
