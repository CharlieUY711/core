/**
 * La pantalla del panel. Una sola, para todo CORE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ DEFINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. LA BARRA: el menú a la izquierda, los cuatro botones a la derecha —
 *      Agregar · Editar · Grabar · Eliminar— siempre en ese orden y en el
 *      mismo lugar.
 *   2c. EL SCROLL VA DEBAJO DEL BUSCADOR. La barra y el buscador no se van
 *      con el desplazamiento: lo que se mueve es la lista. Si se fueran, para
 *      volver a buscar habría que subir hasta arriba de todo primero.
 *   2. EL BUSCADOR, debajo de la barra. Siempre debajo, nunca al costado. Con
 *      el selector de "en qué buscar" ADENTRO del mismo campo, porque acotar
 *      la búsqueda y escribirla son el mismo gesto.
 *   2b. LOS CONTROLES DE PRESENTACIÓN: el selector de vista —Lista · Grandes ·
 *      Medianos · Chicos— y "Columnas", juntos y a la izquierda de las cuatro
 *      acciones. No cambian qué hay, cambian cómo se ve; separarlos obligaba a
 *      buscarlos en dos lados.
 *   3. EL AVISO: dónde aparece, cuánto dura, de qué color según sea bueno o
 *      malo.
 *   3b. LAS NOTIFICACIONES: una campanita en la barra, con un punto rojo cuando
 *      hay algo. Antes eran cajas de colores arriba del contenido: cada
 *      herramienta elegía su naranja, ocupaban una fila entera, y empujaban
 *      para abajo justo lo que el usuario vino a ver.
 *   3c. LA EXPLICACIÓN de la vista sube a la barra de arriba, que es donde vive
 *      lo general. Adentro era otra caja robando alto.
 *   4. EL ERROR: cómo se ve un problema que impide seguir.
 *   5. EL ANCHO: lo decide el layout. Ninguna pantalla se dibuja más angosta
 *      ni más centrada que las otras.
 *
 * POR QUÉ ES UNA DEFINICIÓN Y NO UN PATRÓN
 * Un patrón se copia; una definición se busca. Copiado, cada pantalla termina
 * con su versión: una pone el buscador arriba, otra al costado, una centra el
 * contenido a 960px y otra no. Nada de eso se decide mal a propósito — se
 * decide de nuevo cada vez, y ahí es donde se separan.
 *
 * Escrito una vez, cambiarlo cambia todo junto. Que es el punto: mañana
 * movemos el buscador y se mueve en todas.
 *
 * LO QUE CADA HERRAMIENTA APORTA
 * Su menú, su buscador —si tiene—, y su contenido. Nada de aspecto: ni
 * colores, ni tipografías, ni anchos. Si una herramienta necesita elegir un
 * color, falta algo acá.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CÓMO SE USA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   const p = usePantalla();
 *
 *   return (
 *     <Pantalla p={p}
 *       menu={[{ label: "Todo", activa: cual === "todo", onClick: ... }]}
 *       buscador={{ valor: q, onCambio: setQ }}
 *       error={error}>
 *       <Tabla {...p.tablas.nivel("cosas", { columnas, filas, onCrear })} />
 *     </Pantalla>
 *   );
 *
 * `p.avisar("Guardado")` para confirmar; `p.avisar(msg, false)` para un
 * problema.
 */
import { useState, useEffect, useCallback } from "react";
import { useShop } from "./AdminLayout";
import { BarraDeAcciones, BarraDeAccionesSuelta, ItemDeBarra } from "./BarraDeAcciones";
import { useControlDeTablas, AccionesDeTabla, ControlDeTablas } from "./Tabla";
import { SelectorDeVista } from "./SelectorDeVista";
import { Vista } from "../ui/vistas";

const ACCENT = "var(--brand-madre)";

export interface EstadoDePantalla {
  tablas: ControlDeTablas;
  avisar: (texto: string, ok?: boolean) => void;
  aviso: { texto: string; ok: boolean } | null;
}

