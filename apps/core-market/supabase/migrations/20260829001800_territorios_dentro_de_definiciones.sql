-- ===========================================================================
-- Configurar un territorio ES definirlo
-- ===========================================================================
--
-- POR QUE SE UNIFICAN
-- La division "que existe / que esta configurado" vale cuando hay dos autores.
-- En las apps los hay: el codigo declara que la funcionalidad existe, la
-- plataforma decide si se ofrece. Son decisiones distintas, de momentos
-- distintos.
--
-- En un territorio el autor es uno solo. CORE Market define que Colombia
-- existe y CORE Market le pone la moneda. Sin dos autores la division es
-- artificial, y ademas producia DOS LISTAS DEL MISMO PAIS: una en Definiciones
-- para renombrarlo y otra en Territorios para configurarlo.
--
-- Las zonas ya lo mostraban: en Definiciones no se podian agregar, porque para
-- crear una hay que saber de que pais es — y eso solo se sabe parado adentro
-- del pais.
--
-- Queda una sola entrada. La accion de la fila deja de ser "Editar" y pasa a
-- ser "Configurar", que es lo que realmente se hace ahi.
-- ===========================================================================

begin;

delete from plataforma_apps where codigo = 'territorios';

update plataforma_apps set
  nombre = 'Territorios y definiciones',
  icono  = '🌎',
  para   = 'Países con su moneda, impuestos, zonas y tipo de cambio. Y las monedas e idiomas del sistema.',
  orden  = 220
 where codigo = 'definiciones';

commit;
