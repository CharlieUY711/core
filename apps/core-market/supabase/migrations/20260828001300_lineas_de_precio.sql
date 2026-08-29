-- ===========================================================================
-- Líneas de precio: un precio, a qué destinos, y cuándo rige
-- ===========================================================================
--
-- QUÉ ES UNA LÍNEA
-- No es "el precio de un canal". Es un precio que aplica a UN CONJUNTO de
-- destinos durante UNA VENTANA de tiempo. Web y WhatsApp a $1.000 siempre, ML a
-- $1.200, y una tercera línea a $800 sólo los viernes de 18 a 22 para los tres:
-- son tres líneas, y ninguna se puede expresar como "el precio del canal X".
--
-- POR QUÉ AHORA Y NO DESPUÉS
-- La pantalla ya tiene la forma —N líneas, con sus destinos— y sus líneas
-- extra no se guardaban en ningún lado. Construir la persistencia contra el
-- modelo por canal y rehacerla cuando aparezcan las campañas cuesta más que
-- hacerla una vez completa. Las columnas de vigencia quedan creadas y vacías:
-- agregarles interfaz después es interfaz, no migración.
--
-- ESTO YA EXISTIÓ
-- `zz_deprecated_article_prices` tenía exactamente estos ejes —plataforma,
-- territorio, campaña, vigencia, horario, días, prioridad— y se reemplazó por
-- una columna `precio` en el listing de cada canal, que sólo sabe del eje
-- canal. Esto no inventa un modelo: recupera el que estaba.
--
-- QUÉ NO SE TOCA
-- `catalog_variante.precio` sigue siendo el precio base y la última palabra
-- cuando no hay ninguna línea. `catalog_canal_listing.precio` sigue existiendo
-- y se sigue respetando. Una migración que apagara los dos caminos anteriores
-- dejaría sin precio a todo lo que ya está publicado.
-- ===========================================================================

begin;

create table if not exists catalog_precio (
  id           uuid primary key default gen_random_uuid(),
  variante_id  uuid not null references catalog_variante(id) on delete cascade,

  -- A qué destinos aplica. Un arreglo y no una fila por destino porque una
  -- línea de la pantalla es una decisión: "estos tres, a este precio". Partirla
  -- en tres filas obliga a reconstruirla para poder editarla.
  destinos     text[] not null check (array_length(destinos, 1) >= 1),

  precio       numeric(14,2) not null check (precio > 0),
  moneda       text not null default 'UYU' check (moneda ~ '^[A-Z]{3}$'),

  -- La tasa de esta línea. NULL = la que le corresponda al artículo, igual que
  -- en `catalog_producto_base`.
  tax_rate_id  uuid references tax_rates(id),

  -- Cómo se llama esta línea para quien la mira: "Black Friday", "Precio
  -- mayorista". Sin esto, tres líneas distintas son tres números sin historia.
  etiqueta     text,

  -- ── Cuándo rige ────────────────────────────────────────────────────────
  -- Todo NULL significa "siempre", que es el caso normal y el único que la
  -- pantalla usa hoy.
  desde        timestamptz,
  hasta        timestamptz,

  -- Franja horaria del día. En hora de Montevideo, no UTC: una promo de 18 a
  -- 22 es de 18 a 22 en el negocio, y guardarla en UTC la corre tres horas.
  hora_desde   time,
  hora_hasta   time,

  -- Días de la semana en que aplica, 0 = domingo … 6 = sábado, igual que
  -- `extract(dow)`. NULL = todos.
  dias         smallint[] check (dias is null or dias <@ array[0,1,2,3,4,5,6]::smallint[]),

  -- Ante dos líneas que aplican al mismo destino en el mismo momento, gana la
  -- de prioridad más alta. Sin esto una promo no podría convivir con el precio
  -- de lista: habría que apagar uno para que rigiera el otro.
  prioridad    integer not null default 0,

  status       text not null default 'active'
               check (status = any (array['active','inactive'])),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists catalog_precio_variante_idx on catalog_precio (variante_id);
create index if not exists catalog_precio_destinos_idx on catalog_precio using gin (destinos);

comment on table catalog_precio is
  'Lineas de precio: un precio, a que destinos aplica y cuando rige. Recupera los ejes de zz_deprecated_article_prices, que se habian perdido al simplificar a un precio por canal.';
comment on column catalog_precio.destinos is
  'Destinos a los que aplica: web, ml, wa, ig, fb, otro. Arreglo porque una linea es una decision sobre varios a la vez.';
comment on column catalog_precio.dias is
  '0 = domingo … 6 = sabado, como extract(dow). NULL = todos los dias.';
comment on column catalog_precio.prioridad is
  'Mayor gana. Permite que una promo conviva con el precio de lista sin apagarlo.';

alter table catalog_precio enable row level security;

-- La vidriera necesita leer precios sin sesion. Escribir es otra cosa: lo hace
-- la RPC, que corre como el dueño de la tienda.
drop policy if exists catalog_precio_lectura on catalog_precio;
create policy catalog_precio_lectura
  on catalog_precio for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Qué precio rige
-- ---------------------------------------------------------------------------
create or replace function public.precio_vigente(
  p_variante_id uuid,
  p_destino     text,
  p_momento     timestamptz default now()
)
returns table (precio numeric, moneda text, etiqueta text, origen text)
language sql
stable
security definer
set search_path = public
as $$
  with local as (
    -- Las franjas horarias y los dias se evaluan en hora de Montevideo. En UTC
    -- una promo de viernes a la noche empieza el sabado.
    select (p_momento at time zone 'America/Montevideo') as t
  )
  select l.precio, l.moneda, l.etiqueta, 'linea'::text
    from catalog_precio l, local
   where l.variante_id = p_variante_id
     and p_destino = any (l.destinos)
     and l.status = 'active'
     and (l.desde      is null or p_momento >= l.desde)
     and (l.hasta      is null or p_momento <= l.hasta)
     and (l.dias       is null or extract(dow from local.t)::smallint = any (l.dias))
     and (l.hora_desde is null or local.t::time >= l.hora_desde)
     and (l.hora_hasta is null or local.t::time <= l.hora_hasta)
   order by l.prioridad desc, l.created_at desc
   limit 1;
$$;

comment on function public.precio_vigente(uuid, text, timestamptz) is
  'La linea de precio que rige para un destino en un momento. Mayor prioridad gana; horarios y dias se evaluan en hora de Montevideo.';

grant execute on function public.precio_vigente(uuid, text, timestamptz) to anon, authenticated;

commit;
