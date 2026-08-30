-- ===========================================================================
-- La información va de Market a las tiendas, nunca al revés
-- ===========================================================================
--
-- LA REGLA
-- Una tienda habilitada puede usar lo que sabe Market. Market NO puede usar lo
-- que sabe una tienda. Y una tienda tampoco puede ver lo de otra.
--
-- Es direccional a propósito: lo que Market sabe es conocimiento del mundo
-- —lo que publica un fabricante— y sirve a todos. Lo que sabe una tienda es
-- suyo: cómo llama a sus productos, qué corrigió, qué descubrió. Eso no se
-- comparte hacia arriba ni hacia el costado.
--
-- LO QUE HABÍA, Y NO CUMPLÍA NADA DE ESO
--
--   1. `catalogo_market` tenía SELECT abierto: `using (true)` para todo
--      autenticado. Cualquier tienda podía leer las fichas de cualquier otra
--      con una consulta directa. `buscar_en_biblioteca` filtraba bien, pero la
--      tabla no, y la tabla es lo que manda.
--
--   2. `guardar_catalogo_market` escribe en el catálogo COMPARTIDO y estaba
--      concedida a `authenticated` y a `anon`. O sea: cualquiera, incluso sin
--      iniciar sesión, podía escribir en lo que ven todas las tiendas. Y lo
--      llamaba el navegador de una tienda cada vez que leía un catálogo, que
--      es exactamente la dirección prohibida.
--
--   3. Esa función además estaba ROTA desde el 28/08: su
--      `on conflict (marca_norm, nombre_norm)` apunta a un índice único que se
--      eliminó al agregar `tenant_id` a la identidad de la ficha. Fallaba en
--      cada llamada, y el cliente sólo hacía `console.warn`. Nunca guardó
--      nada, y nadie se enteró.
--
-- CÓMO QUEDA
--   Market lo escribe la plataforma (`service_role`), y sólo ella.
--   Una tienda que lee un catálogo lo guarda en SU biblioteca.
--   Las dos se leen juntas al buscar; ninguna escribe en la otra.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Nadie lee lo que no es suyo
-- ---------------------------------------------------------------------------
drop policy if exists catalogo_market_lectura on catalogo_market;

create policy catalogo_market_lectura on catalogo_market
  for select to authenticated
  using (
    -- Lo de la plataforma: para todas las tiendas habilitadas.
    tenant_id is null
    -- Y lo propio. Nada más.
    or tenant_id = ((auth.jwt() ->> 'store_id')::uuid)
  );

comment on policy catalogo_market_lectura on catalogo_market is
  'Market hacia las tiendas, y cada tienda lo suyo. Una tienda no ve lo de otra.';

-- ---------------------------------------------------------------------------
-- 2. El catálogo compartido lo escribe la plataforma
-- ---------------------------------------------------------------------------
-- Se arregla el `on conflict` -apuntaba a un índice que ya no existe- y se
-- deja explícito el `tenant_id null`: esto es de la plataforma, y depender de
-- que la columna no se mencione es depender de un descuido.
create or replace function public.guardar_catalogo_market(
  p_marca  text,
  p_fuente text,
  p_items  jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer := 0;
  it  jsonb;
begin
  if coalesce(btrim(p_marca), '') = '' then
    raise exception 'El catálogo necesita una marca.' using errcode = '22023';
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    continue when coalesce(btrim(it ->> 'nombre'), '') = '';

    insert into catalogo_market (
      tenant_id, marca, marca_norm, fuente, nombre, nombre_norm,
      familia, descripcion, precio_ref, moneda, leido_at
    ) values (
      null,                                    -- de la plataforma, siempre
      btrim(p_marca), normalizar_texto(p_marca),
      coalesce(nullif(btrim(p_fuente), ''), 'desconocida'),
      btrim(it ->> 'nombre'), normalizar_texto(it ->> 'nombre'),
      nullif(btrim(coalesce(it ->> 'familia', '')), ''),
      nullif(btrim(coalesce(it ->> 'descripcion', '')), ''),
      (it ->> 'precio')::numeric,
      nullif(btrim(coalesce(it ->> 'moneda', '')), ''),
      now()
    )
    -- El índice real: (coalesce(tenant_id, ceros), marca_norm, nombre_norm).
    on conflict (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                 marca_norm, nombre_norm)
    do update set
      familia     = coalesce(excluded.familia,     catalogo_market.familia),
      descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
      precio_ref  = coalesce(excluded.precio_ref,  catalogo_market.precio_ref),
      moneda      = coalesce(excluded.moneda,      catalogo_market.moneda),
      fuente      = excluded.fuente,
      leido_at    = now();

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

comment on function public.guardar_catalogo_market(text, text, jsonb) is
  'Escribe el catálogo COMPARTIDO de Market. Sólo la plataforma: una tienda no alimenta a Market.';

revoke execute on function public.guardar_catalogo_market(text, text, jsonb) from anon;
revoke execute on function public.guardar_catalogo_market(text, text, jsonb) from authenticated;
grant  execute on function public.guardar_catalogo_market(text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Una tienda guarda lo que lee en SU biblioteca
-- ---------------------------------------------------------------------------
-- Es el reemplazo del camino anterior, no su prohibición: lo que la tienda
-- descubre no se pierde, deja de subir a Market. Sirve para ella, que es de
-- quien es.
create or replace function public.guardar_fichas_biblioteca(
  p_marca  text,
  p_fuente text,
  p_items  jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := ((auth.jwt() ->> 'store_id')::uuid);
  v_n integer := 0;
  it  jsonb;
begin
  if v_tenant is null then
    raise exception 'No hay tienda en la sesión.' using errcode = '42501';
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    continue when coalesce(btrim(it ->> 'nombre'), '') = '';

    -- Si Market ya lo sabe, no se copia: se usa el de Market. Copiarlo seria
    -- volver a tener dos fichas del mismo producto, que es justo lo que la
    -- identidad unica viene a evitar.
    continue when exists (
      select 1 from catalogo_market
       where tenant_id is null
         and marca_norm  = normalizar_texto(p_marca)
         and nombre_norm = normalizar_texto(it ->> 'nombre'));

    insert into catalogo_market (
      tenant_id, marca, marca_norm, fuente, nombre, nombre_norm,
      familia, descripcion, precio_ref, moneda, leido_at
    ) values (
      v_tenant,
      btrim(p_marca), normalizar_texto(p_marca),
      coalesce(nullif(btrim(p_fuente), ''), 'desconocida'),
      btrim(it ->> 'nombre'), normalizar_texto(it ->> 'nombre'),
      nullif(btrim(coalesce(it ->> 'familia', '')), ''),
      nullif(btrim(coalesce(it ->> 'descripcion', '')), ''),
      (it ->> 'precio')::numeric,
      nullif(btrim(coalesce(it ->> 'moneda', '')), ''),
      now()
    )
    on conflict (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                 marca_norm, nombre_norm)
    do update set
      familia     = coalesce(excluded.familia,     catalogo_market.familia),
      descripcion = coalesce(excluded.descripcion, catalogo_market.descripcion),
      precio_ref  = coalesce(excluded.precio_ref,  catalogo_market.precio_ref),
      moneda      = coalesce(excluded.moneda,      catalogo_market.moneda),
      leido_at    = now();

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

comment on function public.guardar_fichas_biblioteca(text, text, jsonb) is
  'Guarda en la Biblioteca de la tienda lo que ella leyó. No sube a Market: la información va de Market a las tiendas, no al revés.';

grant execute on function public.guardar_fichas_biblioteca(text, text, jsonb) to authenticated;

commit;
