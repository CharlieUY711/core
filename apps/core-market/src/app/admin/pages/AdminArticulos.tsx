import { useState, useEffect, useRef } from "react";
import { buscarProductos, fichaPorTitulo,
         type FichaCanal, type ProductoEncontrado } from "../utils/canalesSync";
import { predecirTaxonomia } from "../utils/predecirTaxonomia";
import { buscarMarcas, logoDeDominio, type MarcaSugerida } from "../utils/marcasSync";
import { buscarImagenes, buscarVideos, type ResultadoBusqueda } from "../utils/busqueda";
import { DatosDelProducto } from "../components/ficha/DatosDelProducto";
import { BloqueDetalles } from "../components/ficha/BloquesFicha";
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
 *  - como ruta propia (/admin/publicaciones/nueva), enlazable
 *  - embebido dentro de Publicaciones, pasando onFinish/onCancel para no
 *    sacar al usuario de la pantalla donde esta trabajando
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
  bloqueado = false,
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
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const alternar = () => {
    onMarcar(!marcado);
    // El foco va al campo en los dos sentidos: tildar es "lo escribo yo" y
    // destildar es "busca de nuevo", y las dos cosas siguen con el teclado.
    requestAnimationFrame(() => ref.current?.focus());
  };
  return (
    <div style={{ position:"relative", flex:1, minWidth:0 }}>
      <input ref={ref}
        style={{ ...estiloInput, width:"100%", paddingRight: etiqueta.length * 6.4 + 34,
          ...(bloqueado ? { background:"#F8F9FB", cursor:"text" } : null) }}
        value={valor} readOnly={soloLectura || bloqueado}
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
  { onFinish, onCancel, tipoInicial, onResumen, articulo }:
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
    onResumen?: (r: {
      nombre: string; precio: number; moneda: string; stock: number;
      imagen: string | null; estado: string; canales: string[]; tipo: string;
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
  const elegirLogoBuscado = (r: ResultadoBusqueda) => {
    if (!r.imagen) return;
    setLogoUrl(r.imagen);
    setLogoError(false);
    setLogoPersonalizado(null);
    setLogoModalOpen(false);
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
    setLogoUrl(m.imagen ?? logoDeDominio(m.dominio));
    setLogoError(false);
    setLogoPersonalizado(null);
  };
  const elegirMarcaPersonalizada = () => {
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
    if (!articulo || sembrado.current === articulo.id) return;
    sembrado.current = articulo.id;

    setNombre(articulo.nombre ?? "");
    setDescripcion(articulo.descripcion ?? "");
    setPrecio(articulo.precio != null ? String(articulo.precio) : "");
    setPrecioOrig(articulo.precio_original != null ? String(articulo.precio_original) : "");
    setMoneda(articulo.moneda ?? "UYU");
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
    if (!abierto("nombre")) { setCandidatos([]); return; }
    if (idElegido) return;              // ya eligio: no se le cambia debajo
    if (articuloPersonalizado) return;  // se tipea a mano, no se buscan coincidencias
    const q = nombre.trim();
    if (q.length < 4) { setCandidatos([]); return; }
    // Con la marca ya confirmada, la búsqueda va acotada a ella: sin esto
    // "Golf" o "Serie 3" traen cualquier cosa que se llame igual, de
    // cualquier marca.
    const conMarca = marcaConfirmada && marca.trim()
      ? `${marca.trim()} ${q}`
      : q;
    let vivo = true;
    setBuscandoProd(true);
    const t = setTimeout(async () => {
      const r = await buscarProductos(conMarca);
      if (!vivo) return;
      setCandidatos(r);
      setBuscandoProd(false);
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [nombre, idElegido, articuloPersonalizado, marca, marcaConfirmada, marcaModo, abiertos]);

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
  const adoptarProducto = async (id: string, canal: string) => {
    setBuscandoProd(true);
    // Se le pide la ficha al canal que lo conoce, no siempre al mismo.
    const f = await fichaPorTitulo("", canal, id);
    setBuscandoProd(false);
    if (!f) return;
    setElegido(f);
    setIdElegido(id);
    setCandidatos([]);
    if (f.nombre) setNombre(f.nombre);
    // La sugerida del catalogo puede pasarse: se recorta al mismo tope que
    // acepta el campo, para no dejar un texto que despues no se puede guardar.
    if (!descripcion.trim() && f.descripcionSugerida)
      setDescripcion(f.descripcionSugerida.slice(0, MAX_DESCRIPCION));
    if (!imagenes.length && f.imagenes.length) setImagenes(f.imagenes.slice(0, 8));
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
  const [detalles, setDetalles] = useState<Record<string, string>>({});

  const [deshacerDesde, setDeshacerDesde] = useState<string | null>(null);
  const [confirmandoDeshacer, setConfirmandoDeshacer] = useState(false);

  const [tasas, setTasas] = useState<{ id: string; code: string; name: string; rate: number }[]>([]);
  const [tasaId, setTasaId] = useState<string | null>(null);
  const [tasaHeredada, setTasaHeredada] = useState<{ name: string; rate: number; origen: string } | null>(null);

  const [cotizaciones, setCotizaciones] = useState<Record<string, { tasa: number; fecha: string }>>({});
  const [conversion, setConversion] = useState<
    { de: string; a: string; tasaUsada: number; fecha: string; antes: { precio: string; precioOrig: string } } | null
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
    supabase.rpc("tasa_de_articulo", { p_variant_id: articulo.id }).then(({ data }) => {
      if (vivo && data) setTasaId(data as string);
    });
    supabase.rpc("hay_deshacer", { p_variant_id: articulo.id }).then(({ data }) => {
      if (vivo) setDeshacerDesde((data as string) ?? null);
    });
    return () => { vivo = false; };
  }, [articulo?.id]);

  /**
   * Los detalles van en su propia llamada.
   *
   * Que falle no invalida el alta: el articulo ya existe y esto se puede
   * completar despues. Se avisa por consola y sigue, igual que la ficha.
   */
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

    const hay = parseFloat(precio) > 0 || parseFloat(precioOrig) > 0;
    if (!hay) return;   // sin precio no hay nada que convertir

    const desde = cotizaciones[anterior];
    const hasta = cotizaciones[nueva];
    if (!desde || !hasta) {
      // Se cambia la moneda igual -es lo que el usuario pidio- pero el numero
      // queda como estaba y se dice, en vez de convertir con una tasa que no
      // tenemos o dejarlo pasar como si estuviera bien.
      setSinCotizacion(!desde ? anterior : nueva);
      return;
    }

    // Cuantos decimales tiene la moneda lo dice `currencies.decimals`, que es
    // el dato. Antes esto era una regla escrita a mano -"pesos al entero, el
    // resto dos decimales"- que decia lo mismo pero podia dejar de coincidir.
    const dec = monedas.find(m => m.code === nueva)?.decimals ?? 2;
    const convertir = (v: string) => {
      const n = parseFloat(v);
      if (!Number.isFinite(n) || n <= 0) return v;
      const r = (n * desde.tasa) / hasta.tasa;
      return r.toFixed(dec);
    };

    setConversion({
      de: anterior, a: nueva,
      tasaUsada: desde.tasa / hasta.tasa,
      fecha: (hasta.fecha || desde.fecha),
      antes: { precio, precioOrig },
    });
    setPrecio(convertir(precio));
    setPrecioOrig(convertir(precioOrig));
  };

  const deshacerConversion = () => {
    if (!conversion) return;
    setPrecio(conversion.antes.precio);
    setPrecioOrig(conversion.antes.precioOrig);
    setMoneda(conversion.de);
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
    const path = elegido?.categoriaSugerida?.path;
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
  }, [elegido, deptos, cats, subcats, deptoId]);


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
               : !precio || parseFloat(precio) <= 0 ? "Falta el precio"
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
    });
  }, [nombre, precio, moneda, stock, imagenes, publicarComo, disponibilidad, canales, tipo]);

  const faltaParaGuardar = (): string => {
    if (!nombre.trim())      return "Falta el nombre del artículo";
    if (!descripcion.trim()) return "Falta la descripción";
    if (!precio || parseFloat(precio) <= 0) return "Falta el precio";
    return "";
  };
  const puedeGuardar = () => faltaParaGuardar() === "";

  const handlePublicar = async () => {
    setLoading(true);
    try {
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
        });
        if (eUp) throw eUp;
        // La tasa va aparte: no es parte de dar de alta un articulo sino una
        // decision que se toma pocas veces, y meterla en una RPC que ya recibe
        // ocho parametros no la hacia mas clara.
        await supabase.rpc("fijar_tasa_articulo", {
          p_variant_id: articulo.id, p_tax_rate_id: tasaId,
        });
        await guardarDetalles(articulo.id);
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
        p_images:      imagenes,
        p_videos:      videoUrls,
      });
      if (error) throw error;

      if (nuevaVariante) await guardarDetalles(nuevaVariante as string);

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
                    ) : logoResultados.length > 0 ? (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:`${RITMO}px 0.75rem` }}>
                        {logoResultados.filter(r => r.imagen).map((r, i) => (
                          <button key={i} onClick={() => elegirLogoBuscado(r)} title={r.nombre}
                            style={{ aspectRatio:"1", borderRadius:10, overflow:"hidden", padding:6,
                              border:"1.5px solid var(--border)", background:"#fff", cursor:"pointer" }}>
                            <img src={r.imagen!} alt={r.nombre}
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
                  estiloInput={inp} />
              </div>

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
                    ¿Cuál de estos es? Elegir uno completa el resto solo.
                  </div>
                  {candidatos.map(c => (
                    <button key={c.canal + c.id} onClick={() => adoptarProducto(c.id, c.canal)}
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
              para que ambas queden siempre del mismo ancho entre sí. */}
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:RITMO }}>
              {/* Moneda · precio · impuesto, en un renglon.
                  Moneda y precio se achican para que entre el tercero: los
                  tres son el mismo dato -cuanto sale- y separarlos en
                  renglones distintos los haria parecer decisiones aparte. */}
              <div style={{ display:"grid", gridTemplateColumns:"64px 1fr 96px", gap:`${RITMO}px 0.4rem` }}>
                <div>
                  <select style={{ ...inp, padding:"0.5rem 0.3rem" }} value={moneda}
                    onChange={e => cambiarMoneda(e.target.value)}>
                    {monedas.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
                  </select>
                </div>
                <div className="col-precio">
                  <input style={inp} type="number" value={precio}
                    onChange={e => setPrecio(e.target.value)} placeholder="Precio" min="0" />
                </div>
                {/* El impuesto NO cambia el precio: los precios se publican con
                    impuestos incluidos, asi que elegir la tasa cambia el
                    desglose -que se ve abajo- y nada mas. Multiplicar aca
                    seria cambiar el precio de venta sin que nadie lo pida. */}
                <div>
                  <select style={{ ...inp, padding:"0.5rem 0.3rem" }}
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
              <div>
                <input style={inp} type="number" value={precioOrig}
                  onChange={e => setPrecioOrig(e.target.value)} placeholder="Precio original, sin descuento" min="0" />
              </div>
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
            <style>{`.core-card-slot{aspect-ratio:2/3.7;position:relative;width:100%;box-sizing:border-box}`}</style>
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
              <input style={inp} type="number" value={stock}
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

        {/* Destinos */}
        {true && (
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

        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
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



