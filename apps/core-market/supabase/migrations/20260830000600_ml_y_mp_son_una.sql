-- Mercado Libre y Mercado Pago son UNA sola conexión.
--
-- Estaban como dos filas del catálogo y no son dos cosas: llevan a la MISMA
-- pantalla (`/admin/ml`, que se llama "MercadoLibre & MercadoPago"), las
-- resuelve la MISMA función (`ml-oauth`, con un parámetro), y usan la MISMA app
-- de desarrollador — los Secrets `ML_SECRETS_MERCADOLIBRE_MLU` y
-- `ML_SECRETS_MERCADOPAGO_MLU` tienen el mismo valor.
--
-- Dos filas para una conexión obligan a mirar dos renglones para responder una
-- sola pregunta: "¿está conectado Mercado Libre?".
--
-- UNA FILA NO TIENE QUE PERDER INFORMACIÓN
-- Fusionar con una sola `vault_platform` habría escondido el estado de Mercado
-- Pago. Por eso se agrega `vault_platforms`: una app puede tocar varias
-- plataformas del Vault y la pantalla las suma.
--
-- No es un caso aislado: Meta ya era una fila para TRES plataformas
-- —Instagram, Facebook y WhatsApp— y mostraba sólo el estado de Instagram
-- porque la columna alcanzaba para una. Esto arregla las dos.
--
-- `vault_platform` SE QUEDA. Es lo que hoy leen otras cosas, y sacarla sería un
-- cambio que no hace falta para esto. `vault_platforms` es la que manda cuando
-- está; la vieja queda como el caso de una sola.

alter table public.plataforma_apps
  add column if not exists vault_platforms text[];

-- Lo que ya había: cada app con su única plataforma.
update public.plataforma_apps
   set vault_platforms = case
         when vault_platform is null then null
         else array[vault_platform]
       end
 where vault_platforms is null;

-- Las dos que tocan varias.
update public.plataforma_apps
   set vault_platforms = array['Instagram', 'Facebook', 'WhatsApp']
 where codigo = 'meta';

update public.plataforma_apps
   set nombre          = 'ML & MP',
       para            = 'Publicar y sincronizar en Mercado Libre, y cobrar con Mercado Pago.',
       vault_platforms = array['MercadoLibre', 'MercadoPago']
 where codigo = 'ml';

-- Y se va la fila repetida. Se borra al final, cuando la que queda ya sabe
-- cubrir las dos plataformas: si se borrara antes, entre una cosa y la otra
-- Mercado Pago no estaría en ningún lado.
delete from public.plataforma_apps where codigo = 'mp';

-- La función devuelve la columna nueva.
--
-- Se BORRA primero: `create or replace` no puede cambiar el tipo de retorno de
-- una función que ya existe, y agregar una columna a un `returns table` es
-- justamente eso. Postgres avisa con "cannot change return type of existing
-- function", que no dice cuál es la salida.
drop function if exists public.catalogo_de_apps(boolean);

create function public.catalogo_de_apps(p_todas boolean default false)
returns table (
  codigo text, tipo text, nombre text, icono text, para text,
  orden integer, en_sidebar boolean, solo_tiendas boolean,
  solo_plataforma boolean, activa boolean,
  vault_platform text, vault_platforms text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plataforma boolean := soy_la_plataforma();
begin
  if p_todas and not v_plataforma then
    raise exception 'Sólo CORE Market ve las que están apagadas.' using errcode = '42501';
  end if;

  return query
    select a.codigo, a.tipo, a.nombre, a.icono, a.para,
           a.orden, a.en_sidebar, a.solo_tiendas, a.solo_plataforma,
           a.activa, a.vault_platform, a.vault_platforms
      from plataforma_apps a
     -- Sin filtro cuando es el configurador. Con filtro cuando es la vista de
     -- uso: ahí `solo_tiendas` y `solo_plataforma` sí tienen que actuar.
     where p_todas
        or (a.activa
            and not (a.solo_tiendas    and v_plataforma)
            and not (a.solo_plataforma and not v_plataforma))
     order by a.orden, a.nombre;
end;
$$;

grant  execute on function public.catalogo_de_apps(boolean) to authenticated;
revoke execute on function public.catalogo_de_apps(boolean) from public;
revoke execute on function public.catalogo_de_apps(boolean) from anon;
