import { useState, useRef, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useShop } from "../components/AdminLayout";
import { supabase } from "../../../utils/supabase/client";
import { MediaItem } from "../../hooks/useMediaLibrary";
import AdminImport from "./AdminImport";
import AdminExport from "./AdminExport";
import AdminCatalog from "./AdminCatalog";
import { BarraDeAccionesSuelta, ItemDeBarra } from "../components/BarraDeAcciones";
import { ArticuloEnLinea, ResumenDeArticulo,
         AccionesDelArticulo } from "../components/ArticuloEnLinea";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { Tabla, Columna } from "../components/Tabla";
import { TIPOS_DE_BIBLIOTECA, TipoDeBiblioteca, definicionDe } from "../ui/tiposDeBiblioteca";
import { Vista, definicionDeVista } from "../ui/vistas";
import { useElementosDeBiblioteca, ElementoDeBiblioteca, ClaseDeElemento,
         FichaDeBiblioteca } from "../hooks/useElementosDeBiblioteca";

/**
 * Las columnas de la vista Lista.
 *
 * "Columnas" sólo tiene sentido en Lista: en una grilla de íconos no hay
 * columnas que elegir. Por eso en las otras vistas el botón queda apagado y
 * dice por qué, en vez de desaparecer — un control que aparece y desaparece se
 * busca donde ya no está.
 */
const COLUMNAS_BIBLIOTECA = [
  { id: "clase", label: "Tipo"    },
  { id: "sub",   label: "Detalle" },
  { id: "fecha", label: "Fecha", rastro: true },
] as const;

/** El nivel de la tabla. La grilla usa el mismo, así la selección es una sola. */
const NIVEL = "biblioteca";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";

function fmtSize(b: number): string {
  if (!b) return "?";
  return b > 1048576 ? `${(b/1048576).toFixed(1)}MB` : `${Math.round(b/1024)}KB`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-UY", { day:"2-digit", month:"2-digit", year:"2-digit" });
}


/** Las etiquetas visibles de cada clase. Un solo lugar donde se nombran. */
const ETIQUETA_DE_CLASE: Record<ClaseDeElemento, string> = {
  articulo:   "Articulo",
  imagen:     "Imagen",
  video:      "Video",
  documento:  "Documento",
};

const ICONO_DE_CLASE: Record<ClaseDeElemento, string> = {
  articulo: "\u{1F6CD}", imagen: "\u{1F5BC}", video: "\u{1F3AC}", documento: "\u{1F4C4}",
};

/**
 * La miniatura de un elemento, con lo que se ve cuando NO hay miniatura.
 *
 * Un cuadro roto es peor que un icono: parece un error de la aplicacion cuando
 * en realidad la ficha simplemente no tiene foto todavia. Por eso el `onError`
 * esconde la imagen y deja al icono debajo.
 *
 * `lado` en null significa "ocupa lo que te den": es lo que hace que la misma
 * miniatura sirva para la lista (26px) y para las tres grillas.
 */
function Miniatura({ el, lado }: { el: ElementoDeBiblioteca; lado: number | null }) {
  const caja: React.CSSProperties = lado
    ? { width: lado, height: lado, flexShrink: 0 }
    : { width: "100%", height: "100%" };

  return (
    <div style={{ ...caja, display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--gray-50)",
      borderRadius: lado ? 5 : 0, overflow: "hidden", position: "relative" }}>
      <span style={{ fontSize: lado ? "0.8rem" : "2.2rem", opacity: 0.55 }}>
        {ICONO_DE_CLASE[el.clase]}
      </span>
      {el.thumb ? (
        <img src={el.thumb} alt="" loading="lazy"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover" }} />
      ) : null}
    </div>
  );
}

interface Props {
  mode?: "page" | "modal";
  maxImages?: number;
  maxVideos?: number;
  onSelect?: (items: MediaItem[]) => void;
  selectedIds?: string[];
  /** Con qué llega buscada. Para abrirla desde otra pantalla ya filtrada. */
  busca?: string;
}

interface UploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
}

/**
 * Qué se puede AGREGAR en cada sección de la Biblioteca.
 *
 * Escrito una vez y acá, al lado de los tipos: agregar una sección es agregar
 * una fila. Repartido en la pantalla, el día que se agregue un tipo nuevo nadie
 * se acuerda de que también hay que darle sus botones.
 *
 * QUE HACE CADA UNO
 *   Artículos  — dos altas distintas. Market o Second Hand es una decisión que
 *                nadie puede deducir del artículo: la toma una persona.
 *   Multimedia — abren el selector YA FILTRADO. No cambian qué se guarda -el
 *                tipo sale del archivo- pero evitan buscar la foto entre los
 *                doscientos archivos de la carpeta.
 *   Documentos — igual, y además dejan la categoría puesta.
 *
 * "Todo" no lleva ninguno: es la mezcla de las otras, y ahí "agregar" no dice
 * qué. Para eso está la sección.
 */
type AbrirArticulo = (clave: string, tipo?: "market" | "secondhand") => void;
type CargarArchivo = (accept: string, cat: "articulo" | "documento" | "otro") => void;

/* `Partial` a proposito, y no `Record` a secas.
 *
 * Con `Record<string, F>` TypeScript tipa el indice como F -nunca undefined-,
 * asi que un `?? []` de respaldo le parece rama muerta y no lo revisa. En
 * ejecucion "todo" no tiene entrada, caia al respaldo, y se llamaba a un
 * arreglo. Con `Partial` el compilador exige contemplar la que falta. */