/**
 * Lo que toda pantalla necesita: el control de la tabla y cómo avisar.
 *
 * Van juntos porque siempre se usan juntos: guardar algo avisa, y borrar algo
 * avisa. Separarlos obligaba a cada pantalla a escribir su propio `avisar`, y
 * así aparecían cuatro avisos distintos en cuatro esquinas distintas.
 */
export function usePantalla(): EstadoDePantalla {
  const tablas = useControlDeTablas();
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);

  const avisar = useCallback((texto: string, ok = true) => {
    setAviso({ texto, ok });
    // Los problemas quedan más tiempo: hay que poder leerlos.
    setTimeout(() => setAviso(null), ok ? 3500 : 6000);
  }, []);

  return { tablas, avisar, aviso };
}

export interface EleccionDeColumnas {
  opciones: { id: string; label: string }[];
  elegidas: Set<string>;
  onCambio: (id: string) => void;
  /** Si está, el control se apaga y dice esto. No desaparece. */
  apagado?: string;
}

export interface Buscador {
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  /**
   * Enter. Para cuando buscar no filtra la pantalla sino que ABRE algo — en
   * CORE Editor se busca una imagen de la Biblioteca, que no está a la vista.
   * Sin esto, el campo se escribe y no pasa nada.
   */
  onAceptar?: () => void;
}

/**
 * QUÉ se está mirando: los tipos de la sección.
 *
 * UN SELECTOR, DOS LUGARES
 * Se dibuja como botones en el menú de la barra Y como selector a la derecha
 * del buscador. NO son dos controles: es el mismo, dibujado dos veces. Por eso
 * se declara UNA vez acá y `Pantalla` lo pone en los dos lados — mientras sea
 * así, no pueden ofrecer opciones distintas ni quedar desincronizados.
 *
 * Con dos listas, agregar un tipo era acordarse de dos lugares. El día que
 * alguien se olvide, el filtro "no anda" y nadie sabe por qué.
 */
/**
 * Desde / hasta.
 *
 * Va en la misma fila que el buscador, a su derecha: acotar por texto y acotar
 * por fecha son la misma pregunta -"qué de todo esto quiero ver"- y separarlas
 * obliga a mirar en dos lados.
 *
 * Está acá y no en cada herramienta porque toda lista con fechas lo va a
 * querer. Escrito en cada una, cada una elegía su formato y su lugar.
 */
/**
 * Algo que hay que mirar y no impide seguir.
 *
 * `tono` dice QUÉ tan grave es; cómo se ve lo decide acá. Sin esto, cada
 * pantalla elegía su propio naranja y terminaban siendo cuatro naranjas que no
 * querían decir lo mismo.
 */
export interface Notificacion {
  texto: string;
  tono?: "atencion" | "error" | "neutro";
}

export interface Rango {
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
}

export interface Secciones {
  valor: string;
  opciones: { valor: string; label: string }[];
  onCambio: (v: string) => void;
}

