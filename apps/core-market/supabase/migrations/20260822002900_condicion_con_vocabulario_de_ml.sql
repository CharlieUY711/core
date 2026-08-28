-- ===========================================================================
-- La condicion, con el vocabulario del canal
-- ===========================================================================
--
-- En 20260822002800 le puse el enum item_condition -new, like_new, good, fair,
-- poor-. Estaba mal: ese enum vive en la base desde antes, pero solo lo usa una
-- tabla deprecada, y NO es el vocabulario con el que se publica.
--
-- Mercado Libre expone dos atributos y son los que mandan, porque son los que
-- viajan en la publicacion:
--
--   ITEM_CONDITION : Nuevo | Usado | Reacondicionado | Caja abierta
--   GRADING        : Excelente | Bueno | Aceptable   (solo si es reacondicionado)
--
-- Guardar una escala propia obligaria a traducirla al publicar, y toda
-- traduccion entre vocabularios pierde algo: "like_new" no es ninguno de los
-- cuatro, y elegir a cual se parece mas es una decision que despues nadie
-- recuerda haber tomado. Se guarda lo que se publica.
--
-- GRADING va en su propia columna y no pegado a la condicion: solo aplica a uno
-- de los cuatro casos, y meterlo adentro obligaria a partir el texto para
-- saber cual es cual.
-- ===========================================================================

begin;

alter table catalog_producto_base drop column if exists condicion;

alter table catalog_producto_base
  add column if not exists condicion       text,
  add column if not exists condicion_grado text;

alter table catalog_producto_base drop constraint if exists producto_condicion_valida;
alter table catalog_producto_base add constraint producto_condicion_valida
  check (condicion is null or condicion in ('Nuevo','Usado','Reacondicionado','Caja abierta'));

alter table catalog_producto_base drop constraint if exists producto_grado_valido;
alter table catalog_producto_base add constraint producto_grado_valido
  check (
    condicion_grado is null
    -- El grado solo existe para reacondicionado: en los otros casos no
    -- significa nada, y permitirlo dejaria filas que dicen algo imposible.
    or (condicion = 'Reacondicionado' and condicion_grado in ('Excelente','Bueno','Aceptable'))
  );

comment on column catalog_producto_base.condicion is
  'Condicion del articulo con el vocabulario de ITEM_CONDITION de Mercado Libre. Se guarda lo que se publica, para no traducir al publicar.';
comment on column catalog_producto_base.condicion_grado is
  'GRADING de Mercado Libre. Solo aplica a Reacondicionado; el CHECK lo impone.';

-- Lo que ya existe es de Market y esta sin usar.
update catalog_producto_base set condicion = 'Nuevo' where condicion is null;

commit;
