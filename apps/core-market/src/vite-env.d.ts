/// <reference types="vite/client" />

/*
 * Los tipos de `import.meta.env`.
 *
 * Faltaban: el proyecto usa Vite y lee variables con `import.meta.env.VITE_*`
 * en varios archivos, pero `tsc` no sabía qué es `import.meta.env` y marcaba
 * error en todos ellos. El build nunca falló —Vite lo resuelve— así que el
 * error convivió sin molestar y `tsc` quedó con ruido de fondo permanente.
 *
 * Y ese ruido tiene costo: cuando `tsc` siempre tiene errores, un error nuevo
 * de verdad se pierde entre los de siempre.
 */
