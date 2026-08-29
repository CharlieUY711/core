/**
 * Sólo se muestra la imagen que carga.
 *
 * EL PROBLEMA
 * Una búsqueda de imágenes en la web devuelve URLs, no imágenes. Muchas no se
 * pueden mostrar: el sitio bloquea el hotlinking, el archivo se movió, o
 * responde 403 a quien no venga de su propia página. El navegador entonces
 * dibuja el texto alternativo, y la grilla de logos termina siendo una lista de
 * frases —"Colinas de Garzón (@colinasdega · Maldonado"— entre las imágenes que
 * sí cargaron.
 *
 * Eso es peor que mostrar menos resultados: parece que el sistema encontró algo
 * y lo muestra mal, cuando en realidad eso no es una imagen que se pueda usar.
 * Si no se puede mostrar, no se ofrece.
 *
 * CÓMO
 * No se puede saber de antemano si una URL va a cargar: hay que intentarlo. Así
 * que se muestran todas y las que fallan se sacan cuando fallan. El salto es
 * mínimo —ocurre en el primer render— y la alternativa, precargarlas todas
 * antes de dibujar nada, deja la grilla vacía mientras tanto.
 */
import { useCallback, useState } from "react";

export interface ImagenesQueCargan {
  /** ¿Se puede mostrar esta URL? */
  sirve: (url: string | null | undefined) => boolean;
  /** Para el `onError` del `<img>`. */
  falló: (url: string | null | undefined) => void;
  /** Filtra una lista dejando sólo lo que carga. */
  filtrar: <T>(lista: T[], url: (x: T) => string | null | undefined) => T[];
}

export function useImagenesQueCargan(): ImagenesQueCargan {
  const [fallidas, setFallidas] = useState<Set<string>>(new Set());

  const falló = useCallback((url: string | null | undefined) => {
    if (!url) return;
    setFallidas((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  const sirve = useCallback(
    (url: string | null | undefined) => !!url && !fallidas.has(url),
    [fallidas],
  );

  const filtrar = useCallback(
    <T,>(lista: T[], url: (x: T) => string | null | undefined) =>
      lista.filter((x) => sirve(url(x))),
    [sirve],
  );

  return { sirve, falló, filtrar };
}
