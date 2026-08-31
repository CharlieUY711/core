import { useState, useEffect, useRef } from "react";
import { buscarProductos, fichaPorTitulo, categoriaSugeridaDe,
         type FichaCanal, type ProductoEncontrado } from "../utils/canalesSync";
import { predecirTaxonomia } from "../utils/predecirTaxonomia";
import { buscarMarcas, logoDeDominio, marcaElegida, dominioDeUrl,
         type MarcaSugerida } from "../utils/marcasSync";
import { canalesDisponibles } from "../utils/canalesSync";
import { clasificarProducto } from "@core/tax";
import { decidir, hayDatosSuficientes, type Decision } from "../tax/decidir";
import { buscarImagenes, buscarVideos, type ResultadoBusqueda } from "../utils/busqueda";
import { buscarArticulosDeMarca, catalogoDeMarca } from "../utils/articulosDeMarca";
import { DatosDelProducto } from "../components/ficha/DatosDelProducto";
import { BloqueDetalles } from "../components/ficha/BloquesFicha";
import { NUMERICO, NUMERICO_SELECT } from "../ui/numeros";
import { useImagenesQueCargan } from "../ui/imagenesQueCargan";
import { puedeBuscarEnLaWeb, puedeLeerCatalogos } from "../utils/capacidades";
import { useShop } from "../components/AdminLayout";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";
import { MarketCard } from "../../public/MarketCard";

interface Depto  { id: string; nombre: string; }
interface Cat    { id: string; nombre: string; departamento_id: string; }
interface SubCat { id: string; nombre: string; categoria_id: string; }

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";
const GREEN  = "var(--color-success)";



/**
 * Condicion del articulo, con el vocabulario de Mercado Libre.
 *
 * Son los valores de su atributo ITEM_CONDITION, y los niveles de
 * Reacondicionado son los de GRADING. No una escala propia: guardar una
 * obligaria a traducirla al publicar, y toda traduccion entre vocabularios
 * pierde algo -"como nuevo" no es ninguno de los cuatro, y elegir a cual se
 * parece mas es una decision que despues nadie recuerda haber tomado-.
 *
 * Vale igual para Market y para Second: la condicion es del articulo, no del
 * canal. Que "Nuevo" pareciera lo contrario de "Second Hand" era la confusion
 * que habia.
 */
const CONDICIONES_ARTICULO = [
  { id:"Nuevo",           label:"Nuevo",           detalle:"Sin uso, en su empaque sellado" },
  { id:"Caja abierta",    label:"Caja abierta",    detalle:"Nuevo, sin sello. Accesorios originales" },
  { id:"Usado",           label:"Usado",           detalle:"Tuvo uso" },
  { id:"Reacondicionado", label:"Reacondicionado", detalle:"Reparado e inspeccionado. Requiere indicar el grado",
    niveles:["Excelente","Bueno","Aceptable"] as const },
] as const;
/**
 * Monedas de respaldo.
 *
 * Las de verdad salen de `currencies`, que trae siete activas con su simbolo y
 * sus decimales. Esta lista es solo para el instante entre que abre el
 * formulario y contesta la consulta: un selector vacio se ve roto.
 */
const MONEDAS_FALLBACK = [{ code:"UYU", decimals:2 }, { code:"USD", decimals:2 }];

/**
 * A donde va cada precio.
 *
 * NO son los canales de sincronizacion. Esos los declara el registro de
 * motores y hoy solo Mercado Libre tiene uno. Estos son los lugares donde se
 * COTIZA: la web propia, un mensaje de WhatsApp, una historia de Instagram.
 * Un precio puede vivir ahi sin que exista ningun motor que sincronice nada.
 *
 * Por eso la lista es fija y corta: son los seis lugares donde hoy se vende.
 * "Otro" existe para lo que aparezca sin tener que agregar una constante.
 */
/**
 * `canal` es la clave del motor de sincronizacion que hace falta para poder
 * cotizar ahi. Sin ese motor instalado y en orden, el destino no se puede
 * elegir: poner un precio para un lugar al que el sistema no llega es escribir
 * un numero que no va a ninguna parte.
 *
 * `nativo` es la excepcion, y es una sola: la web propia ES esta aplicacion.
 * Su precio es `catalog_variante.precio` y ya funciona; no hay ninguna
 * herramienta que instalar ni ningun tercero al que sincronizar. Pedirle un
 * motor dejaria a la tienda sin poder ponerle precio a su propia vidriera.
 */
const DESTINOS_PRECIO = [
  { id:"web",  label:"Web",  nombre:"Web propia",    color:"#FF5B14", nativo:true },
  { id:"ml",   label:"ML",   nombre:"Mercado Libre", color:"#E8B400", canal:"mercadolibre" },
  { id:"wa",   label:"WA",   nombre:"WhatsApp",      color:"#00A63E", canal:"whatsapp" },
  { id:"ig",   label:"IG",   nombre:"Instagram",     color:"#E0007B", canal:"instagram" },
  { id:"fb",   label:"FB",   nombre:"Facebook",      color:"#1E9FD0", canal:"facebook" },
  { id:"otro", label:"Otro", nombre:"Otro",          color:"#7A1FBF", canal:"otro" },
] as const;

/** Ancho del "+", que va al final de la fila de destinos. */
const ANCHO_MAS = 22;

/**
 * Los dias, en el orden en que se leen y con el numero que usa la base.
 *
 * 0 = domingo … 6 = sabado, igual que `extract(dow)` en Postgres y que
 * `getDay()` en JavaScript. Se arranca en lunes porque una promo de fin de
 * semana se piensa como "viernes, sabado y domingo", no como "domingo y
 * despues viernes y sabado".
 */
const DIAS_SEMANA = [
  { n:1, l:"L" }, { n:2, l:"M" }, { n:3, l:"M" }, { n:4, l:"J" },
  { n:5, l:"V" }, { n:6, l:"S" }, { n:0, l:"D" },
] as const;
const DISPONIBILIDADES = [
  { id:"inmediata",    label:"Inmediata",     desc:"Disponible para envío hoy" },
  { id:"bajo_pedido",  label:"Bajo pedido",   desc:"Se consigue en 3-5 días" },
  { id:"agotado",      label:"Sin stock",     desc:"Pausar publicación" },
];


// Canales de publicacion. `listo:false` = sin integracion real todavia: se
// muestran deshabilitados en vez de fingir que funcionan.
// Market y Second Hand no figuran aca: son el tipo del articulo (paso 1) y son
// excluyentes. Un articulo es nuevo o usado, no las dos cosas.
const DESTINOS = [
  { channel:"mercadolibre", label:"Mercado Libre", color:"#F5C518", listo:true  },
  { channel:"meta",         label:"Facebook / Instagram", color:"#1877F2", listo:false },
  { channel:"whatsapp",     label:"WhatsApp",      color:"#25D366", listo:false },
  { channel:"web",          label:"Mi web",        color:"#6B7280", listo:false },
];

/**
 * Alta de publicaciones. Se usa de dos formas:
 * Lo monta `ArticuloDeBiblioteca`, que resuelve el articulo antes: el alta y la
 * edicion viven en Biblioteca, que es la fuente -una publicacion es una ficha a
 * la que se le puso precio y canal-. Publicaciones ya no lo embebe: alli se
 * decide DONDE se ofrece, no que ES.
 * El tipo (Market / Second Hand) ya no se elige acá adentro: lo define quien
 * abre el formulario (los botones "Market +" / "Second +" de la toolbar de
 * Publicaciones) vía tipoInicial, así que se arranca directo en Información.
 */
/*
 * Geometria de las cuatro columnas.
 *
 * REGLA
 *   1. La tarjeta y la columna de medios tienen el mismo alto.
 *   2. Ese alto es el de las cuatro columnas.
 *   3. El ancho de la tarjeta define el de las ultimas tres.
 *   4. La descripcion se queda con el resto: es la que mas aire necesita.
 *
 * Las tres primeras no son independientes: juntas determinan el tamaño del
 * tile, no lo dejan a eleccion.
 *
 *   alto  = filas·t + (filas-1)·g          (la grilla de medios)
 *   ancho = columnas·t + (columnas-1)·g
 *   alto  = ancho + bloqueFijoTarjeta      (la tarjeta, al mismo alto)
 *
 * Despejando:  t = bloqueFijoTarjeta / (filas - columnas) - g
 *
 * Por eso el tamaño de las imagenes NO se elige directo: se elige cuantas
 * filas entran, y el tile sale de ahi. Mas filas, tiles mas chicos y columnas
 * mas angostas, con la tarjeta siguiendolas sin desalinearse. Antes eso eran
 * dos numeros que habia que ajustar hasta que casualmente coincidieran.
 *
 * Todo en pixeles: mezclar vh con px hacia que la relacion cambiara con la
 * pantalla, y por eso se veia distinto en el monitor que en la notebook.
 */
const GEOMETRIA = {
  /** Espacio entre tiles. */
  gapTiles: 4,
  /** Tres columnas de medios. */
  columnasMedios: 3,
  /** Seis filas: cuatro de imagenes, dos de videos. Subir este numero achica. */
  filasMedios: 6,
  /**
   * Alto del bloque de la tarjeta que NO escala con el ancho.
   *
   * MarketCard tiene imagen cuadrada -crece con el ancho- mas titulo, precio,
   * rating y boton de compra, que ocupan lo mismo sea cual sea el ancho.
   */
  bloqueFijoTarjeta: 285,
} as const;

/** Sale de igualar el alto de la grilla con el de la tarjeta. */
const LADO_TILE = Math.round(
  GEOMETRIA.bloqueFijoTarjeta / (GEOMETRIA.filasMedios - GEOMETRIA.columnasMedios)
  - GEOMETRIA.gapTiles,
);

/** Alto de las cuatro columnas. */
const ALTO_FILA = LADO_TILE * GEOMETRIA.filasMedios
                + GEOMETRIA.gapTiles * (GEOMETRIA.filasMedios - 1);

/**
 * Ancho de las tres columnas de la derecha.
 *
 * Es el de la tarjeta, y se calcula desde el alto para que la tarjeta llegue
 * exactamente ahi. Los medios miden lo mismo por construccion, salvo un pixel
 * de redondeo.
 */
const ANCHO_COLUMNA = ALTO_FILA - GEOMETRIA.bloqueFijoTarjeta;

/**
 * Ancho de la grilla de medios: tres tiles mas sus espacios.
 *
 * Se fija aparte del ancho de la columna. La columna vale lo que la tarjeta,
 * pero los tiles conservan su tamaño: si se estiraran con ella, la columna se
 * volveria mas alta, la tarjeta la seguiria, y cada vuelta amplificaria a la
 * anterior.
 */
const ANCHO_MEDIOS = LADO_TILE * GEOMETRIA.columnasMedios
                   + GEOMETRIA.gapTiles * (GEOMETRIA.columnasMedios - 1);

/**
 * Piso de la descripcion.
 *
 * Es la columna que mas aire necesita y tiene que ser la mas ancha.
 */
/**
 * Cuanto mas grande que el resto se muestra la tarjeta.
 *
 * 1 la deja exactamente al alto de la columna de medios, que era la regla
 * original. Por encima de 1 pasa a ser el elemento mas alto y la fila la
 * sigue, porque es la que muestra el articulo como lo va a ver quien compra y
 * ahi conviene que se lea bien.
 */
/**
 * Ancho de las columnas 2, 3 y 4, derivado del alto de la tarjeta.
 *
 * La tarjeta tiene imagen cuadrada -que crece con el ancho- mas un bloque de
 * titulo, precio, rating y compra que ocupa lo mismo siempre. Su alto es
 * ancho + bloque, asi que fijado el alto, el ancho sale solo:
 *
 *   ancho = ALTO_TARJETA - bloqueFijoTarjeta
 *
 * La perilla es el alto que se quiere para la tarjeta. Y sale de ahi y no del
 * alto de la fila, que es lo que tenia antes: como el alto de la fila depende
 * de cuantas filas de fotos haya, sacar una fila movia el ancho de las tres
 * columnas. La cantidad de fotos no tiene por que cambiar el ancho de la
 * tarjeta.
 */
/**
 * Proporcion de la tarjeta, tomada de su CSS.
 *
 *   .core-card-slot { aspect-ratio: 2 / 3.7 }
 *
 * O sea alto = ancho * 1.85. No hay ningun bloque que "no escale": la cara de
 * la tarjeta es position:absolute con inset:0, asi que llena el slot y todo
 * crece junto.
 *
 * Yo venia restandole al alto un `bloqueFijoTarjeta` de 285 que no existe, y
 * de ahi salian corridos todos los calculos derivados. Con la proporcion real
 * no hay nada que medir ni que suponer.
 */
const PROPORCION_TARJETA = 3.7 / 2;

/** Ancho elegido. El alto sale de el. */
const ANCHO_TARJETA_ELEGIDO = 250;
const ALTO_TARJETA = Math.round(ANCHO_TARJETA_ELEGIDO * PROPORCION_TARJETA);

const ANCHO_COLUMNAS_DERECHA = ANCHO_TARJETA_ELEGIDO;

/** Filas de cada seccion de la columna de medios. */
const FILAS_FOTOS  = 4;
const FILAS_VIDEOS = 2;

/**
 * Separacion vertical entre filas de la columna de medios.
 *
 * No es un valor elegido: es lo que falta para que el bloque entero -fotos mas
 * videos- mida exactamente lo que la tarjeta. Se calcula porque depende del
 * ancho de la columna y de cuantas filas haya; a ojo habria que reajustarlo
 * cada vez que se toque cualquiera de las dos.
 *
 * Los tiles son cuadrados y ocupan el ancho de la columna, asi que su lado
 * sale del ancho. Con el lado conocido, el alto que falta se reparte entre las
 * separaciones:
 *
 *   filas*lado + (filas-1)*separacion = ALTO_TARJETA
 *
 * La separacion horizontal NO cambia: los tiles se separan poco a lo ancho -no
 * hay alto que llenar en ese eje- y estirarlos ahi los dejaria de a pares
 * flotando.
 */
/**
 * Lado de la foto, elegido: 80 x 80.
 *
 * De ahi sale el ancho de la grilla -tres tiles mas dos separaciones- en vez de
 * dejar que los tiles se estiren al ancho de la columna. Con 250 de columna
 * daban 80,67; fijar el lado deja el sobrante como aire al costado, que no se
 * ve, en lugar de tener un tile con decimales.
 */
const LADO_FOTO = 80;
/**
 * Alto del tile de video.
 *
 * El 16/9 daba 45 para un ancho de 80. Se fija el alto en vez de la proporcion
 * porque lo que importa acá es cuánto ocupa la fila, no la forma del recuadro.
 */
const ALTO_VIDEO = 46;
const ANCHO_GRID_MEDIOS = LADO_FOTO * GEOMETRIA.columnasMedios
                        + GEOMETRIA.gapTiles * (GEOMETRIA.columnasMedios - 1);

const LADO_TILE_REAL =
  (ANCHO_COLUMNAS_DERECHA - GEOMETRIA.gapTiles * (GEOMETRIA.columnasMedios - 1))
  / GEOMETRIA.columnasMedios;

const FILAS_TOTALES = FILAS_FOTOS + FILAS_VIDEOS;

/** La separacion que hace que el bloque mida exactamente el alto de la tarjeta. */
/**
 * Ritmo vertical de la pagina.
 *
 * Todo se mide en unidades de la separacion entre filas de fotos. Una sola
 * medida y sus multiplos se leen como una grilla; varias parecidas -13, 16,
 * 20- se leen como desprolijidad, aunque nadie sepa decir por que.
 *
 *   entre elementos      1.5 unidades
 *   campo y su condicion 1 unidad
 *
 * La condicion va mas pegada a proposito: no es un campo aparte sino una
 * precision sobre el articulo que esta justo arriba, y la distancia lo dice
 * antes que cualquier titulo.
 */
const SEPARACION_VERTICAL = 10.67;
const RITMO       = SEPARACION_VERTICAL * 1.5;
const RITMO_JUNTO = SEPARACION_VERTICAL;

/**
 * Aire entre la linea horizontal y el contenido de la fila.
 *
 * El mismo arriba y abajo: la linea de arriba la traza la barra de acciones y
 * la de abajo la cierra la fila. Dos lineas iguales a distinta distancia se
 * leen como un error antes que como una decision.
 */
const AIRE_LINEA = 24;

/**
 * Franja de avisos, debajo de la ficha.
 *
 * Tres renglones, y fijo. Si creciera con lo que hay para decir, la pagina se
 * moveria cada vez que aparece o se va un aviso y lo que uno estaba mirando
 * cambia de lugar. Cuando un aviso no entra, scrollea el aviso; la franja no
 * se mueve.
 *
 * Adentro se repiten las mismas cuatro columnas de arriba, sin lineas que las
 * separen: los avisos caen debajo de la columna a la que se refieren, y esa
 * coincidencia es lo que dice a que campo apuntan sin tener que nombrarlo.
 */
/** Aire de la franja de avisos: menos que el de la ficha, para que las lineas
 *  queden pegadas al texto en vez de encerrar una banda casi vacia. */
/**
 * Tope de la descripcion.
 *
 * El contador ya decia "/ 2000" pero nada lo impedia: se podia escribir de mas
 * y descubrirlo al guardar, o peor, al publicar. El limite se aplica donde se
 * escribe.
 */
const MAX_DESCRIPCION = 2000;

const AIRE_MONITOR  = 8;
const LINEA_TEXTO   = 20;
const ALTO_MONITOR  = LINEA_TEXTO * 3;

/**
 * Alto de todo control de una linea: inputs, selects, el tile del logo.
 *
 * Sin esto cada uno resolvia su alto por su cuenta -el input por su padding, el
 * select por lo que decide el navegador, el tile por un 44 fijo- y quedaban
 * desparejos por unos pocos pixeles. Esa diferencia no se lee como "este
 * control es mas alto": se lee como que la distancia al elemento de abajo es
 * mayor, que fue justamente lo que se noto entre Marca y Articulo.
 */
const ALTO_CAMPO = 40;


const ANCHO_MIN_DESCRIPCION = 380;

/**
 * Ancho que necesita la fila.
 *
 * Por debajo no entra, y apretarla no es opcion: deformaria la tarjeta y los
 * tiles dejarian de ser cuadrados. Se calcula en vez de elegir un breakpoint a
 * ojo, asi cambiar cualquier medida lo corrige solo.
 */
const GAP_COLUMNAS = 16;
const PADDING_TARJETA_CONTENEDORA = 48;
const ANCHO_MINIMO_FILA =
  ANCHO_MIN_DESCRIPCION + ANCHO_COLUMNAS_DERECHA * 3
  + GAP_COLUMNAS * 3 + PADDING_TARJETA_CONTENEDORA;

/**
 * Campo con su check "personalizado" adentro, a la derecha.
 *
 * El check vivia en un renglon propio arriba del campo. Ese renglon existia
 * solo para una casilla, y cada renglon de ese tipo es una linea mas que leer
 * antes de llegar a lo que importa.
 *
 * Adentro tambien queda mas cerca de lo que decide: tildarlo cambia el
 * comportamiento DE ESE campo -deja de buscar y se escribe a mano-, asi que
 * ponerlo al lado del cursor dice mejor a que se aplica que un renglon aparte.
 *
 * Al tildarlo el campo queda vacio y enfocado, listo para escribir. Al
 * destildarlo vuelve a buscar. En los dos casos el foco termina donde va a
 * seguir escribiendo, para no obligar a volver a hacer clic.
 */
