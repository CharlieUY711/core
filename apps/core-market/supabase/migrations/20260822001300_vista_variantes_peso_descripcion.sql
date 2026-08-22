-- ============================================================================
-- v_catalog_variants_full: exponer weight_g y description
-- ============================================================================
-- Error en pantalla: "Variant not found" al publicar en Mercado Libre.
--
-- No era un problema de permisos ni de datos. publicar-en-ml consulta la vista
-- pidiendo columnas que la vista no expone:
--
--     select id, sku, barcode, attributes, weight_g,
--            item_id, item_title, item_description:description, tags,
--            item_status, variant_status, tenant_id
--
-- `weight_g` y `description` no estaban en la vista, asi que PostgREST
-- rechazaba el select entero y la funcion interpretaba el fallo como variante
-- inexistente. Un tercer desajuste entre lo que el codigo de ML espera y lo
-- que el esquema ofrece, del mismo tipo que los de api_vault.
--
-- Ambas columnas SI existen en las tablas base: catalog_variants.weight_g y
-- catalog_items.description. El arreglo es aditivo: se exponen en la vista en
-- vez de recortar la funcion, porque el peso hace falta para el envio y la
-- descripcion es el cuerpo de la publicacion.
--
-- Se agregan AL FINAL del select: CREATE OR REPLACE VIEW solo admite ampliar
-- la lista de columnas por el final, nunca reordenar ni insertar en el medio.
--
-- Se conserva textual todo lo demas, incluido WITH (security_invoker=true),
-- que es lo que hace que auth.jwt() vea el token del llamador y el filtro por
-- tenant funcione.
-- ============================================================================

begin;

create or replace view public.v_catalog_variants_full
with (security_invoker = 'true') as
 select v.id,
    v.sku,
    v.barcode,
    v.attributes,
    v.price,
    v.compare_price,
    v.cost_price,
    v.status as variant_status,
    v.is_default,
    i.id as item_id,
    i.tenant_id,
    i.title as item_title,
    i.status as item_status,
    i.tags,
    t.path as taxonomy_path,
    t.name as taxonomy_name,
    coalesce(sum(inv.quantity) filter (where (inv.quantity is not null)), (0)::bigint) as total_stock,
    coalesce(sum(inv.available) filter (where (inv.available is not null)), (0)::bigint) as total_available,
    -- Agregadas 2026-08-22, al final por el requisito de CREATE OR REPLACE.
    v.weight_g,
    i.description
   from (((public.catalog_variants v
     join public.catalog_items i on ((i.id = v.item_id)))
     left join public.catalog_taxonomy t on ((t.id = i.taxonomy_node_id)))
     left join public.catalog_inventory inv on ((inv.variant_id = v.id)))
  where (i.tenant_id = ((auth.jwt() ->> 'store_id'::text))::uuid)
  group by v.id, i.id, t.path, t.name;

commit;

-- ── Verificacion ────────────────────────────────────────────────────────────
-- Las dos columnas nuevas deben figurar al final.
select column_name, ordinal_position
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'v_catalog_variants_full'
   and column_name in ('weight_g', 'description')
 order by ordinal_position;
