/**
 * La barra de acciones del panel. Una sola, para todas las pantallas.
 *
 * DÓNDE VIVE Y POR QUÉ
 * En el shell, no en los módulos. El Dashboard define cómo se ve una acción
 * —tamaño, tipografía, colores, separadores, qué pasa cuando está deshabilitada—
 * y cada pantalla sólo declara QUÉ acciones tiene. Un módulo no debería saber
 * de bordes ni de sombras: si lo sabe, cada pantalla termina con su propia
 * versión y el panel deja de parecer un solo producto.
 *
 * Es el mismo principio que ya usamos con los motores de canal: la pantalla no
 * conoce ningún canal por nombre, el canal no conoce ninguna pantalla.
 *
 * CÓMO SE USA
 *   <BarraDeAcciones
 *     acciones={[
 *       { label:"Market +", destacado:true, color:AZUL, onClick:… },
 *       "separador",
 *       { label:"Publicar", desactivada:!haySeleccion, onClick:… },
 *     ]}
 *     derecha={<Columnas />}
 *   />
 *
 * Un `"separador"` en la lista dibuja la línea vertical: agrupa sin obligar a
 * anidar arreglos, que es lo que hace ilegible una barra declarativa.
 *
 * `derecha` es para lo que no es una acción —un aviso, un selector de columnas,
 * un contador— y va contra el borde derecho.
 */
import React from "react";

/** Una acción de la barra. `desactivada` explica por qué al pasar el mouse. */
export interface Accion {
  label: string;
  onClick: () => void;
  /** Deshabilitada: se ve, no se puede, y el motivo va en el tooltip. */
  desactivada?: boolean;
  /** Por qué no se puede. Sin esto, una acción apagada no dice nada. */
  motivo?: string;
  /** Color propio. Sin él, el neutro del panel. */
  color?: string;
  /** Rellena en vez de contornear: para la acción principal de la pantalla. */
  destacado?: boolean;
  /** Marcada como la vista actual: para barras que además navegan. */
  activa?: boolean;
  title?: string;
}

export type ItemDeBarra = Accion | "separador";

const NEUTRO = "var(--border)";
const TEXTO  = "#374151";

/** Un botón de la barra. Es el ÚNICO lugar donde se decide cómo se ve. */
function BotonAccion({ a }: { a: Accion }) {
  const off = !!a.desactivada;
  const color = a.color ?? "#111";

  return (
    <button
      onClick={() => !off && a.onClick()}
      disabled={off}
      title={a.title ?? (off ? a.motivo : undefined)}
      style={{
        padding: "0.42rem 0.7rem",
        borderRadius: 7,
        whiteSpace: "nowrap",
        fontSize: "0.76rem",
        fontWeight: 700,
        fontFamily: "DM Sans, sans-serif",
        cursor: off ? "not-allowed" : "pointer",
        transition: "all .12s",
        border: a.destacado ? "none"
              : `1.5px solid ${off ? "#E5E7EB" : (a.activa ? color : (a.color ?? NEUTRO))}`,
        background: a.destacado ? (off ? "#CBD5E1" : color)
                  : a.activa    ? `${color}12`
                  : "#fff",
        color: a.destacado ? "#fff"
             : off         ? "#CBD5E1"
             : a.activa    ? color
             : (a.color ?? TEXTO),
        opacity: off ? 0.75 : 1,
      }}>
      {a.label}
    </button>
  );
}

export function BarraDeAcciones({
  acciones, derecha,
}: {
  acciones: ItemDeBarra[];
  derecha?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", flexShrink: 0,
      background: "#fff", borderBottom: "1px solid #EAECF0",
      padding: "0 1rem", gap: "2px",
      boxShadow: "0 1px 3px rgba(0,0,0,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
        flexWrap: "wrap", padding: "6px 0" }}>
        {acciones.map((it, i) =>
          it === "separador"
            ? <div key={`sep${i}`} style={{ width: 1, height: 22,
                background: "var(--border)", margin: "0 2px" }} />
            : <BotonAccion key={it.label + i} a={it} />,
        )}
      </div>

      {derecha ? (
        <div style={{ marginLeft: "auto", display: "flex",
          alignItems: "center", gap: 6 }}>
          {derecha}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Acciones sueltas, sin la barra.
 *
 * A veces una acción vive adentro de un panel —"Guardar y sincronizar" abajo
 * de la lista de correcciones— y no en la barra de arriba. Se ve igual porque
 * es lo mismo: un botón de acción del panel. Lo que cambia es dónde está, no
 * qué es.
 *
 * Sin esto, esos casos volvían a dibujarse a mano y el estilo empezaba a
 * divergir por el lugar más discreto.
 */
export function BarraDeAccionesSuelta({ acciones }: { acciones: ItemDeBarra[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {acciones.map((it, i) =>
        it === "separador"
          ? <div key={`sep${i}`} style={{ width: 1, height: 22,
              background: "var(--border)", margin: "0 2px" }} />
          : <BotonAccion key={it.label + i} a={it} />,
      )}
    </div>
  );
}

export default BarraDeAcciones;
