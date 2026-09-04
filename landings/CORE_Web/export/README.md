# CORE Web — Export

Exportación autocontenida del sitio CORE actual (7 páginas, sin build, HTML/CSS/JS puro — cada archivo incluye su runtime inline, funciona abriendo el .html directo en el navegador, offline).

## Páginas

- `CORE Homepage.dc.html` — Home (congelada)
- `CORE Capacidades.dc.html` — Capacidades (Logística, Comercial, Marcas, Proyectos, Integración — Celdas Eficientes)
- `CORE Como Trabajamos.dc.html` — Problema → Integración → Solución → Ejecución + Visible/Invisible/Bajo tu marca
- `CORE Cobertura.dc.html` — Local / Regional / Internacional
- `CORE Nosotros.dc.html` — +30 años de experiencia
- `CORE Ecosistema.dc.html` — ODDY, OnDemand, COMITA, FACILIA, KORA, ALMA
- `CORE Contacto.dc.html` — Formulario B2B + confirmación

## Cómo abrir

Abrir `CORE Homepage.dc.html` directamente en un navegador. La navegación entre páginas usa links relativos a los archivos de esta misma carpeta — no requiere servidor ni build.

## Recursos externos

Cada página carga las tipografías IBM Plex Sans / IBM Plex Mono desde Google Fonts (`fonts.googleapis.com`) vía `<link>`. Es el único recurso externo; todo lo demás (estilos, lógica, markup) está inline en cada archivo.

## Notas

- El nombre de archivo conserva la extensión `.dc.html` tal como fue aprobado en el proyecto de diseño de origen; puede renombrarse a `.html` sin romper nada si se prefiere.
- Los links "Privacidad" / "Términos" en el footer están marcados "(próximamente)" — no son links reales, son placeholders intencionales hasta que existan esas páginas.
- No hay build step, package manager ni dependencias — es HTML estático.
