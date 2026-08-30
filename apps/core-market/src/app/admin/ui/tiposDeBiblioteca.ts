/**
 * Qué se está mirando en la Biblioteca.
 *
 * UN SELECTOR, DOS LUGARES
 * El tipo se elige en la barra de arriba y también adentro del buscador. NO son
 * dos filtros: es el mismo, dibujado dos veces. Los dos leen y escriben el
 * mismo estado, así que cambiar uno mueve al otro y manda siempre el último
 * gesto del usuario.
 *
 * Está acá y no en la pantalla para que esa promesa sea estructural: mientras
 * los dos controles se construyan de esta lista, no pueden ofrecer opciones
 * distintas ni quedar desincronizados. Si cada uno tuviera su propia lista,
 * agregar un tipo sería acordarse de dos lugares — y el día que alguien se
 * olvide, el filtro "no anda" sin que nadie sepa por qué.
 *
 * POR QUÉ "MULTIMEDIA" Y NO "IMÁGENES"
 * Porque también hay videos, y se suben desde el mismo lugar. Con la etiqueta
 * "Imágenes" los videos entraban igual —el filtro los incluía— pero nadie
 * podía adivinar que estaban ahí: el nombre escondía la mitad del contenido.
 * Un filtro que muestra más de lo que promete se siente roto aunque funcione.
 */
import type { MediaTipo } from "../../hooks/useMediaLibrary";

export type TipoDeBiblioteca = "todo" | "articulos" | "multimedia" | "documentos";

export interface DefinicionDeTipo {
  id: TipoDeBiblioteca;
  label: string;
  /** Qué archivos muestra. `null` = ninguno (un artículo no es un archivo). */
  medios: MediaTipo[] | null;
  /** Si además muestra fichas de artículo. */
  fichas: boolean;
}

export const TIPOS_DE_BIBLIOTECA: DefinicionDeTipo[] = [
  { id: "todo",       label: "Todo",       medios: ["imagen", "video", "documento"], fichas: true  },
  { id: "articulos",  label: "Artículos",  medios: null,                             fichas: true  },
  { id: "multimedia", label: "Multimedia", medios: ["imagen", "video"],              fichas: false },
  { id: "documentos", label: "Documentos", medios: ["documento"],                    fichas: false },
];

export const definicionDe = (t: TipoDeBiblioteca): DefinicionDeTipo =>
  TIPOS_DE_BIBLIOTECA.find(d => d.id === t) ?? TIPOS_DE_BIBLIOTECA[0];
