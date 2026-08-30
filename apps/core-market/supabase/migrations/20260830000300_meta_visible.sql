-- Meta se ofrece, y se ordena con las otras apps.
--
-- YA APARECÍA EN "HERRAMIENTAS Y APPS" DE CORE MARKET, apagada: la plataforma
-- pide el catálogo completo (`catalogo_de_apps(p_todas => true)`) justamente
-- para poder prender lo que está apagado. Lo que faltaba era prenderla.
--
-- EL ORDEN NO ES COSMÉTICO
-- Estaba en 60, empatada con API Vault y en medio de las funcionalidades. Las
-- apps —lo que tiene una cuenta de terceros del otro lado— viven en 210 y 220:
-- Mercado Libre y Mercado Pago. Meta va con esas, en 230. Una app suelta entre
-- funcionalidades hace dudar de a qué grupo pertenece, que es justo lo que la
-- pantalla intenta dejar claro.
--
-- SE OFRECE A TODOS, NO SÓLO A CORE MARKET
-- `solo_plataforma` queda en false: publicar en Instagram y avisar por WhatsApp
-- es de las tiendas, no de la plataforma. Prenderla no expone nada: sin
-- credenciales en el Vault la pantalla no hace ninguna llamada y dice dónde se
-- cargan.
--
-- NO VA AL SIDEBAR (`en_sidebar` sigue en false). CORE Market administra la
-- plataforma; no lleva cuentas de Instagram. Se llega desde Herramientas y Apps.

update public.plataforma_apps
   set activa = true,
       orden  = 230
 where codigo = 'meta';
