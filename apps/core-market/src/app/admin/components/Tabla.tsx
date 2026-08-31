/**
 * La tabla del panel. Una sola, para todo CORE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA REGLA, QUE VALE PARA TODA LISTA DEL SISTEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. UN CHECK POR FILA. Nada de botones repetidos en cada renglón.
 *   2. LOS BOTONES VAN EN LA BARRA: Agregar · Editar · Grabar · Eliminar,
 *      siempre en ese orden, siempre con los mismos colores, siempre en el
 *      mismo lugar.
 *   3. LAS ACCIONES SON MASIVAS y valen DENTRO DE UN MISMO NIVEL. En una lista
 *      desplegable, elegir adentro de un renglón limpia lo elegido afuera: la
 *      acción actúa sobre un solo nivel y no hay ambigüedad sobre cuál.
 *   4. LAS COLUMNAS VAN EN EL MISMO ORDEN Y CON EL MISMO ANCHO en todas las
 *      pantallas.
 *   5. LO QUE ES RASTRO —creado, modificado— VA A LA DERECHA, siempre igual.
 *   6. EL ENCABEZADO NO SE VA. Se desplaza el cuerpo; los títulos de columna
 *      quedan. Y si una fila está desplegada, esa fila queda fija también: su
 *      detalle se desplaza DEBAJO de ella. Sin eso, al leer el detalle se
 *      pierde de vista de quién es.
 *
 * POR QUÉ
 * Porque el que usa el panel no debería tener que estudiar cada pantalla. Con
 * los botones repetidos por fila, cada tabla los ponía donde le quedaba y
 * moverse de una a otra era un destello tras otro: buscar dónde está Editar,
 * volver a mirar, recién ahí hacer. Con la barra, la mano ya sabe.
 *
 * Y libera la fila: el espacio que se iba en tres botones por renglón ahora
 * muestra información —cuándo se creó, cuándo se modificó, en cuántas cosas se
 * usa— que es lo que uno necesita para decidir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CÓMO SE USA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   const t = useControlDeTablas();
 *
 *   <BarraDeAcciones acciones={solapas} derecha={<AccionesDeTabla control={t} />} />
 *
 *   <Tabla {...t.nivel("paises", {
 *     columnas, filas, onCrear, onGuardar, onBorrar,
 *     detalle: f => <Tabla {...t.nivel(`zonas:${f.clave}`, { ... })} />,
 *   })} />
 *
 * El control es uno por pantalla y sabe qué nivel está activo. Los botones de
 * la barra salen de ahí, así que no hay forma de que digan una cosa y la tabla
 * haga otra.
 */
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect,
  useReducer } from "react";
import { ItemDeBarra, BarraDeAccionesSuelta } from "./BarraDeAcciones";

const ACCENT = "var(--brand-madre)";
const AZUL   = "var(--brand-navy)";
const ROJO   = "#EF4444";

/** Una sola instancia: devolver `new Set()` cada vez rehace el render de quien lo lea. */
const SIN_NADA: ReadonlySet<string> = new Set();

export interface Columna {
  id: string;
  label: string;
  /** A la derecha, con cifras tabulares. La regla del panel. */
  numero?: boolean;
  /** Se puede cambiar. Sin esto, la celda se ve y no se toca. */
  editable?: boolean;
  ancho?: number;
  placeholder?: string;
  /** Al editar, una lista en vez de un campo libre. */
  opciones?: { valor: string; label: string }[];
  /** Cuando no es cero se resalta: es lo que impide borrar. */
  esUso?: boolean;
  /** Rastro —creado, modificado—: va al final, siempre. */
  rastro?: boolean;
  /**
   * Una columna de estado.
   *
   * La herramienta dice QUÉ pasa —"Vencida", con tono de error— y la tabla
   * decide cómo se ve. Sin esto, cada pantalla elegía su propio rojo y su
   * propio verde, y terminaban siendo cuatro rojos que no querían decir lo
   * mismo.
   */
  chip?: (fila: Fila) => { tono: Tono; texto: string } | null;
  ver?: (fila: Fila) => React.ReactNode;
}

