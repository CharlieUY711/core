/**
 * El artículo, abierto desde la Biblioteca.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ACÁ Y NO EN PUBLICACIONES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Está decidido desde `20260829000000_biblioteca_es_la_fuente`: Biblioteca es
 * lo que la tienda SABE, Publicaciones es lo que OFRECE, y se ofrece algo que
 * ya se sabe —una publicación es una ficha a la que se le puso precio y canal—.
 *
 * La base lo cumple desde entonces: un trigger ata cada publicación a su ficha
 * y no se puede crear una sin la otra. La pantalla no había seguido: el alta y
 * la edición vivían adentro de Publicaciones, que es al revés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTO NO ES OTRO EDITOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es el mismo `AdminArticulos` de siempre, con el artículo resuelto antes de
 * montarlo. Escribir un editor propio para la Biblioteca sería la segunda
 * implementación de lo mismo, y ya vimos cómo termina: el editor de pestañas
 * que Publicaciones tenía quedó atrás de cada mejora hecha del lado del alta.
 *
 * LO QUE VIENE EN LA URL ES EL ID DE LA FICHA, NO EL DE LA PUBLICACIÓN
 * Porque la Biblioteca lista fichas. Acá se traduce:
 *
 *   ficha con publicación  → se abre esa publicación, y se edita.
 *   ficha sin publicación  → todavía no se vende: se abre el alta con lo que
 *                            la ficha ya sabe, para no volver a escribirlo.
 *   sin id                 → un artículo nuevo, de cero.
 */
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Pantalla, usePantalla } from "../components/Pantalla";
import AdminArticulos from "./AdminArticulos";
import { useArticuloDeFicha } from "../hooks/useArticuloDeFicha";

const AVISO: React.CSSProperties = {
  padding: "3rem", textAlign: "center", color: "var(--gray-400)",
  fontSize: "0.85rem",
};

export default function ArticuloDeBiblioteca() {
  const p = usePantalla();
  const { id } = useParams();               // el id de la FICHA, no el de la publicación
  const [params] = useSearchParams();
  const navegar = useNavigate();

  /* La resolución ficha -> publicación vive en el hook: la comparte con la fila
     desplegada de la Biblioteca, que es donde se carga y se edita a diario.
     Esta ruta existe para poder ENLAZAR un artículo desde afuera. */
  const { articulo, cargando, error } = useArticuloDeFicha(id);

  const volver = () => navegar("/admin/biblioteca");

  /* La barra, el ancho y el error los pone `Pantalla`, como en todas: sin esto
     el editor sería la única vista del panel con su propio marco. Sin buscador:
     acá no hay nada que buscar, y `Pantalla` lo admite. Guardar y Cancelar los
     sigue dibujando el formulario; subirlos a la barra es tocar sus 3600 líneas
     y es otro cambio. */
  return (
    <Pantalla p={p}
      explicacion={id
        ? "El artículo: lo que la tienda sabe del producto. Dónde se ofrece se decide en Publicaciones."
        : "Un artículo nuevo. Al guardarlo queda en la Biblioteca; dónde se ofrece se decide en Publicaciones."}
      error={error}
      /* La salida va en su lugar fijo, no entre las acciones: volver no es algo
         que la vista haga, es cómo se sale de ella. */
      volver={{ a: "Biblioteca", onVolver: volver }}>

      {cargando ? (
        <div style={AVISO}>Cargando el artículo…</div>
      ) : error ? (
        /* El detalle ya lo muestra `Pantalla` arriba; acá no se repite ni se
           deja un formulario vacío que parezca un alta. */
        <div style={AVISO}>No se pudo abrir el artículo.</div>
      ) : (
        <AdminArticulos
          key={id ?? "nuevo"}
          articulo={articulo}
          tipoInicial={params.get("tipo") === "secondhand" ? "secondhand" : "market"}
          onCancel={volver}
          onFinish={volver}
        />
      )}
    </Pantalla>
  );
}