export function Pantalla({
  p, secciones, menu = [], extra = [], vista, columnas, buscador, rango, error,
  explicacion, notificaciones = [], aviso: avisoFijo, children,
}: {
  p: EstadoDePantalla;
  /** De qué se trata la vista. Va a la barra de arriba, no acá. */
  explicacion?: string;
  /** Lo que hay que mirar. Se cuenta en la campanita de la barra. */
  notificaciones?: Notificacion[];
  /** Los tipos de la sección: se dibujan en el menú Y adentro del buscador. */
  secciones?: Secciones;
  /** Lo que va en el menú y no es una sección. */
  menu?: ItemDeBarra[];
  /**
   * Lo que la herramienta hace y no son las cuatro acciones de la tabla:
   * Importar, Exportar, Sincronizar. Van a la IZQUIERDA de las cuatro, que
   * quedan siempre pegadas al borde derecho: si los extras se metieran en el
   * medio, Agregar cambiaría de lugar según la pantalla.
   */
  extra?: ItemDeBarra[];
  /** Lista · Grandes · Medianos · Chicos. Sin esto, no hay selector. */
  vista?: { valor: Vista; onCambio: (v: Vista) => void };
  /** Qué columnas se ven. Sin esto, no hay control de columnas. */
  columnas?: EleccionDeColumnas;
  /** Debajo de la barra. Sin esto, no hay buscador. */
  buscador?: Buscador;
  /** Desde / hasta, al lado del buscador. Sin esto, no hay rango. */
  rango?: Rango;
  /** Un problema que impide seguir. */
  error?: string | null;
  /** Algo que hay que mirar, que no es un error. */
  aviso?: React.ReactNode;
  children: React.ReactNode;
}) {
  /* La explicación vive en la barra de arriba. Se limpia al salir: si quedara,
     la vista siguiente diría de qué se trata ésta. */
  const { setExplicacion } = useShop();
  useEffect(() => {
    setExplicacion(explicacion ?? "");
    return () => setExplicacion("");
  }, [explicacion, setExplicacion]);

  return (
    /* `height: 100%` con `minHeight: 0`: la pantalla ocupa exactamente lo
       visible y reparte ese alto. Sin el `minHeight`, un hijo flex no se
       encoge por debajo de su contenido y el `overflow` de abajo nunca aplica
       —la pagina entera se desplazaria y la barra se iria con ella. */
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem",
      height: "100%", minHeight: 0 }}>
      {/* El aviso: siempre en la misma esquina, con el mismo tiempo. */}
      {p.aviso && (
        <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
          padding: "0.75rem 1.25rem", borderRadius: 10, fontWeight: 600,
          fontSize: "0.85rem", maxWidth: 460,
          background: p.aviso.ok ? "#f0fdf4" : "#fef2f2",
          color: p.aviso.ok ? "#166534" : "#dc2626",
          border: `1px solid ${p.aviso.ok ? "#86efac" : "#ef4444"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}>
          {p.aviso.texto}
        </div>
      )}

      <BarraDeAcciones acciones={[
        ...(secciones ? secciones.opciones.map(o => ({
          label: o.label,
          color: ACCENT,
          activa: secciones.valor === o.valor,
          onClick: () => secciones.onCambio(o.valor),
        })) : []),
        ...menu,
      ]} derecha={<>
        {/* La campanita PRIMERA, contra el resto: así los cuatro botones nunca
            se corren de lugar por tener o no tener notificaciones. */}
        <Campana notificaciones={notificaciones} />

        {extra.length > 0 && <BarraDeAccionesSuelta acciones={extra} />}

        {(vista || columnas) && <Raya />}
        {vista && <SelectorDeVista vista={vista.valor} onVista={vista.onCambio} />}
        {columnas && <Columnas {...columnas} />}

        {(extra.length > 0 || vista || columnas) && <Raya />}

        {/* Las cuatro, últimas y siempre en el mismo lugar. */}
        <AccionesDeTabla control={p.tablas} />
      </>} />

      {/* Debajo de la barra. Siempre debajo: al costado compite con el menú y
          el ojo tiene que elegir a cuál de los dos ir primero. */}
      {(buscador || rango) && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

        {buscador && (
        <div style={{ flex: "1 1 auto", minWidth: 0,
          display: "flex", alignItems: "center",
          border: "1.5px solid var(--border)", borderRadius: 8,
          background: "#fff", overflow: "hidden" }}>
          {/* La lupa a la izquierda, apagada: dice qué es el campo sin ocupar
              una etiqueta arriba, y no es un botón —no hay nada que apretar,
              se busca a medida que se escribe. */}
          <Lupa />

          <input
            value={buscador.valor}
            onChange={e => buscador.onCambio(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") buscador.onAceptar?.(); }}
            placeholder={buscador.placeholder ?? "Buscar"}
            style={{
              /* `minWidth: 0` y NO `width: 0`. Con `width: 0` el campo depende
                 de que el `flex-grow` lo estire: si algo interfiere queda de
                 cero ancho y no hay dónde escribir —se veía la lupa, la raya y
                 el selector pegados a la izquierda y ni rastro del campo. */
              flex: "1 1 auto", minWidth: 0,
              border: "none", outline: "none",
              padding: "0.45rem 0.7rem 0.45rem 0.35rem",
              fontSize: "0.82rem", fontFamily: "DM Sans, sans-serif",
              background: "transparent", color: "#111",
            }} />

          {secciones && (
            /* Contra el borde DERECHO, y por `marginLeft: auto`, no por confiar
               en que el campo de al lado se estire. Si el campo falla, el
               selector igual queda donde tiene que estar. */
            <div style={{ marginLeft: "auto", display: "flex",
              alignItems: "center", flex: "0 0 auto" }}>
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            {/* Adentro del campo, no al lado: acotar la búsqueda y escribirla
                son el mismo gesto. Se lee como una sola pregunta —"buscar
                'apple' en Multimedia"—; al lado son dos decisiones.

                Es el MISMO estado que los botones del menú, así que tocar uno
                mueve al otro y manda el último gesto del usuario. */}
            <select value={secciones.valor}
              onChange={e => secciones.onCambio(e.target.value)}
              title="En qué buscar"
              style={{ flex: "0 0 auto", border: "none", outline: "none",
                background: "transparent", padding: "0.3rem 0.4rem",
                /* Chico: acota la búsqueda, no es la búsqueda. Si pesa lo
                   mismo que el campo compite con él. */
                fontSize: "0.7rem", fontWeight: 700, color: ACCENT,
                fontFamily: "DM Sans, sans-serif", cursor: "pointer" }}>
              {secciones.opciones.map(o => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
            </div>
          )}
        </div>
        )}

        {rango && (<>
          <Fecha etiqueta="Desde" valor={rango.desde} onCambio={rango.onDesde} />
          <Fecha etiqueta="Hasta" valor={rango.hasta} onCambio={rango.onHasta} />
          {(rango.desde || rango.hasta) && (
            /* Sacar un rango tiene que ser tan fácil como ponerlo. Sin esto hay
               que borrar dos campos a mano, y mientras tanto la lista se ve
               vacía sin decir por qué. */
            <button onClick={() => { rango.onDesde(""); rango.onHasta(""); }}
              title="Sacar el rango"
              style={{ border: "none", background: "transparent", cursor: "pointer",
                color: "var(--mute)", fontSize: "0.9rem", padding: "0 0.3rem" }}>
              ×
            </button>
          )}
        </>)}

        </div>
      )}

      {avisoFijo}

      {error && (
        <div style={{ padding: "0.6rem 0.85rem", borderRadius: 10, fontSize: "0.78rem",
          fontWeight: 600, background: "rgba(245,158,11,.12)", color: "#B45309" }}>
          {error}
        </div>
      )}

      {/* LO QUE SE DESPLAZA. Arriba queda todo lo que sirve para decidir qué
          mirar —la barra, el buscador, el rango, el aviso, el error—; acá
          adentro va lo que se mira.

          `display: flex` en columna para que una tabla pueda ocupar el alto y
          desplazar su propio cuerpo con el encabezado fijo. Lo que no es una
          tabla —una grilla de íconos, un formulario— se desplaza acá. */}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto",
        display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * La lupa del buscador.
 *
 * Dibujada, no un emoji: un emoji cambia de forma y de color en cada sistema
 * -en Windows es azul, en Mac es gris- y el campo se veía distinto según la
 * máquina. Acá el color sale del panel, como todo lo demás.
 */
function Lupa() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
      style={{ flex: "0 0 auto", marginLeft: "0.6rem", color: "var(--mute)" }}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" />
    </svg>
  );
}

/** Un campo de fecha del rango. Uno solo, para que los dos se vean igual. */
function Fecha({ etiqueta, valor, onCambio }: {
  etiqueta: string; valor: string; onCambio: (v: string) => void;
}) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6,
      border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff",
      padding: "0 0.5rem" }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--mute)" }}>
        {etiqueta}
      </span>
      <input type="date" value={valor} onChange={e => onCambio(e.target.value)}
        style={{ border: "none", outline: "none", background: "transparent",
          padding: "0.4rem 0", fontSize: "0.76rem",
          fontFamily: "DM Sans, sans-serif", color: "#111" }} />
    </div>
  );
}

/**
 * La campanita.
 *
 * ESTÁ SIEMPRE, con notificaciones o sin ellas. Si apareciera sólo cuando hay
 * algo, los botones de al lado se correrían de lugar cada vez que aparece una,
 * y además habría que estar mirando para enterarse de que existe. Apagada
 * cuando no hay nada, con el punto rojo cuando hay.
 */
function Campana({ notificaciones }: { notificaciones: Notificacion[] }) {
  const [abierta, setAbierta] = useState(false);
  const hay = notificaciones.length;

  const color = (n: Notificacion) =>
    n.tono === "error" ? "#B91C1C" : n.tono === "neutro" ? "var(--mute)" : "#B45309";

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        onClick={() => hay > 0 && setAbierta(v => !v)}
        disabled={hay === 0}
        title={hay === 0 ? "No hay nada para mirar"
             : hay === 1 ? "1 aviso"
             : `${hay} avisos`}
        aria-label={hay === 0 ? "Sin avisos" : `${hay} avisos`}
        style={{ position: "relative", border: "none", background: "transparent",
          cursor: hay === 0 ? "default" : "pointer",
          padding: "0.3rem 0.4rem", lineHeight: 0,
          color: hay === 0 ? "#CBD5E1" : abierta ? "#111" : "#555" }}>

        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {hay > 0 && (
          /* El punto, no el número: a esta altura importa que HAY algo. El
             cuánto y el qué están a un click. */
          <span style={{ position: "absolute", top: 2, right: 3,
            width: 7, height: 7, borderRadius: "50%",
            background: "#EF4444", border: "1.5px solid #fff" }} />
        )}
      </button>

      {abierta && (
        <div onMouseLeave={() => setAbierta(false)} style={{ position: "absolute",
          left: 0, top: "100%", background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: 10, padding: "0.4rem", zIndex: 300,
          minWidth: 280, maxWidth: 460,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          {notificaciones.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start",
              padding: "0.4rem 0.5rem", fontSize: "0.78rem", lineHeight: 1.45,
              color: "#374151",
              borderTop: i === 0 ? "none" : "1px solid #F3F4F6" }}>
              <span style={{ flex: "0 0 auto", width: 6, height: 6, borderRadius: "50%",
                background: color(n), marginTop: 6 }} />
              <span>{n.texto}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Raya() {
  return <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 4px" }} />;
}

/**
 * Qué columnas se ven.
 *
 * Se APAGA, no desaparece: en una grilla de íconos elegir columnas no quiere
 * decir nada, pero un control que se va se busca donde ya no está. Apagado, y
 * diciendo por qué, se entiende de una.
 */
function Columnas({ opciones, elegidas, onCambio, apagado }: EleccionDeColumnas) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => !apagado && setAbierto(v => !v)}
        disabled={!!apagado}
        title={apagado}
        style={{ padding: "0.5rem 0.8rem", border: "none", background: "transparent",
          cursor: apagado ? "not-allowed" : "pointer", fontSize: "0.78rem",
          fontWeight: abierto ? 700 : 500, whiteSpace: "nowrap",
          color: apagado ? "#CBD5E1" : abierto ? "#111" : "#555",
          display: "flex", alignItems: "center", gap: 3 }}>
        Columnas <span style={{ fontSize: 8, opacity: .6 }}>▾</span>
      </button>

      {abierto && (
        <div onMouseLeave={() => setAbierto(false)} style={{ position: "absolute",
          right: 0, top: "100%", background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: 10, padding: "0.5rem", zIndex: 300, minWidth: 155,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          {opciones.map(c => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8,
              padding: "0.28rem 0", cursor: "pointer", fontSize: "0.8rem", color: "#374151" }}>
              <input type="checkbox" checked={elegidas.has(c.id)}
                style={{ accentColor: ACCENT }}
                onChange={() => onCambio(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default Pantalla;
