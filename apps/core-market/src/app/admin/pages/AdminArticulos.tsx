import { useState, useEffect } from "react";
import { buscarProductos, fichaPorTitulo,
         type FichaCanal, type ProductoEncontrado } from "../utils/canalesSync";
import { predecirTaxonomia } from "../utils/predecirTaxonomia";
import { buscarMarcas, logoDeDominio, type MarcaSugerida } from "../utils/marcasSync";
import { buscarImagenes, buscarVideos, type ResultadoBusqueda } from "../utils/busqueda";
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

const CONDICIONES = ["Nuevo","Excelente","Muy bueno","Bueno","Regular","Para reparar"];

// Condiciones para artículos de Market (no Second Hand). A diferencia de
// CONDICIONES (Second) cada estado trae su propia descripción, garantía,
// empaque y nota — el estándar de a qué se compromete quien publica según
// el estado que declara. "Reacondicionado" no es un estado final: pide
// además uno de los 3 subestados de SUBESTADOS_RECONDICIONADO.
const CONDICIONES_MARKET = [
  { id:"nuevo",           label:"Nuevo",           desc:"Sin uso, 100% original",   garantia:"Fabricante", empaque:"Sellada",              nota:"Estado más estricto" },
  { id:"caja_abierta",    label:"Caja abierta",    desc:"Nuevo sin sello",          garantia:"Fabricante", empaque:"Abierta",               nota:"Accesorios originales" },
  { id:"usado",           label:"Usado",           desc:"Con uso, desgaste",        garantia:"Opcional",   empaque:"Opcional",              nota:"Puede faltar accesorios" },
  { id:"reacondicionado", label:"Reacondicionado", desc:"Reparado/inspeccionado",   garantia:"90 días",    empaque:"Original o genérica",   nota:"Requiere subestado" },
];
const SUBESTADOS_RECONDICIONADO = ["Excelente","Bueno","Aceptable"];
const MONEDAS     = ["UYU","USD","EUR"];
const DISPONIBILIDADES = [
  { id:"inmediata",    label:"Inmediata",     desc:"Disponible para envío hoy" },
  { id:"bajo_pedido",  label:"Bajo pedido",   desc:"Se consigue en 3-5 días" },
  { id:"agotado",      label:"Sin stock",     desc:"Pausar publicación" },
];

