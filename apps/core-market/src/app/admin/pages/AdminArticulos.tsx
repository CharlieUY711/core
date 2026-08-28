import { useState, useEffect, useRef } from "react";
import { buscarProductos, fichaPorTitulo,
         type FichaCanal, type ProductoEncontrado } from "../utils/canalesSync";
import { predecirTaxonomia } from "../utils/predecirTaxonomia";
import { buscarMarcas, logoDeDominio, type MarcaSugerida } from "../utils/marcasSync";
import { buscarImagenes, buscarVideos, type ResultadoBusqueda } from "../utils/busqueda";
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
const MONEDAS     = ["UYU","USD","EUR"];
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
 * TODO SALE DEL LADO DEL TILE. Una sola constante en pixeles, y de ahi el alto
 * de la fila, el ancho de medios y el de la tarjeta.
 *
 * Antes el alto era 56vh -relativo a la ventana- mientras el bloque de la
 * tarjeta seguia siendo 285px. Al mezclar unidades su relacion cambiaba con
 * cada pantalla, y por eso se veia distinto en el monitor que en la notebook:
 * no era un ajuste fino que faltaba, era que no podian coincidir en las dos.
 *
 * Con todo en pixeles la fila mide lo mismo en cualquier pantalla. Si la
 * ventana es baja, la pagina scrollea: preferible a que la fila se deforme
 * distinto en cada maquina. El escalado del sistema operativo agranda o achica
 * todo por igual, que es lo que se espera.
 */
const GEOMETRIA = {
  /** La unica medida elegida. Todo lo demas se deriva. */
  ladoTile: 80,
  /** Espacio entre tiles: un cuarto del original. */
  gapTiles: 4,
  /** Tres columnas de medios. */
  columnasMedios: 3,
  /** Seis filas: cuatro de imagenes, dos de videos. */
  filasMedios: 6,
  /**
   * Alto del bloque de la tarjeta que NO escala con el ancho.
   *
   * MarketCard tiene imagen cuadrada -crece con el ancho- mas titulo, precio,
   * rating y boton de compra, que ocupan lo mismo sea cual sea el ancho. Su
   * alto es ancho + este bloque; invertido, el ancho que le corresponde a un
   * alto dado es alto - bloque.
   */
  bloqueFijoTarjeta: 285,
} as const;

/** Seis filas de tiles mas sus espacios. Es el alto de las cuatro columnas. */
const ALTO_FILA = GEOMETRIA.ladoTile * GEOMETRIA.filasMedios
                + GEOMETRIA.gapTiles * (GEOMETRIA.filasMedios - 1);

/** Tres tiles mas sus espacios. */
const ANCHO_MEDIOS = GEOMETRIA.ladoTile * GEOMETRIA.columnasMedios
                   + GEOMETRIA.gapTiles * (GEOMETRIA.columnasMedios - 1);

/** El ancho con el que la tarjeta llega justo al alto de la fila. */
const ANCHO_TARJETA = ALTO_FILA - GEOMETRIA.bloqueFijoTarjeta;

/** El precio son dos campos cortos: mas ancho seria espacio muerto. */
const ANCHO_PRECIO = 230;

/**
 * Piso de la descripcion.
 *
 * Es la columna que mas aire necesita y tiene que ser la mas ancha. Con las
 * otras tres fijas se queda con el resto; el piso la protege en pantallas
 * angostas, y si no entra, la fila scrollea en vez de apretarla.
 */
