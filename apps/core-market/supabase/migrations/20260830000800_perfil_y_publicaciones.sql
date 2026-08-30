-- "Perfil" y "Publicaciones", sin el posesivo.
--
-- "Mi perfil" y "Mis publicaciones" arrastran el punto de vista de la persona a
-- una lista que es del sistema. En el menú lateral de una tienda el "mi" tenía
-- sentido; en el catálogo de la plataforma, donde al lado están "Tiendas" y
-- "Definiciones", queda como el único renglón que habla en primera persona.
--
-- Y en el buscador y el menú, la palabra que importa es la segunda: nadie busca
-- "mis", busca "publicaciones".

update public.plataforma_apps
   set nombre = 'Perfil'
 where codigo = 'perfil';

update public.plataforma_apps
   set nombre = 'Publicaciones'
 where codigo = 'publicaciones';