export interface Fila {
  clave: string;
  [k: string]: unknown;
}

interface Nivel {
  columnas: Columna[];
  filas: Fila[];
  onCrear?:   (valores: Record<string, string>) => Promise<void>;
  onGuardar?: (fila: Fila, valores: Record<string, string>) => Promise<void>;
  /*
   * Cuando agregar o editar NO cabe en una fila.
   *
   * Hay cosas que no son un renglón de datos: una credencial tiene un secreto
   * y decide su tipo y su entorno; un artículo tiene fotos y precios por canal.
   * Forzarlas a la fila sería peor que abrir su propia pantalla.
   *
   * Lo que NO cambia es dónde está el botón. Eso es lo que importa: el que usa
   * el panel aprieta "Agregar" en el mismo lugar siempre, y lo que se abre
   * después es asunto de cada herramienta.
   */
  onAgregar?: () => void;
  onEditar?:  (fila: Fila) => void;
  onBorrar?:  (filas: Fila[]) => Promise<void>;
  /** Qué se ve al abrir la fila. Sin esto, la fila no se abre. */
  detalle?: (fila: Fila) => React.ReactNode;
  /**
   * Qué fila está abierta, cuando lo decide la pantalla y no la tabla.
   *
   * Por defecto lo decide la tabla: se aprieta la flecha y se abre. Pero hay
   * casos donde la pantalla YA SABE cuál tiene que estar abierta —el alta, que
   * aparece con su formulario desplegado— y esperar un clic más sería pedirle
   * al usuario que confirme algo que ya pidió.
   *
   * Se pasan las dos o ninguna: con `abierta` sin `onAbierta` la flecha dejaría
   * de responder y nadie sabría por qué.
   */
  abierta?: string | null;
  onAbierta?: (clave: string | null) => void;
  /**
   * Doble clic: lo que corresponda hacer con esa fila.
   *
   * El clic simple ELIGE y no actúa, y eso no se negocia: de la selección
   * dependen las acciones de la barra, así que si el clic actuara no habría
   * forma de elegir algo sin ejecutarlo. El doble clic es el atajo.
   */
  onAbrir?: (fila: Fila) => void;
  /** Se ve apagada, no desaparece: si desapareciera no habría cómo prenderla. */
  inactiva?: (fila: Fila) => boolean;
  /** Cómo se llama una fila al confirmar un borrado. */
  nombreDe?: (fila: Fila) => string;
  anidada?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* El control: una selección, una edición, por pantalla                     */
/* ─────────────────────────────────────────────────────────────────────── */

export function useControlDeTablas() {
  /*
   * La selección vive acá y no en cada tabla, y lleva SU NIVEL adentro.
   *
   * Es lo que hace que las acciones masivas sean inequívocas: elegir adentro
   * de un renglón desplegado limpia lo que estaba elegido afuera. Si cada
   * tabla guardara lo suyo, se podrían tener tres países y dos monedas
   * elegidos a la vez, y "Eliminar" no sabría sobre cuál actuar.
   */
  const [seleccion, setSeleccion] = useState<{ nivel: string; claves: Set<string> }>(
    { nivel: "", claves: new Set() });
  const [edicion, setEdicion] = useState<
    { nivel: string; clave: string; original: Record<string, string> } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  /*
   * Los niveles se registran mientras se dibujan las tablas.
   *
   * SE BORRAN EN CADA RENDER, A PROPÓSITO
   * Si se acumularan, al cambiar de solapa quedarían registrados los niveles de
   * la solapa anterior — y como el nivel activo por omisión es el primero,
   * "Agregar" en la solapa de Monedas habría agregado un país.
   */
  const niveles = useRef<Record<string, Nivel>>({});
  const orden   = useRef<string[]>([]);
  niveles.current = {};
  orden.current = [];

  const nivel = useCallback((id: string, cfg: Nivel) => {
    if (!niveles.current[id]) orden.current.push(id);
    niveles.current[id] = cfg;
    return { id, cfg, control: { seleccion, setSeleccion, edicion, setEdicion,
      form, setForm, ocupado, setOcupado } };
  }, [seleccion, edicion, form, ocupado]);

  /*
   * LOS BOTONES ESTÁN DESDE EL PRIMER DIBUJO.
   *
   * `acciones` es una FUNCIÓN, no un arreglo calculado al principio del hook.
   * Se evalúa cuando la barra se dibuja, y para entonces la pantalla ya declaró
   * sus niveles —lo hace en el cuerpo del componente, antes del `return`.
   *
   * Antes se calculaba acá arriba, cuando `niveles` todavía estaba vacío: los
   * botones no aparecían hasta que elegías una fila, que era lo que provocaba
   * el segundo render. Un botón que aparece solo ya perdió: hay que estar
   * mirándolo para enterarse de que existe.
   *
   * Lo de abajo queda igual como red: si alguna pantalla declara sus niveles
   * adentro del JSX en vez del cuerpo, converge en un render más en lugar de
   * quedarse sin botones. No cicla — la segunda vez la firma es la misma.
   */
  const firma = useRef("");
  const [, forzar] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const actual = orden.current.join("|");
    if (actual !== firma.current) { firma.current = actual; forzar(); }
  });

  const limpiar = () => { setEdicion(null); setForm({}); };

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * TODO ESTO SE CALCULA AL DIBUJAR LA BARRA, NO ACÁ ARRIBA.
   * ═══════════════════════════════════════════════════════════════════════
   *
   * `niveles.current` está VACÍO mientras corre el cuerpo de este hook: recién
   * se llena cuando la pantalla —que corre después— declara sus niveles. Todo
   * lo que dependa de eso y se calcule acá arriba, se calcula sobre la nada.
   *
   * Ese fue el error que se arregló dos veces sin arreglarse. La primera vez
   * `acciones` pasó a ser una función, pero seguía leyendo `puedeAgregar` y
   * compañía, que ya venían calculados desde acá arriba: la función era nueva,
   * los valores eran los mismos de antes. Cambió cuándo se armaba el arreglo,
   * no cuándo se decidía qué iba adentro.
   *
   * Por eso ahora esto es UNA FUNCIÓN. Se llama cuando la barra se dibuja, y
   * para ese momento la pantalla ya declaró qué puede hacer.
   */
  const leer = () => {
    /* Cuál manda: el que se está editando, si no el que tiene algo elegido, si
       no el primero. Sin esta última parte, "Agregar" no sabría a qué lista. */
    const idActivo = edicion?.nivel
      || (seleccion.claves.size > 0 ? seleccion.nivel : "")
      || orden.current[0]
      || "";
    const activo = niveles.current[idActivo];

    const elegidas = idActivo === seleccion.nivel
      ? (activo?.filas ?? []).filter(f => seleccion.claves.has(f.clave))
      : [];

    const editables  = (activo?.columnas ?? []).filter(c => c.editable);
    const hayCambios = !!edicion
      && editables.some(c => (form[c.id] ?? "") !== (edicion.original[c.id] ?? ""));
    const puedeCrear = !!edicion && edicion.clave === "nueva"
      && editables.length > 0 && (form[editables[0].id] ?? "").trim() !== "";

    /*
     * QUÉ BOTONES HAY vs. CUÁLES SE PUEDEN APRETAR
     *
     * Que el botón EXISTA depende de lo que la herramienta puede hacer, y eso
     * no cambia mientras estás en la pantalla: si una lista no se puede
     * agregar, no hay "Agregar" — un botón apagado para siempre es ruido que
     * igual hay que leer para descartarlo.
     *
     * Que el botón se pueda APRETAR depende del momento: no elegiste nada,
     * todavía no cambió nada, hay una edición en curso. Eso sí cambia, y por
     * eso el botón se apaga en su lugar en vez de desaparecer.
     *
     * Adentro de una pantalla nada se mueve. Entre pantallas, no hay botones
     * muertos.
     */
    return {
      idActivo, activo, elegidas, editables, hayCambios, puedeCrear,
      puedeAgregar: !!(activo?.onCrear || activo?.onAgregar),
      puedeEditar:  !!(activo?.onGuardar || activo?.onEditar),
      puedeBorrar:  !!activo?.onBorrar,
      /* "Grabar" sólo tiene sentido si algo se edita en la fila. Si editar
         abre otra pantalla, ahí adentro se graba. */
      puedeGrabar:  !!(activo?.onCrear || activo?.onGuardar),
    };
  };

  const acciones = (): ItemDeBarra[] => {
    const { idActivo, activo, elegidas, editables, hayCambios, puedeCrear,
            puedeAgregar, puedeEditar, puedeBorrar, puedeGrabar } = leer();

    return [
    ...(puedeAgregar ? [{
      label: "Agregar", color: ACCENT, destacado: true,
      desactivada: ocupado || !!edicion,
      motivo: "Terminá la edición en curso",
      onClick: () => {
        if (!activo) return;
        if (activo.onAgregar) { activo.onAgregar(); return; }
        setSeleccion({ nivel: idActivo, claves: new Set() });
        setEdicion({ nivel: idActivo, clave: "nueva", original: {} });
        setForm({});
      },
    }] : []),

    ...(puedeEditar ? [{
      label: "Editar", color: AZUL,
      activa: !!edicion && edicion.clave !== "nueva",
      desactivada: ocupado || (!edicion && elegidas.length !== 1),
      motivo: elegidas.length === 0 ? "Elegí una fila" : "Se edita de a una",
      title: edicion ? "Cancelar la edición" : undefined,
      onClick: () => {
        if (edicion) { limpiar(); return; }
        const f = elegidas[0];
        if (!f || !activo) return;
        if (activo.onEditar) { activo.onEditar(f); return; }
        const valores = Object.fromEntries(
          editables.map(c => [c.id, String(f[c.id] ?? "")]));
        setEdicion({ nivel: idActivo, clave: f.clave, original: valores });
        setForm(valores);
      },
    }] : []),

    ...(puedeGrabar ? [{
      label: ocupado ? "Grabando…" : "Grabar", color: ACCENT,
      destacado: !!edicion && (hayCambios || puedeCrear),
      desactivada: ocupado || !edicion || !(hayCambios || puedeCrear),
      motivo: !edicion ? "No hay nada que grabar" : "Todavía no cambió nada",
      onClick: async () => {
        if (!edicion || !activo) return;
        setOcupado(true);
        try {
          if (edicion.clave === "nueva") await activo.onCrear?.(form);
          else {
            const f = activo.filas.find(x => x.clave === edicion.clave);
            if (f) await activo.onGuardar?.(f, form);
          }
          limpiar();
        } finally { setOcupado(false); }
      },
    }] : []),

    ...(puedeBorrar ? [{
      label: "Eliminar", color: ROJO,
      desactivada: ocupado || !!edicion || elegidas.length === 0,
      motivo: edicion ? "Terminá la edición en curso" : "Elegí al menos una fila",
      onClick: async () => {
        if (!activo || !elegidas.length) return;
        const que = elegidas.length === 1
          ? `"${activo.nombreDe?.(elegidas[0]) ?? elegidas[0].clave}"`
          : `${elegidas.length} filas`;
        if (!confirm(`¿Eliminar ${que}?`)) return;
        setOcupado(true);
        try {
          await activo.onBorrar?.(elegidas);
          setSeleccion({ nivel: idActivo, claves: new Set() });
        } finally { setOcupado(false); }
      },
    }] : []),
    ];
  };

  /*
   * LA SELECCIÓN, PARA QUIEN NO DIBUJA UNA TABLA.
   *
   * Hay pantallas que muestran lo mismo de dos maneras: la Biblioteca tiene la
   * vista Lista y tres grillas de íconos. La lista es una tabla; las grillas no.
   *
   * Si la grilla guardara su propia selección habría DOS: elegís tres artículos
   * en íconos, pasás a Lista y no hay nada elegido, y "Eliminar" —que lee la de
   * la tabla— actúa sobre otra cosa que la que estás viendo. Por eso la
   * selección se presta, no se copia.
   */
  const seleccionadas = useCallback(
    (id: string): ReadonlySet<string> =>
      seleccion.nivel === id ? seleccion.claves : SIN_NADA,
    [seleccion]);

  const alternar = useCallback((id: string, clave: string) => {
    setSeleccion(prev => {
      // Cambiar de nivel limpia lo de antes: es la misma regla que adentro de
      // la tabla —una acción actúa sobre un solo nivel.
      const claves = prev.nivel === id ? new Set(prev.claves) : new Set<string>();
      claves.has(clave) ? claves.delete(clave) : claves.add(clave);
      return { nivel: id, claves };
    });
  }, []);

  /** Dejar elegido exactamente esto. Para llegar con algo ya elegido. */
  const seleccionar = useCallback(
    (id: string, claves: string[]) => setSeleccion({ nivel: id, claves: new Set(claves) }), []);

  const limpiarSeleccion = useCallback(
    () => setSeleccion(prev => ({ nivel: prev.nivel, claves: new Set() })), []);

  return { nivel, acciones, ocupado, seleccionadas, alternar, seleccionar, limpiarSeleccion };
}