function CampoConCheck({
  valor, onChange, placeholder, marcado, onMarcar, etiqueta,
  soloLectura = false, estiloInput, confirmado = false, onCambiar,
  bloqueado = false, onEnter,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  marcado: boolean;
  onMarcar: (m: boolean) => void;
  etiqueta: string;
  soloLectura?: boolean;
  estiloInput: React.CSSProperties;
  /** Ya hay una eleccion hecha: el check deja lugar a "Cambiar". */
  confirmado?: boolean;
  onCambiar?: () => void;
  /**
   * El campo todavia no fue abierto: se ve y no se toca.
   *
   * Marca y articulo son los dos campos de los que cuelga todo lo demas -las
   * busquedas de catalogo, las fotos, la categoria-. Pararse encima no alcanza
   * para editarlos: un clic al pasar no puede ser lo que habilite cambiar la
   * identidad de un articulo ya publicado. Se abren con "Cambiar", que es una
   * decision explicita, y los dos se comportan igual.
   */
  bloqueado?: boolean;
  /**
   * Que hacer con Enter en este campo.
   *
   * En un campo con lista de sugerencias, Enter significa "esta" — no "pasar
   * al siguiente". La regla general de la app -Enter como Tab- se apaga aca
   * con `data-enter-nativo`, que existe justo para este caso.
   */
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const alternar = () => {
    onMarcar(!marcado);
    // El foco va al campo en los dos sentidos: tildar es "lo escribo yo" y
    // destildar es "busca de nuevo", y las dos cosas siguen con el teclado.
    requestAnimationFrame(() => ref.current?.focus());
  };
  return (
    <div style={{ position:"relative", flex:1, minWidth:0 }}
      {...(onEnter ? { "data-enter-nativo": "" } : null)}>
      <input ref={ref}
        style={{ ...estiloInput, width:"100%", paddingRight: etiqueta.length * 6.4 + 34,
          ...(bloqueado ? { background:"#F8F9FB", cursor:"text" } : null) }}
        value={valor} readOnly={soloLectura || bloqueado}
        onKeyDown={onEnter ? (e) => {
          if (e.key === "Enter") { e.preventDefault(); onEnter(); }
        } : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} />
      {(confirmado || bloqueado) ? (
        /*
         * Con la marca ya elegida, "Personalizada" no ofrece nada: la decision
         * ya se tomo. Lo unico que puede querer alguien en ese momento es
         * cambiarla, asi que eso es lo que va, y en el mismo lugar donde
         * estaba el check.
         *
         * Tambien saca el "Cambiar marca" que vivia en un renglon aparte
         * arriba del campo: un renglon entero para una accion que entra al
         * lado del dato.
         */
        <button
          onClick={() => { onCambiar?.(); requestAnimationFrame(() => ref.current?.focus()); }}
          style={{
            position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
            border:"none", background:"#fff", paddingLeft:6, cursor:"pointer",
            fontSize:"0.72rem", fontWeight:700, color:ACCENT, textDecoration:"underline",
          }}>
          Cambiar
        </button>
      ) : (
      <label
        onClick={(e) => { e.preventDefault(); alternar(); }}
        title={marcado
          ? `Lo estás escribiendo a mano. Destildá para volver a buscar.`
          : `Tildá para escribir ${etiqueta.toLowerCase()} a mano, sin buscar.`}
        style={{
          position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
          display:"flex", alignItems:"center", gap:5, cursor:"pointer",
          fontSize:"0.7rem", color: marcado ? "#111" : "var(--gray-400)",
          fontWeight: marcado ? 700 : 400, userSelect:"none",
          // Fondo del color del campo: el texto que se escribe pasa por debajo
          // y sin esto se leerian encimados.
          background:"#fff", paddingLeft:6,
        }}>
        <input type="checkbox" checked={marcado} readOnly
          style={{ accentColor: ACCENT, margin:0, pointerEvents:"none" }} />
        {etiqueta}
      </label>
      )}
    </div>
  );
}

/**
 * Condicion del articulo, en una linea.
 *
 * Cuando la condicion elegida tiene niveles propios, las demas desaparecen: ya
 * no son una eleccion pendiente, y dejarlas ahi obliga a leer seis opciones
 * para ver las tres que importan ahora. La elegida queda a la izquierda y sus
 * niveles siguen en la misma linea, que es el orden en que se decide: primero
 * que es, despues cuanto.
 *
 * Se vuelve tocando la condicion elegida. No hay un boton aparte para eso: el
 * mismo lugar que la eligio la suelta.
 */
/**
 * Los seis destinos, como pastillas.
 *
 * Forma de pista de atletismo -lados rectos, puntas redondas- y no circulos:
 * un circulo con la etiqueta al lado obliga a leer dos cosas para entender
 * una. Con el nombre adentro, la pastilla es la etiqueta.
 *
 * TODAS DEL MISMO ANCHO, aunque "Otro" tenga cuatro letras y "ML" dos. Seis
 * pastillas de anchos distintos se leen como seis cosas distintas; iguales, se
 * leen como una fila de opciones — que es lo que son.
 *
 * El color es el del destino, y va en el texto y en el borde siempre. Elegido
 * se pinta con una version clara del mismo color en vez de con el color pleno:
 * asi la leyenda sigue siendo del color del destino, que es lo que se reconoce
 * sin leer, en vez de volverse blanca y perderlo.
 */
/**
 * Cómo se lee la vigencia de una línea, en una sola frase.
 *
 * El panel está plegado casi siempre, así que este texto es lo único que
 * distingue "sin nada puesto" de "hay una campaña configurada acá abajo".
 * Plegado no puede significar oculto.
 */
function resumenVigencia(l: {
  etiqueta: string; desde: string; hasta: string;
  horaDesde: string; horaHasta: string; dias: number[];
}): string {
  const partes: string[] = [];
  if (l.desde && l.hasta)   partes.push(`${l.desde} → ${l.hasta}`);
  else if (l.desde)         partes.push(`desde ${l.desde}`);
  else if (l.hasta)         partes.push(`hasta ${l.hasta}`);

  if (l.dias.length && l.dias.length < 7) {
    partes.push(DIAS_SEMANA.filter(d => l.dias.includes(d.n)).map(d => d.l).join(""));
  }
  if (l.horaDesde && l.horaHasta) partes.push(`${l.horaDesde}–${l.horaHasta}`);

  const cuando = partes.length ? partes.join(" · ") : "siempre";
  return l.etiqueta ? `${l.etiqueta} · ${cuando}` : `Rige ${cuando}`;
}

/**
 * La fila de destinos: seis columnas iguales y el "+" al final.
 *
 * Misma caja y mismo gap que el renglon de moneda/precio/impuesto, asi los dos
 * miden EXACTAMENTE lo mismo. Antes las pastillas tenian un ancho fijo y la
 * fila terminaba antes o despues que la de arriba segun la pantalla, que es
 * justo lo que se nota.
 */
const filaDestinos: React.CSSProperties = {
  display:"grid",
  gridTemplateColumns:`repeat(${DESTINOS_PRECIO.length}, 1fr) ${ANCHO_MAS}px`,
  gap:"0.4rem", alignItems:"center", width:"100%",
};

function PastillasDestino({ elegidos, onToggle, ocupados, motores }: {
  elegidos: string[];
  onToggle: (id: string) => void;
  /** Destinos que ya tomo otra linea: no se pueden elegir en dos lados. */
  ocupados?: string[];
  /** Motores de sincronizacion instalados y en orden. */
  motores: Set<string>;
}) {
  return (
    <>
      {DESTINOS_PRECIO.map(d => {
        const on = elegidos.includes(d.id);
        // Sin herramienta INSTALADA no hay destino: la pastilla se ve y no se
        // toca. Que este instalada y sin conectar no bloquea nada — el precio
        // se decide igual, y cuando se conecte ya esta puesto.
        const sinMotor = !("nativo" in d) && !motores.has((d as any).canal);
        const tomado   = !on && (ocupados ?? []).includes(d.id);
        const off      = sinMotor || tomado;

        return (
          <button key={d.id} type="button" disabled={off}
            onClick={() => onToggle(d.id)}
            title={
              sinMotor ? `${d.nombre}: no hay herramienta de sincronización instalada`
              : tomado  ? `${d.nombre} ya tiene otro precio`
              : d.nombre
            }
            style={{
              width:"100%", height:20, padding:0,
              borderRadius:999,
              border:`1.5px ${sinMotor ? "dashed" : "solid"} ${off ? "var(--border)" : d.color}`,
              background: on ? `${d.color}26` : sinMotor ? "#F8F9FB" : "#fff",
              color: off ? "var(--gray-400)" : d.color,
              fontSize:"10px", fontWeight:800, letterSpacing:".02em",
              fontFamily:"inherit",
              cursor: off ? "not-allowed" : "pointer",
              opacity: tomado ? .5 : 1,
              transition:"background .12s",
            }}>{d.label}</button>
        );
      })}
    </>
  );
}

function LineaCondicion({ opciones, valor, onChange, subValor, onSubValor }: {
  opciones: readonly { readonly id: string; readonly label: string;
                       readonly niveles?: readonly string[]; readonly detalle?: string }[];
  valor: string;
  onChange: (id: string) => void;
  subValor: string;
  onSubValor: (v: string) => void;
}) {
  const elegida = opciones.find((o) => o.id === valor);
  const conNiveles = elegida && elegida.niveles && elegida.niveles.length > 0;

  const opcion = (activo: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
    fontWeight: activo ? 700 : 400,
    color: activo ? "#111" : "var(--mute)",
  });

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.9rem", flexWrap:"wrap",
      fontSize:"0.78rem", color:"#374151" }}>

      {conNiveles ? (
        <>
          {/* La elegida, a la izquierda. Tocarla vuelve a la lista completa. */}
          <span onClick={() => onChange("")} title="Cambiar la condición"
            style={{ ...opcion(true), cursor:"pointer" }}>
            <input type="radio" checked readOnly style={{ accentColor: ACCENT, margin:0, pointerEvents:"none" }} />
            {elegida!.label}
          </span>
          <span style={{ color:"var(--gray-400)" }}>›</span>
          {elegida!.niveles!.map((n) => (
            <label key={n} style={opcion(subValor === n)}>
              <input type="radio" name="nivel-condicion"
                checked={subValor === n} onChange={() => onSubValor(n)}
                style={{ accentColor: ACCENT, margin:0 }} />
              {n}
            </label>
          ))}
        </>
      ) : (
        opciones.map((o) => (
          <label key={o.id} title={o.detalle} style={opcion(valor === o.id)}>
            <input type="radio" name="condicion-articulo"
              checked={valor === o.id}
              onChange={() => { onChange(o.id); if (o.niveles?.length) onSubValor(o.niveles[0]); }}
              style={{ accentColor: ACCENT, margin:0 }} />
            {o.label}
          </label>
        ))
      )}
    </div>
  );
}

