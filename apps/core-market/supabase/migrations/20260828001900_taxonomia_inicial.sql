-- ===========================================================================
-- Taxonomía inicial: la tienda necesita departamentos para existir
-- ===========================================================================
--
-- POR QUÉ ESTO ESTABA BLOQUEANDO TODO
-- `departamentos`, `categorias` y `subcategorias` tenían CERO filas, y ninguna
-- migración las cargaba. Con eso:
--
--   - Los selectores de Departamento y Categoría del alta estaban vacíos: no
--     es que nadie eligiera, es que no había nada para elegir.
--   - `predecirTaxonomia` abortaba en su primera línea (`if (!deptos.length)`).
--     Su trabajo es mapear el camino de categorías de Mercado Libre contra la
--     taxonomía de la tienda, y contra una taxonomía vacía no hay nada que
--     mapear.
--   - CORE-TAX no podía clasificar: sin categoría, `hayDatosSuficientes`
--     devuelve false y el botón queda apagado.
--
-- Tres funciones construidas y ninguna podía correr, todas por la misma razón.
--
-- ESTE ÁRBOL ES PROPIO, NO IMPORTADO
-- Tiene la FORMA del primer nivel de Mercado Libre Uruguay porque es un punto
-- de partida conocido y reconocible, pero es de la tienda: sus ids son
-- estables y no dependen de ningún canal.
--
-- No se pudo importar el árbol real: `api.mercadolibre.com/sites/MLU/categories`
-- hoy responde 403 sin credenciales, y el motor de ML está desconectado. El
-- import de verdad —que reconcilie contra esto en vez de reemplazarlo— es
-- trabajo aparte, y es lo que convierte esta lista en un espejo mantenido.
--
-- Mientras tanto: es editable como cualquier otro dato. Sobra un departamento,
-- se desactiva; falta uno, se agrega.
-- ===========================================================================

begin;

insert into departamentos (nombre, orden, activo)
select d.nombre, d.orden, true
  from (values
    ('Alimentos y Bebidas',            10),
    ('Bebés',                          20),
    ('Belleza y Cuidado Personal',     30),
    ('Salud y Equipamiento Médico',    40),
    ('Ropa y Accesorios',              50),
    ('Joyas y Relojes',                60),
    ('Celulares y Teléfonos',          70),
    ('Computación',                    80),
    ('Electrónica, Audio y Video',     90),
    ('Cámaras y Accesorios',          100),
    ('Consolas y Videojuegos',        110),
    ('Electrodomésticos',             120),
    ('Hogar, Muebles y Jardín',       130),
    ('Herramientas',                  140),
    ('Construcción',                  150),
    ('Deportes y Fitness',            160),
    ('Juegos y Juguetes',             170),
    ('Libros, Revistas y Comics',     180),
    ('Instrumentos Musicales',        190),
    ('Música, Películas y Series',    200),
    ('Animales y Mascotas',           210),
    ('Accesorios para Vehículos',     220),
    ('Agro',                          230),
    ('Industrias y Oficinas',         240),
    ('Arte, Librería y Mercería',     250),
    ('Antigüedades y Colecciones',    260),
    ('Souvenirs, Cotillón y Fiestas', 270),
    ('Otras categorías',              900)
  ) as d(nombre, orden)
 where not exists (select 1 from departamentos x where x.nombre = d.nombre);

-- ---------------------------------------------------------------------------
-- Categorías: sólo donde hay algo concreto que decir
-- ---------------------------------------------------------------------------
-- No se inventa una lista completa para los veintiocho departamentos. Se cargan
-- las de los que la tienda usa hoy, y el resto queda con su departamento como
-- único nivel — que alcanza: el selector funciona y CORE-TAX clasifica con el
-- departamento cuando no hay categoría.
--
-- Inventar doscientas categorías que nadie va a usar hace más ruido que
-- servicio, y las vuelve difíciles de distinguir de las que sí importan.
insert into categorias (departamento_id, nombre, orden, activo)
select d.id, c.nombre, c.orden, true
  from (values
    ('Celulares y Teléfonos',       'Celulares y Smartphones',      10),
    ('Celulares y Teléfonos',       'Accesorios para Celulares',    20),
    ('Celulares y Teléfonos',       'Repuestos de Celulares',       30),
    ('Computación',                 'Notebooks y Accesorios',       10),
    ('Computación',                 'Tablets y Accesorios',         20),
    ('Computación',                 'Componentes de PC',            30),
    ('Computación',                 'Almacenamiento',               40),
    ('Electrónica, Audio y Video',  'Televisores',                  10),
    ('Electrónica, Audio y Video',  'Audio',                        20),
    ('Electrónica, Audio y Video',  'Wearables',                    30),
    ('Alimentos y Bebidas',         'Almacén',                      10),
    ('Alimentos y Bebidas',         'Bebidas',                      20),
    ('Alimentos y Bebidas',         'Carnes y Pescados',            30),
    ('Alimentos y Bebidas',         'Frutas y Verduras',            40),
    ('Ropa y Accesorios',           'Indumentaria',                 10),
    ('Ropa y Accesorios',           'Calzado',                      20),
    ('Ropa y Accesorios',           'Accesorios de Moda',           30),
    ('Electrodomésticos',           'Cocina',                       10),
    ('Electrodomésticos',           'Climatización',                20),
    ('Electrodomésticos',           'Lavado',                       30),
    ('Hogar, Muebles y Jardín',     'Muebles',                      10),
    ('Hogar, Muebles y Jardín',     'Decoración',                   20),
    ('Hogar, Muebles y Jardín',     'Jardín',                       30),
    ('Salud y Equipamiento Médico', 'Farmacia',                     10),
    ('Salud y Equipamiento Médico', 'Equipamiento Médico',          20),
    ('Libros, Revistas y Comics',   'Libros',                       10),
    ('Libros, Revistas y Comics',   'Revistas',                     20)
  ) as c(depto, nombre, orden)
  join departamentos d on d.nombre = c.depto
 where not exists (
   select 1 from categorias x where x.departamento_id = d.id and x.nombre = c.nombre
 );

commit;
