-- ===========================================================================
-- La taxonomía también es una definición
-- ===========================================================================
--
-- Mismo test que con los territorios: ¿hay dos autores? No. Departamentos,
-- categorías y subcategorías los define la plataforma y nadie más — igual que
-- los países, las monedas y los idiomas. Son datos de referencia: lo que
-- existe para que el resto del sistema los use.
--
-- Con esto "Definiciones" queda como el único lugar donde se define qué
-- existe: territorios con su configuración, monedas, idiomas y la taxonomía.
-- Y el menú pierde otra entrada que era una pestaña disfrazada.
-- ===========================================================================

begin;

delete from plataforma_apps where codigo = 'taxonomia';

update plataforma_apps set
  nombre = 'Definiciones',
  icono  = '📐',
  para   = 'Qué existe: territorios con su configuración, monedas, idiomas y la taxonomía.',
  orden  = 220
 where codigo = 'definiciones';

commit;