const ACCIONES_DE_SECCION: Partial<Record<string,
  (abrir: AbrirArticulo, cargar: CargarArchivo) => ItemDeBarra[]>> = {

  articulos: abrir => [
    { label: "Market +", destacado: true, color: "var(--brand-navy)",
      onClick: () => abrir("nueva", "market") },
    { label: "Second +", destacado: true, color: "var(--color-success)",
      onClick: () => abrir("nueva", "secondhand") },
  ],

  multimedia: (_a, cargar) => [
    { label: "Imagen +", destacado: true, color: "var(--brand-navy)",
      onClick: () => cargar("image/*", "otro") },
    { label: "Video +", destacado: true, color: "var(--color-success)",
      onClick: () => cargar("video/*", "otro") },
  ],

  documentos: (_a, cargar) => [
    { label: "PDF +", destacado: true, color: "var(--brand-navy)",
      onClick: () => cargar("application/pdf,.pdf", "documento") },
    { label: "Texto +", destacado: true, color: "var(--brand-navy)",
      onClick: () => cargar("text/plain,text/html,.txt,.md,.csv", "documento") },
    /* Sin filtro: lo que no es ninguno de los dos. Existe para que "no encaja
       en las categorías" no signifique "no se puede subir". */
    { label: "Otro +", onClick: () => cargar("", "otro") },
  ],
};