const ANCHO_MIN_DESCRIPCION = 380;

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
  soloLectura = false, estiloInput,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  marcado: boolean;
  onMarcar: (m: boolean) => void;
  etiqueta: string;
  soloLectura?: boolean;
  estiloInput: React.CSSProperties;
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
        style={{ ...estiloInput, width:"100%", paddingRight: etiqueta.length * 6.4 + 34 }}
        value={valor} readOnly={soloLectura}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} />
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
  { onFinish, onCancel, tipoInicial }:
  { onFinish?: () => void; onCancel?: () => void; tipoInicial?: "market"|"secondhand" } = {}
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
  useEffect(() => {
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
  }, [marca, marcaConfirmada]);

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
  }, [nombre, idElegido, articuloPersonalizado, marca, marcaConfirmada, marcaModo]);

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
  }, [marca, marcaConfirmada, marcaModo, nombre]);

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
    if (!descripcion.trim() && f.descripcionSugerida) setDescripcion(f.descripcionSugerida);
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
  const descuento = precio && precioOrig && parseFloat(precioOrig) > parseFloat(precio)
    ? Math.round((1 - parseFloat(precio) / parseFloat(precioOrig)) * 100)
    : null;

  // PASO 3: Detalles
  const [deptoId,       setDeptoId]       = useState("");
  const [catId,         setCatId]         = useState("");
  const [subcatId,      setSubcatId]      = useState("");
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
    width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)",
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
  const card: React.CSSProperties = {
    background:"#fff", borderRadius:14, padding:"1.5rem",
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
    <div style={{ margin:0, display:"flex", flexDirection:"column", gap:"1.25rem" }}>

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
        <div style={{
          ...card, display:"grid", gap:"1rem", alignItems:"stretch",
          /*
           * El alto lo define la columna de medios: es la unica que tiene una
           * forma fija -dos columnas de tiles- y por lo tanto un alto natural.
           * Las demas se ajustan a ese alto en vez de estirarlo.
           *
           * La tarjeta mantiene su proporcion, asi que con el alto dado su
           * ancho queda determinado: ALTO_COLUMNAS * PROPORCION_TARJETA. Los
           * medios ocupan lo que necesitan sus tiles, precio es angosto por
           * naturaleza, y la descripcion se queda con lo que sobra, que es la
           * que mas aire necesita.
           */
          gridTemplateColumns:
            `minmax(${ANCHO_MIN_DESCRIPCION}px, 1fr) ${ANCHO_MEDIOS}px ${ANCHO_PRECIO}px ${ANCHO_TARJETA}px`,
          height: ALTO_FILA,
        }}>
          {/* Descripcion. Si su contenido pasa el alto comun, scrollea ella:
              estirar la fila entera para que entre un campo mas deja a las
              otras tres con aire muerto. */}
          <div style={{ minWidth:0, height:"100%", overflowY:"auto", paddingRight:4 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>

            {/* Marca: el input queda más angosto (flex:1) para dejarle lugar,
                a continuación y siempre presente, a la miniatura del logo.
                La miniatura no es un campo nuevo: es el mismo logoUrl que ya
                se busca automáticamente a partir de lo que se escribe acá
                (buscarMarcas / logoDeDominio), solo que antes se mostraba
                arriba del todo -y solo después de confirmar la marca- y ahora
                vive pegada al campo y se ve siempre, incluso mientras se
                busca o no hay nada cargado todavía. */}
            <div>
              {marcaConfirmada && marcaModo === "sugerida" && (
                <button onClick={cambiarMarca} style={{ border:"none", background:"none",
                  padding:0, cursor:"pointer", color:ACCENT, textDecoration:"underline",
                  fontSize:"0.72rem", marginBottom:4 }}>
                  Cambiar marca
                </button>
              )}

              <div style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
                <CampoConCheck
                  valor={marca}
                  onChange={(v) => setMarca(v)}
                  placeholder="Marca"
                  etiqueta="Personalizada"
                  marcado={marcaModo === "personalizada"}
                  onMarcar={(m) => { if (m) { setMarca(""); elegirMarcaPersonalizada(); } else cambiarMarca(); }}
                  soloLectura={marcaConfirmada && marcaModo !== "personalizada"}
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
                        width:44, height:44, borderRadius:8, flexShrink:0, overflow:"hidden", position:"relative",
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
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem" }}>
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

            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.85rem" }}>
                  {elegido && (
                    <button onClick={() => { setElegido(null); setIdElegido(null); }} style={{ border:"none", background:"none",
                      padding:0, cursor:"pointer", color:ACCENT, textDecoration:"underline",
                      fontSize:"0.72rem" }}>
                      Cambiar artículo
                    </button>
                  )}
                </div>
              </div>
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

              {elegido && (
                <div style={{ marginTop:7, padding:"7px 10px", borderRadius:8,
                  background:"rgba(22,163,74,.07)", border:"1px solid rgba(22,163,74,.35)",
                  fontSize:"0.76rem", color:"#166534" }}>
                  <div style={{ fontWeight:700 }}>{elegido.nombre}</div>
                  <div style={{ color:"#374151", marginTop:2 }}>
                    Se completaron los datos que estaban vacíos.
                    {elegido.mercado &&
                      ` Hoy hay ${elegido.mercado.ofertas} publicaciones del mismo producto,`
                      + ` entre ${elegido.mercado.moneda} ${elegido.mercado.min.toLocaleString("es-UY")}`
                      + ` y ${elegido.mercado.moneda} ${elegido.mercado.max.toLocaleString("es-UY")}.`}
                  </div>
                  <button onClick={() => { setElegido(null); setIdElegido(null); }}
                    style={{ marginTop:5, border:"none", background:"none", padding:0,
                      cursor:"pointer", color:"#166534", textDecoration:"underline",
                      fontSize:"0.73rem" }}>
                    No es este
                  </button>
                </div>
              )}
            </div>

            {/* Condición: entre Artículo y Descripción. Market y Second Hand
                son excluyentes (definidos por `tipo`), cada uno con su
                propia escala. Sin título "Condición *": las opciones van
                directo en una sola fila de chips, todas visibles a la vez. */}
            {tipo === "market" && (
              <div>
                <LineaCondicion
                  opciones={CONDICIONES_ARTICULO}
                  valor={condicionMarketId}
                  onChange={setCondicionMarketId}
                  subValor={subestadoRecond}
                  onSubValor={setSubestadoRecond} />
              </div>
            )}

            {tipo === "secondhand" && (
              <LineaCondicion
                opciones={CONDICIONES_ARTICULO}
                valor={condicion}
                onChange={setCondicion}
                subValor={subestadoRecond}
                onSubValor={setSubestadoRecond} />
            )}

            {/* Categorización: Departamento/Categoría/Subcategoría. Se
                auto-completan por predicción ML apenas se elige un producto
                (ver el useEffect más arriba); el aviso "sugerido por ML" se
                apaga en cuanto la persona toca cualquiera de los tres
                selectores. */}
            <div style={{ display:"grid", gridTemplateColumns: filteredSubs.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap:"0.75rem" }}>
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
              <textarea style={{ ...inp, minHeight:100, resize:"vertical" }}
                value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción: características, uso, accesorios incluidos…" />
              <div style={{ fontSize:"11px", color:"var(--gray-400)", textAlign:"right", marginTop:"3px" }}>
                {descripcion.length} / 2000
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
          <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:"calc(0.35rem / 3)" }}>
            <SelectorMediaArticulo
              imagenes={imagenes}
              videos={videoUrls}
              onChangeImagenes={setImagenes}
              onChangeVideos={setVideoUrls}
              columnas={3}
              maxImagenes={12}
              maxVideos={6}
              imagenAspect="1"
              anchoGrid="100%"
              espacioSecciones="0.25rem"
              gapTiles="0.25rem"
              sinEncabezados
            />
          </div>

          {/* Precio: vive acá, a la derecha de las fotos, sin un paso aparte.
              Misma fracción de grilla que la columna de Información (col 1)
              para que ambas queden siempre del mismo ancho entre sí. */}
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:"0.75rem" }}>
                <div>
                  <select style={inp} value={moneda} onChange={e => setMoneda(e.target.value)}>
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <input style={inp} type="number" value={precio}
                    onChange={e => setPrecio(e.target.value)} placeholder="Precio" min="0" />
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
              {precio && (
                <div style={{ padding:"0.85rem", background:"var(--gray-50)", borderRadius:8, border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:"0.75rem", color:"var(--mute)", marginBottom:"4px" }}>Vista previa</div>
                  {precioOrig && parseFloat(precioOrig) > parseFloat(precio) && (
                    <div style={{ fontSize:"0.85rem", color:"var(--gray-400)", textDecoration:"line-through" }}>
                      {moneda} {parseFloat(precioOrig).toLocaleString("es-UY")}
                    </div>
                  )}
                  <div style={{ fontSize:"1.3rem", fontWeight:900, color:ACCENT }}>
                    {moneda} {parseFloat(precio || "0").toLocaleString("es-UY")}
                  </div>
                  {descuento && (
                    <div style={{ display:"inline-block", background:ACCENT, color:"#fff",
                      fontSize:"0.7rem", fontWeight:700, padding:"2px 8px", borderRadius:20, marginTop:"4px" }}>
                      -{descuento}% OFF
                    </div>
                  )}
                </div>
              )}
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
          <div style={{ minWidth:0 }}>
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

      {/* ABAJO: la informacion ampliada. Toda en la misma pagina.
          Saltar de pantalla en pantalla obliga a recordar lo que quedo atras
          para decidir lo que viene, y a volver para comprobarlo. */}
      <div style={card}>

        {/* Detalles y disponibilidad */}
        {true && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
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
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
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

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"0.6rem" }}>
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
        <button
          onClick={() => salir(false)}
          style={{ padding:"0.65rem 1.25rem", background:"transparent",
            border:"1.5px solid var(--border)", borderRadius:10,
            color:"var(--mute)", cursor:"pointer", fontSize:"0.875rem" }}>
          ← Cancelar
        </button>

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
            {loading ? "Guardando..." : publicarComo === "draft" ? "Guardar borrador" : "Publicar artículo"}
          </button>
        </div>
      </div>
    </div>
  );
}