export type ControlDeTablas = ReturnType<typeof useControlDeTablas>;

/** Los cuatro botones, para poner a la derecha de la barra de la pantalla. */
export function AccionesDeTabla({ control }: { control: ControlDeTablas }) {
  // Se evalúa acá, al dibujar la barra: para este momento la pantalla ya
  // declaró qué puede hacer.
  return <BarraDeAccionesSuelta acciones={control.acciones()} />;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* La tabla                                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

const celda: React.CSSProperties = { padding: "0.5rem 0.6rem", color: "#374151" };
const th: React.CSSProperties = {
  background: "#F9FAFB", padding: "0.45rem 0.6rem", fontSize: "0.7rem",
  fontWeight: 700, color: "var(--mute)", whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)", textAlign: "left",
};
const num: React.CSSProperties = {
  textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};
const campoStyle: React.CSSProperties = {
  padding: "0.3rem 0.45rem", border: `1.5px solid ${ACCENT}`, borderRadius: 6,
  fontSize: "0.8rem", outline: "none", background: "#fff", color: "#111",
  fontFamily: "DM Sans, sans-serif", width: "100%", boxSizing: "border-box",
};

/** El check y la flecha. Mismo ancho en todas las tablas: las columnas de
 *  contenido arrancan siempre en el mismo lugar. */
