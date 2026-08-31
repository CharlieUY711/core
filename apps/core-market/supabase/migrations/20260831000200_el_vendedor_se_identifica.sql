-- ===========================================================================
-- El Vendedor se identifica con un documento
-- ===========================================================================
--
-- Ver docs/architecture/vendedor.md.
--
-- NO HAY DOS CLASES DE VENDEDOR
-- Una empresa y un particular no se tratan distinto. La unica diferencia real
-- entre los dos es CON QUE DOCUMENTO se identifican: numero de registro fiscal
-- en un caso, documento de identidad en el otro. Todo lo demas -miembros,
-- catalogo, medios, ordenes, canales- funciona igual.
--
-- Lo que lo justifica solo: un particular que se formaliza cambia su documento
-- y nada mas. No cambia de naturaleza, no migra su catalogo, no pierde sus
-- publicaciones. Con dos clases, formalizarse seria una migracion.
--
-- POR ESO ES UN SOLO PAR DE CAMPOS Y NO DOS CAMINOS
-- Con `rut` y `cedula` como columnas separadas, cada consulta que quiera
-- identificar a un vendedor tiene que preguntar cual de las dos mirar, y ese
-- `if` se replica por todo el codigo. Con clase + numero, se lee uno.
--
-- QUE NO HACE ESTA MIGRACION
-- No valida el formato. Un RUT uruguayo tiene 12 digitos y un digito
-- verificador; una cedula, 8 y el suyo. Validar depende del pais y es un cambio
-- aparte: aca solo se guarda CON QUE se identifica.
--
-- Y no lo exige: los vendedores que ya existen no tienen documento cargado, y
-- ponerlo obligatorio los dejaria sin poder guardarse. Se exige cuando haya con
-- que completarlos.
-- ===========================================================================

begin;

alter table public.stores
  add column if not exists documento_clase  text,
  add column if not exists documento_numero text;

comment on column public.stores.documento_clase is
  'Con qué se identifica el vendedor: rut (registro fiscal) o ci (documento de identidad). La única diferencia entre una empresa y un particular.';
comment on column public.stores.documento_numero is
  'El número, tal como se escribe. Sin validar: el formato depende del país y es otro cambio.';

-- Las clases que existen. Es una restriccion y no una tabla porque son dos y no
-- se agregan solas: el dia que haya un tercer pais con otro documento, se
-- agrega aca a proposito.
alter table public.stores
  drop constraint if exists stores_documento_clase_valida;
alter table public.stores
  add constraint stores_documento_clase_valida
  check (documento_clase is null or documento_clase in ('rut', 'ci'));

-- Un documento identifica a UN vendedor. Dos vendedores con el mismo numero es
-- o un duplicado o una suplantacion, y las dos cosas hay que verlas cuando
-- pasan y no despues.
--
-- Parcial: los que todavia no tienen documento no chocan entre si.
create unique index if not exists stores_documento_unico
  on public.stores (documento_clase, documento_numero)
  where documento_clase is not null and documento_numero is not null;

commit;
