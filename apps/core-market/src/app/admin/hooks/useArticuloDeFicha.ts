/**
 * El artículo que sale de una ficha de Biblioteca.
 *
 * POR QUÉ ES UN HOOK Y NO ESTÁ ESCRITO EN LA PANTALLA
 * Lo necesitan dos lugares: la fila desplegada de la Biblioteca -donde se carga
 * y se edita, que es lo acordado- y la ruta `/admin/biblioteca/articulo/:id`,
 * que existe para poder enlazar un artículo desde afuera. Es el mismo artículo
 * resuelto de la misma forma; escrito dos veces serían dos formas apenas los
 * toque alguien.
 *
 * LO QUE RESUELVE
 * La Biblioteca lista FICHAS y el editor trabaja sobre PUBLICACIONES. El
 * vínculo es `catalog_producto_base.ficha_id`, que existe desde la migración
 * `biblioteca_es_la_fuente`. Acá se traduce:
 *
 *   ficha con publicación → esa publicación, para editarla.
 *   ficha sin publicación → todavía no se vende: un alta con lo que la ficha ya
 *                           sabe, para no volver a escribirlo. Sin `id`, así el
 *                           formulario crea en vez de actualizar.
 *   sin ficha             → un artículo nuevo, de cero.
 */
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase/client";
import { Art, toArt } from "../ui/articulo";
import { publicacionDeFicha } from "./useCatalogPublicaciones";

export interface ArticuloResuelto {
  articulo: Art | undefined;
  cargando: boolean;
  error: string | null;
}

export function useArticuloDeFicha(fichaId?: string | null): ArticuloResuelto {
  const [articulo, setArticulo] = useState<Art | undefined>();
  const [cargando, setCargando] = useState(!!fichaId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fichaId) { setArticulo(undefined); setCargando(false); setError(null); return; }
    let vivo = true;

    (async () => {
      setCargando(true);
      try {
        const p = await publicacionDeFicha(fichaId);
        if (!vivo) return;
        if (p) { setArticulo(toArt(p)); setError(null); setCargando(false); return; }

        const { data, error: e } = await supabase
          .from("catalogo_market")
          .select("id, marca, nombre, descripcion, imagen, precio_ref, moneda")
          .eq("id", fichaId)
          .maybeSingle();
        if (!vivo) return;

        if (e) { setError(e.message); setCargando(false); return; }
        if (!data) {
          setError("Esa ficha no está en la Biblioteca de esta tienda.");
          setCargando(false); return;
        }

        setError(null);
        setArticulo({
          // Sin `id`: es un alta. Ver `articulo?.id` en AdminArticulos.
          nombre:      data.nombre ?? "",
          descripcion: data.descripcion ?? undefined,
          imagen_principal: data.imagen ?? undefined,
          precio:      data.precio_ref ?? 0,
          moneda:      data.moneda ?? "UYU",
          stock:       1,
        } as unknown as Art);
        setCargando(false);
      } catch (err: any) {
        if (!vivo) return;
        /* Un fallo acá no puede quedarse en un formulario vacío que parece un
           alta: se dice qué pasó. */
        setError(err?.message ?? String(err));
        setCargando(false);
      }
    })();

    return () => { vivo = false; };
  }, [fichaId]);

  return { articulo, cargando, error };
}