export default function AdminBiblioteca({
  mode = "page",
  maxImages = 9,
  maxVideos = 5,
  onSelect,
  selectedIds = [],
  busca = "",
}: Props) {
  useOutletContext<any>();

  /*
   * Importar y Exportar viven acá, no en la barra lateral.
   *
   * Son operaciones SOBRE la Biblioteca, no lugares a los que se va. Sueltas en
   * el menú obligaban a saber de antemano que existían y sobre qué actuaban;
   * acá están donde está lo que importan y exportan.
   */
  /* La barra, el buscador, el selector de vista, "Columnas", el aviso, el
     error y el ancho los define `Pantalla`. Acá estaban escritos a mano. */
  const p = usePantalla();
  const { tablas } = p;

  const [tab,        setTab]        = useState<
    "biblioteca" | "subir" | "taxonomia" | "importar" | "exportar">("biblioteca");
  const [search,     setSearch]     = useState(busca);
  /*
   * UN SOLO ESTADO PARA EL TIPO.
   *
   * Lo tocan dos controles —los botones de la barra y el selector de adentro
   * del buscador— y por eso no pueden discrepar: no hay dos valores que
   * sincronizar, hay uno que se escribe desde dos lados. Manda el último gesto
   * del usuario porque es lo único que puede mandar.
   */
  const [tipo,       setTipo]       = useState<TipoDeBiblioteca>("todo");
  /* Lista por defecto. La grilla de íconos luce mejor vacía, pero acá se
     trabaja: el artículo se carga y se edita en su fila, y en una grilla no hay
     fila que desplegar. Las otras vistas siguen a un clic. */
  const [presentacion, setPresentacion] = useState<Vista>("lista");
  const [cols,       setCols]       = useState<Set<string>>(
    new Set(COLUMNAS_BIBLIOTECA.map(c => c.id)));
  /* Sólo las fichas COMPARTIDAS abren esta tarjeta: las propias son el
     artículo de la tienda y se editan en la fila desplegada. Por eso ya no hay
     formulario ni estado de guardado acá — se editaban en dos lados. */
  const [ficha,      setFicha]      = useState<FichaDeBiblioteca | null>(null);

  /*
   * EL ARTÍCULO SE CARGA Y SE EDITA ACÁ, EN LA LISTA.
   *
   * `articuloAbierto` es el id de la ficha que se está editando, o "nueva" para
   * un alta. La fila de un alta no existe en la base todavía: se agrega a la
   * lista como una fila más —misma tabla, mismas columnas— y se va completando
   * con lo que el formulario avisa por `onResumen`. Al guardar, la fila real
   * ocupa su lugar.
   */
  const [articuloAbierto, setArticuloAbierto] = useState<string | null>(null);
  const [tipoDeAlta, setTipoDeAlta] = useState<"market" | "secondhand">("market");
  const [resumen, setResumen] = useState<ResumenDeArticulo | null>(null);
  /* Lo que se puede hacer con el artículo abierto. Lo avisa el formulario y lo
     dibuja la barra: los botones del panel están siempre en el mismo lugar, y
     el del formulario estaba al fondo de todo —a varias pantallas de scroll del
     título, en la fila desplegada—. */
  const [acciones, setAcciones] = useState<AccionesDelArticulo | null>(null);

  /**
   * Abre el selector de archivos filtrado a lo que dice el botón.
   *
   * El filtro se pone en el nodo y no en el estado a proposito: `setState` no
   * cambia el `accept` hasta el proximo dibujo, y el selector se abre AHORA. Con
   * el estado, el primer clic abriria con el filtro anterior.
   *
   * `value = ""` para que se pueda volver a elegir el mismo archivo: sin eso el
   * evento no salta la segunda vez y parece que el boton dejo de andar.
   */
  const cargarArchivo = (accept: string,
                         cat: "articulo" | "documento" | "otro") => {
    setUploadCat(cat);
    const el = inputRef.current;
    if (!el) return;
    el.accept = accept;
    el.value  = "";
    el.click();
  };

  const cerrarArticulo = () => {
    setArticuloAbierto(null); setResumen(null); setAcciones(null);
  };

  /**
   * Volver a la lista, sea de donde sea.
   *
   * Un artículo abierto, la pantalla de carga, Importar, Exportar: todo eso se
   * entra desde la barra y hasta ahora no se salía por la barra. La única
   * salida era el menú lateral, que no vuelve al paso anterior sino que se va a
   * otra cosa —y con un artículo a medio escribir, eso lo pierde—.
   */
  const enLaLista = tab === "biblioteca" && !articuloAbierto;
  const volverALaLista = () => { cerrarArticulo(); setTab("biblioteca"); };

  /*
   * Abrir un artículo obliga a la vista Lista: el formulario sale DEBAJO de su
   * fila, y en una grilla de íconos no hay fila que desplegar. Sin esto, abrir
   * desde una grilla dejaba la fila marcada y ningún formulario, sin que nada
   * dijera por qué.
   */
  const abrirArticulo = (clave: string, tipoAlta?: "market" | "secondhand") => {
    if (tipoAlta) setTipoDeAlta(tipoAlta);
    setPresentacion("lista");
    setResumen(null);
    setArticuloAbierto(clave);
  };
  /*
   * La selección NO vive acá: la presta el control de la tabla.
   *
   * La lista y las tres grillas muestran lo mismo de dos maneras. Con una
   * selección propia había dos: elegías en íconos, pasabas a Lista y no había
   * nada elegido — y "Eliminar", que lee la de la tabla, actuaba sobre otra
   * cosa que la que estabas viendo.
   */
  const selected = tablas.seleccionadas(NIVEL);

  /* Se llega con algo ya elegido cuando la Biblioteca se abre desde una ficha
     para cambiarle las fotos: lo que ya tenía puesto viene marcado. */
  useEffect(() => {
    if (selectedIds.length) tablas.seleccionar(NIVEL, selectedIds);
    // Sólo al abrir: después manda lo que el usuario toca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [uploads,    setUploads]    = useState<UploadItem[]>([]);
  const [uploadCat,  setUploadCat]  = useState<"articulo" | "documento" | "otro">("articulo");
  const [uploadTags, setUploadTags] = useState("");
  const [preview,    setPreview]    = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * Fichas y archivos llegan normalizados en una sola lista. La pantalla no
   * pregunta de qué tabla salió cada cosa: si lo hiciera, "Todo" tendría que
   * dibujar dos grillas y cada vista nueva habría que escribirla dos veces.
   */
  const { elementos, items, loading, errorFichas, reload, deleteItem, stats } =
    useElementosDeBiblioteca(tipo, search);

  /*
   * Los contadores y la sección se publican en la barra de arriba, que es
   * donde vive lo general. Se limpian al salir: si quedaran, el módulo
   * siguiente mostraría los números de éste.
   */
  const { setTopStats, setVista: setVistaGeneral } = useShop();
  const seccionActual = tab === "biblioteca" ? definicionDe(tipo).label
                      : tab === "taxonomia"  ? "Deptos y Categorías"
                      : tab === "importar"   ? "Importar"
                      : tab === "exportar"   ? "Exportar"
                      : "Cargar";

  useEffect(() => {
    if (mode !== "page") return;
    setVistaGeneral(seccionActual);
    setTopStats([
      { label:"Total",      value: stats.total,      color:"#fff"    },
      { label:"Imágenes",   value: stats.imagenes,   color:"#F5C542" },
      { label:"Videos",     value: stats.videos,     color:"#A78BFA" },
      { label:"Documentos", value: stats.documentos, color:"#38BDF8" },
    ]);
    return () => { setTopStats([]); setVistaGeneral(""); };
  }, [mode, seccionActual, stats.total, stats.imagenes, stats.videos,
      stats.documentos, setTopStats, setVistaGeneral]);

  /* El aviso es el de la pantalla: uno solo, en la misma esquina, con el
     mismo tiempo. Antes cada herramienta tenía el suyo. */
  const notify = p.avisar;

  const toggleSelect = (item: MediaItem) => {
    /* Los topes -9 imágenes, 5 videos- se revisan ANTES de tocar la selección:
       la selección la mueve el control de la tabla, que no sabe de topes ni
       tiene por qué saber. */
    if (!selected.has(item.id)) {
      const yaImgs = items.filter(i => selected.has(i.id) && i.tipo === "imagen").length;
      const yaVids = items.filter(i => selected.has(i.id) && i.tipo === "video").length;
      if (item.tipo === "imagen" && yaImgs >= maxImages) { notify(`Máx ${maxImages} imágenes`, false); return; }
      if (item.tipo === "video"  && yaVids >= maxVideos)  { notify(`Máx ${maxVideos} videos`,   false); return; }
    }
    tablas.alternar(NIVEL, item.id);
  };

  const captureVideoThumb = async (file: File, userId: string, name: string): Promise<string | null> => {
    return new Promise(res => {
      const v = document.createElement("video");
      v.src = URL.createObjectURL(file); v.muted = true; v.currentTime = 1;
      v.onloadeddata = async () => {
        try {
          const c = document.createElement("canvas");
          c.width = 320; c.height = 180;
          c.getContext("2d")!.drawImage(v, 0, 0, 320, 180);
          const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), "image/jpeg", 0.8));
          const path = `${userId}/thumb_${name}`;
          const { error } = await supabase.storage.from("biblioteca").upload(path, blob, { upsert: true });
          URL.revokeObjectURL(v.src);
          res(error ? null : path);
        } catch { res(null); }
      };
      v.onerror = () => res(null);
    });
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) { notify("Sesión expirada", false); return; }

    const arr = Array.from(files);
    setUploads(prev => [...arr.map(f => ({ file: f, progress: 0, status: "pending" as const })), ...prev]);
    setTab("subir");

    for (let i = 0; i < arr.length; i++) {
      const file    = arr[i];
      const isVideo = file.type.startsWith("video/");
      const isDoc   = file.type === "text/html" || file.type === "application/pdf";
      const bucket  = isVideo ? "videos" : "biblioteca";
      const ext     = file.name.split(".").pop() || "bin";
      const rand    = Math.random().toString(36).slice(2, 7);
      const ts      = Date.now();
      const fname   = `${user.id}/${ts}_${rand}.${ext}`;
      const tipo    = isVideo ? "video" : isDoc ? "documento" : "imagen";

      const setProgress = (p: number, status: UploadItem["status"], error?: string) => {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: p, status, error } : u));
      };

      setProgress(10, "uploading");
      try {
        const prog = setInterval(() => setUploads(prev =>
          prev.map((u, idx) => idx === i && u.progress < 80 ? { ...u, progress: u.progress + 15 } : u)
        ), 300);

        const { error: upErr } = await supabase.storage.from(bucket).upload(fname, file, { upsert: false });
        clearInterval(prog);
        if (upErr) throw upErr;

        let thumbPath: string | null = null;
        let duracion: number | null  = null;
        let width:  number | null    = null;
        let height: number | null    = null;

        if (isVideo) {
          thumbPath = await captureVideoThumb(file, user.id, `${ts}_${rand}.jpg`);
          duracion  = await new Promise(r => {
            const v = document.createElement("video");
            v.src = URL.createObjectURL(file);
            v.onloadedmetadata = () => { r(Math.round(v.duration)); URL.revokeObjectURL(v.src); };
            v.onerror = () => r(null);
          });
        } else if (!isDoc) {
          const dims: [number,number] | null = await new Promise(r => {
            const img = new Image();
            img.onload = () => { r([img.naturalWidth, img.naturalHeight]); URL.revokeObjectURL(img.src); };
            img.onerror = () => r(null);
            img.src = URL.createObjectURL(file);
          });
          if (dims) { [width, height] = dims; }
        }

        const tags = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

        const { error: dbErr } = await supabase.from("media_library").insert({
          user_id:        user.id,
          bucket,
          path:           fname,
          tipo,
          nombre:         file.name,
          size_bytes:     file.size,
          width, height,
          duracion_seg:   duracion,
          thumbnail_path: thumbPath,
          categoria:      uploadCat,
          etiquetas:      tags,
          status:         "ready",
        });
        if (dbErr) throw dbErr;

        setProgress(100, "done");
      } catch (e: any) {
        setProgress(0, "failed", e.message);
      }
    }
    await reload();
    setTimeout(() => setTab("biblioteca"), 600);
  }, [uploadCat, uploadTags, reload]);


  /* ------------------------------------------------------------------ *
   * Selección y apertura
   *
   * Un click SELECCIONA; doble click ABRE. Antes el click abría, y con eso las
   * acciones de la barra —Editar, Eliminar— no tenían sobre qué actuar: había
   * que elegir algo, y no había forma de elegir sin abrirlo.
   * ------------------------------------------------------------------ */
  const alternar = (el: ElementoDeBiblioteca) => {
    // En modo modal hay topes -9 imagenes, 5 videos- y los sabe `toggleSelect`.
    // Duplicar la regla aca era garantizar que algun dia dejaran de coincidir:
    // se elegirian 12 fotos desde la Biblioteca y el formulario aceptaria 9.
    if (mode === "modal" && el.media) { toggleSelect(el.media); return; }
    tablas.alternar(NIVEL, el.id);
  };

  /**
   * Abrir un elemento de la Biblioteca.
   *
   * UN ARCHIVO se previsualiza. UNA FICHA depende de quien sea:
   *
   *   propia      -> es EL articulo de la tienda, y se abre el editor completo.
   *                  Antes se abria un panel de cuatro campos: un segundo
   *                  formulario sobre lo mismo, que iba a quedar atras del
   *                  primero como ya paso con el editor de pestañas.
   *   compartida  -> es de la plataforma. La tienda no la edita: se muestra la
   *                  tarjeta de solo lectura, que es lo unico que aplica.
   */
  const abrir = (el: ElementoDeBiblioteca) => {
    if (el.media) { setPreview(el.media); return; }
    if (!el.ficha) return;
    /* La ficha propia se abre ACÁ, en su fila: cargar un artículo es ir y
       venir entre el formulario y la lista, y sacar al usuario de la lista le
       hace perder de vista en qué anda. La ruta
       /admin/biblioteca/articulo/:id sigue existiendo para poder ENLAZAR uno
       desde afuera, y monta exactamente el mismo formulario. */
    if (el.ficha.propia) { abrirArticulo(el.ficha.id); return; }
    setFicha(el.ficha);
  };

  /* La confirmación la hace la tabla, con el nombre de lo que se va a borrar.
     Preguntar acá también era preguntar dos veces. */
  const eliminar = async (aBorrar: ElementoDeBiblioteca[]) => {
    const archivos = aBorrar.filter(e => e.media).map(e => e.media!);
    const fichas   = aBorrar.filter(e => e.ficha).map(e => e.ficha!);

    for (const a of archivos) await deleteItem(a);

    // Las fichas se borran de a una y cada una puede fallar por su cuenta: una
    // con publicaciones no se puede borrar, y una de la plataforma tampoco. Un
    // unico "no se pudo" escondería cuál y por qué.
    const problemas: string[] = [];
    for (const f of fichas) {
      const { error } = await supabase.rpc("eliminar_ficha_biblioteca", { p_id: f.id });
      if (error) problemas.push(`${f.nombre}: ${error.message}`);
    }

    tablas.limpiarSeleccion();
    reload();

    if (problemas.length) {
      notify(problemas[0] + (problemas.length > 1 ? ` (y ${problemas.length - 1} más)` : ""), false);
    } else {
      notify(`${aBorrar.length} eliminado(s)`);
    }
  };

  const selImgs = items.filter(i => selected.has(i.id) && i.tipo === "imagen").length;
  const selVids = items.filter(i => selected.has(i.id) && i.tipo === "video").length;
  const selDocs = items.filter(i => selected.has(i.id) && i.tipo === "documento").length;

  const inp: React.CSSProperties = {
    padding:"0.5rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px",
    fontSize:"0.85rem", outline:"none", background:"#fff", color:"#111",
  };

  /* ------------------------------------------------------------------
   * LA TABLA
   *
   * Se declara ANTES del `return`: la barra va arriba en el árbol, así que si
   * esto viviera adentro del JSX los botones no sabrían qué se puede hacer
   * hasta un render después.
   *
   * Y se declara aunque estemos en una grilla de íconos, porque la grilla usa
   * el MISMO nivel: es la misma selección y las mismas cuatro acciones,
   * cambia sólo cómo se dibuja.
   * ---------------------------------------------------------------- */
  const columnasDeLaTabla: Columna[] = [
    {
      id: "nombre", label: "Nombre",
      ver: f => (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Miniatura el={f.el as ElementoDeBiblioteca} lado={26} />
          <span style={{ fontWeight:600, color:"#374151" }}>{String(f.nombre)}</span>
        </div>
      ),
    },
    ...COLUMNAS_BIBLIOTECA
      .filter(c => cols.has(c.id))
      .map(c => ({ id: c.id, label: c.label, rastro: "rastro" in c })),
  ];

  /*
   * La fila del artículo que se está dando de alta.
   *
   * Va como una fila MÁS: la tabla no cambia de forma para recibirla, y al
   * guardar la fila real ocupa su lugar. Lo que todavía no se escribió se
   * muestra con una raya, no en blanco: un hueco no dice si falta o si no
   * aplica.
   */
  const filaDelAlta = articuloAbierto !== "nueva" ? [] : [{
    clave: "nueva",
    nombre: resumen?.nombre || "Sin título todavía",
    clase: ETIQUETA_DE_CLASE.articulo,
    /* La MISMA regla que las filas de abajo -ver `useElementosDeBiblioteca`-:
       marca · familia, y "Sin marca" cuando no hay. Una fila que se lee
       distinto que sus vecinas se lee dos veces. */
    sub: [resumen?.marca, resumen?.familia].filter(Boolean).join(" · ")
         || "Se completa mientras escribís",
    fecha: "—",
    /* Un elemento de verdad, no null: la miniatura y todo lo que dibuja la
       fila esperan uno. Así la portada aparece mientras se elige, y no recién
       después de guardar. */
    el: {
      id: "nueva", clase: "articulo" as const,
      nombre: resumen?.nombre || "Sin título todavía",
      sub: "", thumb: resumen?.imagen ?? "", fecha: "",
    } as ElementoDeBiblioteca,
  }];

  const nivelBiblioteca = tab !== "biblioteca" ? null : tablas.nivel(NIVEL, {
    columnas: columnasDeLaTabla,
    filas: [...filaDelAlta, ...elementos.map(el => ({
      clave: el.id,
      nombre: el.nombre,
      clase: ETIQUETA_DE_CLASE[el.clase],
      sub: el.sub,
      fecha: fmtDate(el.fecha),
      el,
    }))],

    /* Qué fila está desplegada lo decide esta pantalla y no la tabla: el alta
       aparece CON su formulario abierto, y pedir un clic más sería pedir que
       confirme algo que ya pidió. */
    abierta: articuloAbierto,
    onAbierta: clave => { setArticuloAbierto(clave); if (!clave) setResumen(null); },

    /* La flecha, sólo donde algo pasa: el alta y los artículos propios. Un
       archivo se previsualiza y una ficha de la plataforma no se edita desde
       acá, así que en esas filas no hay nada que desplegar. */
    abre: f => f.clave === "nueva"
            || !!(f.el as ElementoDeBiblioteca | undefined)?.ficha?.propia,

    /* Lo que se ve al desplegar: el formulario del artículo, el mismo de
       siempre. */
    detalle: f => {
      if (f.clave === "nueva") return (
        <ArticuloEnLinea tipo={tipoDeAlta} onResumen={setResumen}
          onAcciones={setAcciones}
          onCerrar={cerrarArticulo}
          onGuardado={() => { cerrarArticulo(); reload(); }} />
      );
      const el = f.el as ElementoDeBiblioteca | undefined;
      if (!el?.ficha?.propia) return null;
      return (
        <ArticuloEnLinea fichaId={el.ficha.id} onResumen={setResumen}
          onAcciones={setAcciones}
          onCerrar={cerrarArticulo}
          onGuardado={() => { cerrarArticulo(); reload(); }} />
      );
    },

    /* Cargar no cabe en una fila: un archivo se elige, se clasifica y se
       etiqueta. Por eso "Agregar" abre la pantalla de carga en vez de abrir
       un renglón vacío — pero está en el mismo lugar que en todas.

       Y en la sección Artículos agrega un ARTÍCULO, que es lo que se está
       mirando. La sección ya dice de qué se habla: preguntarlo otra vez con un
       menú sería el segundo lugar donde se decide lo mismo. */
    onAgregar: () => {
      if (tipo !== "articulos") { setTab("subir"); return; }
      // El caso normal es Market. Second Hand está al lado, en la barra.
      abrirArticulo("nueva", "market");
    },
    onEditar:  f => abrir(f.el as ElementoDeBiblioteca),
    /* Doble clic, como en todas las tablas: el clic simple sigue eligiendo,
       que es de lo que dependen las acciones masivas. */
    onAbrir:   f => abrir(f.el as ElementoDeBiblioteca),
    onBorrar:  async fs => eliminar(fs.map(f => f.el as ElementoDeBiblioteca)),
    nombreDe:  f => String(f.nombre),
  });

  return (
    /* La barra, el buscador, el selector de vista, "Columnas", el aviso, el
       error y el ancho los define `Pantalla`. Acá estaban escritos a mano —y
       en Tiendas, y en el Vault—, así que las tres podían divergir. */
    <Pantalla p={p}
      /* Sólo cuando hay de dónde volver: en la lista, un "Volver" permanente no
         diría a dónde iría. */
      volver={enLaLista ? undefined : { a: "la lista", onVolver: volverALaLista }}

      /* Los tipos se declaran UNA vez: `Pantalla` los dibuja como botones del
         menú y como selector adentro del buscador. No son dos controles, es el
         mismo en dos lugares.

         Deptos y Categorías se fue a CORE Market → Plataforma: `departamentos`
         y `categorias` no tienen tenant_id, son de la plataforma y las usan
         todas las tiendas. Acá adentro, un operador de tienda se las cambiaba
         a todas. */
      secciones={{
        valor: tab === "biblioteca" ? tipo : "",
        /* Cada sección declara lo que deja agregar, y sale pegado a ella:
           "estoy en Artículos, y acá agrego artículos". Los de las otras
           secciones no se dibujan —hablarían de algo que no se está mirando—.

           En Artículos son dos altas distintas —Market y Second Hand es una
           decisión que nadie puede deducir del artículo—. En Multimedia y
           Documentos abren el selector de archivos YA FILTRADO: no cambian qué
           se guarda —eso sale del archivo— pero evitan tener que encontrar el
           archivo entre todos los demás. */
        opciones: TIPOS_DE_BIBLIOTECA.map(t => ({
          valor: t.id, label: t.label,
          acciones: ACCIONES_DE_SECCION[t.id]?.(abrirArticulo, cargarArchivo),
        })),
        /* Apretar una sección devuelve a SU LISTA, tambien si ya estaba
           elegida: es la forma de deshacer lo que se desplegó. Antes, con el
           formulario abierto, apretar "Artículos" no hacía nada visible y no
           quedaba manera de cerrarlo. */
        onCambio: v => { setTipo(v as TipoDeBiblioteca); volverALaLista(); },
      }}

      /* Lo que hace la Biblioteca y no son las cuatro acciones de la tabla.
         Importar y Exportar viven acá y no en la barra lateral: son
         operaciones SOBRE la Biblioteca, no lugares a los que se va. */
      extra={[
        /* Grabar va PRIMERO y sólo con un artículo abierto: es lo que se está
           haciendo en ese momento. Deshabilitado dice qué falta, en vez de
           desaparecer —un botón que se va se busca donde ya no está—. */
        ...(acciones ? [{
          label: acciones.etiqueta, destacado: true, color: ACCENT,
          desactivada: !!acciones.falta || acciones.guardando,
          motivo: acciones.falta,
          onClick: acciones.grabar,
        }, "separador" as const] : []),
        ...(mode === "modal" ? [{
          label: `Usar (${selected.size})`, destacado: true, color: ACCENT,
          desactivada: selected.size === 0, motivo: "Elegí al menos uno",
          onClick: () => onSelect?.(items.filter(i => selected.has(i.id))),
        }] : []),
        { label:"Importar", color:BLUE, activa: tab === "importar",
          onClick:()=>setTab("importar") },
        { label:"Exportar", color:BLUE, activa: tab === "exportar",
          onClick:()=>setTab("exportar") },
        { label:"Actualizar", onClick: reload },
      ] as ItemDeBarra[]}

      vista={{ valor: presentacion, onCambio: setPresentacion }}

      /* "Columnas" sólo significa algo en Lista. En las grillas se apaga y lo
         dice, en vez de desaparecer: un control que se va se busca donde ya
         no está. */
      columnas={{
        opciones: COLUMNAS_BIBLIOTECA.map(c => ({ id: c.id, label: c.label })),
        elegidas: cols,
        onCambio: id => setCols(prev => {
          const n = new Set(prev);
          n.has(id) ? n.delete(id) : n.add(id);
          return n;
        }),
        apagado: presentacion === "lista" ? undefined
                                          : "Las columnas se eligen en la vista Lista",
      }}

      buscador={tab === "biblioteca"
        ? { valor: search, onCambio: setSearch }
        : undefined}

      error={tab === "biblioteca" && errorFichas
        ? `No se pudieron leer los artículos de la Biblioteca: ${errorFichas}`
        : null}>


      {/* Importar y Exportar: las pantallas que ya existían, ahora acá adentro.
          No se reescriben — funcionan y son las mismas; lo que cambia es dónde
          se llega a ellas. */}
      {/* Departamentos y categorías: es la estructura con la que se clasifica
          lo que hay en la Biblioteca. Suelta en el menú era una pantalla que
          nadie sabía para qué servía; acá está al lado de lo que ordena. */}
      {tab === "taxonomia" && (
        <div style={{ marginTop:"0.5rem" }}><AdminCatalog /></div>
      )}

      {tab === "importar" && (
        <div style={{ marginTop:"0.5rem" }}><AdminImport /></div>
      )}
      {tab === "exportar" && (
        <div style={{ marginTop:"0.5rem" }}><AdminExport /></div>
      )}

      {/*
        La entrada de archivos, SIEMPRE montada y no dentro de una pestaña.

        Los botones de sección -"Imagen +", "PDF +"- la abren, y la barra se ve
        en todas las pestañas. Adentro de la pestaña Biblioteca, desde Importar
        o Exportar el botón no encontraba la entrada y no pasaba nada: un botón
        muerto que no dice que está muerto.

        Y montada de una: abrir el selector de archivos necesita el gesto del
        usuario, así que no se puede montar y hacer clic después.

        El `accept` lo pone `cargarArchivo` en el momento; el de acá es el que
        vale para "Agregar", que no filtra nada en particular.
      */}
      <input ref={inputRef} type="file" multiple
        accept="image/*,video/*,text/html,application/pdf"
        style={{ display:"none" }} onChange={e => handleFiles(e.target.files)} />

      {/*
        El progreso, fuera de la pestaña "Subir".

        Los botones de sección abren el selector desde la LISTA, y ahí el
        progreso no se veía: se elegían los archivos y no pasaba nada hasta que
        aparecían solos, sin decir si estaban subiendo o si algo habia fallado.
        Subir es de la Biblioteca, no de una de sus pestañas.
      */}
        {uploads.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
            {uploads.map((u, i) => (
              <div key={i} style={{ background:"var(--gray-50)", borderRadius:8,
                padding:"0.55rem 0.75rem", border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                  <span style={{ fontSize:"0.82rem", fontWeight:500, color:"#374151",
                    maxWidth:"70%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {u.file.name}
                  </span>
                  <span style={{ fontSize:"0.75rem", color:
                    u.status==="done" ? "#16a34a" : u.status==="failed" ? "#dc2626" : "var(--mute)" }}>
                    {u.status==="done"?"✓ Listo":u.status==="failed"?"✗ Error":
                     u.status==="uploading"?`${u.progress}%`:"En cola"}
                  </span>
                </div>
                <div style={{ height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, transition:"width .3s",
                    width:`${u.progress}%`,
                    background: u.status==="failed"?"#ef4444":u.status==="done"?"#22c55e":ACCENT }} />
                </div>
                {u.error && <div style={{ fontSize:"0.72rem", color:"#dc2626", marginTop:"2px" }}>{u.error}</div>}
              </div>
            ))}
            <button onClick={() => { setUploads([]); setTab("biblioteca"); }}
              style={{ padding:"0.45rem", background:"none", border:"1.5px solid var(--border)",
                borderRadius:8, cursor:"pointer", fontSize:"0.82rem", color:"var(--mute)" }}>
              Limpiar lista
            </button>
          </div>
        )}

      {/* TAB BIBLIOTECA */}
      {tab === "biblioteca" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

          {/* Selección info en modal */}
          {mode === "modal" && (
            <div style={{ fontSize:"0.78rem", color:"var(--mute)", display:"flex", gap:"1rem" }}>
              <span>🖼 {selImgs}/{maxImages}</span>
              <span>🎬 {selVids}/{maxVideos}</span>
              {selDocs > 0 && <span>📄 {selDocs}</span>}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:"3rem", color:"var(--gray-400)" }}>Cargando...</div>
          ) : elementos.length === 0 ? (
            <div style={{ textAlign:"center", padding:"3rem" }}>
              <div style={{ fontSize:"3rem" }}>🗂</div>
              <div style={{ color:"var(--gray-400)", marginTop:"0.5rem" }}>
                {search ? "Nada en " + definicionDe(tipo).label + " para “" + search + "”"
                        : "Nada en " + definicionDe(tipo).label}
              </div>
            </div>
          ) : presentacion === "lista" ? (
            /* ---------------------------------------------------------------
             * LISTA
             *
             * La tabla del panel, la misma que Tiendas, el Vault y
             * Definiciones: check por fila, las cuatro acciones en la barra,
             * las columnas en el mismo orden y con el mismo ancho, y el rastro
             * a la derecha.
             *
             * Acá estaba dibujada a mano y compartía el aspecto sin compartir
             * el código, así que las dos podían divergir sin que nadie se
             * entere. Ahora si cambia la tabla, cambia también acá.
             * ------------------------------------------------------------- */
            nivelBiblioteca && <Tabla {...nivelBiblioteca} />
          ) : (
            /* ---------------------------------------------------------------
             * ICONOS
             * El ancho es un MINIMO, no un ancho fijo: `auto-fill` mas `1fr`
             * reparte el sobrante, asi que la grilla llena el ancho visible en
             * vez de dejar un hueco a la derecha que crece con la pantalla.
             * ------------------------------------------------------------- */
            <div style={{ display:"grid", gap:"0.6rem",
              gridTemplateColumns:"repeat(auto-fill,minmax(" + definicionDeVista(presentacion).ancho + "px,1fr))" }}>
              {elementos.map(el => {
                const sel     = selected.has(el.id);
                const detalle = definicionDeVista(presentacion).detalle;
                return (
                  <div key={el.id} title={el.nombre}
                    onClick={() => alternar(el)} onDoubleClick={() => abrir(el)}
                    style={{
                      border:"2px solid " + (sel ? ACCENT : "var(--border)"), borderRadius:10,
                      overflow:"hidden", cursor:"pointer", background:"#fff", position:"relative",
                      boxShadow: sel ? "0 0 0 3px color-mix(in srgb, var(--brand-madre) 15%, transparent)"
                                     : "0 1px 3px rgba(0,0,0,.05)",
                      transition:"all .15s",
                    }}>
                    {/* Cuadrada, como la tarjeta de la tienda: en "Grandes" el
                        articulo se ve como se va a ver publicado. */}
                    <div style={{ aspectRatio:"1 / 1", background:"var(--gray-50)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      overflow:"hidden", position:"relative" }}>
                      <Miniatura el={el} lado={null} />
                      {sel && (
                        <div style={{ position:"absolute", top:5, left:5, width:17, height:17,
                          borderRadius:5, background:ACCENT, color:"#fff", fontSize:"10px",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>✓</div>
                      )}
                    </div>

                    {detalle !== "ninguno" && (
                      <div style={{ padding:"0.4rem 0.5rem" }}>
                        <div style={{ fontSize: detalle === "completo" ? "0.8rem" : "0.7rem",
                          fontWeight:600, color:"#374151", overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {el.nombre}
                        </div>
                        {detalle === "completo" && (
                          <div style={{ fontSize:"0.7rem", color:"var(--gray-400)", overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{el.sub}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmar selección modal */}
          {mode === "modal" && selected.size > 0 && (
            <div style={{ position:"sticky", bottom:0, background:"#fff", padding:"0.75rem",
              borderTop:"1px solid var(--border)", display:"flex", gap:"0.75rem", alignItems:"center" }}>
              <span style={{ fontSize:"0.85rem", color:"#374151", flex:1 }}>
                {selImgs>0 && `${selImgs} imagen(es) `}
                {selVids>0 && `${selVids} video(s) `}
                {selDocs>0 && `${selDocs} doc(s) `}
                seleccionado(s)
              </span>
              <button onClick={() => tablas.limpiarSeleccion()} style={{
                padding:"0.45rem 0.9rem", background:"none", border:"1.5px solid var(--border)",
                borderRadius:8, cursor:"pointer", fontSize:"0.82rem", color:"var(--mute)" }}>
                Limpiar
              </button>
              <button onClick={() => onSelect?.(items.filter(i => selected.has(i.id)))} style={{
                padding:"0.45rem 1.1rem", background:ACCENT, color:"#fff",
                border:"none", borderRadius:8, fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>
                Usar seleccionados →
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB SUBIR */}
      {tab === "subir" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = ACCENT; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; handleFiles(e.dataTransfer.files); }}
            style={{ border:"2px dashed var(--border)", borderRadius:12, padding:"2rem",
              textAlign:"center", cursor:"pointer", color:"var(--gray-400)", transition:"border-color .2s" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"0.5rem" }}>⬆</div>
            <div style={{ fontWeight:600, color:"#374151", marginBottom:"0.25rem" }}>
              Arrastrá archivos o hacé click
            </div>
            <div style={{ fontSize:"0.8rem" }}>Imágenes · Videos MP4 · HTML · PDF</div>
          </div>

          {/* Opciones */}
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px" }}>Categoría</div>
              <div style={{ display:"flex", gap:"4px" }}>
                {(["articulo","documento","otro"] as const).map(c => (
                  <button key={c} onClick={() => setUploadCat(c)} style={{
                    flex:1, padding:"0.4rem", borderRadius:7, fontSize:"0.75rem",
                    border:`1.5px solid ${uploadCat===c ? ACCENT : "var(--border)"}`,
                    background: uploadCat===c ? `color-mix(in srgb, var(--brand-madre) 8%, transparent)` : "#fff",
                    color: uploadCat===c ? ACCENT : "var(--mute)",
                    fontWeight: uploadCat===c ? 700 : 400, cursor:"pointer",
                  }}>
                    {c==="articulo"?"🛍 Art.":c==="documento"?"📄 Doc":"📎 Otro"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:2, minWidth:200 }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px" }}>
                Etiquetas <span style={{ fontWeight:400, color:"var(--gray-400)" }}>(separadas por coma)</span>
              </div>
              <input value={uploadTags} onChange={e => setUploadTags(e.target.value)}
                placeholder="verano, electro, oferta"
                style={{ ...inp, width:"100%" }} />
            </div>
          </div>

        </div>
      )}

      {/* La ficha de un artículo.
          Se edita si es propia de la tienda. Las de la plataforma se ven pero
          no se tocan: las comparten todas las tiendas, y corregir una acá se
          la corrige a todas. */}
      {ficha && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={() => setFicha(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff",
            borderRadius:16, maxWidth:620, width:"100%", overflow:"hidden" }}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"0.75rem 1rem", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontWeight:700, fontSize:"0.9rem", color:"#111" }}>
                {ficha.propia ? "Artículo de la Biblioteca" : ficha.nombre}
              </span>
              <button onClick={() => setFicha(null)} style={{ background:"none", border:"none",
                fontSize:"1.25rem", cursor:"pointer", color:"var(--mute)" }}>&#10005;</button>
            </div>

            <div style={{ padding:"1rem", display:"flex", gap:"1rem" }}>
              {ficha.imagen && (
                <img src={ficha.imagen} alt="" style={{ width:140, height:140,
                  objectFit:"cover", borderRadius:10, flexShrink:0 }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              )}

              <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                {(
                  <div style={{ fontSize:"0.82rem", color:"#374151", display:"flex",
                    flexDirection:"column", gap:"0.35rem" }}>
                    <div><b>Marca:</b> {ficha.marca || "—"}</div>
                    <div><b>Familia:</b> {ficha.familia || "—"}</div>
                    <div><b>Fuente:</b> {ficha.fuente || "—"}</div>
                    {ficha.precio_ref != null && (
                      <div><b>Precio de referencia:</b>{" "}
                        <span style={{ fontVariantNumeric:"tabular-nums" }}>
                          {ficha.moneda || ""} {ficha.precio_ref}
                        </span>
                      </div>
                    )}
                    {ficha.descripcion && (
                      <div style={{ color:"var(--mute)" }}>{ficha.descripcion}</div>
                    )}
                    <div style={{ marginTop:"0.4rem", padding:"0.5rem 0.6rem", borderRadius:8,
                      background:"rgba(245,158,11,.12)", color:"#B45309", fontWeight:600,
                      fontSize:"0.75rem" }}>
                      Es una ficha de la plataforma: la comparten todas las tiendas, así que
                      no se edita desde acá.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8,
              padding:"0.7rem 1rem", borderTop:"1px solid var(--border)" }}>
              <BarraDeAccionesSuelta acciones={[
                { label:"Cerrar", color:"var(--mute)", onClick:()=>setFicha(null) },
              ]} />
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={() => setPreview(null)}>
          <div style={{ background:"#fff", borderRadius:16, overflow:"hidden",
            maxWidth:800, width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"0.75rem 1rem", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontWeight:700, fontSize:"0.9rem", color:"#111" }}>{preview.nombre}</span>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {preview.tipo === "documento" && (
                  <button onClick={() => window.open(preview.url, "_blank")} style={{
                    padding:"0.35rem 0.75rem", background:BLUE, color:"#fff",
                    border:"none", borderRadius:7, fontSize:"0.8rem", cursor:"pointer" }}>
                    🖨 Imprimir
                  </button>
                )}
                <button onClick={() => { navigator.clipboard.writeText(preview.url||""); notify("URL copiada"); }}
                  style={{ padding:"0.35rem 0.75rem", background:"none", border:"1.5px solid var(--border)",
                    borderRadius:7, fontSize:"0.8rem", cursor:"pointer", color:"var(--mute)" }}>
                  📋 Copiar URL
                </button>
                <button onClick={() => setPreview(null)}
                  style={{ background:"none", border:"none", fontSize:"1.25rem", cursor:"pointer", color:"var(--mute)" }}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflow:"auto", padding:"1rem", display:"flex",
              alignItems:"center", justifyContent:"center", background:"var(--gray-50)", minHeight:300 }}>
              {preview.tipo === "imagen" && (
                <img src={preview.url} alt={preview.nombre}
                  style={{ maxWidth:"100%", maxHeight:"60vh", borderRadius:8, objectFit:"contain" }} />
              )}
              {preview.tipo === "video" && (
                <video src={preview.url} controls style={{ maxWidth:"100%", maxHeight:"60vh", borderRadius:8 }} />
              )}
              {preview.tipo === "documento" && (
                <iframe src={preview.url} title={preview.nombre}
                  style={{ width:"100%", height:"60vh", border:"none", borderRadius:8 }} />
              )}
            </div>
            <div style={{ padding:"0.6rem 1rem", borderTop:"1px solid var(--border)",
              display:"flex", gap:"1rem", fontSize:"0.78rem", color:"var(--gray-400)" }}>
              <span>{fmtSize(preview.size_bytes)}</span>
              <span>{fmtDate(preview.created_at)}</span>
              <span>{preview.categoria}</span>
              {preview.etiquetas?.length > 0 && (
                <span>{preview.etiquetas.map(t => `#${t}`).join(" ")}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Pantalla>
  );
}