const ANCHO_CHECK  = 34;
const ANCHO_FLECHA = 22;

export function Tabla({ id, cfg, control }: ReturnType<ControlDeTablas["nivel"]>) {
  /* La fila abierta la maneja la tabla, salvo que la pantalla la controle. Es
     el patrón de siempre: si viene de afuera manda lo de afuera, y si no, la
     tabla se arregla sola. */
  const [abiertaPropia, setAbiertaPropia] = useState<string | null>(null);
  const controlada = cfg.abierta !== undefined;
  const abierta = controlada ? cfg.abierta ?? null : abiertaPropia;
  const setAbierta = (siguiente: (a: string | null) => string | null) => {
    if (controlada) cfg.onAbierta?.(siguiente(abierta));
    else setAbiertaPropia(siguiente);
  };
  const { seleccion, setSeleccion, edicion, setForm, form } = control;

  const columnas = [
    ...cfg.columnas.filter(c => !c.rastro),
    // El rastro siempre al final, en el mismo orden. Es lo que hace que dos
    // tablas distintas se lean igual sin volver a mirar el encabezado.
    ...cfg.columnas.filter(c => c.rastro),
  ];
  const editables = columnas.filter(c => c.editable);

  const mias = id === seleccion.nivel ? seleccion.claves : new Set<string>();
  const todas = cfg.filas.length > 0 && cfg.filas.every(f => mias.has(f.clave));

  /* Elegir en un nivel limpia el otro: la acción de la barra actúa sobre un
     solo nivel, y con dos selecciones vivas no se sabría cuál. */
  const alternar = (clave: string) => setSeleccion(s => {
    const propias = id === s.nivel ? new Set(s.claves) : new Set<string>();
    propias.has(clave) ? propias.delete(clave) : propias.add(clave);
    return { nivel: id, claves: propias };
  });

  const todasONinguna = () => setSeleccion(() =>
    todas ? { nivel: id, claves: new Set<string>() }
          : { nivel: id, claves: new Set(cfg.filas.map(f => f.clave)) });

  const campo = (c: Columna) => c.opciones ? (
    <select value={form[c.id] ?? ""} autoFocus={c.id === editables[0]?.id}
      onChange={e => setForm(f => ({ ...f, [c.id]: e.target.value }))}
      style={campoStyle}>
      {c.opciones.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
    </select>
  ) : (
    <input value={form[c.id] ?? ""} placeholder={c.placeholder}
      autoFocus={c.id === editables[0]?.id}
      onChange={e => setForm(f => ({ ...f, [c.id]: e.target.value }))}
      style={{ ...campoStyle, ...(c.numero
        ? { textAlign: "right", fontVariantNumeric: "tabular-nums" } : {}) }} />
  );

  const filaEnEdicion = (clave: string) => (
    <tr key={clave} style={{ borderBottom: "1px solid #F3F4F6",
      background: "color-mix(in srgb, var(--brand-madre) 5%, transparent)" }}>
      <td style={{ ...celda, width: ANCHO_CHECK }} />
      <td style={{ ...celda, width: ANCHO_FLECHA }} />
      {columnas.map(c => (
        <td key={c.id} style={{ ...celda, ...(c.numero ? num : {}) }}>
          {c.editable ? campo(c) : null}
        </td>
      ))}
    </tr>
  );

  const enEdicionAca = edicion?.nivel === id;
  const columnasTotales = 2 + columnas.length;

  /*
   * El alto del encabezado se MIDE, no se escribe.
   *
   * La fila desplegada se pega justo debajo del encabezado, y para eso hay que
   * saber cuánto mide. Con un número escrito a mano, el día que cambie la
   * tipografía o el padding la fila queda tapada o flotando, y nadie lo
   * relaciona con eso.
   */
  const cabecera = useRef<HTMLTableSectionElement>(null);
  const [altoCabecera, setAltoCabecera] = useState(0);

  useLayoutEffect(() => {
    const alto = cabecera.current?.offsetHeight ?? 0;
    setAltoCabecera(a => (a === alto ? a : alto));
  });

  /* Pegado: sólo en la tabla de arriba, que es la que desplaza. En una anidada
     no hay nada a qué pegarse. */
  const pegado = (top: number, z: number): React.CSSProperties =>
    cfg.anidada ? {} : { position: "sticky", top, zIndex: z };

  return (
    /* La tabla de arriba ocupa el alto que le den y desplaza su propio cuerpo.
       Una anidada no: vive adentro de una fila y se desplaza con ella —si
       tuviera su propio desplazamiento habría dos barras, una adentro de la
       otra, y ninguna clara. */
    <div style={{
      background: cfg.anidada ? "transparent" : "#fff",
      border: cfg.anidada ? "none" : "1px solid var(--border)",
      borderRadius: cfg.anidada ? 0 : 12,
      overflow: "hidden",
      ...(cfg.anidada ? {} : {
        flex: "1 1 auto", minHeight: 0,
        display: "flex", flexDirection: "column",
      }),
    }}>
      <div style={{
        overflowX: "auto",
        ...(cfg.anidada ? {} : { flex: "1 1 auto", minHeight: 0, overflowY: "auto" }),
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead ref={cabecera}>
            <tr>
              <th style={{ ...th, ...pegado(0, 3), width: ANCHO_CHECK,
                ...(cfg.anidada ? { background: "transparent" } : {}) }}>
                {/* Elegir todas las de ESTE nivel. */}
                <input type="checkbox" checked={todas} onChange={todasONinguna}
                  disabled={!!edicion || cfg.filas.length === 0}
                  title="Elegir todas" style={{ accentColor: ACCENT }} />
              </th>
              <th style={{ ...th, ...pegado(0, 3), width: ANCHO_FLECHA,
                ...(cfg.anidada ? { background: "transparent" } : {}) }} />
              {columnas.map(c => (
                <th key={c.id} style={{ ...th, ...pegado(0, 3),
                  textAlign: c.numero || c.rastro ? "right" : "left",
                  width: c.ancho ? c.ancho + 20 : undefined,
                  ...(cfg.anidada ? { background: "transparent" } : {}) }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cfg.filas.map(f => {
              if (enEdicionAca && edicion!.clave === f.clave) return filaEnEdicion(f.clave);

              const elegida = mias.has(f.clave);
              const abierto = abierta === f.clave;
              const apagada = cfg.inactiva?.(f) ?? false;

              /*
               * Desplegada, la fila queda fija y su detalle se desplaza debajo.
               * Sin esto, al leer el detalle la fila se va para arriba y se
               * pierde de vista de quién es.
               *
               * Va en las CELDAS y no en el `<tr>`: `position: sticky` sobre
               * una fila no funciona en todos los navegadores, sobre una celda
               * sí. Y el fondo tiene que ser OPACO —no una mezcla con
               * `transparent`— porque lo de abajo pasa por atrás.
               */
              const pegadaSiAbierta: React.CSSProperties = !abierto ? {} : {
                ...pegado(altoCabecera, 2),
                background: elegida
                  ? "color-mix(in srgb, var(--brand-madre) 7%, #fff)" : "#fff",
                boxShadow: "0 1px 0 var(--border)",
              };

              return (
                /* La llave va en el Fragment, que es el hijo del `tbody`. Con
                   la llave sólo en el `<tr>` de adentro, React reordenaba mal
                   al filtrar y avisaba por consola. */
                <React.Fragment key={f.clave}>
                  <tr
                    onClick={() => !edicion && alternar(f.clave)}
                    onDoubleClick={() => !edicion && cfg.onAbrir?.(f)}
                    style={{
                      borderBottom: abierto ? "none" : "1px solid #F3F4F6",
                      cursor: edicion ? "default" : "pointer",
                      background: elegida && !abierto
                        ? "color-mix(in srgb, var(--brand-madre) 7%, transparent)" : undefined,
                      opacity: apagada ? 0.55 : 1,
                    }}>
                    <td style={{ ...celda, ...pegadaSiAbierta, width: ANCHO_CHECK }}>
                      <input type="checkbox" checked={elegida} readOnly
                        disabled={!!edicion} style={{ accentColor: ACCENT }} />
                    </td>
                    <td style={{ ...celda, ...pegadaSiAbierta,
                      width: ANCHO_FLECHA, color: "var(--gray-400)",
                      fontSize: "0.7rem" }}
                      onClick={e => {
                        if (!cfg.detalle) return;
                        // Abrir no es elegir: son dos gestos distintos sobre la
                        // misma fila y confundirlos hace elegir sin querer.
                        e.stopPropagation();
                        setAbierta(a => a === f.clave ? null : f.clave);
                      }}>
                      {cfg.detalle ? (abierto ? "▾" : "▸") : ""}
                    </td>

                    {columnas.map(c => (
                      <td key={c.id} style={{ ...celda, ...pegadaSiAbierta,
                        ...(c.numero || c.rastro ? num : {}),
                        ...(c.rastro ? { color: "var(--gray-400)", fontSize: "0.76rem" } : {}),
                        ...(c.esUso && Number(f[c.id]) > 0
                          ? { color: "#B45309", fontWeight: 700 } : {}) }}>
                        {c.chip
                          ? (() => { const e = c.chip!(f);
                              return e ? <Chip tono={e.tono}>{e.texto}</Chip> : null; })()
                          : c.ver ? c.ver(f) : String(f[c.id] ?? "—")}
                      </td>
                    ))}
                  </tr>

                  {abierto && cfg.detalle && (
                    <tr>
                      {/* Sangría sólo a la izquierda: a la derecha va a ras,
                          para que las columnas de adentro caigan debajo de las
                          de afuera. */}
                      <td colSpan={columnasTotales}
                        style={{ padding: "0.35rem 0 0.6rem 1.9rem",
                          background: "var(--gray-50)",
                          borderBottom: "1px solid #F3F4F6" }}>
                        {cfg.detalle(f)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* El alta es la misma fila, vacía, al final. */}
            {enEdicionAca && edicion!.clave === "nueva" && filaEnEdicion("nueva")}

            {cfg.filas.length === 0 && !enEdicionAca && (
              <tr><td colSpan={columnasTotales}
                style={{ ...celda, textAlign: "center", color: "var(--gray-400)",
                  padding: "1.5rem" }}>
                No hay nada todavía.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* El vocabulario visual. Ninguna herramienta elige colores.                */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Los cuatro estados que sabe decir el panel.
 *
 * POR QUÉ ACÁ Y NO EN CADA PANTALLA
 * Porque si cada herramienta elige su verde, terminan siendo cuatro verdes
 * distintos y ninguno quiere decir nada. Y peor: el día que cambie la marca,
 * hay que buscarlos uno por uno.
 *
 * Una herramienta dice QUÉ está pasando —está bien, hay que mirarlo, falló, no
 * aplica—; cómo se ve eso lo decide un solo lugar.
 */
export type Tono = "ok" | "atencion" | "error" | "neutro";

const TONOS: Record<Tono, { texto: string; fondo: string }> = {
  ok:       { texto: "#166534", fondo: "#DCFCE7" },
  atencion: { texto: "#B45309", fondo: "rgba(245,158,11,.15)" },
  error:    { texto: "#B91C1C", fondo: "#FEE2E2" },
  neutro:   { texto: "var(--mute)", fondo: "transparent" },
};

export function Chip({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  /* Un tono que no existe no puede tumbar la pantalla entera. Pasó: una
     herramienta pidió "aviso" -que no está en la lista- y toda la vista murió
     con "Cannot read properties of undefined". Un chip mal pintado se ve mal;
     una pantalla en blanco no se puede usar. */
  const t = TONOS[tono] ?? TONOS.neutro;
  return (
    <span style={{ fontSize: "0.66rem", fontWeight: 800, padding: "2px 8px",
      borderRadius: 999, whiteSpace: "nowrap", color: t.texto, background: t.fondo }}>
      {children}
    </span>
  );
}

/** Una fecha corta, como se muestra el rastro en todo el panel. */
export const fecha = (iso: unknown) => {
  if (!iso) return "—";
  const d = new Date(String(iso));
  return isNaN(d.getTime()) ? "—"
    : d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

/** Las columnas de rastro. Iguales en todas las tablas, siempre al final. */
export const COLUMNAS_DE_RASTRO: Columna[] = [
  { id: "creado",     label: "Creado",     rastro: true, ancho: 80, ver: f => fecha(f.creado) },
  { id: "modificado", label: "Modificado", rastro: true, ancho: 90, ver: f => fecha(f.modificado) },
];

export default Tabla;