const STEPS = [
  { id:2, label:"Información",icon:"📝" },
  { id:3, label:"Detalles",   icon:"⚙️" },
  { id:4, label:"Destinos",   icon:"📡" },
  { id:5, label:"Revisión",   icon:"✅" },
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
  const PRIMER_PASO = 2;
  const [step, setStep]     = useState(PRIMER_PASO);
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

  const canNext = (): boolean => {
    if (step === 2) return nombre.trim().length > 0 && descripcion.trim().length > 0
      && imagenes.length > 0 && precio.length > 0 && parseFloat(precio) > 0;
    if (step === 3) return true; // departamento opcional temporalmente
    if (step === 4) return true; // el tipo (Market/Second) ya viene fijo desde afuera
    return true;
  };

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
  // Casillero de check cuadrado, mismo look en todos los selectores tipo
  // check del formulario (Personalizada/o, condiciones de Market y Second).
  const checkSq = (active: boolean): React.CSSProperties => ({
    width:16, height:16, borderRadius:4, flexShrink:0, display:"inline-flex",
    alignItems:"center", justifyContent:"center",
    border:`1.5px solid ${active ? ACCENT : "var(--border)"}`,
    background:"#fff", fontSize:"11px", fontWeight:900, color:ACCENT,
  });
  // Chip de condición (Market y Second): fila única en vez de lista vertical
  // con título. flex:1 para repartir el ancho disponible entre todas las
  // opciones y que entren siempre en una sola línea.
  const condPill = (active: boolean): React.CSSProperties => ({
    flex:1, textAlign:"center", cursor:"pointer", whiteSpace:"nowrap",
    padding:"0.5rem 0.6rem", borderRadius:8, fontSize:"0.8rem",
    fontWeight: active ? 700 : 500,
    color: active ? ACCENT : "var(--mute)",
    border:`1.5px solid ${active ? ACCENT : "var(--border)"}`,
    background: active ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "#fff",
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
    <div style={{ maxWidth: step === 2 ? "none" : 380, margin:0, display:"flex", flexDirection:"column", gap:"1.25rem" }}>

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
      {step === 2 ? (
        // Grid en vez de flex: 4 columnas que reparten el 100% del ancho del
        // contenedor en la misma proporción que antes tenían fijada en px
        // (380:285:380:285 → Información y Precio, columna 1 y 3, quedan del
        // mismo ancho entre sí; Imágenes y Tarjeta, columna 2 y 4, quedan del
        // mismo ancho entre sí). Con fr las 4 columnas se reparten siempre el
        // 100% disponible, angostándose o ensanchándose todas juntas y en la
        // misma proporción según el ancho real del contenedor.
        <div style={{ ...card, display:"grid", gridTemplateColumns:"380fr 285fr 380fr 285fr", gap:"1rem", alignItems:"stretch" }}>
          {/* PASO 2: Información */}
          <div style={{ minWidth:0 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Información del artículo</h2>

            {/* Marca: el input queda más angosto (flex:1) para dejarle lugar,
                a continuación y siempre presente, a la miniatura del logo.
                La miniatura no es un campo nuevo: es el mismo logoUrl que ya
                se busca automáticamente a partir de lo que se escribe acá
                (buscarMarcas / logoDeDominio), solo que antes se mostraba
                arriba del todo -y solo después de confirmar la marca- y ahora
                vive pegada al campo y se ve siempre, incluso mientras se
                busca o no hay nada cargado todavía. */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                <label style={{ ...lbl, marginBottom:0 }}>Marca</label>
                <div style={{ display:"flex", alignItems:"center", gap:"0.85rem" }}>
                  {marcaConfirmada && marcaModo === "sugerida" && (
                    <button onClick={cambiarMarca} style={{ border:"none", background:"none",
                      padding:0, cursor:"pointer", color:ACCENT, textDecoration:"underline",
                      fontSize:"0.72rem" }}>
                      Cambiar marca
                    </button>
                  )}
                  <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                    fontSize:"0.75rem", color:"var(--mute)" }}>
                    <span
                      onClick={() => marcaModo === "personalizada" ? cambiarMarca() : elegirMarcaPersonalizada()}
                      style={checkSq(marcaModo === "personalizada")}>
                      {marcaModo === "personalizada" ? "✓" : ""}
                    </span>
                    <span onClick={() => marcaModo === "personalizada" ? cambiarMarca() : elegirMarcaPersonalizada()}>
                      Personalizada
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
                <input style={{ ...inp, flex:1, minWidth:0 }} value={marca}
                  readOnly={marcaConfirmada && marcaModo !== "personalizada"}
                  onChange={e => { setMarca(e.target.value); }}
                  placeholder="Empezá a escribir para buscar la marca…" />

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
                <label style={{ ...lbl, marginBottom:0 }}>Artículo *</label>
                <div style={{ display:"flex", alignItems:"center", gap:"0.85rem" }}>
                  {elegido && (
                    <button onClick={() => { setElegido(null); setIdElegido(null); }} style={{ border:"none", background:"none",
                      padding:0, cursor:"pointer", color:ACCENT, textDecoration:"underline",
                      fontSize:"0.72rem" }}>
                      Cambiar artículo
                    </button>
                  )}
                  <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                    fontSize:"0.75rem", color:"var(--mute)" }}>
                    <span
                      onClick={() => setArticuloPersonalizado(p => {
                        const n = !p;
                        if (n) { setCandidatos([]); setElegido(null); setIdElegido(null); }
                        return n;
                      })}
                      style={checkSq(articuloPersonalizado)}>
                      {articuloPersonalizado ? "✓" : ""}
                    </span>
                    <span onClick={() => setArticuloPersonalizado(p => {
                        const n = !p;
                        if (n) { setCandidatos([]); setElegido(null); setIdElegido(null); }
                        return n;
                      })}>
                      Personalizado
                    </span>
                  </label>
                </div>
              </div>
              <input style={inp} value={nombre}
                onChange={e => { setNombre(e.target.value); setIdElegido(null); setElegido(null); }}
                placeholder="Ej: iPhone 14 Pro 256GB Negro" />

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
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  {CONDICIONES_MARKET.map(c => (
                    <div key={c.id} onClick={() => setCondicionMarketId(c.id)}
                      style={condPill(condicionMarketId === c.id)}>
                      {c.label}
                    </div>
                  ))}
                </div>
                {condicionMarketId === "reacondicionado" ? (
                  // Único estado que pide un subestado adicional: se muestra
                  // debajo de la fila de chips, junto con el detalle del
                  // estado elegido.
                  <div style={{ marginTop:"0.5rem", display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                    <span style={{ fontSize:"0.7rem", color:"var(--gray-400)" }}>
                      {CONDICIONES_MARKET.find(c => c.id === "reacondicionado")?.desc} · Garantía: 90 días · Empaque: Original o genérica
                    </span>
                    <div style={{ display:"flex", gap:"0.5rem" }}>
                      {SUBESTADOS_RECONDICIONADO.map(s => (
                        <div key={s} onClick={() => setSubestadoRecond(s)} style={condPill(subestadoRecond === s)}>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop:"0.4rem", fontSize:"0.7rem", color:"var(--gray-400)" }}>
                    {CONDICIONES_MARKET.find(c => c.id === condicionMarketId)?.desc}
                    {" · Garantía: "}{CONDICIONES_MARKET.find(c => c.id === condicionMarketId)?.garantia}
                    {" · Empaque: "}{CONDICIONES_MARKET.find(c => c.id === condicionMarketId)?.empaque}
                  </div>
                )}
              </div>
            )}
            {tipo === "secondhand" && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {CONDICIONES.map(c => (
                  <div key={c} onClick={() => setCondicion(c)} style={condPill(condicion === c)}>
                    {c}
                  </div>
                ))}
              </div>
            )}

            {/* Categorización: Departamento/Categoría/Subcategoría. Se
                auto-completan por predicción ML apenas se elige un producto
                (ver el useEffect más arriba); el aviso "sugerido por ML" se
                apaga en cuanto la persona toca cualquiera de los tres
                selectores. */}
            <div style={{ display:"grid", gridTemplateColumns: filteredSubs.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap:"0.75rem" }}>
              <div>
                <label style={lbl}>
                  Departamento *
                  {taxonomiaSugerida && (
                    <span style={{ marginLeft:6, fontWeight:600, fontSize:"0.75rem", color: BLUE }}>
                      · sugerido por ML
                    </span>
                  )}
                </label>
                <select style={inp} value={deptoId}
                  onChange={e => { setDeptoId(e.target.value); setCatId(""); setSubcatId(""); setTaxonomiaSugerida(false); }}>
                  <option value="">Seleccionar...</option>
                  {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={catId}
                  onChange={e => { setCatId(e.target.value); setSubcatId(""); setTaxonomiaSugerida(false); }}
                  disabled={!deptoId}>
                  <option value="">Seleccionar...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {filteredSubs.length > 0 && (
                <div>
                  <label style={lbl}>Subcategoría</label>
                  <select style={inp} value={subcatId}
                    onChange={e => { setSubcatId(e.target.value); setTaxonomiaSugerida(false); }} disabled={!catId}>
                    <option value="">Seleccionar...</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Descripción *</label>
              <textarea style={{ ...inp, minHeight:100, resize:"vertical" }}
                value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Describí el artículo con detalle: características, uso, accesorios incluidos..." />
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
              columnas={2}
              maxImagenes={6}
              maxVideos={2}
              imagenAspect="1"
              anchoGrid="100%"
              espacioSecciones="1rem"
              gapTiles="1rem"
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
                  <label style={lbl}>Moneda</label>
                  <select style={inp} value={moneda} onChange={e => setMoneda(e.target.value)}>
                    {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Precio *</label>
                  <input style={inp} type="number" value={precio}
                    onChange={e => setPrecio(e.target.value)} placeholder="0" min="0" />
                </div>
              </div>
              <div>
                <label style={lbl}>Precio original <span style={{ fontWeight:400, color:"var(--gray-400)" }}>(sin descuento)</span></label>
                <input style={inp} type="number" value={precioOrig}
                  onChange={e => setPrecioOrig(e.target.value)} placeholder="0" min="0" />
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

          {/* Tarjeta del artículo: la misma que se usa en el front (MarketCard,
              importada directamente desde ahí) con sus mismas funcionalidades
              -dar vuelta, galería, selector de cantidad-.
              Antes el ancho de esta columna salía del alto (aspect-ratio al
              revés) para que no se disparara más alta que el resto cuando le
              sobraba ancho libre. Ahora ya no puede sobrarle ancho: la
              grilla le da la misma fracción que a la columna de Imágenes
              (col 2 y col 4 comparten "285fr"), así que ambas quedan siempre
              del mismo ancho entre sí — y con eso alcanza para que la
              tarjeta no se dispare de alto: vuelve a ser el aspect-ratio
              normal (ancho → alto). Si se modifica MarketCard.tsx, esta
              vista previa se actualiza sola porque es el mismo componente,
              no una copia. */}
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
      ) : (
      <div style={card}>

        {/* PASO 3: Detalles */}
        {step === 3 && (
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

        {/* PASO 4: Destinos */}
        {step === 4 && (
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
        {/* PASO 5: Revisión */}
        {step === 5 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Revisión final</h2>

            {/* Preview imagen */}
            {imagenes.length > 0 && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {imagenes.slice(0,5).map((url,i) => (
                  <img key={i} src={`${url}?width=100`} alt=""
                    style={{ width:60, height:60, objectFit:"cover", borderRadius:8,
                      border: i===0 ? `2px solid ${ACCENT}` : "1px solid var(--border)" }} />
                ))}
                {imagenes.length > 5 && (
                  <div style={{ width:60, height:60, borderRadius:8, background:"#F3F4F6",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.8rem", color:"var(--mute)", fontWeight:700 }}>
                    +{imagenes.length-5}
                  </div>
                )}
              </div>
            )}

            {/* Resumen */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
              {[
                { label:"Tipo",          value: tipo === "market" ? "🛍 Market" : "♻️ Second Hand" },
                { label:"Nombre",        value: nombre },
                { label:"Precio",        value: `${moneda} ${parseFloat(precio||"0").toLocaleString("es-UY")}${descuento ? ` (-${descuento}%)` : ""}` },
                { label:"Categoría",     value: [deptos.find(d=>d.id===deptoId)?.nombre, cats.find(c=>c.id===catId)?.nombre].filter(Boolean).join(" › ") || "—" },
                { label:"Imágenes",      value: `${imagenes.length} imagen(es) · ${videoUrls.length} video(s)` },
                { label:"Stock",         value: stock },
                { label:"Disponibilidad",value: DISPONIBILIDADES.find(d=>d.id===disponibilidad)?.label || "—" },
                { label:"Publicar como", value: publicarComo === "active" ? "🚀 Publicar ahora" : "📋 Borrador" },
                ...(tipo==="secondhand" ? [{ label:"Condición", value: condicion }] : []),
              ].map(row => (
                <div key={row.label} style={{ padding:"0.65rem 0.85rem", background:"var(--gray-50)",
                  borderRadius:8, border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:"0.7rem", color:"var(--gray-400)", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".05em", marginBottom:"2px" }}>{row.label}</div>
                  <div style={{ fontSize:"0.875rem", color:"#111", fontWeight:600 }}>{row.value || "—"}</div>
                </div>
              ))}
            </div>

            {/* Descripción preview */}
            {descripcion && (
              <div style={{ padding:"0.75rem", background:"var(--gray-50)", borderRadius:8, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:"0.7rem", color:"var(--gray-400)", fontWeight:700,
                  textTransform:"uppercase", marginBottom:"4px" }}>Descripción</div>
                <div style={{ fontSize:"0.875rem", color:"#374151", lineHeight:1.5 }}>{descripcion}</div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Navegación */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button
          onClick={() => step > PRIMER_PASO ? setStep(s => s-1) : salir(false)}
          style={{ padding:"0.65rem 1.25rem", background:"transparent",
            border:"1.5px solid var(--border)", borderRadius:10,
            color:"var(--mute)", cursor:"pointer", fontSize:"0.875rem" }}>
          {step === PRIMER_PASO ? "← Cancelar" : "← Anterior"}
        </button>

        <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
          <span style={{ fontSize:"0.8rem", color:"var(--gray-400)" }}>
            Paso {STEPS.findIndex(s => s.id === step) + 1} de {STEPS.length}
          </span>
          {step < 4 ? (
            <button
              onClick={() => canNext() && setStep(s => s+1)}
              disabled={!canNext()}
              style={{ padding:"0.65rem 1.5rem", background: canNext() ? ACCENT : "var(--border)",
                color: canNext() ? "#fff" : "var(--gray-400)", border:"none",
                borderRadius:10, fontWeight:700, fontSize:"0.875rem",
                cursor: canNext() ? "pointer" : "not-allowed", transition:"all .15s" }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handlePublicar} disabled={loading} style={{
              padding:"0.65rem 1.75rem",
              background: loading ? "#ccc" : publicarComo === "draft" ? BLUE : GREEN,
              color:"#fff", border:"none", borderRadius:10, fontWeight:800,
              fontSize:"0.95rem", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Guardando..." : publicarComo === "draft" ? "💾 Guardar borrador" : "🚀 Publicar artículo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



