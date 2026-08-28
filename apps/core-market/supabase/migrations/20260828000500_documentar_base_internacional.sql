-- ===========================================================================
-- Documentar lo que ya existe en produccion: paises, territorios, idiomas,
-- monedas y traducciones
-- ===========================================================================
--
-- POR QUE ESTA MIGRACION NO CREA NADA NUEVO
-- Estas cinco tablas existen en produccion con datos cargados, pero NINGUNA
-- tiene migracion en este repo: se crearon por fuera. O sea que hoy un
-- `db reset` se lleva puestos los cinco paises, los ocho territorios, los diez
-- idiomas y las siete monedas, y nadie se entera hasta que algo los busca.
--
-- Todo va con IF NOT EXISTS / ON CONFLICT DO NOTHING: contra produccion no
-- cambia nada, contra una base limpia la deja igual que produccion.
--
-- RLS: LAS TRES ESTABAN CERRADAS
-- `currencies`, `languages` y `translations` tienen RLS prendida y CERO
-- policies, o sea que desde el cliente no las lee nadie. Eso explica por que
-- el codigo no las usa: no puede. El formulario del articulo terminó con
-- `MONEDAS = ["UYU","USD","EUR"]` escrito a mano al lado de una tabla con
-- siete monedas que no podia leer.
--
-- Son tablas de referencia -nomencladores publicos, no datos de nadie-, asi
-- que se leen sin sesion y no las escribe nadie desde el cliente.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Idiomas
-- ---------------------------------------------------------------------------
create table if not exists languages (
  code        text primary key,
  name        text not null,
  native_name text,
  status      text not null default 'active'
              check (status = any (array['active','inactive'])),
  created_at  timestamptz not null default now()
);

insert into languages (code, name, native_name) values
  ('es','Spanish','Español'), ('en','English','English'),
  ('pt','Portuguese','Português'), ('fr','French','Français'),
  ('zh','Chinese','中文'), ('ar','Arabic','العربية'),
  ('de','German','Deutsch'), ('it','Italian','Italiano'),
  ('ja','Japanese','日本語'), ('ko','Korean','한국어')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Monedas
-- ---------------------------------------------------------------------------
-- `decimals` no es decorativo: es cuantos decimales tiene la moneda, y es lo
-- que hay que usar para redondear. Un precio en pesos con centesimos no
-- existe.
create table if not exists currencies (
  code       char(3) primary key,
  name       text not null,
  symbol     text,
  decimals   smallint not null default 2,
  status     text not null default 'active'
             check (status = any (array['active','inactive'])),
  created_at timestamptz not null default now()
);

insert into currencies (code, name, symbol, decimals) values
  ('UYU','Peso uruguayo','$U',2),  ('USD','Dólar estadounidense','$',2),
  ('EUR','Euro','€',2),            ('ARS','Peso argentino','$',2),
  ('BRL','Real','R$',2),           ('PYG','Guaraní','₲',2),
  ('CLP','Peso chileno','$',2)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Paises y territorios
-- ---------------------------------------------------------------------------
create table if not exists countries (
  id         uuid primary key default gen_random_uuid(),
  iso_code   text not null unique,
  name       text not null,
  status     text not null default 'active'
             check (status = any (array['active','inactive'])),
  created_at timestamptz not null default now()
);

insert into countries (iso_code, name) values
  ('UY','Uruguay'), ('AR','Argentina'), ('BR','Brasil'),
  ('CL','Chile'),   ('PY','Paraguay')
on conflict (iso_code) do nothing;

-- El territorio no es "el pais": adentro de un pais hay regimenes distintos.
-- Una zona franca no paga los mismos impuestos que el territorio nacional, y
-- eso no es un detalle contable — cambia el precio final de la misma venta.
-- Por eso la distincion vive en el modelo desde el principio.
create table if not exists territories (
  id             uuid primary key default gen_random_uuid(),
  country_id     uuid not null references countries(id),
  territory_type text not null
                 check (territory_type = any (array['national','free_zone','bonded','free_port','special_regime'])),
  name           text not null,
  code           text,
  status         text not null default 'active'
                 check (status = any (array['active','inactive'])),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

insert into territories (country_id, territory_type, name, code)
select c.id, t.tipo, t.nombre, t.codigo
  from countries c
  join (values
    ('UY','national', 'Uruguay — Territorio Nacional',   'UY-NAT'),
    ('UY','free_zone','Zonamerica',                      'UY-FZ-ZA'),
    ('UY','free_zone','Aguada Park',                     'UY-FZ-AP'),
    ('AR','national', 'Argentina — Territorio Nacional', 'AR-NAT'),
    ('BR','national', 'Brasil — Territorio Nacional',    'BR-NAT'),
    ('CL','national', 'Chile — Territorio Nacional',     'CL-NAT'),
    ('PY','national', 'Paraguay — Territorio Nacional',  'PY-NAT'),
    ('PY','free_zone','Ciudad del Este',                 'PY-FZ-CE')
  ) as t(iso, tipo, nombre, codigo) on t.iso = c.iso_code
 where not exists (select 1 from territories x where x.code = t.codigo);

-- ---------------------------------------------------------------------------
-- Traducciones
-- ---------------------------------------------------------------------------
-- Generica a proposito: traduce cualquier campo de cualquier entidad sin que
-- las tablas traducidas sepan que existen las traducciones. Agregar un idioma
-- son filas, no columnas.
create table if not exists translations (
  id            uuid primary key default gen_random_uuid(),
  language_code text not null references languages(code),
  entity_type   text not null,
  entity_id     uuid not null,
  field         text not null,
  value         text,
  status        text not null default 'active'
                check (status = any (array['active','inactive','draft'])),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (language_code, entity_type, entity_id, field)
);

-- ---------------------------------------------------------------------------
-- Quien las lee
-- ---------------------------------------------------------------------------
alter table languages   enable row level security;
alter table currencies  enable row level security;
alter table countries   enable row level security;
alter table territories enable row level security;

drop policy if exists languages_lectura_publica   on languages;
drop policy if exists currencies_lectura_publica  on currencies;
drop policy if exists countries_lectura_publica   on countries;
drop policy if exists territories_lectura_publica on territories;

create policy languages_lectura_publica   on languages   for select to anon, authenticated using (true);
create policy currencies_lectura_publica  on currencies  for select to anon, authenticated using (true);
create policy countries_lectura_publica   on countries   for select to anon, authenticated using (true);
create policy territories_lectura_publica on territories for select to anon, authenticated using (true);

-- `translations` queda cerrada por ahora: cuando se use, la lectura se abre
-- junto con la entidad que traduce, no antes. Abrir una tabla "por las dudas"
-- es exponer lo que todavia no sabemos que va a contener.

commit;