export default function AdminArticulos(
  { onFinish, onCancel, tipoInicial, onResumen, onAcciones, articulo, modo = "articulo" }:
  {
    onFinish?: () => void;
    onCancel?: () => void;
    tipoInicial?: "market"|"secondhand";
    /**
     * Avisa lo que se lleva cargado, para que quien monte el formulario pueda
     * mostrarlo -por ejemplo, como la fila de la tabla que se va completando-.
     *
     * Es un aviso, no un estado compartido: el formulario sigue siendo dueño
     * de sus datos. Levantar el estado para que otro lo dibuje ataria las dos
     * cosas y cualquier cambio en el formulario obligaria a tocar la pantalla.
     */
    /**
     * Articulo a editar. Sin esto, el formulario crea uno nuevo.
     *
     * Es el mismo formulario en los dos casos: alta y edicion no son dos cosas
     * distintas sino el mismo formulario con o sin datos. Tener dos pantallas
     * garantizaba que se separaran, y se separaron.
     */
    articulo?: any;
    /**
     * Qué se está cargando. El formulario es EL MISMO en los dos casos —dos
     * formularios divergen, y ya lo vimos con el editor de pestañas— pero una
     * ficha de Biblioteca no tiene precio, stock ni canales: eso aparece
     * cuando se decide vender.
     *
     *   "articulo" — alta o edición de algo que se vende.
     *   "ficha"    — sólo lo que el producto ES, para la Biblioteca.
     */
    modo?: "articulo" | "ficha";
    /**
     * Lo que se puede hacer con este formulario, para que lo dibuje la barra de
     * la pantalla y no el formulario.
     *
     * Los botones del panel viven en la barra de arriba, siempre en el mismo
     * lugar. Este formulario tenia el suyo abajo del todo, que es donde nadie
     * lo busca —y en la fila desplegada de la Biblioteca queda a varias
     * pantallas de scroll del titulo—.
     *
     * Con esto declarado, el formulario deja de dibujar su propio pie: dos
     * botones que guardan lo mismo son dos, y uno de los dos sobra.
     */
    onAcciones?: (a: {
      grabar: () => void;
      /** Qué falta para poder grabar. Vacío si no falta nada. */
      falta: string;
      guardando: boolean;
      /** "Publicar artículo", "Guardar cambios", "Guardar borrador". */
      etiqueta: string;
    }) => void;
    onResumen?: (r: {
      nombre: string; precio: number; moneda: string; stock: number;
      imagen: string | null; estado: string; canales: string[]; tipo: string;
      /** Lo que la Biblioteca muestra en "Detalle": marca · familia. */
      marca: string; familia: string | null;
    }) => void;
  } = {}
) {
  const { isAdmin } = useOutletContext<any>() || {};
  const navigate    = useNavigate();
  const salir = (recargar: boolean) => {
    const cb = recargar ? onFinish : onCancel;
    if (cb) cb();
    else navigate("/admin/publicaciones");
  };
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState<{text:string;ok:boolean}|null>(null);

  // Catálogo
  const [deptos,  setDeptos]  = useState<Depto[]>([]);
  const [cats,    setCats]    = useState<Cat[]>([]);
  const [subcats, setSubcats] = useState<SubCat[]>([]);

  // Tipo: viene fijo desde afuera (tipoInicial); ya no hay un paso propio
  // para elegirlo.
  const [tipo, setTipo] = useState<"market"|"secondhand">(tipoInicial ?? "market");

  // PASO 2: Marca
  // "buscando"     = todavía escribiendo / eligiendo de las sugerencias
  // "sugerida"     = eligió una marca de la lista sugerida (o tiene logo propio)
  // "personalizada"= marca escrita a mano, no está en las sugerencias
  const [marca,         setMarca]         = useState("");
  const [marcaModo,     setMarcaModo]     = useState<"buscando"|"sugerida"|"personalizada">("buscando");
  const [marcaConfirmada, setMarcaConfirmada] = useState(false);
  const [candidatosMarca, setCandidatosMarca] = useState<MarcaSugerida[]>([]);
  const [buscandoMarca,  setBuscandoMarca]    = useState(false);
  /**
   * Dominio del fabricante de la marca elegida.
   *
   * Es lo que permite buscar el articulo EN SU SITIO y no en cualquier lado.
   * Sin esto, con la marca "Apple" confirmada, "iPhone 17" traia igual paginas
   * de reviews, de tiendas y de foros — cualquier lugar donde se mencione.
   */
  const [marcaDominio,   setMarcaDominio]   = useState<string|null>(null);
  const [logoUrl,        setLogoUrl]        = useState<string|null>(null); // logo encontrado
  const [logoPersonalizado, setLogoPersonalizado] = useState<string|null>(null); // subido a mano
  const [logoError,      setLogoError]      = useState(false); // el logo encontrado no cargó

  // Buscador de logo: el mismo mecanismo que las fotos del artículo (un
  // tile que al tocarlo abre un buscador de imágenes de la web), pero acá
  // el texto de búsqueda no lo escribe la persona: sale de la marca +
  // "logo", así el buscador va directo a traer el logo en vez de fotos del
  // producto.
  const [logoModalOpen,  setLogoModalOpen]  = useState(false);
  const [logoQuery,      setLogoQuery]      = useState("");
  const [logoResultados, setLogoResultados] = useState<ResultadoBusqueda[]>([]);
  /** Las que no cargan no se ofrecen: una URL rota no es una imagen. */
  const imgs = useImagenesQueCargan();
  const [buscandoLogoWeb,setBuscandoLogoWeb]= useState(false);

  const buscarLogoWeb = async (q: string) => {
    const texto = q.trim();
    if (texto.length < 2) { setLogoResultados([]); return; }
    setBuscandoLogoWeb(true);
    const r = await buscarImagenes(texto);
    setLogoResultados(r);
    setBuscandoLogoWeb(false);
  };
  const abrirBuscadorLogo = () => {
    const q = `${marca.trim()} logo`.trim();
    setLogoQuery(q);
    setLogoModalOpen(true);
    buscarLogoWeb(q);
  };
  /**
   * Elegir el logo DEFINE la marca.
   *
   * Hay nombres que comparten varias marcas distintas: "Santa Laura" son
   * Olivares de Santa Laura, Ganadera Santa Laura, Cerealista Santa Laura y
   * Agrícola Santa Laura, cada una con su sitio y su catálogo. Mostrar todos
   * los logos está bien —quien carga sabe cuál es el suyo apenas lo ve— pero
   * elegir uno tiene que cerrar la ambigüedad, no dejarla abierta.
   *
   * Al elegirlo se toman el nombre completo y el dominio de ESE resultado. A
   * partir de ahí el artículo se busca en el sitio de esa marca y no en el de
   * su homónima, que es lo que estaba pasando.
   *
   * Si el resultado no trae de dónde salió —a veces la imagen viene sin
   * página— se queda el logo y la marca sigue como estaba: es mejor que
   * inventarle un dominio.
   */
  const elegirLogoBuscado = (r: ResultadoBusqueda) => {
    if (!r.imagen) return;
    setLogoUrl(r.imagen);
    setLogoError(false);
    setLogoPersonalizado(null);
    setLogoModalOpen(false);

    const dominio = dominioDeUrl(r.url);
    if (!dominio) return;
    setMarcaDominio(dominio);
    setMarca(marcaElegida(dominio, r.nombre));
    setMarcaModo("sugerida");
    setMarcaConfirmada(true);
    // El artículo que hubiera se suelta: era de la marca anterior, que puede
    // ser otra empresa con el mismo nombre.
    setIdElegido(null);
    setElegido(null);
    setCandidatos([]);
  };
  const quitarLogo = () => { setLogoUrl(null); setLogoPersonalizado(null); setLogoError(false); };

  // Se espera a que deje de escribir: la sugerencia ahora sale de una
  // búsqueda web real (Serper/Google), no de filtrar una lista en memoria.
  /**
   * Campos que el usuario abrio.
   *
   * Editar un articulo ya cargado sembraba marca y nombre en el estado, y eso
   * disparaba las busquedas de catalogo, fotos y videos como si los estuviera
   * escribiendo en ese momento: sugerencias que nadie pidio sobre campos que
   * nadie toco, y el riesgo de pisar datos correctos con una coincidencia.
   *
   * Un campo se abre cuando el usuario se para en el: hasta entonces se lee
   * pero no se edita, y ninguna busqueda corre por su cuenta.
   *
   * En el alta no hay nada que proteger -los campos arrancan vacios y lo unico
   * que hay es lo que se acaba de escribir-, asi que todo esta abierto desde
   * el principio y no cambia nada.
   */
  const bloqueaCampos = !!articulo;
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const abrir = (c: string) =>
    setAbiertos(prev => prev.has(c) ? prev : new Set(prev).add(c));
  const abierto = (c: string) => !bloqueaCampos || abiertos.has(c);

  useEffect(() => {
    if (!puedeBuscarEnLaWeb()) { setCandidatosMarca([]); return; }
    if (!abierto("marca")) { setCandidatosMarca([]); return; }
    if (marcaConfirmada) { setCandidatosMarca([]); return; }
    const q = marca.trim();
    if (q.length < 2) { setCandidatosMarca([]); return; }
    let vivo = true;
    setBuscandoMarca(true);
    const t = setTimeout(async () => {
      const r = await buscarMarcas(q);
      if (!vivo) return;
      setCandidatosMarca(r);
      setBuscandoMarca(false);
    }, 500);
    return () => { vivo = false; clearTimeout(t); };
  }, [marca, marcaConfirmada, abiertos]);

  const elegirMarcaSugerida = (m: MarcaSugerida) => {
    setMarca(m.nombre);
    setMarcaModo("sugerida");
    setMarcaConfirmada(true);
    setMarcaDominio(m.dominio);
    setLogoUrl(m.imagen ?? logoDeDominio(m.dominio));
    setLogoError(false);
    setLogoPersonalizado(null);
  };
  const olvidarDominioDeMarca = () => setMarcaDominio(null);
  const elegirMarcaPersonalizada = () => {
    olvidarDominioDeMarca();
    setMarcaModo("personalizada");
    setMarcaConfirmada(true);
    setLogoUrl(null);
    setLogoError(false);
  };
  const cambiarMarca = () => {
    setMarcaConfirmada(false);
    setMarcaModo("buscando");
    setLogoUrl(null);
    setLogoError(false);
    setLogoPersonalizado(null);
  };
  const subirLogoPersonalizado = (file: File) => {
    const r = new FileReader();
    r.onload = () => setLogoPersonalizado(String(r.result));
    r.readAsDataURL(file);
  };

  // PASO 2: Información
  const [nombre,      setNombre]      = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Lo que el canal sabe del producto. Se busca mientras se escribe el nombre:
  // todo lo que no es una decision de quien vende -las versiones que existen,
  // la descripcion, las fotos del fabricante, el precio de mercado- es
  // informacion publica del producto y no hay por que hacersela cargar.
  const [candidatos, setCandidatos] = useState<ProductoEncontrado[]>([]);
  const [buscandoProd, setBuscandoProd] = useState(false);
  /** Lo que se muestra es el catalogo de la marca y no coincidencias. */
  const [mostrandoCatalogo, setMostrandoCatalogo] = useState(false);

  /**
   * Camino de categorias que sugiere el canal para este titulo.
   *
   * Se pide aunque ML no tenga el producto: sabe clasificar "Aceite de oliva
   * extra virgen 500 ml" sin tenerlo publicado. Antes esto solo llegaba cuando
   * se adoptaba un producto de SU catalogo, que es el caso raro — y por eso el
   * departamento no se predecia casi nunca.
   */
  const [pathCategoriaCanal, setPathCategoriaCanal] = useState<string[] | null>(null);

  /**
   * A cuanto lo vende el representante oficial.
   *
   * Es la comparacion mas util que hay: el mismo producto, en el mismo pais,
   * por quien lo representa. Mucho mas que la mediana de un marketplace, que
   * mezcla reventa, usados y accesorios.
   *
   * NO se usa para poner el precio: ese lo decide quien vende. Se muestra al
   * lado, con el nombre de la tienda, para que la decision se tome sabiendo.
   */
  const [precioOficial, setPrecioOficial] = useState<
    { tienda: string; precio: number; moneda: string } | null>(null);

  /**
   * Cargar varios de la misma marca, despues de guardar uno.
   *
   * Quien carga un producto de una marca casi siempre carga varios: ya tiene el
   * catalogo abierto, ya identifico el fabricante, ya sabe donde clasificarlo.
   * Preguntarselo ahi -y no obligarlo a repetir todo el alta por cada uno- es
   * lo que evita que "cargar el catalogo" sea una tarde de trabajo.
   *
   * No reemplaza a la carga masiva de verdad, que sera su propio modulo con
   * archivos y mapeo de columnas. Resuelve el caso comun con lo que ya esta.
   */
  const [masivoAbierto, setMasivoAbierto]   = useState(false);
  const [masivoItems, setMasivoItems]       = useState<ResultadoBusqueda[]>([]);
  const [masivoElegidos, setMasivoElegidos] = useState<Set<string>>(new Set());
  const [masivoCargando, setMasivoCargando] = useState(false);
  /**
   * Si el cuadro se abrio DESPUES de guardar, "el punto anterior" es la lista:
   * el alta ya termino. Si se abrio desde el enlace, es el formulario. Volver
   * tiene que llevar a donde estaba cada uno, no siempre al mismo lado.
   */
  const [masivoTrasGuardar, setMasivoTrasGuardar] = useState(false);
  /**
   * El cuadro tiene dos pasos: primero las familias, despues sus productos.
   *
   * Un catalogo entero es una lista de cuarenta o cien filas, y tildar de a una
   * es exactamente el trabajo que este cuadro venia a evitar. Elegir "iPhone" y
   * "Mac" y ver solo eso convierte cuarenta decisiones en dos.
   *
   * Con una sola familia el primer paso se saltea: una eleccion con una sola
   * opcion no es una eleccion.
   */
  const [masivoPaso, setMasivoPaso] = useState<"familias" | "productos">("productos");
  const [masivoFamilias, setMasivoFamilias] = useState<Set<string>>(new Set());
  const [elegido, setElegido] = useState<FichaCanal|null>(null);
  const [idElegido, setIdElegido] = useState<string|null>(null);
  const [condicion,   setCondicion]   = useState("Nuevo");

  /**
   * Nombre de la vista, para el encabezado.
   *
   * La URL es la misma que la de la lista, asi que la ruta no puede decir que
   * se esta viendo una ficha ni de que tipo es el articulo. Lo declara esta
   * pantalla, y se limpia al salir para no dejar el encabezado hablando de algo
   * que ya no esta en pantalla.
   */
  /**
   * La tarjeta llega al alto de la columna de medios midiendose.
   *
   * Su alto es ancho + un bloque que no escala -titulo, precio, rating,
   * compra-. Yo estimaba ese bloque a ojo y por eso la tarjeta quedaba corta:
   * el numero dependia de la fuente, del zoom y del contenido, y no hay
   * constante que acierte en todos los casos.
   *
   * Se mide lo que realmente ocupa y se corrige el ancho por la diferencia.
   * Como el alto crece exactamente lo que crece el ancho, una sola correccion
   * alcanza; el efecto se vuelve a aplicar si cambia el contenido o el tamaño
   * de la ventana.
   */
  /**
   * La tarjeta al alto de la columna de medios, en un solo calculo.
   *
   * Su alto es ancho + un bloque que no escala -titulo, precio, rating,
   * compra-. Ese bloque no se puede saber de antemano: depende de la fuente,
   * del zoom y del contenido. Pero SI se puede medir, y una vez medido el
   * ancho correcto sale directo:
   *
   *   bloque = altoMedido - anchoActual
   *   ancho  = altoDeLaColumnaDeMedios - bloque
   *
   * Antes lo corregia por diferencias sucesivas y el efecto no tenia lista de
   * dependencias, asi que corria en cada render: cada correccion disparaba
   * otra y la tarjeta temblaba. Un calculo directo no puede oscilar.
   *
   * ResizeObserver en vez de correr en cada render: solo interesa cuando algo
   * cambia de tamaño de verdad.
   */
  /**
   * La tarjeta, a partir del alto real de la columna de medios.
   *
   * Su alto es ancho + un bloque que no escala -titulo, precio, rating,
   * compra-. Ese bloque no se puede saber de antemano, pero se mide una vez:
   *
   *   bloque = altoDeLaTarjeta - anchoDeLaTarjeta
   *   ancho  = (altoDeMedios - bloque) * ESCALA_TARJETA
   *
   * EL BLOQUE SE MIDE UNA SOLA VEZ, a proposito. Al cambiarle el ancho a la
   * tarjeta su texto reacomoda y el bloque cambia un poco; si se volviera a
   * medir, cada ajuste dispararia otro y la tarjeta tiembla. Eso es lo que
   * estaba pasando: el observer miraba tambien la tarjeta, o sea su propia
   * consecuencia.
   *
   * Se observa unicamente la columna de medios, que es la causa y no el
   * efecto.
   */
  /**
   * Ancho comun de las tres columnas de la derecha: el de la tarjeta.
   *
   * LA TARJETA MANDA Y NADIE LE RESPONDE. Eso es deliberado: si el ancho
   * saliera del alto medido de la columna de medios, y a la vez ese ancho
   * ensanchara los tiles, cada vuelta se amplificaria -tiles mas anchos, mas
   * altos, tarjeta mas grande, tiles mas anchos- y el layout diverge. Ya paso
   * con una version anterior, que temblaba.
   *
   * Lo unico que se mide es el bloque que la tarjeta NO escala con el ancho
   * -titulo, precio, rating, compra-, y se mide una sola vez porque cambiar el
   * ancho lo altera un poco: volver a medirlo seria volver a realimentar.
   */
  /**
   * La separacion entre filas sale del alto REAL de la tarjeta.
   *
   * ALTO_TARJETA es lo que queremos que mida, pero lo que mide de verdad
   * depende de su tipografia y de su contenido: apuntarle a la constante hacia
   * que el bloque de medios se pasara.
   *
   * Medirla es seguro ahora: su ancho es una constante y no depende del alto de
   * los medios, asi que la dependencia va en un solo sentido y no puede
   * realimentarse. Cuando salia de los medios, si podia, y temblaba.
   */
  /**
   * Carga el articulo en el formulario.
   *
   * Una sola vez, al abrirlo: si se resembrara en cada render, escribir un
   * campo lo pisaria con el valor guardado en la siguiente vuelta.
   */
  const sembrado = useRef<string | null>(null);
  useEffect(() => {
    /*
     * La Biblioteca puede abrir un alta CON datos: una ficha que todavia no se
     * vende trae nombre y descripcion, y no hay que hacerlos escribir de nuevo.
     * Ese articulo no tiene `id` -es un alta-, asi que la marca de sembrado no
     * puede ser el id: se usa un valor estable que igual siembra una sola vez.
     */
    const semilla = articulo ? (articulo.id ?? "sin-publicar") : null;
    if (!articulo || sembrado.current === semilla) return;
    sembrado.current = semilla;

    setNombre(articulo.nombre ?? "");
    /* La marca faltaba: se cargaba, se guardaba, y al reabrir el campo estaba
       vacio como si nunca se hubiera escrito. */
    setMarca(articulo.marca ?? "");
    setDescripcion(articulo.descripcion ?? "");
    setPrecio(articulo.precio != null ? String(articulo.precio) : "");
    setPrecioOrig(articulo.precio_original != null ? String(articulo.precio_original) : "");
    setMoneda(articulo.moneda ?? "UYU");
    // Lo guardado es el ancla: es el precio que alguien decidio, en su moneda.
    setAncla({
      monto:  articulo.precio != null ? Number(articulo.precio) : 0,
      moneda: articulo.moneda ?? "UYU",
      orig:   articulo.precio_original != null ? Number(articulo.precio_original) : 0,
    });
    setStock(articulo.stock != null ? String(articulo.stock) : "1");
    setImagenes(Array.isArray(articulo.imagenes)
      ? articulo.imagenes.map((x: any) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
      : (articulo.imagen_principal ? [articulo.imagen_principal] : []));
    setVideoUrls(Array.isArray(articulo.videos)
      ? articulo.videos.map((x: any) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
      : []);
    setDeptoId(articulo.departamento_id ?? "");
    setCatId(articulo.categoria_id ?? "");
    setPublicarComo(articulo.status === "draft" ? "draft" : "active");
    if (articulo.condicion) { setCondicion(articulo.condicion); setCondicionMarketId(articulo.condicion); }
    setDetalles({
      garantia:    articulo.garantia    ?? "",
      tipo_envio:  articulo.tipo_envio  ?? "",
      peso:        articulo.peso        ?? "",
      dimensiones: articulo.dimensiones ?? "",
      material:    articulo.material    ?? "",
      origen:      articulo.origen      ?? "",
    });
    setCanales((articulo.canales ?? [])
      .filter((c: any) => c?.status !== "delisted")
      .map((c: any) => c.channel)
      .filter((c: string) => c !== "market" && c !== "secondhand"));
  }, [articulo]);

  const { setVista } = useShop();
  useEffect(() => {
    setVista(`Ficha completa de artículo de ${tipo === "secondhand" ? "Second Hand" : "Market"}`);
    return () => setVista("");
  }, [tipo, setVista]);
  // Artículo "Personalizado": igual que la marca, se tipea a mano y no se
  // buscan sugerencias/coincidencias de catálogo mientras esté marcado.
  const [articuloPersonalizado, setArticuloPersonalizado] = useState(false);
  // PASO 2: Condición (Market). Independiente de `condicion` (Second Hand):
  // son tipos de artículo excluyentes, cada uno con su propia escala.
  const [condicionMarketId, setCondicionMarketId] = useState("nuevo");
  const [subestadoRecond,   setSubestadoRecond]   = useState("Excelente");

  // Se espera a que deje de escribir: buscar en cada tecla castiga la API y
  // hace parpadear la lista sin que nadie llegue a leerla.
  useEffect(() => {
    if (!puedeBuscarEnLaWeb()) { setCandidatos([]); return; }
    if (!abierto("nombre")) { setCandidatos([]); return; }
    if (idElegido) return;              // ya eligio: no se le cambia debajo
    if (articuloPersonalizado) return;  // se tipea a mano, no se buscan coincidencias
    const q = nombre.trim();
    /*
     * Con la marca confirmada se busca aunque no haya texto: lo que se muestra
     * entonces es su catalogo. Sin marca hacen falta cuatro letras, porque
     * buscar "ace" en toda la web no devuelve nada util.
     */
    if (q.length < 4 && !marcaConfirmada) { setCandidatos([]); return; }
    // Dentro de la marca, siempre. Sin esto "Golf" o "Serie 3" traen cualquier
    // cosa que se llame igual, de cualquier marca.
    const conMarca = marcaConfirmada && marca.trim()
      ? `${marca.trim()} ${q}`
      : q;
    let vivo = true;
    setBuscandoProd(true);
    const t = setTimeout(async () => {
      /*
       * En la web abierta, NO en Mercado Libre.
       *
       * Esto llamaba a `buscarProductos`, que consulta a los canales
       * conectados — o sea que el artículo se definía con el catálogo de ML y
       * quedaba escrito con sus títulos, sus fotos y su forma de nombrar las
       * cosas.
       *
       * El artículo es del fabricante, no del canal donde después se vende.
       * De ML queremos otra cosa: en qué departamento y categoría lo clasifica,
       * y a cuánto lo vende la competencia. Eso se pregunta aparte, cuando el
       * artículo ya está definido.
       *
       * `incluirCanales: false` es lo que lo garantiza, igual que en la
       * búsqueda de marca.
       */
      /*
       * Articulos de la marca, no paginas de la marca.
       *
       * Restringir al dominio del fabricante no alcanzaba: su sitio tiene el
       * catalogo pero tambien "Turismo", "Calidad" y la portada, y esas
       * volvian mezcladas con los productos. `buscarArticulosDeMarca` filtra
       * por lo que dice la URL —`/producto/`, `/supermercado/` son catalogo;
       * `/turismo`, `/noticias` y la raiz no— y exige que el nombre mencione
       * la marca, porque buscando "Colinas de Garzon aceite" Google trae
       * tambien aceites de otras marcas: eso es competencia, no este articulo.
       */
      const { items: web, esCatalogo } = await buscarArticulosDeMarca({
        marca: marcaConfirmada ? marca : "",
        dominio: marcaDominio,
        texto: q,
      });
      if (!vivo) return;
      setMostrandoCatalogo(esCatalogo);
      if (!vivo) return;
      setCandidatos(web.map(r => ({
        id: r.url ?? r.nombre,
        // `canal` vacio marca que viene de la web y no de un canal: adoptarlo
        // no es pedirle la ficha a nadie, es quedarse con lo que ya trajo.
        canal: "",
        nombre: r.nombre,
        imagen: r.imagen,
        rasgos: r.descripcion ? [r.descripcion] : [],
        canalNombre: r.fuente,
        descripcion: r.descripcion,
      })) as any);
      setBuscandoProd(false);
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [nombre, idElegido, articuloPersonalizado, marca, marcaConfirmada, marcaModo, marcaDominio, abiertos]);

  // Imágenes y videos encontrados en la web para marca + artículo. Sólo
  // tiene sentido buscar una vez que hay algo de las dos cosas escrito: son
  // los mismos datos que ya se usan para acotar la búsqueda del artículo,
  // no un campo nuevo que haya que llenar.
  const [imagenesBuscadas, setImagenesBuscadas] = useState<ResultadoBusqueda[]>([]);
  const [buscandoImagenes, setBuscandoImagenes] = useState(false);
  const [videosBuscados,   setVideosBuscados]   = useState<ResultadoBusqueda[]>([]);
  const [buscandoVideos,   setBuscandoVideos]   = useState(false);

  useEffect(() => {
    const articulo = nombre.trim();
    if (!puedeBuscarEnLaWeb()) { setImagenesBuscadas([]); setVideosBuscados([]); return; }
    if (!abierto("nombre") && !abierto("marca")) {
      setImagenesBuscadas([]);
      setVideosBuscados([]);
      return;
    }
    if (!marcaConfirmada || !marca.trim() || articulo.length < 4) {
      setImagenesBuscadas([]);
      setVideosBuscados([]);
      return;
    }
    const q = `${marca.trim()} ${articulo}`;
    let vivo = true;
    setBuscandoImagenes(true);
    setBuscandoVideos(true);
    const t = setTimeout(async () => {
      const [imgs, vids] = await Promise.all([buscarImagenes(q), buscarVideos(q)]);
      if (!vivo) return;
      setImagenesBuscadas(imgs);
      setBuscandoImagenes(false);
      setVideosBuscados(vids);
      setBuscandoVideos(false);
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [marca, marcaConfirmada, marcaModo, nombre, abiertos]);

  /**
   * Adopta la version elegida.
   *
   * Se completa lo que esta vacio y no se pisa lo escrito: si alguien ya
   * redacto su descripcion o cargo sus fotos, son suyas y valen mas que las
   * del catalogo.
   */
  /**
   * Elegir uno de los candidatos.
   *
   * LA DIVISION DE FUENTES
   * Lo que define AL ARTICULO —titulo, foto, descripcion— sale de donde se
   * encontro: la web del fabricante. De Mercado Libre se pide otra cosa y
   * despues: en que departamento y categoria lo clasifica, y a cuanto lo vende
   * la competencia.
   *
   * Antes esto le pedia la ficha entera al canal, asi que el articulo quedaba
   * escrito con los titulos, las fotos y la forma de nombrar de ML. Y desde que
   * la busqueda pasa por la web, ese pedido ni siquiera encontraba nada: un
   * resultado web no tiene canal al que preguntarle.
   */
  const adoptarProducto = async (id: string, canal: string, c?: any) => {
    setCandidatos([]);
    setIdElegido(id);

    // 1) El articulo, de donde se encontro.
    const titulo = (c?.nombre ?? nombre).trim();
    setPrecioOficial(
      c?.precio && c?.fuente
        ? { tienda: String(c.fuente), precio: Number(c.precio), moneda: c.moneda ?? moneda }
        : null,
    );
    if (titulo) setNombre(titulo);
    if (!descripcion.trim() && c?.descripcion)
      setDescripcion(String(c.descripcion).slice(0, MAX_DESCRIPCION));

    /*
     * Las fotos se ELIGEN, no solo se ofrecen.
     *
     * La busqueda de imagenes ya corria y dejaba resultados en la lista de
     * candidatas, esperando que alguien las tildara una por una. Elegir un
     * articulo es decir "es este": las primeras fotos del fabricante entran
     * solas, y sacar la que no sirve cuesta menos que buscar cuatro.
     *
     * Solo si no habia ninguna: nunca se pisa lo que ya se cargo a mano.
     */
    if (!imagenes.length) {
      const q = `${marca.trim()} ${titulo}`.trim();
      const fotos = q.length >= 4 ? await buscarImagenes(q) : [];
      const urls = fotos.map(f => f.imagen).filter((u): u is string => !!u).slice(0, 4);
      if (urls.length) setImagenes(urls);
      else if (c?.imagen) setImagenes([c.imagen]);
    }

    // 2) La clasificacion y la competencia, de Mercado Libre. Que falle no
    //    invalida nada: el articulo ya quedo definido con lo de arriba.
    setBuscandoProd(true);
    const f = canal
      ? await fichaPorTitulo("", canal, id)
      : await fichaPorTitulo(titulo);
    setBuscandoProd(false);
    if (!f) return;

    setElegido(f);
    // Solo el precio de mercado: la descripcion y las fotos ya vinieron del
    // fabricante y no se pisan con las del canal.
    if (!precio && f.mercado?.mediana) setPrecio(String(Math.round(f.mercado.mediana)));
  };

  // PASO 4: Destinos
  const [canales, setCanales] = useState<string[]>([]);

  // PASO 2: Media (embebido junto a la información del artículo)
  const [imagenes,  setImagenes]  = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // PASO 2: Precio (embebido a la derecha de las fotos)
  const [precio,      setPrecio]      = useState("");
  const [precioOrig,  setPrecioOrig]  = useState("");
  const [moneda,      setMoneda]      = useState("UYU");

  /**
   * Cambiar la moneda convierte el precio.
   *
   * Antes no lo hacia: `moneda` era una etiqueta al lado del numero, asi que
   * pasar de UYU a USD dejaba 38.795 USD -el mismo numero, cuarenta veces mas
   * caro-. No es un detalle de comodidad: es un precio equivocado publicado.
   *
   * Se convierte solo, sin preguntar, porque nadie quiere el numero sin
   * convertir; pero queda dicho en la franja de avisos con que cotizacion se
   * hizo y de cuando es, y se puede deshacer. Convertir en silencio seria tan
   * malo como no convertir: el precio cambio y hay que poder verlo.
   *
   * Todo pivotea por el peso, que es como el BCU cotiza: monto * tasa(desde) /
   * tasa(hasta), con el peso valiendo 1.
   */
  const [monedas, setMonedas] = useState<{ code: string; decimals: number }[]>(MONEDAS_FALLBACK);

  /**
   * Impuesto del articulo.
   *
   * `tasaId` en null NO significa "sin impuesto": significa "la que le
   * corresponda por su categoria". Sin impuesto es la tasa Exento, que es una
   * tasa de verdad -0%- y se elige como cualquier otra. Confundirlas seria
   * vender sin IVA sin querer.
   *
   * `tasaHeredada` es la que resuelve la base -articulo, subcategoria,
   * categoria, departamento, default- y sirve para poder mostrar cual esta
   * rigiendo aunque nadie haya elegido nada.
   */
  /**
   * Deshacer el ultimo cambio.
   *
   * La base guarda una sola version anterior y `revertir_ultimo_cambio` la
   * restaura. Eso existe y funciona desde hace dias; lo que faltaba era poder
   * llegar.
   *
   * `deshacerDesde` es CUANDO se tomo el respaldo, no un booleano: "deshacer" a
   * secas no dice que se va a perder, "deshacer el cambio de las 14:32" si.
   *
   * Y pide confirmacion, porque descarta lo que hay ahora — que puede ser
   * trabajo de varios minutos que nadie va a poder recuperar: el respaldo se
   * consume al usarlo, deshacer no se deshace.
   */
  /**
   * Garantía, envío, peso, dimensiones, material y origen.
   *
   * Un objeto y no seis useState porque el bloque que los dibuja ya trabaja con
   * `{form, setForm}` — el mismo contrato que traía del editor de pestañas. Y
   * porque se guardan juntos, en una sola llamada.
   *
   * Estaban en el editor viejo, se extrajeron, y quedaron sin usar: ponerlos
   * habría mostrado campos que no persisten, porque ninguna RPC los escribía.
   * Ahora los escribe `guardar_detalles_articulo`.
   */
  /**
   * Lineas de precio adicionales.
   *
   * La primera linea -moneda, precio e impuesto- es la del articulo y no vive
   * aca: es `precio`, `moneda` y `tasaId`. Estas son las que agrega el "+",
   * para cotizar distinto en otros destinos.
   *
   * `destinos` dice a cuales aplica cada linea. Un destino no puede estar en
   * dos lineas a la vez: dos precios para el mismo lugar no es una eleccion,
   * es una ambiguedad.
   */
  const [lineasPrecio, setLineasPrecio] = useState<
    { id: number; precio: string; moneda: string; tasaId: string | null; destinos: string[];
      etiqueta: string; desde: string; hasta: string;
      horaDesde: string; horaHasta: string; dias: number[] }[]
  >([]);

  /** Que linea tiene abierto el panel de vigencia. */
  const [vigenciaAbierta, setVigenciaAbierta] = useState<number | null>(null);
  const [destinosBase, setDestinosBase] = useState<string[]>([]);

  /**
   * Motores de sincronizacion INSTALADOS.
   *
   * Instalado, no conectado. Son dos cosas distintas y confundirlas fue un
   * error: que Mercado Libre no tenga credenciales hoy no impide decidir a que
   * precio se va a vender ahi. El precio es una decision comercial; la conexion
   * es un tramite que puede resolverse despues, y cuando se resuelva el precio
   * ya tiene que estar puesto.
   *
   * Por eso se toman las dos listas. `disponibles` son los que ademas estan en
   * orden, y eso importa para sincronizar -la barra de acciones lo dice- pero
   * no para cotizar.
   *
   * Lo contesta el registro de canales, no una lista escrita aca: la pantalla
   * no sabe de ningun canal por nombre, y el dia que se instale WhatsApp su
   * pastilla se enciende sola sin tocar este archivo.
   */
  const [motores, setMotores] = useState<Set<string>>(new Set());
  useEffect(() => {
    let vivo = true;
    canalesDisponibles().then(({ disponibles, bloqueados }) => {
      if (vivo) setMotores(new Set([...disponibles, ...bloqueados].map(d => d.channel)));
    });
    return () => { vivo = false; };
  }, []);

  const [detalles, setDetalles] = useState<Record<string, string>>({});

  const [deshacerDesde, setDeshacerDesde] = useState<string | null>(null);
  const [confirmandoDeshacer, setConfirmandoDeshacer] = useState(false);

  const [tasas, setTasas] = useState<{ id: string; code: string; name: string; rate: number }[]>([]);
  const [tasaId, setTasaId] = useState<string | null>(null);
  const [tasaHeredada, setTasaHeredada] = useState<{ name: string; rate: number; origen: string } | null>(null);
  /** Codigo de la tasa heredada -basica/minima/exento-, que es lo que compara
   *  el motor. `rate` es para mostrar; el codigo es para decidir. */
  const [codigoHeredado, setCodigoHeredado] = useState<string>("basica");
  /** De donde salio la clasificacion que tiene hoy el articulo. */
  const [origenFiscal, setOrigenFiscal] = useState<
    "SUGGESTED" | "CONFIRMED" | "MANUAL" | "REVIEW_REQUIRED" | null>(null);
  /** La sugerencia del motor y que hacer con ella. Null = no se corrio. */
  const [sugerencia, setSugerencia] = useState<
    { clasificacion: ReturnType<typeof clasificarProducto>; decision: Decision } | null>(null);

  /**
   * El precio como lo escribio el usuario, en la moneda en que lo escribio.
   *
   * TODA conversion se calcula desde aca, nunca desde lo que hay en pantalla.
   *
   * Antes se convertia encadenado -de lo mostrado a lo nuevo- y eso esta mal
   * por dos motivos. El chico: cada salto redondea sobre el redondeo anterior,
   * asi que UYU → USD → EUR no da lo mismo que UYU → EUR. El grave: la
   * cotizacion cambia todos los dias, asi que convertir un numero que ya venia
   * convertido lo hace pasar por la cotizacion de hoy cuando en realidad se
   * fijo con la de otro dia. El precio termina siendo el resultado de por
   * cuantas monedas se paseo y en que orden, que no es un precio.
   *
   * Con ancla, un articulo que vale 15.000 pesos vale 15.000 pesos: pasarlo a
   * dolares y despues a euros siempre da el equivalente de esos 15.000 a la
   * cotizacion del momento en que se mira.
   *
   * Se mueve solo cuando el usuario escribe un precio: ahi la decision es
   * suya, y el nuevo numero pasa a ser el ancla en la moneda que este puesta.
   */
  const [ancla, setAncla] = useState<{ monto: number; moneda: string; orig: number } | null>(null);

  const [cotizaciones, setCotizaciones] = useState<Record<string, { tasa: number; fecha: string }>>({});
  const [conversion, setConversion] = useState<
    { de: string; a: string; tasaUsada: number; fecha: string;
      antes: { precio: string; precioOrig: string };
      ancla: { monto: number; moneda: string; orig: number } } | null
  >(null);
  const [sinCotizacion, setSinCotizacion] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.from("currencies").select("code, decimals").eq("status", "active")
      .then(({ data }) => {
        if (!vivo || !data?.length) return;
        setMonedas(data.map((c: any) => ({ code: String(c.code).trim(), decimals: Number(c.decimals ?? 2) })));
      });
    supabase.from("tax_rates").select("id, code, name, rate").eq("status", "active").order("rate")
      .then(({ data }) => {
        if (!vivo || !data?.length) return;
        setTasas(data.map((t: any) => ({ ...t, rate: Number(t.rate) })));
      });
    return () => { vivo = false; };
  }, []);

  // Al abrir un articulo existente, si tiene una excepcion declarada hay que
  // mostrarla: sin esto el selector diria "heredada" sobre un articulo que
  // decidio otra cosa.
  useEffect(() => {
    if (!articulo?.id) return;
    let vivo = true;
    supabase.rpc("clasificacion_de_articulo", { p_variant_id: articulo.id }).then(({ data }) => {
      const f = Array.isArray(data) ? data[0] : data;
      if (!vivo || !f) return;
      setTasaId(f.tax_rate_id ?? null);
      setOrigenFiscal(f.tax_source ?? null);
    });
    supabase.rpc("hay_deshacer", { p_variant_id: articulo.id }).then(({ data }) => {
      if (vivo) setDeshacerDesde((data as string) ?? null);
    });
    /*
     * Las lineas guardadas.
     *
     * La de prioridad 0 es la base -la que rige donde ninguna otra dice lo
     * contrario- y es la que se muestra arriba, junto al precio del articulo.
     * Las demas son las que agrego el "+", y ganan sobre ella: por eso tienen
     * prioridad mayor. La prioridad no es un numero decorativo, es lo que hace
     * que una promo conviva con el precio de lista sin apagarlo.
     */
    supabase.rpc("lineas_de_precio", { p_variante_id: articulo.id }).then(({ data }) => {
      if (!vivo || !Array.isArray(data)) return;
      const filas = data as any[];
      const base   = filas.find(f => Number(f.prioridad) === 0);
      const extras = filas.filter(f => Number(f.prioridad) !== 0);
      if (base) setDestinosBase(base.destinos ?? []);
      setLineasPrecio(extras.map((f, i) => ({
        id: i + 1,
        precio: String(f.precio ?? ""),
        moneda: f.moneda ?? "UYU",
        tasaId: f.tax_rate_id ?? null,
        destinos: f.destinos ?? [],
        etiqueta: f.etiqueta ?? "",
        // Los timestamptz vienen completos y el input date quiere solo la fecha.
        desde: f.desde ? String(f.desde).slice(0, 10) : "",
        hasta: f.hasta ? String(f.hasta).slice(0, 10) : "",
        horaDesde: f.hora_desde ? String(f.hora_desde).slice(0, 5) : "",
        horaHasta: f.hora_hasta ? String(f.hora_hasta).slice(0, 5) : "",
        dias: Array.isArray(f.dias) ? f.dias.map(Number) : [],
      })));
    });
    return () => { vivo = false; };
  }, [articulo?.id]);

  /**
   * Los detalles van en su propia llamada.
   *
   * Que falle no invalida el alta: el articulo ya existe y esto se puede
   * completar despues. Se avisa por consola y sigue, igual que la ficha.
   */
  /**
   * Guarda TODAS las lineas de precio, incluida la base.
   *
   * La base va con prioridad 0 y las extra con 1, 2, 3…: mayor gana, asi que
   * una linea agregada con el "+" pisa a la base en los destinos que declara,
   * y la base sigue rigiendo en el resto.
   *
   * `catalog_variante.precio` se sigue guardando aparte -lo hacen las RPC de
   * alta y edicion- porque es el precio del que cuelga todo lo que no tiene
   * linea, y es el que se publica en los canales.
   */
  const guardarLineasDePrecio = async (variantId: string) => {
    const lineas = [
      ...(destinosBase.length && parseFloat(precio) > 0
        ? [{ destinos: destinosBase, precio: parseFloat(precio), moneda,
             tax_rate_id: tasaId, prioridad: 0 }]
        : []),
      ...lineasPrecio
        .filter(l => l.destinos.length && parseFloat(l.precio) > 0)
        .map((l, i) => ({
          destinos: l.destinos, precio: parseFloat(l.precio),
          moneda: l.moneda, tax_rate_id: l.tasaId, prioridad: i + 1,
          etiqueta: l.etiqueta || null,
          // Vacio es "siempre", no "desde el principio de los tiempos".
          desde: l.desde ? `${l.desde}T00:00:00` : null,
          hasta: l.hasta ? `${l.hasta}T23:59:59` : null,
          hora_desde: l.horaDesde || null,
          hora_hasta: l.horaHasta || null,
          dias: l.dias.length ? l.dias : null,
        })),
    ];

    const { error } = await supabase.rpc("guardar_lineas_de_precio", {
      p_variante_id: variantId,
      p_lineas: lineas,
    });
    // Que falle no invalida el alta: el articulo existe y tiene su precio base.
    if (error) console.warn("[precios]", error.message);
  };

  const guardarDetalles = async (variantId: string) => {
    const hay = Object.values(detalles).some(v => (v ?? "").trim() !== "");
    if (!hay) return;
    const { error } = await supabase.rpc("guardar_detalles_articulo", {
      p_variant_id:  variantId,
      p_garantia:    detalles.garantia    ?? null,
      p_peso:        detalles.peso        ?? null,
      p_dimensiones: detalles.dimensiones ?? null,
      p_material:    detalles.material    ?? null,
      p_origen:      detalles.origen      ?? null,
      p_tipo_envio:  detalles.tipo_envio  ?? null,
    });
    if (error) console.warn("[detalles]", error.message);
  };

  /**
   * Sugerir el IVA.
   *
   * Se ejecuta a pedido y solo con nombre y categoria: sin categoria el motor
   * llega como mucho a confianza MEDIA, y ofrecer una sugerencia floja como si
   * fuera un resultado es peor que no ofrecer nada.
   *
   * NO guarda: deja la sugerencia a la vista con su fundamento para que el
   * usuario decida. Aplicarla es otro clic.
   */
  const sugerirIva = () => {
    const cat = cats.find(c => c.id === catId)?.nombre
             ?? deptos.find(d => d.id === deptoId)?.nombre
             ?? "";
    if (!hayDatosSuficientes(nombre, cat)) return;

    const clasificacion = clasificarProducto({
      nombre: nombre.trim(),
      categoria: cat,
      descripcion: descripcion.trim() || undefined,
      marca: marca.trim() || undefined,
    });
    const decision = decidir(clasificacion, {
      heredada:  codigoHeredado as any,
      excepcion: (tasas.find(t => t.id === tasaId)?.code ?? null) as any,
      origen:    origenFiscal,
    });
    setSugerencia({ clasificacion, decision });
  };

  /**
   * Aplicar la sugerencia.
   *
   * `CONFIRMAR_HERENCIA` guarda `null` en la tasa a proposito: coincidir con la
   * taxonomia no justifica una copia en el articulo. Materializarla igual lo
   * dejaria sin poder seguir a su categoria cuando esa cambie.
   */
  const aplicarSugerencia = async (forzar = false) => {
    if (!sugerencia || !articulo?.id) return;
    const { decision, clasificacion } = forzar
      ? { decision: decidir(sugerencia.clasificacion,
            { heredada: codigoHeredado as any,
              excepcion: (tasas.find(t => t.id === tasaId)?.code ?? null) as any,
              origen: origenFiscal }, true),
          clasificacion: sugerencia.clasificacion }
      : sugerencia;

    if (decision.accion === "PEDIR_REVISION" || decision.accion === "RESPETAR_MANUAL") return;

    const idTasa = decision.tasaAGuardar
      ? (tasas.find(t => t.code === decision.tasaAGuardar)?.id ?? null)
      : null;

    const { data, error } = await supabase.rpc("guardar_clasificacion_fiscal", {
      p_variant_id:      articulo.id,
      p_tax_rate_id:     idTasa,
      p_source:          decision.origen,
      p_confidence:      clasificacion.confianza,
      p_rule:            clasificacion.reglas.join(","),
      p_reason:          clasificacion.razon,
      p_version:         clasificacion.versionMotor,
      p_respetar_manual: !forzar,
    });
    if (error) { notify(error.message, false); return; }
    if (data === false) {
      notify("Este artículo tiene una tasa puesta a mano. Confirmá para reemplazarla.", false);
      return;
    }
    setTasaId(idTasa);
    setOrigenFiscal(decision.origen);
    setSugerencia(null);
    notify(decision.accion === "CONFIRMAR_HERENCIA"
      ? "Confirmado: sigue heredando la tasa de su categoría"
      : "Excepción aplicada a este artículo");
  };

  /**
   * Crea los seleccionados, como BORRADORES.
   *
   * Sin precio no se puede publicar, y el precio de cada uno no lo sabe nadie
   * mas que quien vende: inventarlo seria peor que dejarlos incompletos. Se
   * crean con lo que si se sabe -titulo, marca, foto, clasificacion- y quedan
   * esperando el precio, que es una linea por producto en vez de un alta
   * entera.
   */
  /**
   * El catalogo de la marca, sin el que se acaba de cargar y SIN LAS SECCIONES.
   *
   * Antes esto usaba el catalogo crudo: por eso el cuadro ofrecia dar de alta
   * "Donde estamos" y "Cultura y Salud". Pasa por el mismo filtro que la lista
   * de sugerencias, que es el que sabe distinguir un producto de una pagina.
   */
  const otrosDeLaMarca = async (): Promise<{ items: ResultadoBusqueda[]; motivo?: string | null }> => {
    const { items, motivo } = await buscarArticulosDeMarca({
      marca, dominio: marcaDominio, texto: "",
    });
    const yaCargado = nombre.trim().toLowerCase();
    return { items: items.filter(r => r.nombre.trim().toLowerCase() !== yaCargado), motivo };
  };

  /** Abrir el cuadro a pedido, sin tener que guardar primero. */
  const abrirCargaDeMarca = async () => {
    setMasivoCargando(true);
    const { items: otros, motivo } = await otrosDeLaMarca();
    setMasivoCargando(false);
    /*
     * Sin catálogo no se abre un cuadro vacío: se dice POR QUÉ.
     *
     * "No pude" a secas no le sirve a nadie: cuatro fallas distintas —el sitio
     * hecho en JavaScript, un 404, el extractor sin cupo, no haber encontrado
     * representante— se veían todas igual, y ni quien lo usa ni quien lo
     * programa podían saber cuál era.
     */
    if (!otros.length) {
      notify(motivo ?? `No pude armar el catálogo de ${marca.trim()}. Cargalos de a uno.`, false);
      return;
    }
    abrirCuadroCon(otros, false);
  };

  /** Abre el cuadro en el paso que corresponda segun cuantas familias haya. */
  const abrirCuadroCon = (items: ResultadoBusqueda[], trasGuardar: boolean) => {
    const familias = [...new Set(items.map(r => r.familia).filter(Boolean) as string[])];
    setMasivoItems(items);
    setMasivoElegidos(new Set());
    setMasivoFamilias(new Set(familias));   // todas marcadas: quitar es mas facil que sumar
    setMasivoPaso(familias.length > 1 ? "familias" : "productos");
    setMasivoTrasGuardar(trasGuardar);
    setMasivoAbierto(true);
  };

  /**
   * Volver: del paso de productos al de familias, y de ahi a donde estaba.
   *
   * Que el mismo boton retroceda un paso antes de salir es lo que hace que
   * elegir mal una familia no cueste empezar de nuevo.
   */
  const volverDelCuadro = () => {
    if (masivoPaso === "productos" && hayVariasFamilias) { setMasivoPaso("familias"); return; }
    setMasivoAbierto(false);
    if (masivoTrasGuardar) salir(true);
  };

  /** Las familias del catalogo, con cuantos productos tiene cada una. */
  const familiasDelCatalogo = (() => {
    const cuenta = new Map<string, number>();
    for (const r of masivoItems) {
      const f = r.familia?.trim();
      if (f) cuenta.set(f, (cuenta.get(f) ?? 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const hayVariasFamilias = familiasDelCatalogo.length > 1;

  /** Los productos de las familias elegidas. Sin familias, todos. */
  /** Los productos por familia, en el orden en que aparecen las familias. */
  const agruparPorFamilia = (
    items: ResultadoBusqueda[],
  ): Array<[string, ResultadoBusqueda[]]> => {
    const grupos = new Map<string, ResultadoBusqueda[]>();
    for (const r of items) {
      const f = r.familia?.trim() || "Sin familia";
      const g = grupos.get(f);
      if (g) g.push(r); else grupos.set(f, [r]);
    }
    return [...grupos.entries()];
  };

  const productosVisibles = hayVariasFamilias
    ? masivoItems.filter(r => r.familia && masivoFamilias.has(r.familia.trim()))
    : masivoItems;

  const crearElegidosDeMarca = async () => {
    /*
     * Solo lo VISIBLE y tildado.
     *
     * Si alguien tilda productos de iPhone, vuelve atras y desmarca la familia
     * iPhone, esos tildes quedaron en el estado pero ya no estan en pantalla.
     * Crearlos seria crear lo que dejo de elegir.
     */
    const elegidos = productosVisibles.filter(r => masivoElegidos.has(r.nombre));
    // Sin nada tildado, "Crear selección" no crea nada: equivale a volver.
    if (!elegidos.length) { volverDelCuadro(); return; }

    setMasivoCargando(true);
    let creados = 0;
    for (const r of elegidos) {
      const { error } = await supabase.rpc("crear_publicacion", {
        p_title:       r.nombre.slice(0, 200),
        p_price:       0,
        p_tipo:        tipo === "secondhand" ? "secondhand" : "market",
        p_currency:    moneda,
        p_description: r.descripcion?.slice(0, MAX_DESCRIPCION) ?? null,
        p_stock:       0,
        p_status:      "draft",
        p_images:      r.imagen ? [r.imagen] : null,
        p_attributes:  { marca: marca.trim(), ...(deptoId ? { departamento: { id: deptoId } } : {}) },
      });
      if (error) console.warn("[masivo]", r.nombre, error.message);
      else creados++;
    }
    setMasivoCargando(false);
    setMasivoAbierto(false);
    notify(creados === 0
      ? "No se pudo crear ninguno"
      : `${creados} borrador${creados === 1 ? "" : "es"} más de ${marca.trim()}. Les falta el precio.`,
      creados > 0);
    setTimeout(() => salir(true), 900);   // creados: se va a verlos a la lista
  };

  const deshacer = async () => {
    if (!articulo?.id) return;
    setLoading(true);
    const { error } = await supabase.rpc("revertir_ultimo_cambio", { p_variant_id: articulo.id });
    setLoading(false);
    if (error) {
      // El caso normal: alguien ya lo deshizo en otra pestaña. Se dice lo que
      // pasa y se apaga el boton, en vez de dejarlo ofreciendo algo que ya no
      // esta.
      notify(error.message || "No hay un cambio anterior para deshacer.", false);
      setDeshacerDesde(null);
      setConfirmandoDeshacer(false);
      return;
    }
    notify("Se volvió al estado anterior");
    setTimeout(() => salir(true), 900);
  };

  useEffect(() => {
    let vivo = true;
    supabase.rpc("tipos_de_cambio_vigentes", { p_to: "UYU" }).then(({ data, error }) => {
      if (!vivo || error || !data) return;
      const mapa: Record<string, { tasa: number; fecha: string }> = { UYU: { tasa: 1, fecha: "" } };
      for (const f of data as any[]) {
        mapa[f.from_currency] = { tasa: Number(f.rate), fecha: f.valid_at };
      }
      setCotizaciones(mapa);
    });
    return () => { vivo = false; };
  }, []);

  const cambiarMoneda = (nueva: string) => {
    const anterior = moneda;
    if (nueva === anterior) return;
    setMoneda(nueva);
    setConversion(null);
    setSinCotizacion(null);

    // El ancla manda. Si todavia no hay -nadie escribio nada- se toma lo que
    // haya en pantalla, que en ese caso es lo mismo.
    const base = ancla ?? {
      monto: parseFloat(precio) || 0,
      orig:  parseFloat(precioOrig) || 0,
      moneda: anterior,
    };
    if (base.monto <= 0 && base.orig <= 0) return;

    const desde = cotizaciones[base.moneda];
    const hasta = cotizaciones[nueva];
    if (!desde || !hasta) {
      // Se cambia la moneda igual -es lo que el usuario pidio- pero el numero
      // queda como estaba y se dice, en vez de convertir con una tasa que no
      // tenemos o dejarlo pasar como si estuviera bien.
      setSinCotizacion(!desde ? base.moneda : nueva);
      return;
    }

    // Cuantos decimales tiene la moneda lo dice `currencies.decimals`, que es
    // el dato. Antes esto era una regla escrita a mano -"pesos al entero, el
    // resto dos decimales"- que decia lo mismo pero podia dejar de coincidir.
    const dec = monedas.find(m => m.code === nueva)?.decimals ?? 2;
    // Siempre desde el ancla, con una sola division: dos conversiones
    // encadenadas redondean dos veces.
    const desdeAncla = (n: number) =>
      n > 0 ? ((n * desde.tasa) / hasta.tasa).toFixed(dec) : "";

    setConversion({
      de: base.moneda, a: nueva,
      tasaUsada: desde.tasa / hasta.tasa,
      fecha: (hasta.fecha || desde.fecha),
      antes: { precio, precioOrig },
      // El ancla NO cambia al convertir: cambiar de moneda es mirar el mismo
      // precio de otra forma, no ponerle uno nuevo.
      ancla: base,
    });
    setAncla(base);
    setPrecio(desdeAncla(base.monto));
    setPrecioOrig(desdeAncla(base.orig));
  };

  /**
   * Escribir un precio fija un ancla nueva.
   *
   * Es el unico momento en que el ancla se mueve: el usuario decidio cuanto
   * vale, en la moneda que esta viendo.
   */
  const escribirPrecio = (v: string) => {
    setPrecio(v);
    setConversion(null);
    setAncla({ monto: parseFloat(v) || 0, moneda, orig: parseFloat(precioOrig) || 0 });
  };

  const deshacerConversion = () => {
    if (!conversion) return;
    setPrecio(conversion.antes.precio);
    setPrecioOrig(conversion.antes.precioOrig);
    setMoneda(conversion.de);
    setAncla(conversion.ancla);
    setConversion(null);
  };
  const descuento = precio && precioOrig && parseFloat(precioOrig) > parseFloat(precio)
    ? Math.round((1 - parseFloat(precio) / parseFloat(precioOrig)) * 100)
    : null;

  // PASO 3: Detalles
  const [deptoId,       setDeptoId]       = useState("");
  const [catId,         setCatId]         = useState("");
  const [subcatId,      setSubcatId]      = useState("");

  // La tasa que se hereda depende de donde se clasifique el articulo, asi que
  // se vuelve a resolver cada vez que eso cambia. En un articulo nuevo esto es
  // lo unico que puede decir que tasa va a regir: todavia no existe la fila.
  //
  // Va aca abajo y no arriba con los otros efectos porque lee deptoId, catId y
  // subcatId: declararlos despues no es un detalle de orden, es un
  // ReferenceError al montar. El build de Vite no lo mira; `tsc` si.
  useEffect(() => {
    let vivo = true;
    supabase.rpc("tasa_por_taxonomia", {
      p_departamento_id: deptoId || null,
      p_categoria_id:    catId    || null,
      p_subcategoria_id: subcatId || null,
    }).then(({ data }) => {
      const f = Array.isArray(data) ? data[0] : data;
      if (!vivo || !f) return;
      setTasaHeredada({ name: f.name, rate: Number(f.rate), origen: f.origen });
      setCodigoHeredado(f.code ?? "basica");
    });
    return () => { vivo = false; };
  }, [deptoId, catId, subcatId]);
  // Aviso de que depto/cat/subcat vinieron de la predicción por ML, no de una
  // elección propia: apenas la persona toca cualquiera de los tres selectores
  // se apaga, para no seguir mostrando "sugerido" sobre algo que ya corrigió.
  const [taxonomiaSugerida, setTaxonomiaSugerida] = useState(false);
  const [stock,         setStock]         = useState("1");
  const [disponibilidad,setDisponibilidad] = useState("inmediata");
  const [publicarComo,  setPublicarComo]  = useState<"active"|"draft">("active");

  const filteredCats = cats.filter(c => c.departamento_id === deptoId);
  const filteredSubs = subcats.filter(s => s.categoria_id === catId);

  // Antes un error de la consulta se perdía en silencio: `d.data || []`
  // dejaba el selector vacío sin ninguna pista de por qué. Ahora se guarda
  // el motivo (error de Supabase, o "cargó bien pero no hay filas") para
  // poder mostrarlo junto al selector en vez de un desplegable vacío mudo.
  const [cargandoTaxonomia, setCargandoTaxonomia] = useState(true);
  const [errorTaxonomia,    setErrorTaxonomia]    = useState<string | null>(null);

  const notify = (text: string, ok = true) => {
    setToast({text, ok});
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let vivo = true;
    setCargandoTaxonomia(true);
    Promise.all([
      supabase.from("departamentos").select("id, nombre").eq("activo", true).order("orden"),
      supabase.from("categorias").select("id, nombre, departamento_id").eq("activo", true).order("orden"),
      supabase.from("subcategorias").select("id, nombre, categoria_id").eq("activo", true).order("orden"),
    ]).then(([d, c, s]) => {
      if (!vivo) return;
      const primerError = d.error || c.error || s.error;
      if (primerError) {
        console.error("Error cargando departamentos/categorías/subcategorías:", primerError);
        setErrorTaxonomia(`No se pudo cargar el catálogo (${primerError.message})`);
      } else if (!d.data?.length) {
        // La consulta anduvo bien pero no trajo filas: es un catálogo vacío,
        // no un bug de red — se avisa distinto para no mandar a buscar algo
        // que no corresponde.
        setErrorTaxonomia("No hay departamentos cargados todavía. Cargalos antes de poder categorizar artículos.");
      } else {
        setErrorTaxonomia(null);
      }
      setDeptos(d.data || []);
      setCats(c.data || []);
      setSubcats(s.data || []);
      setCargandoTaxonomia(false);
    }).catch(err => {
      if (!vivo) return;
      console.error("Error cargando departamentos/categorías/subcategorías:", err);
      setErrorTaxonomia("No se pudo cargar el catálogo. Revisá la conexión e intentá de nuevo.");
      setCargandoTaxonomia(false);
    });
    return () => { vivo = false; };
  }, []);

  /**
   * En cuanto se elige un producto de ML (o llega el catálogo, lo que pase
   * después), se intenta adivinar depto/categoría/subcategoría a partir del
   * camino de categoría que ML sugirió para ese título.
   *
   * Sólo completa lo que está vacío: si la persona ya eligió algo a mano
   * (acá o en un paso anterior) no se lo pisa. Por eso depende también de
   * deptoId — una vez que hay algo cargado, esto deja de tener efecto.
   */
  useEffect(() => {
    if (deptoId) return;                       // ya hay algo elegido, no se toca
    if (!deptos.length) return;                 // catálogo todavía no cargó
    const path = elegido?.categoriaSugerida?.path ?? pathCategoriaCanal;
    if (!path || !path.length) return;

    const { departamento, categoria, subcategoria } = predecirTaxonomia(path, deptos, cats, subcats);
    if (!departamento) {
      console.warn("No se encontró coincidencia de categoría para predecir taxonomía. Camino de ML:", path);
      return;
    }

    setDeptoId(departamento.id);
    if (categoria)    setCatId(categoria.id);
    if (subcategoria) setSubcatId(subcategoria.id);
    setTaxonomiaSugerida(true);
  }, [elegido, pathCategoriaCanal, deptos, cats, subcats, deptoId]);

  /**
   * Preguntarle al canal en que categoria cae este titulo.
   *
   * Se espera a que deje de escribir, como todo lo demas. Solo si todavia no
   * hay departamento elegido: una vez que alguien clasifico a mano, no se le
   * cambia debajo.
   */
  useEffect(() => {
    if (deptoId) return;
    const titulo = nombre.trim();
    if (titulo.length < 4) { setPathCategoriaCanal(null); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      const c = await categoriaSugeridaDe(titulo);
      if (vivo) setPathCategoriaCanal(c?.path?.length ? c.path : null);
    }, 700);
    return () => { vivo = false; clearTimeout(t); };
  }, [nombre, deptoId]);


  /**
   * Que falta para poder guardar, en una frase.
   *
   * Antes esto era canNext() por paso: cada pantalla se validaba sola y no
   * habia forma de saber, parado en la primera, que iba a faltar en la tercera.
   * Con todo a la vista la pregunta es una sola.
   */
  /**
   * Que dice el monitor, por columna.
   *
   * Vacio es un estado valido y frecuente: la franja queda en blanco pero
   * ocupa su lugar. Preferible a que aparezca y desaparezca moviendo todo.
   */
  const avisos: Record<string, React.ReactNode> = {
    descripcion: !nombre.trim() ? "Escribí el nombre del artículo para buscarlo"
               : buscandoProd     ? "Buscando el producto…"
               : elegido          ? (
                   <>
                     <div style={{ fontWeight:700, color:"#166534" }}>{elegido.nombre}</div>
                     <div>
                       Se completaron los datos que estaban vacíos.
                       {elegido.mercado &&
                         ` Hoy hay ${elegido.mercado.ofertas} publicaciones del mismo producto,`
                         + ` entre ${elegido.mercado.moneda} ${elegido.mercado.min.toLocaleString("es-UY")}`
                         + ` y ${elegido.mercado.moneda} ${elegido.mercado.max.toLocaleString("es-UY")}.`}
                     </div>
                     <button onClick={() => { setElegido(null); setIdElegido(null); }}
                       style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                         color:"#166534", textDecoration:"underline", fontSize:"0.78rem" }}>
                       No es este
                     </button>
                   </>
                 )
               : "",
    medios:      imagenes.length === 0 ? "Sin fotos: Mercado Libre necesita al menos una" : "",
    precio:      sinCotizacion ? (
                   <span style={{ color:"#92400E" }}>
                     No hay cotización de {sinCotizacion}: el precio quedó como estaba, revisalo.
                   </span>
                 )
               : conversion ? (
                   <>
                     <div>
                       Convertido de {conversion.de} a {conversion.a} al oficial del BCU
                       {conversion.fecha ? ` del ${new Date(conversion.fecha).toLocaleDateString("es-UY")}` : ""}.
                     </div>
                     <button onClick={deshacerConversion}
                       style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                         color:ACCENT, textDecoration:"underline", fontSize:"0.78rem" }}>
                       Deshacer
                     </button>
                   </>
                 )
               : !precio || parseFloat(precio) <= 0 ? (
                   precioOficial ? (
                     <>
                       <div style={{ color:"#166534", fontWeight:700 }}>
                         Oficial en {precioOficial.tienda}: {precioOficial.moneda}{" "}
                         {precioOficial.precio.toLocaleString("es-UY", { maximumFractionDigits: 2 })}
                       </div>
                       <div>Falta el precio</div>
                     </>
                   ) : "Falta el precio"
                 )
               : (() => {
                   // El precio ya incluye el impuesto, asi que esto lo
                   // descompone hacia atras -neto = bruto / (1 + tasa)-. Es la
                   // misma cuenta que hace `lineas_de_impuesto` del lado del
                   // servidor, que es la que factura; aca se muestra para que
                   // se pueda ver antes de vender.
                   const elegida = tasas.find(t => t.id === tasaId);
                   const tasaPct = elegida ? elegida.rate : tasaHeredada?.rate;
                   if (tasaPct == null) return "";
                   const bruto = parseFloat(precio);
                   const neto  = bruto / (1 + tasaPct / 100);
                   const iva   = bruto - neto;
                   const nro   = (n: number) =>
                     n.toLocaleString("es-UY", { maximumFractionDigits: 2 });
                   const nombre = elegida?.name ?? tasaHeredada?.name ?? "";
                   return (
                     <>
                       {/* El precio del oficial, arriba del desglose: es el
                           dato que se mira antes de decidir el propio. */}
                       {precioOficial && (
                         <div style={{ color:"#166534", fontWeight:700 }}>
                           Oficial en {precioOficial.tienda}: {precioOficial.moneda}{" "}
                           {nro(precioOficial.precio)}
                         </div>
                       )}
                       <div>
                         Incluye {moneda} {nro(iva)} de {nombre} · neto {moneda} {nro(neto)}
                       </div>
                       <div style={{ color:"var(--gray-400)" }}>
                         {elegida
                           ? "Tasa elegida en este artículo."
                           : `Tasa heredada${tasaHeredada?.origen && tasaHeredada.origen !== "default"
                               ? ` de la ${tasaHeredada.origen}` : " por defecto"}.`}
                       </div>
                     </>
                   );
                 })(),
    tarjeta:     "",
  };

  // Se avisa en cada cambio de lo que importa para la fila, no en cada tecla:
  // la lista de dependencias es lo que hace la diferencia.
  useEffect(() => {
    onResumen?.({
      nombre, precio: parseFloat(precio) || 0, moneda,
      stock: parseInt(stock) || 0,
      imagen: imagenes[0] ?? null,
      estado: publicarComo === "draft" ? "draft"
            : disponibilidad === "agotado" ? "archived" : "active",
      canales, tipo,
      /* Marca y familia: son la columna "Detalle" de la Biblioteca. Sin esto la
         fila que se va completando no podia decir lo mismo que las de abajo, y
         una fila que se lee distinto que sus vecinas se lee dos veces. */
      marca,
      familia: cats.find(c => c.id === catId)?.nombre
            ?? deptos.find(d => d.id === deptoId)?.nombre ?? null,
    });
  }, [nombre, precio, moneda, stock, imagenes, publicarComo, disponibilidad,
      canales, tipo, marca, catId, deptoId, cats, deptos]);

  /* Se avisa a quien monta el formulario, igual que el resumen: la barra de la
     pantalla es la que dibuja el boton, y para eso tiene que saber si se puede
     grabar y que falta si no. */
  useEffect(() => {
    onAcciones?.({
      grabar: () => { void handlePublicar(); },
      falta: faltaParaGuardar(),
      guardando: loading,
      etiqueta: loading ? "Guardando…"
              : articulo?.id ? "Guardar cambios"
              : publicarComo === "draft" ? "Guardar borrador" : "Publicar artículo",
    });
  });

  const faltaParaGuardar = (): string => {
    if (!nombre.trim())      return "Falta el nombre del artículo";
    if (!descripcion.trim()) return "Falta la descripción";
    // Una ficha no necesita precio: todavía no se decidió venderla.
    if (modo === "ficha") return "";
    if (!precio || parseFloat(precio) <= 0) return "Falta el precio";
    return "";
  };
  const puedeGuardar = () => faltaParaGuardar() === "";

  /**
   * Trae a la Biblioteca lo que esté afuera, y devuelve lo que hay que guardar.
   *
   * LA BIBLIOTECA ES LA UNICA FUENTE DE MEDIOS
   * El buscador de imagenes trae fotos de la web y de los canales, y hasta
   * ahora esas URLs ajenas se guardaban tal cual en el articulo: la Biblioteca
   * quedaba vacia aunque el articulo tuviera ocho fotos, y las fotos no eran
   * nuestras -el dia que ese sitio las mueve, el articulo se queda sin imagen-.
   *
   * Lo que ya vive en la Biblioteca no se vuelve a bajar.
   *
   * Lo que no se puede traer -un sitio que bloquea la copia- se DICE y se deja
   * enlazado de afuera. Descartarlo en silencio seria perder fotos que el
   * usuario acaba de elegir.
   */
  const aLaBiblioteca = async (urls: string[]): Promise<string[]> => {
    if (urls.length === 0) return [];
    const { data, error } = await supabase.functions.invoke("traer-a-biblioteca",
      { body: { urls } });

    if (error || data?.error) {
      notify(`No se pudieron traer los medios a la Biblioteca: ${
        error?.message ?? data.error}. Quedan enlazados de afuera.`, false);
      return urls;
    }

    const medios = (data?.medios ?? []) as
      { original: string; url: string; motivo: string }[];
    const fallaron = medios.filter(m => m.motivo);
    if (fallaron.length) {
      notify(`${fallaron.length} de ${medios.length} no se pudieron traer a la `
           + `Biblioteca (${fallaron[0].motivo}). Quedan enlazados de afuera.`, false);
    }
    return medios.map(m => m.url);
  };

  const handlePublicar = async () => {
    setLoading(true);
    try {
      /* Primero los medios: lo que se guarde en el articulo tiene que ser lo
         que quedo en la Biblioteca, no lo que se habia elegido afuera. */
      /* Nombres propios y no los del estado: `setImagenes` no cambia
         `imagenes` hasta el proximo dibujo, asi que guardar leyendo el estado
         guardaria lo viejo. */
      const enBiblioteca    = await aLaBiblioteca(imagenes);
      const videosGuardados = await aLaBiblioteca(videoUrls);
      setImagenes(enBiblioteca);
      setVideoUrls(videosGuardados);

      /*
       * En modo ficha se guarda SOLO la ficha.
       *
       * Crear una publicación con precio cero para después despublicarla es
       * exactamente lo que la Biblioteca vino a evitar: ensuciar la lista de lo
       * que se vende con cosas que todavía no se venden.
       */
      if (modo === "ficha") {
        const { error } = await supabase.rpc("guardar_ficha_biblioteca", {
          p_marca:       marca.trim(),
          p_nombre:      nombre.trim(),
          p_familia:     cats.find(c => c.id === catId)?.nombre ?? null,
          p_descripcion: descripcion.trim() || null,
          p_imagen:      enBiblioteca[0] ?? null,
        });
        if (error) throw error;
        notify("Guardado en la Biblioteca");
        setTimeout(() => salir(true), 900);
        return;
      }

      // Alta contra el modelo multicanal (catalog_*), igual que la pantalla de
      // Publicaciones. Antes esto insertaba en `articulos`, con lo cual el
      // producto no aparecia en ninguna de las dos vistas.
      const depto = deptos.find(d => d.id === deptoId);

      // Lo que no tiene columna propia en catalog_* viaja en attributes.
      // Departamento se guarda como referencia hasta que catalog_taxonomy este
      // poblada: asi el dato no se pierde y la migracion futura lo encuentra.
      const atributos: Record<string, unknown> = {};
      if (tipo === "secondhand") atributos.condicion = condicion;
      if (precioOrig)            atributos.precio_original = parseFloat(precioOrig);
      if (disponibilidad)        atributos.disponibilidad = disponibilidad;
      if (deptoId)               atributos.departamento = { id: deptoId, nombre: depto?.nombre ?? null };

      // Editar y crear no son dos flujos: es el mismo formulario resolviendo a
      // que RPC ir. Con articulo se actualiza; sin el, se crea.
      if (articulo?.id) {
        const { error: eUp } = await supabase.rpc("actualizar_publicacion", {
          p_variant_id:  articulo.id,
          p_title:       nombre.trim(),
          p_description: descripcion.trim() || null,
          p_price:       parseFloat(precio),
          p_currency:    moneda,
          p_stock:       parseInt(stock) || 0,
          p_status:      publicarComo === "draft" ? "draft"
                         : disponibilidad === "agotado" ? "archived" : "active",
          p_tipo:        tipo === "secondhand" ? "secondhand" : "market",
          /* La marca y los medios FALTABAN. Editar guardaba todo lo demas y se
             comia estos dos sin decir nada -ni siquiera se podia agregar una
             foto a un articulo ya creado-. */
          p_marca:       marca.trim(),
          p_images:      enBiblioteca,
          p_videos:      videosGuardados,
        });
        if (eUp) throw eUp;

        /*
         * Y la ficha de la Biblioteca, que es la FUENTE.
         *
         * El alta la guardaba; editar no la tocaba. Con eso, corregir la marca
         * o el titulo de un articulo dejaba la Biblioteca diciendo lo viejo, y
         * la Biblioteca es de donde sale todo lo demas.
         *
         * Se actualiza POR ID y no con `guardar_ficha_biblioteca`: esa hace
         * upsert por (marca, nombre), asi que cambiar la marca habria creado
         * una ficha nueva en vez de corregir la que estaba.
         */
        if (articulo.ficha_id) {
          const { error: eF } = await supabase.rpc("actualizar_ficha_biblioteca", {
            p_id:          articulo.ficha_id,
            p_nombre:      nombre.trim(),
            p_marca:       marca.trim(),
            p_familia:     cats.find(c => c.id === catId)?.nombre ?? null,
            p_descripcion: descripcion.trim() || null,
            p_fotos:       enBiblioteca,
          });
          // Que falle no invalida el guardado: el articulo ya se actualizo. Se
          // avisa, no se pierde en la consola.
          if (eF) notify(`El artículo se guardó, pero la Biblioteca no: ${eF.message}`, false);
        }
        // La tasa va aparte: no es parte de dar de alta un articulo sino una
        // decision que se toma pocas veces, y meterla en una RPC que ya recibe
        // ocho parametros no la hacia mas clara.
        await supabase.rpc("fijar_tasa_articulo", {
          p_variant_id: articulo.id, p_tax_rate_id: tasaId,
        });
        await guardarDetalles(articulo.id);
        await guardarLineasDePrecio(articulo.id);
        // Recien guardado: a partir de ahora hay un estado anterior al que
        // volver. Se marca aca y no se vuelve a consultar porque acabamos de
        // crearlo nosotros.
        setDeshacerDesde(new Date().toISOString());
        notify("Cambios guardados");
        setTimeout(() => salir(true), 900);
        return;
      }

      const { data: nuevaVariante, error } = await supabase.rpc("crear_publicacion", {
        p_title:       nombre.trim(),
        p_price:       parseFloat(precio),
        p_currency:    moneda,
        p_description: descripcion.trim() || null,
        p_stock:       parseInt(stock) || 1,
        p_channels:    [tipo === "secondhand" ? "secondhand" : "market", ...canales],
        p_status:      publicarComo === "draft" ? "draft"
                       : disponibilidad === "agotado" ? "archived" : "active",
        p_attributes:  atributos,
        p_images:      enBiblioteca,
        p_videos:      videosGuardados,
        /* Tambien en la publicacion, no solo en la ficha: `marca` es una
           columna de `catalog_producto_base` y quedaba siempre en null. */
        p_marca:       marca.trim(),
      });
      if (error) throw error;

      if (nuevaVariante) {
        await guardarDetalles(nuevaVariante as string);
        await guardarLineasDePrecio(nuevaVariante as string);
      }

      /*
       * Lo que se carga queda SIEMPRE en la Biblioteca.
       *
       * Ese es el punto de tenerla: si mañana se deja de publicar, no se pierde
       * lo que se sabía del producto. Hoy la única forma de no perderlo era
       * dejarlo archivado entre las publicaciones, estorbando.
       *
       * Que falle no invalida el alta: el artículo ya está creado.
       */
      const { error: eB } = await supabase.rpc("guardar_ficha_biblioteca", {
        p_marca:       marca.trim(),
        p_nombre:      nombre.trim(),
        p_familia:     cats.find(c => c.id === catId)?.nombre ?? null,
        p_descripcion: descripcion.trim() || null,
        p_imagen:      enBiblioteca[0] ?? null,
      });
      if (eB) console.warn("[biblioteca]", eB.message);

      // La excepcion de tasa, solo si se eligio una. Sin esto el articulo
      // hereda, que es lo correcto y lo que pasa el 95% de las veces.
      if (tasaId && nuevaVariante) {
        const { error: eT } = await supabase.rpc("fijar_tasa_articulo", {
          p_variant_id: nuevaVariante, p_tax_rate_id: tasaId,
        });
        if (eT) console.warn("[tasa]", eT.message);
      }

      // La ficha se guarda apenas existe el articulo. Si se dejara para
      // despues dependeria de que alguien vuelva a abrirlo con el canal
      // respondiendo, y lo que ya sabiamos se perderia.
      if (elegido && nuevaVariante) {
        const { error: eF } = await supabase.rpc("guardar_ficha_articulo", {
          p_variant_id:  nuevaVariante,
          p_ficha:       elegido,
          p_fuente:      "mercadolibre",
          p_producto_id: idElegido,
        });
        // Que falle no invalida el alta: el articulo esta creado y la ficha se
        // puede volver a traer. Se avisa, no se aborta.
        if (eF) console.warn("[ficha]", eF.message);
      }

      notify(publicarComo === "draft" ? "Guardado como borrador — podés publicarlo cuando quieras" : "¡Listo! Tu artículo ya está publicado en Charlie Market");

      /*
       * Antes de irse: ¿hay mas de esta marca?
       *
       * Es el momento en que preguntarlo cuesta menos —el catalogo ya se
       * consulto, la marca ya esta identificada— y en que mas sirve. Si no hay
       * marca confirmada o el catalogo no trae nada, se sale como siempre y
       * nadie se entera de que se pregunto.
       */
      if (puedeLeerCatalogos() && marcaConfirmada && marca.trim()) {
        const otros = await otrosDeLaMarca();
        if (otros.items.length > 0) {
          abrirCuadroCon(otros.items, true);
          return;                       // se sale al cerrar el cuadro, no antes
        }
      }
      setTimeout(() => salir(true), 1500);
    } catch (e: any) {
      notify(e.message || "Algo salió mal. Intentá de nuevo en un momento", false);
    } finally {
      setLoading(false);
    }
  };
  const inp: React.CSSProperties = {
    /*
     * display block a proposito. Un input es inline: su caja deja unos pixeles
     * de descender debajo, dentro del contenedor. Con eso el bloque de Marca
     * medía 44 aunque el campo midiera 40, y esos 4 pixeles se leian como
     * "hasta Articulo hay mas distancia que entre los demas".
     */
    display:"block",
    width:"100%", height:ALTO_CAMPO, padding:"0 0.75rem", border:"1.5px solid var(--border)",
    borderRadius:"8px", fontSize:"0.875rem", outline:"none",
    boxSizing:"border-box", fontFamily:"DM Sans, sans-serif", background:"#fff",
  };
  const lbl: React.CSSProperties = {
    fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px", display:"block",
  };
  // Campo con la etiqueta adentro: un único recuadro con borde, la etiqueta
  // como primera línea (chica, muted) y el control debajo sin su propio
  // borde. Reemplaza el patrón anterior de <label> suelta arriba + <input>
  // con su propio recuadro: ahora ambos viven dentro del mismo contenedor.
  const fieldBox: React.CSSProperties = {
    border:"1.5px solid var(--border)", borderRadius:8, background:"#fff",
    padding:"0.4rem 0.7rem 0.5rem", boxSizing:"border-box",
  };
  const fieldLbl: React.CSSProperties = {
    fontSize:"0.68rem", fontWeight:700, color:"var(--gray-400)", display:"block", marginBottom:2,
  };
  const fieldCtrl: React.CSSProperties = {
    width:"100%", border:"none", outline:"none", padding:0, margin:0,
    fontSize:"0.875rem", fontFamily:"DM Sans, sans-serif",
    background:"transparent", boxSizing:"border-box", color:"#111", display:"block",
  };
  /**
   * La fila cerrada arriba y abajo por la misma linea.
   *
   * Arriba la traza la barra de acciones -borderBottom 1px #EAECF0-. Abajo se
   * repite igual, y con el mismo aire de cada lado, para que la ficha quede
   * contenida entre dos lineas iguales en vez de terminar en el aire.
   *
   * El padding lateral queda como estaba: lo que se iguala es el ritmo
   * vertical, que es lo que se ve.
   */
  /** Celda del monitor: no crece, y si el aviso no entra, scrollea el aviso. */
  const celdaAviso: React.CSSProperties = {
    minWidth:0, height:ALTO_MONITOR, overflowY:"auto",
    fontSize:"0.8rem", lineHeight:`${LINEA_TEXTO}px`, color:"#374151",
  };

  const card: React.CSSProperties = {
    background:"#fff", borderRadius:0,
    padding:`${AIRE_LINEA}px 1.5rem`,
    borderBottom:"1px solid #EAECF0",
  };
  // Mismo look que los slots de SelectorMediaArticulo (paso Imágenes): tile
  // redondeado, fondo gris cuando está vacío, negro detrás de la foto/video
  // cuando tiene algo. Acá se listan en columna en vez de en grilla.
  const tile = (filled: boolean, ratio: string = "1"): React.CSSProperties => ({
    width:"100%", aspectRatio:ratio, borderRadius:10, overflow:"hidden", flexShrink:0,
    border: `1.5px solid ${filled ? "var(--border)" : "#F3F4F6"}`,
    background: filled ? "#000" : "var(--gray-50)",
    display:"flex", alignItems:"center", justifyContent:"center",
  });

  // Paso 2 · Vista previa: arma el mismo objeto que consume la tarjeta real
  // del front (MarketCard) para que se vea exactamente como en la tienda,
  // actualizándose en vivo a medida que se completa el formulario.
  const categoriaLabel = cats.find(c => c.id === catId)?.nombre || marca || undefined;
  const previewProduct = {
    id: 0,
    img: imagenes[0] || "",
    d: categoriaLabel || "",
    n: nombre || "Nombre del artículo",
    p: parseFloat(precio || "0").toLocaleString("es-UY"),
    o: precioOrig && parseFloat(precioOrig) > parseFloat(precio || "0")
      ? parseFloat(precioOrig).toLocaleString("es-UY") : null,
    desc: descripcion || "",
    r: 0,
    rv: 0,
    stock: stock ? parseInt(stock, 10) : undefined,
  };

  return (
    <div style={{ margin:0, display:"flex", flexDirection:"column", gap:RITMO }}>
      {/*
        La grilla va en CSS y no en estilos inline porque necesita una media
        query: los estilos inline no pueden expresar "si no entra, cambia de
        forma", y esta fila tiene un ancho minimo real por debajo del cual
        apretarla deformaria la tarjeta y los tiles.

        Debajo de ese ancho se parte en dos bandas -descripcion con medios, y
        precio con la tarjeta- en vez de encogerse. Cada banda conserva la
        relacion que importa: los tiles siguen cuadrados y la tarjeta sigue
        siendo la del front.
      */}
      <style>{`
        .ficha-fila {
          display: grid;
          gap: ${GAP_COLUMNAS}px;
          align-items: stretch;
          grid-template-columns:
            minmax(${ANCHO_MIN_DESCRIPCION}px, 1fr)
            ${ANCHO_COLUMNAS_DERECHA}px
            ${ANCHO_COLUMNAS_DERECHA}px
            ${ANCHO_COLUMNAS_DERECHA}px;
          height: auto;
        }
        @media (max-width: ${ANCHO_MINIMO_FILA}px) {
          .ficha-fila {
            grid-template-columns: minmax(0, 1fr) ${ANCHO_COLUMNAS_DERECHA}px;
            height: auto;
          }
          /* Precio y tarjeta bajan a la segunda banda, en el mismo orden. */
          .ficha-fila > .col-precio,
          .ficha-fila > .col-tarjeta { grid-column: auto; }
          .ficha-fila > .col-descripcion { height: 100%; }
          .ficha-fila > .col-medios { height: auto; }
        }
      `}</style>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:"10px", fontWeight:600, fontSize:"0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border:`1px solid ${toast.ok ? "color-mix(in srgb, var(--color-success) 70%, white)" : "#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Contenido del paso */}
      {/* ARRIBA: lo basico, en cuatro columnas. Identidad, imagenes, precio y
          como se va a ver. Es lo que define al articulo, y entra de una. */}
      {true ? (
        // Grid en vez de flex: 4 columnas que reparten el 100% del ancho del
        // contenedor en la misma proporción que antes tenían fijada en px
        // (380:285:380:285 → Información y Precio, columna 1 y 3, quedan del
        // mismo ancho entre sí; Imágenes y Tarjeta, columna 2 y 4, quedan del
        // mismo ancho entre sí). Con fr las 4 columnas se reparten siempre el
        // 100% disponible, angostándose o ensanchándose todas juntas y en la
        // misma proporción según el ancho real del contenedor.
        <div className="ficha-fila"
          style={card}>
          {/* Descripcion. Si su contenido pasa el alto comun, scrollea ella:
              estirar la fila entera para que entre un campo mas deja a las
              otras tres con aire muerto. */}
          <div className="col-descripcion" style={{ minWidth:0, height:"100%", overflowY:"auto", paddingRight:4 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:RITMO }}>

            {/* Marca: el input queda más angosto (flex:1) para dejarle lugar,
                a continuación y siempre presente, a la miniatura del logo.
                La miniatura no es un campo nuevo: es el mismo logoUrl que ya
                se busca automáticamente a partir de lo que se escribe acá
                (buscarMarcas / logoDeDominio), solo que antes se mostraba
                arriba del todo -y solo después de confirmar la marca- y ahora
                vive pegada al campo y se ve siempre, incluso mientras se
                busca o no hay nada cargado todavía. */}
            <div>
              <div style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
                <CampoConCheck
                  valor={marca}
                  onChange={(v) => setMarca(v)}
                  placeholder="Marca"
                  etiqueta="Personalizada"
                  marcado={marcaModo === "personalizada"}
                  onMarcar={(m) => { if (m) { setMarca(""); elegirMarcaPersonalizada(); } else cambiarMarca(); }}
                  soloLectura={marcaConfirmada && marcaModo !== "personalizada"}
                  confirmado={marcaConfirmada && marcaModo === "sugerida"}
                  onCambiar={() => { abrir("marca"); cambiarMarca(); }}
                  bloqueado={bloqueaCampos && !abiertos.has("marca")}
                  onEnter={() => {
                    const m = candidatosMarca[0];
                    if (m) elegirMarcaSugerida(m);
                  }}
                  estiloInput={inp} />

                {/* Logo de la marca: mismo patrón que los tiles de fotos del
                    artículo (SelectorMediaArticulo) — vacío muestra "+" y al
                    tocarlo abre un buscador; con logo cargado, el hover
                    ofrece Reemplazar/Quitar. El buscador usa la misma
                    función de búsqueda de imágenes de la web que las fotos
                    del artículo (buscarImagenes), con "<marca> logo" como
                    texto en vez de dejarlo en blanco. */}
                {(() => {
                  const logoActual = logoPersonalizado || (logoUrl && !logoError ? logoUrl : null);
                  const puedeBuscar = marca.trim().length > 1;
                  return (
                    <div
                      onClick={() => !logoActual && puedeBuscar && abrirBuscadorLogo()}
                      style={{
                        width:ALTO_CAMPO, height:ALTO_CAMPO, borderRadius:8, flexShrink:0, overflow:"hidden", position:"relative",
                        border: logoActual ? "1px solid var(--border)" : "1.5px dashed var(--border)",
                        background: logoActual ? "#000" : "var(--gray-50)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        cursor: logoActual || puedeBuscar ? "pointer" : "default",
                      }}>
                      {logoActual ? (
                        <>
                          <img src={logoActual} alt={marca} onError={() => setLogoError(true)}
                            style={{ width:"100%", height:"100%", objectFit:"contain", background:"#fff" }} />
                          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)",
                            display:"flex", alignItems:"center", justifyContent:"center", gap:2,
                            opacity:0, transition:"all .15s" }}
                            onMouseEnter={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,.5);opacity:1")}
                            onMouseLeave={e => (e.currentTarget.style.cssText += "background:rgba(0,0,0,0);opacity:0")}
                          >
                            <button onClick={e => { e.stopPropagation(); abrirBuscadorLogo(); }}
                              title="Reemplazar logo"
                              style={{ background:ACCENT, color:"#fff", border:"none", borderRadius:4,
                                width:16, height:16, fontSize:"9px", cursor:"pointer", lineHeight:1, padding:0 }}>✏</button>
                            <button onClick={e => { e.stopPropagation(); quitarLogo(); }}
                              title="Quitar logo"
                              style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:4,
                                width:16, height:16, fontSize:"9px", cursor:"pointer", lineHeight:1, padding:0 }}>🗑</button>
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize:"0.55rem", color:"var(--gray-400)", textAlign:"center", lineHeight:1.1, padding:"0 3px" }}>
                          {buscandoMarca && !marcaConfirmada ? "…" : (puedeBuscar ? "+ Logo" : "Sin logo")}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {buscandoMarca && !marcaConfirmada && (

                <div style={{ fontSize:"0.75rem", color:"var(--gray-400)", marginTop:5 }}>
                  Buscando en la web…
                </div>
              )}

              {/* Sugerencias mientras escribe */}
              {!marcaConfirmada && candidatosMarca.length > 0 && (
                <div style={{ border:"1px solid var(--border)", borderRadius:8, marginTop:6,
                  maxHeight:200, overflowY:"auto" }}>
                  {candidatosMarca.map(m => (
                    <button key={m.nombre} onClick={() => elegirMarcaSugerida(m)}
                      style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
                        textAlign:"left", padding:"7px 10px", border:"none", background:"transparent",
                        cursor:"pointer", borderBottom:"1px solid var(--gray-50)" }}>
                      {m.imagen
                        ? <img src={m.imagen} alt="" style={{width:22,height:22,objectFit:"contain",
                            borderRadius:4,flexShrink:0}} onError={e => (e.currentTarget.style.visibility="hidden")}/>
                        : <div style={{width:22,height:22,flexShrink:0}}/>}
                      <span style={{ fontSize:"0.8rem", fontWeight:600, color:"#111" }}>{m.nombre}</span>
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* MODAL BUSCADOR DE LOGO — mismo patrón que el modal de
                Biblioteca de SelectorMediaArticulo (overlay + tarjeta
                centrada), pero con resultados de la búsqueda de imágenes de
                la web en vez de la biblioteca interna. */}
            {logoModalOpen && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:9999,
                display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
                onClick={e => { if (e.target === e.currentTarget) setLogoModalOpen(false); }}
              >
                <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560,
                  maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden",
                  boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ fontWeight:700, fontSize:"1rem", color:"#111" }}>🖼 Logo de {marca || "la marca"}</span>
                    <button onClick={() => setLogoModalOpen(false)}
                      style={{ background:"none", border:"none", fontSize:"1.25rem", cursor:"pointer", color:"var(--mute)" }}>✕</button>
                  </div>

                  <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)",
                    display:"flex", gap:"0.6rem" }}>
                    <input style={{ ...inp, flex:1 }} value={logoQuery}
                      onChange={e => setLogoQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && buscarLogoWeb(logoQuery)}
                      placeholder="Ej: Nike logo" />
                    <button onClick={() => buscarLogoWeb(logoQuery)} style={{
                      padding:"0 1rem", background:ACCENT, color:"#fff", border:"none",
                      borderRadius:8, fontSize:"0.85rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      Buscar
                    </button>
                  </div>

                  <div style={{ flex:1, overflow:"auto", padding:"1.25rem" }}>
                    {buscandoLogoWeb ? (
                      <div style={{ textAlign:"center", padding:"2rem", color:"var(--gray-400)", fontSize:"0.85rem" }}>
                        Buscando en la web…
                      </div>
                    ) : imgs.filtrar(logoResultados, r => r.imagen).length > 0 ? (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:`${RITMO}px 0.75rem` }}>
                        {imgs.filtrar(logoResultados, r => r.imagen).map((r, i) => (
                          <button key={i} onClick={() => elegirLogoBuscado(r)} title={r.nombre}
                            style={{ aspectRatio:"1", borderRadius:10, overflow:"hidden", padding:6,
                              border:"1.5px solid var(--border)", background:"#fff", cursor:"pointer" }}>
                            {/* Sin `alt`: si la imagen no carga la baldosa
                                desaparece entera, y un texto alternativo la
                                dejaria como una frase suelta en la grilla. */}
                            <img src={r.imagen!} alt=""
                              onError={() => imgs.falló(r.imagen)}
                              style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign:"center", padding:"2rem", color:"var(--gray-400)", fontSize:"0.85rem" }}>
                        Sin resultados. Probá con otro texto.
                      </div>
                    )}
                  </div>

                  <div style={{ padding:"0.85rem 1.25rem", borderTop:"1px solid var(--border)",
                    display:"flex", justifyContent:"center" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                      color:ACCENT, fontSize:"0.8rem", fontWeight:700, textDecoration:"underline" }}>
                      Subir mi propio logo desde el dispositivo
                      <input type="file" accept="image/*" style={{ display:"none" }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          subirLogoPersonalizado(f);
                          setLogoModalOpen(false);
                        }} />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Sin renglon propio arriba: "Cambiar" vive adentro del campo,
                y asi todos los campos arrancan en la misma linea. */}
            <div>
              <div style={{ display:"flex" }}>
                <CampoConCheck
                  valor={nombre}
                  onChange={(v) => { setNombre(v); setIdElegido(null); setElegido(null); }}
                  placeholder="Artículo"
                  etiqueta="Personalizado"
                  marcado={articuloPersonalizado}
                  onMarcar={(m) => {
                    setArticuloPersonalizado(m);
                    // Tildar es "lo escribo yo": se limpia lo que habia y se
                    // sueltan los candidatos, que ya no aplican.
                    if (m) { setNombre(""); setCandidatos([]); setElegido(null); setIdElegido(null); }
                  }}
                  confirmado={!!idElegido}
                  onCambiar={() => { abrir("nombre"); setIdElegido(null); setElegido(null); setCandidatos([]); }}
                  bloqueado={bloqueaCampos && !abiertos.has("nombre")}
                  // Enter elige el primer candidato: la lista ya muestra
                  // arriba el que se estaba buscando.
                  onEnter={() => {
                    const c: any = candidatos[0];
                    if (c) adoptarProducto(c.id, c.canal, c);
                  }}
                  estiloInput={inp} />
              </div>

              {/* Cargar varios de la marca, sin tener que guardar primero.
                  La misma oferta aparece sola al guardar; acá está para el
                  caso obvio: ya identifiqué la marca y quiero su catálogo. */}
              {puedeLeerCatalogos() && marcaConfirmada && marca.trim() && !masivoAbierto && (
                <button type="button" onClick={abrirCargaDeMarca} disabled={masivoCargando}
                  style={{ marginTop:6, padding:"0.45rem 0.85rem", borderRadius:9,
                    border:`1.5px solid ${masivoCargando ? "var(--border)" : ACCENT}`,
                    background: masivoCargando ? "var(--gray-50)" : "#fff",
                    color: masivoCargando ? "var(--gray-400)" : ACCENT,
                    cursor: masivoCargando ? "wait" : "pointer",
                    fontSize:"0.78rem", fontWeight:700, fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:7 }}>
                  {masivoCargando ? (
                    <>
                      {/* Leer un catalogo son varias llamadas encadenadas y
                          puede tardar. Sin este aviso parece que no paso nada. */}
                      <span style={{ width:11, height:11, borderRadius:"50%", flexShrink:0,
                        border:"2px solid var(--border)", borderTopColor:ACCENT,
                        animation:"girar .7s linear infinite" }} />
                      Generando catálogo…
                    </>
                  ) : `¿Generar el catálogo de ${marca.trim()}?`}
                </button>
              )}

              {buscandoProd && !elegido && !articuloPersonalizado && (
                <div style={{ fontSize:"0.75rem", color:"var(--gray-400)", marginTop:5 }}>
                  Buscando el producto…
                </div>
              )}

              {/* Las versiones que existen. "iPhone 17" son varias -256 GB,
                  512 GB, cada color- y cual es solo lo sabe quien lo tiene en
                  la mano, asi que se listan en vez de adivinar. */}
              {candidatos.length > 0 && !elegido && (
                <div style={{ border:"1px solid var(--border)", borderRadius:8, marginTop:6,
                  maxHeight:230, overflowY:"auto" }}>
                  <div style={{ padding:"6px 10px", fontSize:"0.72rem", color:"var(--gray-400)",
                    borderBottom:"1px solid var(--gray-50)" }}>
                    {mostrandoCatalogo
                      ? `No hay coincidencias con lo que escribiste. Estos son los productos de ${marca.trim()}.`
                      : "¿Cuál de estos es? Elegir uno completa el resto solo."}
                  </div>
                  {candidatos.map(c => (
                    <button key={c.canal + c.id} onClick={() => adoptarProducto(c.id, c.canal, c)}
                      style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
                        textAlign:"left", padding:"7px 10px", border:"none", background:"transparent",
                        cursor:"pointer", borderBottom:"1px solid var(--gray-50)" }}>
                      {c.imagen
                        ? <img src={c.imagen} alt="" style={{width:34,height:34,objectFit:"cover",
                            borderRadius:5,border:"1px solid var(--border)",flexShrink:0}}/>
                        : <div style={{width:34,height:34,flexShrink:0}}/>}
                      <span style={{ minWidth:0 }}>
                        <span style={{ display:"block", fontSize:"0.8rem", fontWeight:600, color:"#111" }}>
                          {c.nombre}
                        </span>
                        <span style={{ fontSize:"0.72rem", color:"var(--gray-400)" }}>
                          {[c.rasgos.join(" · "), c.canalNombre].filter(Boolean).join("  —  ")}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* La confirmacion de la version elegida no vive aca: va al
                  monitor, debajo de esta misma columna. Un cartel intercalado
                  entre dos campos empuja todo lo de abajo cada vez que aparece
                  y desaparece, y ademas rompe el renglonado que hace que los
                  campos se lean como una lista. */}
            </div>

            {/* Condición: entre Artículo y Descripción. Market y Second Hand
                son excluyentes (definidos por `tipo`), cada uno con su
                propia escala. Sin título "Condición *": las opciones van
                directo en una sola fila de chips, todas visibles a la vez. */}
            {tipo === "market" && (
              <div style={{ marginTop: RITMO_JUNTO - RITMO }}>
                <LineaCondicion
                  opciones={CONDICIONES_ARTICULO}
                  valor={condicionMarketId}
                  onChange={setCondicionMarketId}
                  subValor={subestadoRecond}
                  onSubValor={setSubestadoRecond} />
              </div>
            )}

            {tipo === "secondhand" && (
              <div style={{ marginTop: RITMO_JUNTO - RITMO }}>
              <LineaCondicion
                opciones={CONDICIONES_ARTICULO}
                valor={condicion}
                onChange={setCondicion}
                subValor={subestadoRecond}
                onSubValor={setSubestadoRecond} />
              </div>
            )}

            {/* Categorización: Departamento/Categoría/Subcategoría. Se
                auto-completan por predicción ML apenas se elige un producto
                (ver el useEffect más arriba); el aviso "sugerido por ML" se
                apaga en cuanto la persona toca cualquiera de los tres
                selectores. */}
            <div style={{ display:"grid", gridTemplateColumns: filteredSubs.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap:`${RITMO}px 0.75rem` }}>
              <div>
                <select style={inp} value={deptoId}
                  onChange={e => { setDeptoId(e.target.value); setCatId(""); setSubcatId(""); setTaxonomiaSugerida(false); }}>
                  <option value="">Departamento</option>
                  {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <select style={inp} value={catId}
                  onChange={e => { setCatId(e.target.value); setSubcatId(""); setTaxonomiaSugerida(false); }}
                  disabled={!deptoId}>
                  <option value="">Categoría</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {filteredSubs.length > 0 && (
                <div>
                  <select style={inp} value={subcatId}
                    onChange={e => { setSubcatId(e.target.value); setTaxonomiaSugerida(false); }} disabled={!catId}>
                    <option value="">Subcategoría</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <textarea maxLength={MAX_DESCRIPCION}
                style={{ ...inp, height:"auto", minHeight:100,
                padding:"0.6rem 0.75rem", resize:"vertical",
                ...(bloqueaCampos && !abiertos.has("descripcion")
                    ? { background:"#F8F9FB" } : null) }}
                readOnly={bloqueaCampos && !abiertos.has("descripcion")}
                onFocus={() => abrir("descripcion")}
                onMouseDown={() => abrir("descripcion")}
                value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción: características, uso, accesorios incluidos…" />
              <div style={{ fontSize:"11px", color:"var(--gray-400)", textAlign:"right", marginTop:"3px" }}>
                {descripcion.length} / {MAX_DESCRIPCION}
              </div>
            </div>
          </div>
          </div>

          {/* Imágenes y videos: viven acá, en el paso Información, sin un paso
              aparte. El usuario agrega/reemplaza/quita desde la Biblioteca.
              El ancho de esta columna ya no es un valor fijo: lo pone la
              grilla (columna 2, misma proporción que antes tenía 285 sobre
              380), y como la columna 4 (Tarjeta) usa la misma fracción,
              ambas quedan siempre del mismo ancho entre sí. */}
          <div className="col-medios" style={{ minWidth:0, alignSelf:"start", width:"100%", display:"flex", flexDirection:"column", gap:RITMO }}>
            <SelectorMediaArticulo
              imagenes={imagenes}
              videos={videoUrls}
              onChangeImagenes={setImagenes}
              onChangeVideos={setVideoUrls}
              columnas={3}
              maxImagenes={12}
              maxVideos={6}
              imagenAspect="1"
              anchoGrid={`${ANCHO_GRID_MEDIOS}px`}
              espacioSecciones={`${SEPARACION_VERTICAL}px`}
              /* gap acepta "fila columna": vertical el calculado, horizontal el chico. */
              gapTiles={`${SEPARACION_VERTICAL}px ${GEOMETRIA.gapTiles}px`}
              videoAspect={`${LADO_FOTO} / ${ALTO_VIDEO}`}
              sinEncabezados
            />
          </div>

          {/* Precio: vive acá, a la derecha de las fotos, sin un paso aparte.
              Misma fracción de grilla que la columna de Información (col 1)
              para que ambas queden siempre del mismo ancho entre sí.

              En modo ficha no va: una ficha dice QUÉ ES el producto, no a
              cuánto lo vende alguien. El precio aparece al publicarlo. */}
          <div style={{ minWidth:0, display: modo === "ficha" ? "none" : undefined }}>
            {/*
              La columna del precio tiene el alto de la fila y no crece.

              Cada "+" agrega un renglon, y sin tope la columna empujaba la
              pagina hacia abajo: con seis precios la tarjeta quedaba a media
              pantalla y las cuatro columnas dejaban de estar una al lado de la
              otra, que es lo unico que justifica esta disposicion.

              El alto es el de la tarjeta -la misma aritmetica que define toda
              la fila- y lo que no entra scrollea acá adentro. Un scroll local
              es mas barato que mover el resto de la pagina.
            */}
            <div style={{ display:"flex", flexDirection:"column", gap:RITMO,
              maxHeight:ALTO_TARJETA, overflowY:"auto", overflowX:"hidden",
              // Aire a la derecha para que la barra de scroll no se coma el
              // borde de los campos cuando aparece.
              paddingRight:4 }}>
              {/* Moneda · precio · impuesto, en un renglon.
                  Moneda y precio se achican para que entre el tercero: los
                  tres son el mismo dato -cuanto sale- y separarlos en
                  renglones distintos los haria parecer decisiones aparte. */}
              {/* El impuesto es la columna mas angosta: siempre muestra dos
                  digitos y un signo. El precio se queda con lo que sobra, que
                  es el campo que se escribe y el que puede crecer. */}
              <div style={{ display:"grid", gridTemplateColumns:"64px 1fr 72px", gap:`${RITMO}px 0.4rem` }}>
                <div>
                  <select style={{ ...inp, padding:"0.5rem 0.3rem" }} value={moneda}
                    onChange={e => cambiarMoneda(e.target.value)}>
                    {monedas.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
                  </select>
                </div>
                <div className="col-precio">
                  {/* A la derecha, como cualquier importe: un numero se lee de
                      atras para adelante -unidades, decenas, centenas- y
                      alineado a la izquierda las cifras bailan segun cuantos
                      digitos tenga. `tabular-nums` ademas les da a todos los
                      digitos el mismo ancho, asi el numero no se mueve mientras
                      se escribe. */}
                  <input style={{ ...inp, ...NUMERICO }}
                    type="number" value={precio}
                    onChange={e => escribirPrecio(e.target.value)} placeholder="Precio" min="0" />
                </div>
                {/* El impuesto NO cambia el precio: los precios se publican con
                    impuestos incluidos, asi que elegir la tasa cambia el
                    desglose -que se ve abajo- y nada mas. Multiplicar aca
                    seria cambiar el precio de venta sin que nadie lo pida. */}
                <div>
                  <select style={{ ...inp, padding:"0.5rem 0.15rem", ...NUMERICO_SELECT }}
                    title="Impuesto incluido en el precio"
                    value={tasaId ?? ""}
                    onChange={e => setTasaId(e.target.value || null)}>
                    <option value="">
                      {tasaHeredada ? `${tasaHeredada.rate}%` : "IVA"}
                    </option>
                    {tasas.map(t => (
                      <option key={t.id} value={t.id}>{t.rate}%</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Sugerir IVA.
                  A pedido y no automatico: la sugerencia se muestra con su
                  fundamento y decide una persona. Solo con nombre y categoria,
                  porque sin categoria el motor llega como mucho a confianza
                  media, y ofrecer una sugerencia floja como si fuera un
                  resultado es peor que no ofrecer nada. */}
              {articulo?.id && (
                <div style={{ display:"flex", flexDirection:"column", gap:RITMO_JUNTO }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                    <button type="button" onClick={sugerirIva}
                      disabled={!hayDatosSuficientes(nombre,
                        cats.find(c => c.id === catId)?.nombre
                        ?? deptos.find(d => d.id === deptoId)?.nombre ?? "")}
                      style={{ border:"none", background:"none", padding:0,
                        cursor: hayDatosSuficientes(nombre,
                          cats.find(c => c.id === catId)?.nombre
                          ?? deptos.find(d => d.id === deptoId)?.nombre ?? "")
                          ? "pointer" : "not-allowed",
                        color: hayDatosSuficientes(nombre,
                          cats.find(c => c.id === catId)?.nombre
                          ?? deptos.find(d => d.id === deptoId)?.nombre ?? "")
                          ? ACCENT : "var(--gray-400)",
                        fontSize:"0.78rem", fontWeight:700, textDecoration:"underline",
                        fontFamily:"inherit" }}>
                      Sugerir IVA
                    </button>
                    {origenFiscal === "MANUAL" && (
                      <span style={{ fontSize:"0.72rem", color:"var(--gray-400)" }}>
                        Puesta a mano
                      </span>
                    )}
                  </div>

                  {sugerencia && (
                    <div style={{ padding:"0.6rem 0.7rem", borderRadius:8,
                      border:`1px solid ${sugerencia.decision.accion === "PEDIR_REVISION"
                        ? "#FCD34D" : "var(--border)"}`,
                      background: sugerencia.decision.accion === "PEDIR_REVISION"
                        ? "#FFFBEB" : "var(--gray-50)",
                      display:"flex", flexDirection:"column", gap:6 }}>

                      <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#111" }}>
                        {sugerencia.clasificacion.codigoTasa
                          ? `IVA sugerido: ${tasas.find(t =>
                              t.code === sugerencia.clasificacion.codigoTasa)?.name
                              ?? sugerencia.clasificacion.codigoTasa}`
                          : "Hace falta revisarlo"}
                      </div>

                      <div style={{ fontSize:"0.74rem", color:"var(--mute)" }}>
                        Confianza: {sugerencia.clasificacion.confianza.toLowerCase()}
                        {" · "}Regla: {sugerencia.clasificacion.reglas.join(", ")}
                      </div>

                      <div style={{ fontSize:"0.74rem", color:"var(--mute)" }}>
                        {sugerencia.decision.mensaje}
                      </div>

                      {/* El fundamento se muestra tal como esta: sin verificar
                          se dice sin verificar. Una cita legal presentada como
                          hecho, cuando nadie la confirmo, se cree. */}
                      <div style={{ fontSize:"0.72rem", color:"var(--gray-400)" }}>
                        Fundamento:{" "}
                        {sugerencia.clasificacion.fuente
                          ? `${sugerencia.clasificacion.fuente.referencia}` +
                            (sugerencia.clasificacion.fuente.verificado
                              ? "" : " — pendiente de verificación")
                          : "sin fundamento aplicable"}
                      </div>

                      <div style={{ display:"flex", gap:"0.7rem", alignItems:"center" }}>
                        {sugerencia.decision.accion === "PEDIR_REVISION" ? (
                          <span style={{ fontSize:"0.74rem", color:"#92400E", fontWeight:700 }}>
                            Elegí la tasa a mano en el selector de arriba.
                          </span>
                        ) : sugerencia.decision.accion === "RESPETAR_MANUAL" ? (
                          <button type="button" onClick={() => aplicarSugerencia(true)}
                            style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                              color:"#92400E", fontSize:"0.78rem", fontWeight:700,
                              textDecoration:"underline", fontFamily:"inherit" }}>
                            Reemplazar la tasa que puse a mano
                          </button>
                        ) : (
                          <button type="button" onClick={() => aplicarSugerencia()}
                            style={{ border:"none", background:ACCENT, color:"#fff",
                              padding:"0.35rem 0.8rem", borderRadius:8, cursor:"pointer",
                              fontSize:"0.78rem", fontWeight:700, fontFamily:"inherit" }}>
                            Aplicar sugerencia
                          </button>
                        )}
                        <button type="button" onClick={() => setSugerencia(null)}
                          style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                            color:"var(--gray-400)", fontSize:"0.78rem",
                            textDecoration:"underline", fontFamily:"inherit" }}>
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* A donde va este precio, y el "+" para cotizar distinto.

                  Los bullets van debajo del renglon y no adentro porque son de
                  la linea entera -moneda, precio e impuesto juntos-, no de
                  ninguno de los tres campos.

                  El "+" agrega una linea identica a esta. Identica y no vacia:
                  quien cotiza distinto para Instagram casi siempre parte del
                  mismo numero y le cambia algo, y arrancar de cero obliga a
                  escribir de nuevo lo que ya estaba. */}
              <div style={filaDestinos}>
                <PastillasDestino
                  motores={motores}
                  elegidos={destinosBase}
                  ocupados={lineasPrecio.flatMap(l => l.destinos)}
                  onToggle={id => setDestinosBase(d =>
                    d.includes(id) ? d.filter(x => x !== id) : [...d, id])}/>
                <button type="button"
                  title="Agregar otro precio, para otros destinos"
                  onClick={() => setLineasPrecio(ls => [...ls, {
                    id: (ls[ls.length-1]?.id ?? 0) + 1,
                    precio, moneda, tasaId, destinos: [],
                    etiqueta:"", desde:"", hasta:"", horaDesde:"", horaHasta:"", dias:[],
                  }])}
                  style={{ width:"100%", height:20, padding:0, borderRadius:999,
                    border:"1.5px dashed var(--gray-400)", background:"#fff",
                    color:"var(--gray-400)", cursor:"pointer", fontSize:"12px",
                    fontWeight:800, fontFamily:"inherit" }}>+</button>
              </div>

              {/* Las lineas extra. Cada una es la misma fila: moneda, precio,
                  impuesto y a donde va. */}
              {lineasPrecio.map((l, i) => {
                const set = (campo: string, valor: unknown) =>
                  setLineasPrecio(ls => ls.map((x, j) => j === i ? { ...x, [campo]: valor } : x));
                const ocupados = [
                  ...destinosBase,
                  ...lineasPrecio.filter((_, j) => j !== i).flatMap(x => x.destinos),
                ];
                return (
                  <div key={l.id} style={{ display:"flex", flexDirection:"column", gap:RITMO }}>
                    <div style={{ display:"grid", gridTemplateColumns:"64px 1fr 72px", gap:"0.4rem" }}>
                      <select style={{ ...inp, padding:"0.5rem 0.3rem" }} value={l.moneda}
                        onChange={e => set("moneda", e.target.value)}>
                        {monedas.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
                      </select>
                      <input style={{ ...inp, ...NUMERICO }} type="number" min="0"
                        value={l.precio} placeholder="Precio"
                        onChange={e => set("precio", e.target.value)}/>
                      <select style={{ ...inp, padding:"0.5rem 0.15rem", ...NUMERICO_SELECT }}
                        value={l.tasaId ?? ""}
                        onChange={e => set("tasaId", e.target.value || null)}>
                        <option value="">{tasaHeredada ? `${tasaHeredada.rate}%` : "IVA"}</option>
                        {tasas.map(t => <option key={t.id} value={t.id}>{t.rate}%</option>)}
                      </select>
                    </div>
                    <div style={filaDestinos}>
                      <PastillasDestino
                        motores={motores}
                        elegidos={l.destinos}
                        ocupados={ocupados}
                        onToggle={id => set("destinos",
                          l.destinos.includes(id)
                            ? l.destinos.filter(x => x !== id)
                            : [...l.destinos, id])}/>
                      {/* Ocupa el lugar del "+" de la linea de arriba, para
                          que las dos filas terminen en la misma columna. */}
                      <button type="button" title="Quitar este precio"
                        onClick={() => setLineasPrecio(ls => ls.filter((_, j) => j !== i))}
                        style={{ width:"100%", height:20, padding:0, borderRadius:999,
                          border:"1.5px dashed var(--border)", background:"#fff",
                          color:"var(--gray-400)", cursor:"pointer", fontSize:"12px",
                          fontWeight:800, fontFamily:"inherit" }}>×</button>
                    </div>

                    {/* Cuando rige.
                        Plegado por defecto: la mayoria de las lineas son "este
                        precio, en estos destinos, siempre", y abrir seis campos
                        para no completar ninguno es ruido. El resumen dice si
                        hay algo puesto, para que plegado no signifique oculto. */}
                    <button type="button"
                      onClick={() => setVigenciaAbierta(v => v === l.id ? null : l.id)}
                      style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                        textAlign:"left", color:"var(--gray-400)", fontSize:"0.72rem",
                        fontFamily:"inherit", textDecoration:"underline" }}>
                      {resumenVigencia(l)}
                    </button>

                    {vigenciaAbierta === l.id && (
                      <div style={{ display:"flex", flexDirection:"column", gap:RITMO_JUNTO,
                        padding:"0.6rem", background:"var(--gray-50)", borderRadius:8,
                        border:"1px solid var(--border)" }}>
                        <input style={{ ...inp, padding:"0.35rem 0.5rem", fontSize:"0.78rem" }}
                          value={l.etiqueta} placeholder="Nombre: Black Friday, Mayorista…"
                          onChange={e => set("etiqueta", e.target.value)} />

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem" }}>
                          <input type="date" style={{ ...inp, padding:"0.35rem 0.5rem", fontSize:"0.78rem" }}
                            value={l.desde} title="Desde"
                            onChange={e => set("desde", e.target.value)} />
                          <input type="date" style={{ ...inp, padding:"0.35rem 0.5rem", fontSize:"0.78rem" }}
                            value={l.hasta} title="Hasta"
                            onChange={e => set("hasta", e.target.value)} />
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem" }}>
                          <input type="time" style={{ ...inp, padding:"0.35rem 0.5rem", fontSize:"0.78rem" }}
                            value={l.horaDesde} title="Desde qué hora"
                            onChange={e => set("horaDesde", e.target.value)} />
                          <input type="time" style={{ ...inp, padding:"0.35rem 0.5rem", fontSize:"0.78rem" }}
                            value={l.horaHasta} title="Hasta qué hora"
                            onChange={e => set("horaHasta", e.target.value)} />
                        </div>

                        {/* Ningún día marcado significa todos: marcar los siete
                            y no marcar ninguno querrían decir lo mismo, así que
                            vacío es el estado natural. */}
                        <div style={{ display:"flex", gap:4 }}>
                          {DIAS_SEMANA.map(d => {
                            const on = l.dias.includes(d.n);
                            return (
                              <button key={d.n} type="button"
                                onClick={() => set("dias",
                                  on ? l.dias.filter(x => x !== d.n) : [...l.dias, d.n])}
                                style={{ flex:1, height:22, padding:0, borderRadius:6,
                                  border:`1.5px solid ${on ? ACCENT : "var(--border)"}`,
                                  background: on ? `${ACCENT}18` : "#fff",
                                  color: on ? ACCENT : "var(--gray-400)",
                                  fontSize:"10px", fontWeight:800, fontFamily:"inherit",
                                  cursor:"pointer" }}>{d.l}</button>
                            );
                          })}
                        </div>

                        <div style={{ fontSize:"0.7rem", color:"var(--gray-400)" }}>
                          Vacío es siempre. Los horarios son hora de Montevideo.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* El campo "Precio original, sin descuento" se saco de aca.
                  El descuento no es parte de dar de alta un articulo: es una
                  decision comercial posterior, y ocupaba un renglon entero en
                  la columna del precio para algo que casi nunca se completa.

                  Lo que sigue funcionando es MOSTRARLO: un articulo que ya
                  tiene precio original guardado sigue viendose tachado en la
                  tarjeta y con su cartel de descuento. Sacar el campo no borra
                  el dato. */}
              {descuento && (
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", padding:"0.65rem 0.8rem",
                  background:"#f0fdf4", border:"1px solid color-mix(in srgb, var(--color-success) 70%, white)", borderRadius:8 }}>
                  <span style={{ fontSize:"1.1rem" }}>🏷</span>
                  <span style={{ fontWeight:700, color:"#166534", fontSize:"0.8rem" }}>
                    Descuento del {descuento}%
                  </span>
                </div>
              )}
              {/* El recuadro de "Vista previa" del precio se elimino: la
                  tarjeta esta al lado y muestra ese mismo precio -tachado,
                  con descuento y todo- tal como lo va a ver quien compra.
                  Repetirlo era pedir que se comparen dos numeros que siempre
                  dicen lo mismo, y ocupaba el lugar de algo util. */}
            </div>
          </div>

          {/* Tarjeta del artículo.
              Es MarketCard, importada del front: la misma que ve quien compra,
              con sus mismas funcionalidades -dar vuelta, galería, cantidad,
              agregar al carrito-. No una copia parecida: una copia se
              desactualiza y entonces la vista previa deja de mostrar lo que
              realmente va a ver el comprador, que es lo unico que justifica
              tenerla.
              Por eso tampoco se la deforma. Su ancho sale del alto de la fila
              (ver GEOMETRIA arriba) y se alinea arriba: estirarla para llenar
              la columna seria mostrar una tarjeta que no existe. */}
          <div className="col-tarjeta" style={{ minWidth:0 }}>
            {/* Única regla de CSS que MarketCard necesita del front (le da a
                la tarjeta su alto vía aspect-ratio); se define acá en vez de
                importar toda la hoja de estilos del front para no arrastrar
                sus reglas globales (html, body) al panel de admin. */}
            <style>{`.core-card-slot{aspect-ratio:2/3.7;position:relative;width:100%;box-sizing:border-box}
              @keyframes girar{to{transform:rotate(360deg)}}
              @media (prefers-reduced-motion:reduce){
                [style*="girar"]{animation:none!important}
              }`}</style>
            <MarketCard
              p={previewProduct}
              context={tipo === "secondhand" ? "second" : "market"}
              onAdd={() => setToast({ text:"Vista previa: así se agrega al carrito en la tienda", ok:true })}
            />
          </div>

        </div>
      ) : null}

      {/* MONITOR: la misma grilla, sin delimitar, para avisos.
          Se alinea con las columnas de arriba a proposito. Un aviso debajo de
          la columna de precio se entiende referido al precio; el mismo aviso
          suelto obligaria a decir "en el precio…" en cada mensaje. */}
      <div style={{
        background:"#fff",
        padding:`${AIRE_MONITOR}px 1.5rem`,
        borderBottom:"1px solid #EAECF0",
      }}>
        <div className="ficha-fila" style={{ height:ALTO_MONITOR, alignItems:"start" }}>
          <div style={celdaAviso}>{avisos.descripcion}</div>
          <div style={celdaAviso}>{avisos.medios}</div>
          <div style={celdaAviso}>{avisos.precio}</div>
          <div style={celdaAviso}>{avisos.tarjeta}</div>
        </div>
      </div>

      {/* Lo que los canales saben del producto, debajo de la franja de avisos.
          Va aca y no arriba porque es informacion traida, no cargada: se
          consulta cuando hace falta y no compite con los campos que hay que
          completar. Solo con el articulo ya creado: sin variante no hay a quien
          preguntarle. */}
      {articulo?.id && (
        <div style={{ background:"#fff", padding:`${AIRE_LINEA}px 1.5rem`,
          borderBottom:"1px solid #EAECF0" }}>
          <DatosDelProducto
            variantId={articulo.id}
            precioActual={parseFloat(precio) || 0}
            guardada={articulo.ficha ?? null}
            fuente={articulo.fichaFuente ?? null}
            traidaEl={articulo.fichaAt ?? null} />
        </div>
      )}

      {/* Detalles del producto: garantía, envío, peso, medidas, material y
          origen. Van debajo de la franja, con los datos traídos de los canales,
          porque son la ficha del producto y no lo que define la venta —el
          título, la foto, el precio— que está arriba.

          Garantía y tipo de envío son datos que pide Mercado Libre. Hasta ahora
          la única forma de completarlos era a mano en la base. */}
      <div style={{ background:"#fff", padding:`${AIRE_LINEA}px 1.5rem`,
        borderBottom:"1px solid #EAECF0" }}>
        <div style={{ maxWidth: ANCHO_TARJETA_ELEGIDO * 3, display:"flex",
          flexDirection:"column", gap:RITMO }}>
          <BloqueDetalles form={detalles} setForm={setDetalles} lbl={lbl} inp={inp} />
        </div>
      </div>

      {/* ABAJO: la informacion ampliada. Toda en la misma pagina.
          Saltar de pantalla en pantalla obliga a recordar lo que quedo atras
          para decidir lo que viene, y a volver para comprobarlo. */}
      <div style={card}>

        {/* Detalles y disponibilidad */}
        {true && (
          <div style={{ display:"flex", flexDirection:"column", gap:RITMO }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Detalles y disponibilidad</h2>
            <div style={{ maxWidth:160 }}>
              <label style={lbl}>Stock</label>
              <input style={{ ...inp, ...NUMERICO }} type="number" value={stock}
                onChange={e => setStock(e.target.value)} min="0" />
            </div>
            <div>
              <label style={lbl}>Disponibilidad</label>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {DISPONIBILIDADES.map(d => (
                  <button key={d.id} onClick={() => setDisponibilidad(d.id)} style={{
                    flex:1, padding:"0.75rem", borderRadius:8, textAlign:"left",
                    border:`1.5px solid ${disponibilidad===d.id ? BLUE : "var(--border)"}`,
                    background: disponibilidad===d.id ? "color-mix(in srgb, var(--brand-navy) 6%, transparent)" : "#fff",
                    cursor:"pointer",
                  }}>
                    <div style={{ fontWeight:700, fontSize:"0.8rem",
                      color: disponibilidad===d.id ? BLUE : "#374151" }}>{d.label}</div>
                    <div style={{ fontSize:"0.72rem", color:"var(--gray-400)", marginTop:"2px" }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Publicar como</label>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {([
                  { id:"active", label:"Publicar ahora", icon:"🚀", color:GREEN },
                  { id:"draft",  label:"Guardar borrador", icon:"📋", color:"var(--mute)" },
                ] as const).map(p => (
                  <button key={p.id} onClick={() => setPublicarComo(p.id)} style={{
                    flex:1, padding:"0.75rem", borderRadius:8,
                    border:`1.5px solid ${publicarComo===p.id ? p.color : "var(--border)"}`,
                    background: publicarComo===p.id ? `${p.color}12` : "#fff",
                    cursor:"pointer", display:"flex", alignItems:"center", gap:"0.5rem",
                  }}>
                    <span style={{ fontSize:"16px" }}>{p.icon}</span>
                    <span style={{ fontWeight:700, fontSize:"0.85rem",
                      color: publicarComo===p.id ? p.color : "#374151" }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Destinos. Una ficha no se publica en ningún lado: eso se decide
            cuando se la convierte en artículo. */}
        {modo !== "ficha" && (
          <div style={{ display:"flex", flexDirection:"column", gap:RITMO }}>
            <div>
              <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>
                ¿Dónde lo publicamos?
              </h2>
              <p style={{ margin:"0.35rem 0 0", fontSize:"0.82rem", color:"var(--gray-400)" }}>
                Tu artículo ya se publica en {tipo === "secondhand" ? "Second Hand" : "Market"}.
                Acá elegís en qué otros canales además querés ofrecerlo.
              </p>
            </div>

            {/* El canal base viene del paso 1 y no se elige aca: un articulo es
                nuevo o usado, no las dos cosas. */}
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem",
              padding:"0.7rem 0.8rem", borderRadius:10, background:"#F3F4F6",
              border:"1px solid var(--border)" }}>
              <span style={{ fontSize:"1rem" }}>{tipo === "secondhand" ? "♻️" : "🏬"}</span>
              <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
                <span style={{ fontSize:"0.85rem", fontWeight:700, color:"#111" }}>
                  {tipo === "secondhand" ? "Second Hand" : "Market"}
                </span>
                <span style={{ fontSize:"0.68rem", color:"var(--gray-400)" }}>
                  Definido en el paso Tipo · siempre incluido
                </span>
              </span>
            </div>

            <div style={{ display:"flex", gap:"0.6rem" }}>
              <button type="button"
                onClick={() => setCanales(DESTINOS.filter(d => d.listo).map(d => d.channel))}
                style={{ border:"none", background:"none", cursor:"pointer",
                  fontSize:"0.75rem", fontWeight:700, color:ACCENT, padding:0 }}>
                Seleccionar todos
              </button>
              <button type="button" onClick={() => setCanales([])}
                style={{ border:"none", background:"none", cursor:"pointer",
                  fontSize:"0.75rem", fontWeight:700, color:"var(--gray-400)", padding:0 }}>
                Deseleccionar todos
              </button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:`${RITMO}px 0.6rem` }}>
              {DESTINOS.map(d => {
                const on = canales.includes(d.channel);
                return (
                  <button key={d.channel} type="button" disabled={!d.listo}
                    onClick={() => setCanales(c =>
                      c.includes(d.channel) ? c.filter(x => x !== d.channel) : [...c, d.channel])}
                    style={{
                      display:"flex", alignItems:"center", gap:"0.6rem", textAlign:"left",
                      padding:"0.7rem 0.8rem", borderRadius:10,
                      border:`1.5px solid ${on ? d.color : "var(--border)"}`,
                      background: on ? `${d.color}12` : "#fff",
                      cursor: d.listo ? "pointer" : "not-allowed",
                      opacity: d.listo ? 1 : 0.55,
                    }}>
                    <span style={{ width:16, height:16, borderRadius:4, flexShrink:0,
                      border:`1.5px solid ${on ? d.color : "#CBD5E1"}`,
                      background: on ? d.color : "#fff", color:"#fff",
                      fontSize:"11px", lineHeight:"14px", textAlign:"center", fontWeight:900 }}>
                      {on ? "✓" : ""}
                    </span>
                    <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <span style={{ fontSize:"0.85rem", fontWeight:700, color:"#111" }}>{d.label}</span>
                      {!d.listo && (
                        <span style={{ fontSize:"0.68rem", color:"var(--gray-400)" }}>No conectado</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {canales.length === 0 && (
              <div style={{ fontSize:"0.75rem", color:"var(--gray-400)" }}>
                Sin canales adicionales, el artículo se publica solo en
                {tipo === "secondhand" ? " Second Hand" : " Market"}. Podés agregarlos
                después desde la lista de publicaciones.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ¿Más de esta marca?
          Aparece al guardar, con el catálogo ya consultado. No es la carga
          masiva —esa será su propio módulo, con archivos y mapeo— es el caso
          común resuelto con lo que ya está en pantalla. */}
      {/* ¿Más de esta marca?
          Dos pasos: primero las familias del catálogo, después sus productos.
          Un catálogo entero son cuarenta filas, y tildar de a una es justo el
          trabajo que este cuadro venía a evitar. */}
      {masivoAbierto && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:400 }}
          data-enter-nativo>
          <div style={{ background:"#fff", borderRadius:14, width:"min(600px,94vw)",
            maxHeight:"84vh", display:"flex", flexDirection:"column",
            boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

            {/* Dice de dónde salió el catálogo: quien decide tiene que saber a
                quién le estamos creyendo. */}
            <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)" }}>
              <div style={{ fontWeight:800, color:"#111", fontSize:"1rem" }}>
                {masivoPaso === "familias"
                  ? `¿Qué querés cargar de ${marca.trim()}?`
                  : `Productos de ${marca.trim()}`}
              </div>
              <div style={{ fontSize:"0.76rem", color:"var(--gray-400)", marginTop:3 }}>
                {masivoPaso === "familias"
                  ? "Elegí las familias; después podés desmarcar productos sueltos."
                  : "Se crean como borradores, con su nombre y su foto. Les vas a tener que poner el precio."}
                {masivoItems[0]?.fuente ? (
                  <> {" · "}Catálogo de <b style={{ color:"var(--mute)" }}>{masivoItems[0].fuente}</b></>
                ) : null}
              </div>
            </div>

            {/* PASO 1 — familias, con cuántos productos tiene cada una.
                Sin el número se elige a ciegas. */}
            {masivoPaso === "familias" ? (
              <>
                <div style={{ padding:"0.5rem 1.25rem", display:"flex", gap:"0.9rem",
                  borderBottom:"1px solid var(--gray-50)" }}>
                  <button type="button"
                    onClick={() => setMasivoFamilias(new Set(familiasDelCatalogo.map(f => f[0])))}
                    style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                      color:ACCENT, fontSize:"0.74rem", fontWeight:700, fontFamily:"inherit" }}>
                    Todas
                  </button>
                  <button type="button" onClick={() => setMasivoFamilias(new Set())}
                    style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                      color:"var(--gray-400)", fontSize:"0.74rem", fontWeight:700,
                      fontFamily:"inherit" }}>
                    Ninguna
                  </button>
                </div>
                <div style={{ overflowY:"auto", padding:"0.6rem 1.25rem",
                  display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                  gap:"0.5rem" }}>
                  {familiasDelCatalogo.map(f => {
                    const fam = f[0], n = f[1];
                    const on = masivoFamilias.has(fam);
                    return (
                      <button key={fam} type="button"
                        onClick={() => setMasivoFamilias(prev => {
                          const s = new Set(prev);
                          if (s.has(fam)) s.delete(fam); else s.add(fam);
                          return s;
                        })}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                          gap:8, padding:"0.6rem 0.75rem", borderRadius:10, textAlign:"left",
                          border:`1.5px solid ${on ? ACCENT : "var(--border)"}`,
                          background: on ? `${ACCENT}0F` : "#fff",
                          cursor:"pointer", fontFamily:"inherit" }}>
                        <span style={{ fontSize:"0.85rem", fontWeight:700,
                          color: on ? "#111" : "var(--mute)", minWidth:0, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fam}</span>
                        <span style={{ fontSize:"0.72rem", fontWeight:800,
                          color: on ? ACCENT : "var(--gray-400)", flexShrink:0 }}>{n}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ padding:"0.5rem 1.25rem", display:"flex", gap:"0.9rem",
                  alignItems:"center", borderBottom:"1px solid var(--gray-50)" }}>
                  <button type="button"
                    onClick={() => setMasivoElegidos(new Set(productosVisibles.map(r => r.nombre)))}
                    style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                      color:ACCENT, fontSize:"0.74rem", fontWeight:700, fontFamily:"inherit" }}>
                    Todos
                  </button>
                  <button type="button" onClick={() => setMasivoElegidos(new Set())}
                    style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                      color:"var(--gray-400)", fontSize:"0.74rem", fontWeight:700,
                      fontFamily:"inherit" }}>
                    Ninguno
                  </button>
                  <span style={{ marginLeft:"auto", fontSize:"0.74rem", color:"var(--gray-400)" }}>
                    {productosVisibles.length} producto{productosVisibles.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Agrupados por familia: elegiste dos, verlas separadas es lo
                    que hace la lista legible. */}
                <div style={{ overflowY:"auto", padding:"0.35rem 0" }}>
                  {agruparPorFamilia(productosVisibles).map(g => (
                    <div key={g[0]}>
                      {hayVariasFamilias ? (
                        <div style={{ padding:"0.5rem 1.25rem 0.25rem", fontSize:"0.7rem",
                          fontWeight:800, letterSpacing:".06em", textTransform:"uppercase",
                          color:"var(--gray-400)" }}>{g[0]}</div>
                      ) : null}
                      {g[1].map((r, i) => {
                        const on = masivoElegidos.has(r.nombre);
                        return (
                          <label key={g[0] + i} style={{ display:"flex", alignItems:"center", gap:10,
                            padding:"7px 1.25rem", cursor:"pointer",
                            background: on ? `${ACCENT}08` : "transparent" }}>
                            <input type="checkbox" checked={on} style={{ accentColor:ACCENT }}
                              onChange={() => setMasivoElegidos(prev => {
                                const n = new Set(prev);
                                if (n.has(r.nombre)) n.delete(r.nombre); else n.add(r.nombre);
                                return n;
                              })} />
                            <span style={{ minWidth:0, flex:1, fontSize:"0.82rem", color:"#111",
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {r.nombre}
                            </span>
                            {/* El precio del oficial, si el catálogo lo publica.
                                Es contexto para decidir, no el precio propio. */}
                            {r.precio ? (
                              <span style={{ fontSize:"0.76rem", color:"var(--mute)",
                                fontWeight:700, flexShrink:0, ...NUMERICO }}>
                                {r.moneda ?? ""} {r.precio.toLocaleString("es-UY",
                                  { maximumFractionDigits: 0 })}
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ padding:"0.85rem 1.25rem", borderTop:"1px solid var(--border)",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={volverDelCuadro}
                style={{ border:"none", background:"none", padding:0, cursor:"pointer",
                  color:"var(--mute)", fontSize:"0.82rem", textDecoration:"underline",
                  fontFamily:"inherit" }}>
                ← Volver
              </button>

              {masivoPaso === "familias" ? (
                <button onClick={() => setMasivoPaso("productos")}
                  disabled={masivoFamilias.size === 0}
                  style={{ padding:"0.55rem 1.2rem", borderRadius:9, border:"none",
                    background: masivoFamilias.size ? ACCENT : "var(--border)",
                    color: masivoFamilias.size ? "#fff" : "var(--gray-400)",
                    fontWeight:800, fontSize:"0.82rem", fontFamily:"inherit",
                    cursor: masivoFamilias.size ? "pointer" : "not-allowed" }}>
                  Ver productos
                </button>
              ) : (
                <button onClick={crearElegidosDeMarca} disabled={masivoCargando}
                  style={{ padding:"0.55rem 1.2rem", borderRadius:9, border:"none",
                    background: masivoElegidos.size ? ACCENT : "var(--border)",
                    color: masivoElegidos.size ? "#fff" : "var(--gray-400)",
                    fontWeight:800, fontSize:"0.82rem", fontFamily:"inherit",
                    cursor: masivoCargando ? "wait" : "pointer" }}>
                  {masivoCargando ? "Creando…"
                    : masivoElegidos.size
                      ? `Crear selección (${masivoElegidos.size})`
                      : "Crear selección"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Una sola accion: no hay pasos que recorrer. */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <button
            onClick={() => salir(false)}
            style={{ padding:"0.65rem 1.25rem", background:"transparent",
              border:"1.5px solid var(--border)", borderRadius:10,
              color:"var(--mute)", cursor:"pointer", fontSize:"0.875rem" }}>
            Descartar y volver
          </button>

          {/* Deshacer: sólo aparece si hay un estado anterior guardado.
              Ofrecerlo siempre y fallar cuando no hay respaldo sería ofrecer
              algo que no se puede hacer. */}
          {deshacerDesde && (
            confirmandoDeshacer ? (
              <span style={{ display:"flex", gap:"0.6rem", alignItems:"center",
                padding:"0.5rem 0.85rem", borderRadius:10,
                background:"#FFFBEB", border:"1.5px solid #FCD34D" }}>
                <span style={{ fontSize:"0.8rem", color:"#92400E" }}>
                  Se pierde lo que hay ahora y no se puede volver atrás.
                </span>
                <button onClick={deshacer} disabled={loading} style={{
                  border:"none", background:"#92400E", color:"#fff", cursor:"pointer",
                  padding:"0.35rem 0.8rem", borderRadius:8, fontSize:"0.78rem", fontWeight:700 }}>
                  Deshacer
                </button>
                <button onClick={() => setConfirmandoDeshacer(false)} style={{
                  border:"none", background:"none", cursor:"pointer",
                  color:"#92400E", fontSize:"0.78rem", textDecoration:"underline" }}>
                  No
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmandoDeshacer(true)} title={
                `Vuelve al estado del ${new Date(deshacerDesde).toLocaleString("es-UY")}`
              } style={{
                border:"none", background:"none", padding:0, cursor:"pointer",
                color:"var(--mute)", fontSize:"0.82rem", textDecoration:"underline" }}>
                Deshacer el cambio de las{" "}
                {new Date(deshacerDesde).toLocaleTimeString("es-UY",
                  { hour:"2-digit", minute:"2-digit" })}
              </button>
            )
          )}
        </div>

        {/* Sin `onAcciones`, el formulario dibuja su propio pie: es el caso de
            quien lo monta sin barra. Con `onAcciones`, el boton esta arriba y
            repetirlo aca serian dos botones que hacen lo mismo. */}
        <div style={{ display: onAcciones ? "none" : "flex",
          gap:"0.75rem", alignItems:"center" }}>
          {/* Lo que falta se dice antes de apretar, no despues. */}
          {!puedeGuardar() && (
            <span style={{ fontSize:"0.8rem", color:"var(--gray-400)" }}>
              {faltaParaGuardar()}
            </span>
          )}
          <button onClick={handlePublicar} disabled={loading || !puedeGuardar()} style={{
            padding:"0.65rem 1.75rem",
            background: (loading || !puedeGuardar()) ? "var(--border)"
                      : publicarComo === "draft" ? BLUE : GREEN,
            color: (loading || !puedeGuardar()) ? "var(--gray-400)" : "#fff",
            border:"none", borderRadius:10, fontWeight:800,
            fontSize:"0.95rem",
            cursor: (loading || !puedeGuardar()) ? "not-allowed" : "pointer" }}>
            {loading ? "Guardando..."
              : articulo ? "Guardar cambios"
              : publicarComo === "draft" ? "Guardar borrador" : "Publicar artículo"}
          </button>
        </div>
      </div>
    </div>
  );
}



