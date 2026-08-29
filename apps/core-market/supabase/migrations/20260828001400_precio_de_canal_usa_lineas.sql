-- ===========================================================================
-- La caja y la vidriera respetan las líneas de precio
-- ===========================================================================
--
-- `precio_de_canal` es la única resolución de precio que usan la vidriera y el
-- checkout, a propósito: dos resoluciones separadas terminan discrepando, y la
-- forma en que eso se nota es que la tienda muestra un número y la caja cobra
-- otro. Así que las líneas entran acá o no rigen en ningún lado.
--
-- ORDEN DE PRECEDENCIA, DE MÁS ESPECÍFICO A MENOS
--   1. La línea vigente para ese destino en este momento.
--   2. El precio propio del canal (`catalog_canal_listing.precio`).
--   3. El precio de la variante.
--
-- Las dos últimas ya existían y no se tocan. Una migración que las apagara
-- dejaría sin precio a todo lo que ya está publicado.
--
-- EL PUENTE ENTRE DOS VOCABULARIOS
-- El checkout habla de canales -'market', 'secondhand', 'mercadolibre'- y las
-- líneas hablan de destinos -'web', 'ml'-. Son dos nomenclaturas que nacieron
-- por separado: la primera es dónde está publicado el artículo, la segunda es
-- dónde se lo cotiza.
--
-- `destino_de_canal` las une en un solo lugar, en vez de repartir el mapeo por
-- las funciones que lo necesiten. Es un puente, no un diseño: lo correcto a
-- futuro es que haya una sola nomenclatura, y mientras tanto conviene que la
-- traducción esté escrita una vez y a la vista.
-- ===========================================================================

begin;

create or replace function public.destino_de_canal(p_channel text)
returns text
language sql
immutable
as $$
  select case p_channel
    when 'market'       then 'web'   -- la vidriera propia
    when 'secondhand'   then 'web'   -- misma vidriera, otro tipo de articulo
    when 'mercadolibre' then 'ml'
    else p_channel                    -- el que ya coincida, pasa derecho
  end;
$$;

comment on function public.destino_de_canal(text) is
  'Puente entre los canales de publicacion y los destinos de precio. Provisorio: lo correcto es una sola nomenclatura.';

create or replace function public.precio_de_canal(p_variante_id uuid, p_channel text)
returns table(precio numeric, moneda text)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(lp.precio, l.precio, v.precio),
    coalesce(lp.moneda, l.moneda, v.moneda, 'UYU')
  from catalog_variante v
  left join catalog_canal_listing l
         on l.variante_id = v.id and l.channel = p_channel
  left join lateral (
    select p.precio, p.moneda
      from precio_vigente(v.id, destino_de_canal(p_channel)) p
  ) lp on true
  where v.id = p_variante_id
  limit 1;
$$;

comment on function public.precio_de_canal(uuid, text) is
  'El precio que rige en un canal: la linea vigente si hay, si no el precio propio del canal, si no el de la variante. Unica resolucion — la usan la vidriera y el checkout.';

grant execute on function public.destino_de_canal(text) to anon, authenticated;

commit;
