/**
 * Lo que hay en la Biblioteca, sea lo que sea.
 *
 * POR QUÉ UNA SOLA LISTA Y NO DOS
 * La Biblioteca guarda dos cosas de naturaleza distinta: fichas de artículo
 * —lo que la tienda SABE de un producto, en `catalogo_market`— y archivos
 * —fotos, videos y documentos, en `media_library`. Vienen de tablas distintas
 * y tienen columnas distintas.
 *
 * Pero para la pantalla son lo mismo: cosas que se buscan, se eligen, se
 * muestran en grilla o en lista y se borran. Si esa diferencia llegara hasta la
 * vista, "Todo" tendría que dibujar dos grillas, el selector de presentación
 * valdría para una sola, y cada vista nueva habría que escribirla dos veces.
 *
 * Acá se normalizan a una forma común, y de ahí para arriba nadie pregunta de
 * qué tabla salió. Lo específico sigue disponible en `media` y `ficha` para
 * quien lo necesite —borrar un archivo no es borrar una ficha— pero no se paga
 * en cada lugar que sólo quiere mostrarlo.
 *
 * LAS FICHAS NO SE FILTRAN ACÁ POR TEXTO
 * Las busca el servidor: `buscar_en_biblioteca` ya recibe el texto y ordena lo
 * propio antes que lo compartido. Repetir el filtro en el navegador sería
 * decidir dos veces la misma cosa, y en cuanto una de las dos cambie dejan de
 * coincidir.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useMediaLibrary, MediaItem } from "../../hooks/useMediaLibrary";
import { TipoDeBiblioteca, definicionDe } from "../ui/tiposDeBiblioteca";

export interface FichaDeBiblioteca {
  id: string; marca: string; nombre: string; familia: string | null;
  descripcion: string | null; imagen: string | null;
  precio_ref: number | null; moneda: string | null; fuente: string | null;
  propia: boolean; leido_at: string;
}

export type ClaseDeElemento = "articulo" | "imagen" | "video" | "documento";

export interface ElementoDeBiblioteca {
  id: string;
  clase: ClaseDeElemento;
  nombre: string;
  /** La segunda línea: marca y familia en un artículo, peso y fecha en un archivo. */
  sub: string;
  /** URL de la miniatura, o "" si no tiene y hay que dibujar un ícono. */
  thumb: string;
  fecha: string;
  media?: MediaItem;
  ficha?: FichaDeBiblioteca;
}

export function useElementosDeBiblioteca(tipo: TipoDeBiblioteca, texto: string) {
  const def = definicionDe(tipo);

  // Los archivos se piden todos y se filtran acá: el hook de medios toma un
  // tipo, y estas vistas agrupan varios ("Multimedia" son imagen y video).
  const { items, loading: cargandoMedios, reload, deleteItem, stats } =
    useMediaLibrary({ search: texto });

  const [fichas, setFichas] = useState<FichaDeBiblioteca[]>([]);
  const [cargandoFichas, setCargandoFichas] = useState(false);
  const [errorFichas, setErrorFichas] = useState<string | null>(null);

  const traerFichas = useCallback(async () => {
    if (!def.fichas) { setFichas([]); setErrorFichas(null); return; }
    setCargandoFichas(true);
    const { data, error } = await supabase.rpc("buscar_en_biblioteca", {
      p_texto: texto ?? "", p_limite: 100,
    });
    // Un error acá no puede vaciar la pantalla en silencio: sin fichas y sin
    // aviso, la Biblioteca parece vacía y nadie sabe que falló algo.
    if (error) {
      console.warn("[biblioteca] no se pudieron leer las fichas:", error.message);
      setErrorFichas(error.message);
      setFichas([]);
    } else {
      setErrorFichas(null);
      setFichas((data ?? []) as FichaDeBiblioteca[]);
    }
    setCargandoFichas(false);
  }, [def.fichas, texto]);

  useEffect(() => { void traerFichas(); }, [traerFichas]);

  const thumbDeMedio = (m: MediaItem): string => {
    if (m.tipo === "documento") return "";
    if (m.tipo === "video") {
      return m.thumbnail_path
        ? supabase.storage.from("biblioteca").getPublicUrl(m.thumbnail_path).data.publicUrl
        : "";
    }
    const url = supabase.storage.from(m.bucket).getPublicUrl(m.path).data.publicUrl;
    return `${url}?width=400&height=400&resize=cover`;
  };

  const kb = (b: number) => !b ? "?"
    : b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`;

  const elementosDeMedios: ElementoDeBiblioteca[] = (def.medios ? items : [])
    .filter(m => def.medios!.includes(m.tipo))
    .map(m => ({
      id: m.id, clase: m.tipo as ClaseDeElemento, nombre: m.nombre,
      sub: `${kb(m.size_bytes)} · ${new Date(m.created_at).toLocaleDateString("es-UY")}`,
      thumb: thumbDeMedio(m), fecha: m.created_at, media: m,
    }));

  const elementosDeFichas: ElementoDeBiblioteca[] = fichas.map(f => ({
    id: f.id, clase: "articulo", nombre: f.nombre,
    sub: [f.marca, f.familia].filter(Boolean).join(" · ") || "Sin marca",
    thumb: f.imagen ?? "", fecha: f.leido_at, ficha: f,
  }));

  // Los artículos primero: son lo que se busca cuando se busca algo, y los
  // archivos son lo que lo acompaña.
  const elementos = [...elementosDeFichas, ...elementosDeMedios];

  return {
    elementos,
    /** Los archivos crudos. Los necesita quien distingue archivo de ficha. */
    items,
    stats,
    loading: cargandoMedios || cargandoFichas,
    errorFichas,
    reload: () => { reload(); void traerFichas(); },
    deleteItem,
    conteos: {
      articulos:  elementosDeFichas.length,
      multimedia: items.filter(m => m.tipo === "imagen" || m.tipo === "video").length,
      documentos: items.filter(m => m.tipo === "documento").length,
      total:      elementosDeFichas.length + items.length,
    },
  };
}
