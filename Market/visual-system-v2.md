# CORE Market — Visual System v2.0

**ID:** `CORE-PM-MARKET-VISUAL-0002`  
**Versión:** 2.0  
**Fecha:** Junio 2026  
**Cambios v2.0:** Navbar naranja eliminado. Market→Navy, Second Hand→Green CORE. Fondo claro.

---

## 1. Regla fundamental de color por modo

| Modo | Navbar / Topbar | Fondo general | Cards |
|------|----------------|---------------|-------|
| **Market** | `#0D2B55` Navy CORE | `#F2F5FA` Gray Light | `#FFFFFF` |
| **Second Hand** | `#1D9E75` Green CORE | `#F2F5FA` Gray Light | `#FFFFFF` |

> El naranja `#FF6835` queda eliminado del sistema.

---

## 2. Paleta

### Market
| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#F2F5FA` | Fondo principal |
| `--surface` | `#FFFFFF` | Cards |
| `--text` | `#0D2B55` | Texto Navy CORE |
| `--muted` | `#7A7A7A` | Texto secundario |
| `--accent` | `#C9A84C` | Gold CORE |
| `--accent2` | `#1A4F9C` | Blue CORE |
| `--line` | `#C8D5E8` | Bordes |
| `--nav-bg` | `#0D2B55` | Navbar Market |

### Second Hand
| Token | Valor | Uso |
|-------|-------|-----|
| `--accent` | `#1D9E75` | Green CORE |
| `--accent2` | `#16845F` | Green CORE dark |
| `--nav-bg` | `#1D9E75` | Navbar Second Hand |

---

## 3. Tipografía

```css
--font-base: Calibri, 'Segoe UI', system-ui, sans-serif;
```

---

## 4. Navbar

- Market: `#0D2B55` + border `rgba(201,168,76,.2)`
- Second Hand: `#1D9E75` + border `rgba(255,255,255,.15)`
- Texto: `#FFFFFF`
- Transición: `background 0.4s ease`

---

## Historial

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Junio 2026 | Creación inicial |
| 2.0 | Junio 2026 | Naranja eliminado. Market→Navy, Second Hand→Green CORE |

---

*CORE Market — Visual System v2.0 · Junio 2026 · Confidencial — Uso interno*
