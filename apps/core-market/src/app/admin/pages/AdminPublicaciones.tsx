import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import { fetchPublicaciones, type Publicacion } from "../hooks/useCatalogPublicaciones";
import { BloqueMetricas } from "../components/ficha/BloquesFicha";
import { NUMERICO } from "../ui/numeros";
import { sincronizarCanal, verificarCanal, canalesDisponibles, corregirCampo,
         type ProblemaPublicacion } from "../utils/canalesSync";
import AdminArticulos from "./AdminArticulos";
import { BarraDeAcciones, BarraDeAccionesSuelta } from "../components/BarraDeAcciones";

const ACCENT = "var(--brand-madre)";
const GREEN  = "var(--color-success)";
const BLUE   = "var(--brand-navy)";

const TABS = ["Información","Multimedia","Moneda y Precio","Detalles","Inventario","Vista previa"];
// Pestañas cuyos campos aún no tienen destino en catalog_*: se avisa en el
// formulario en vez de descartar lo que el usuario escribe sin decir nada.
const MONEDAS = ["UYU","USD","EUR"];
// `key` es la propiedad sintética que la UI ya renderiza; `channel` es el
// valor real de catalog_listings.channel. El adaptador deriva una de la otra,
// así el render de la tabla no cambia.
/**
 * Presentación de un canal.
 *
 * DEFINICIÓN DE DISEÑO: la pantalla no tiene una lista de canales. Los canales
 * salen del catálogo, que guarda `catalog_listings.channel` como texto libre.
 * Puede aparecer la web propia, un marketplace que hoy no usamos, o uno que
 * todavía no existe.
 *
 * Este mapa es sólo estética: da una etiqueta corta y un color a los que ya
 * conocemos. Un canal que no esté acá no es un error ni requiere tocar código:
 * se muestra con una etiqueta derivada de su nombre y color neutro, y funciona
 * igual. Lo único que decide si se puede publicar en él es si tiene motor.
 */
const ESTETICA_CANAL: Record<string,{label:string;color:string;tc:string}> = {
  mercadolibre: {label:"ML",   color:"#F5C518",      tc:"#333"},
  meta:         {label:"Meta", color:"#1877F2",      tc:"#fff"},
  whatsapp:     {label:"WA",   color:"#25D366",      tc:"#fff"},
  web:          {label:"Web",  color:"var(--mute)",  tc:"#fff"},
};

const NEUTRO = {color:"#64748B", tc:"#fff"};

/** Etiqueta legible para un canal desconocido: su propio nombre, acortado. */
const etiquetaDe = (channel:string) =>
  channel.length <= 5 ? channel.toUpperCase() : channel.slice(0,4).toUpperCase();

export interface CanalUI {
  key:string; channel:string; label:string; color:string; tc:string;
  /** Por que el canal no esta habilitado. Sin esto, esta habilitado. */
  motivo?:string;
}

const canalUI = (channel:string, motivo?:string):CanalUI => {
  const e = ESTETICA_CANAL[channel];
  return {
    key:     "sync_" + channel,
    channel,
    label:   e?.label ?? etiquetaDe(channel),
    color:   e?.color ?? NEUTRO.color,
    tc:      e?.tc    ?? NEUTRO.tc,
    // Sin motivo, el canal esta habilitado. Con motivo, se muestra igual pero
    // apagado y diciendo por que: esconderlo dejaba la pregunta "¿y Mercado
    // Libre?" sin ninguna respuesta en pantalla.
    motivo,
  };
};

// Market y Second Hand NO son canales de distribucion: son el tipo del
// articulo (nuevo o usado) y son excluyentes entre si. Ya no se usan para
// resolver nada (DEC-012, 2026-08-25): toArt y el filtro por pestaña leen
// `tipo` directo de catalog_producto_base. Queda sin uso, sin borrar, por si
// algun render mas abajo todavia la referenciaba por nombre de canal.
const CANALES_BASE = [
  {key:"sync_market", channel:"market",     label:"Market",      color:ACCENT, tc:"#fff"},
  {key:"sync_second", channel:"secondhand", label:"Second Hand", color:GREEN,  tc:"#fff"},
];


/**
 * Estado de sincronizacion de un canal, tal como lo pinta el chip.
 *
 *   off      el canal no esta habilitado para este articulo
 *   espera   habilitado pero todavia no salio: mantiene el color de la marca
 *   error    Mercado Libre -u otro canal- lo rechazo
 *   ok       publicado y vigente
 *
 * Son cuatro y no tres porque "habilitado pero sin publicar" y "sin habilitar"
 * son cosas distintas: en la primera el usuario ya decidio, en la segunda no.
 */
export type EstadoCanal = "off" | "espera" | "error" | "ok";

const estadoDeCanal = (p: Publicacion | undefined, channel: string): EstadoCanal => {
  const l = p?.channels?.find((c: any) => c.channel === channel);
  if (!l || l.status === "delisted") return "off";
  if (l.status === "error")   return "error";
  if (l.status === "active")  return "ok";
  return "espera";
};

/** Igual que canalActivo pero sobre la forma plana que usa la tabla. */
const canalActivoEn = (a:{canales?:any[]}, channel:string) =>
  (a.canales ?? []).some((c:any)=>c.channel===channel && c.status!=="delisted");

/** Un canal cuenta como activo salvo que se lo haya dado de baja. */
const canalActivo = (p:Publicacion, channel:string) =>
  p.channels.some(c => c.channel === channel && c.status !== "delisted");

interface Art {
  id:string; nombre:string; tipo:"market"|"secondhand"; status:string;
  precio:number; moneda:string; imagen_principal?:string; imagenes?:any[];
  videos?:any[]; stock:number; condicion?:string; departamento_id?:string;
  departamento_nombre?:string; categoria_id?:string; categoria_nombre?:string;
  atributos?:Record<string,any>; descripcion?:string;
  rating_promedio?:number; rating_count?:number;
  impresiones?:number; clicks?:number; ranking_score?:number;
  created_at:string; published_at?:string; deleted_at?:string;
  baja_prevista?:string; precio_original?:number; sku?:string;
  stock_ilimitado?:boolean; envio_tipo?:string; envio_gratis?:boolean;
  /* garantia/tipo_envio/peso/dimensiones/material/origen son columnas reales de
     catalog_producto_base. Antes habia aca `peso_kg`, `garantia_tipo` y
     `garantia_meses`, que no existen en ninguna tabla: el editor viejo los
     mostraba y se perdian al recargar. */
  garantia?:string|null; tipo_envio?:string|null; peso?:string|null;
  dimensiones?:string|null; material?:string|null; origen?:string|null;
  sync_ml?:boolean; sync_meta?:boolean; sync_wa?:boolean; sync_web?:boolean;
  // Añadidos por la migración a catalog_*: `id` es el variant_id, y estos dos
  // conservan lo que la forma plana de Art no puede representar.
  item_id?:string; canales?:Publicacion["channels"];
  // Lo que sabemos del producto, guardado. Ver la migracion 001900.
  ficha?:Record<string,any>|null; fichaFuente?:string|null; fichaAt?:string|null;
  sync_market?:boolean; sync_second?:boolean;
}

/**
 * catalog_* -> la forma que la tabla ya sabe dibujar.
 *
 * `tipo` deja de ser una columna y pasa a ser lo que siempre debió ser: la
 * presencia de un listing en el canal 'market' o 'secondhand'.
 */
function toArt(p:Publicacion):Art {
  return {
    id:          p.variant_id,
    item_id:     p.item_id,
    nombre:      p.title,
    descripcion: p.description ?? undefined,
    sku:         p.sku ?? undefined,
    // Un articulo es de Market o de Second Hand; cualquier otra cosa que
    // devuelva la base se trata como Market, que es el caso normal.
    tipo:        p.tipo === "secondhand" ? "secondhand" : "market",
    status:      p.item_status,
    precio:      p.master_price ?? 0,
    moneda:      p.master_currency,
    stock:       p.total_available,
    created_at:  p.created_at,
    published_at:p.item_status === "active" ? p.updated_at : undefined,
    canales:     p.channels,
    ficha:       (p as any).ficha ?? null,
    fichaFuente: (p as any).ficha_fuente ?? null,
    fichaAt:     (p as any).ficha_at ?? null,
    garantia:    (p as any).garantia    ?? null,
    tipo_envio:  (p as any).tipo_envio  ?? null,
    peso:        (p as any).peso        ?? null,
    dimensiones: (p as any).dimensiones ?? null,
    material:    (p as any).material    ?? null,
    origen:      (p as any).origen      ?? null,
    sync_market: p.tipo === "market",
    sync_second: p.tipo === "secondhand",
    sync_ml:     canalActivo(p,"mercadolibre"),
    sync_meta:   canalActivo(p,"meta"),
    sync_wa:     canalActivo(p,"whatsapp"),
    sync_web:    canalActivo(p,"web"),
  };
}

// Valores reales del enum catalog_item_status: draft | active | archived |
// discontinued. `paused` e `inactive` quedan por compatibilidad de render con
// datos viejos, pero ya no se escriben.
const S: Record<string,{label:string;bg:string;color:string}> = {
  active:      {label:"Activo",       bg:"#dcfce7", color:"#166534"},
  draft:       {label:"Borrador",     bg:"#F3F4F6", color:"var(--mute)"},
  archived:    {label:"Archivado",    bg:"#F3F4F6", color:"var(--mute)"},
  discontinued:{label:"Discontinuado",bg:"#fee2e2", color:"#991b1b"},
  paused:  {label:"Pausado",  bg:"#fef9c3", color:"#854d0e"},
  inactive:{label:"Inactivo", bg:"#fee2e2", color:"#991b1b"},
};

const XCOLS = [
  {id:"categoria",label:"Categoría"},{id:"marca",label:"Marca"},
  {id:"ranking",label:"Ranking"},{id:"ctr",label:"CTR"},
  {id:"baja",label:"Baja"},{id:"mkt1",label:"MKT 1"},{id:"mkt2",label:"MKT 2"},
];

type SK = "precio"|"stock"|"status"|"alta"|null;
const fmt = (s?:string) => s?new Date(s).toLocaleDateString("es-UY",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—";
const fmtP = (n:number,m="UYU") => m+" "+Number(n).toLocaleString("es-UY");



// ── Chip de canal ─────────────────────────────────────────────────────────
//
// El color dice el estado de sincronizacion; el anillo, si esta seleccionado
// para el proximo Sincronizar. Son dos ejes independientes y por eso se pintan
// con recursos distintos: mezclarlos en el mismo (color) obligaria a elegir
// cual de los dos se ve.
const ROJO_SYNC = "#EF4444";
const VERDE_SYNC = "#16A34A";

function Canal({c,estado,sel,ocupado,onClick}:{
  c:CanalUI; estado:EstadoCanal; sel:boolean; ocupado?:boolean; onClick:()=>void;
}) {
  const [dn,setDn]=useState(false);

  /*
   * Canal sin habilitar: se ve y no se toca.
   *
   * No se pinta con su color de marca ni acepta clic — apretarlo no puede
   * hacer nada, y un boton que no hace nada se lee como que algo se rompio.
   * El motivo va en el tooltip, que es donde alguien lo va a buscar.
   */
  if (c.motivo) {
    return (
      <button disabled title={`${c.label} no está disponible: ${c.motivo}`}
        style={{padding:"2px 0",width:"100%",border:"1.5px dashed var(--border)",
          borderRadius:5,fontSize:"10px",fontWeight:800,letterSpacing:".02em",
          background:"#F8F9FB",color:"var(--gray-400)",cursor:"not-allowed"}}>
        {c.label}
      </button>
    );
  }

  const borde = estado==="error" ? ROJO_SYNC : estado==="ok" ? VERDE_SYNC : c.color;
  const relleno = estado==="error" ? ROJO_SYNC : estado==="ok" ? VERDE_SYNC
                : estado==="espera" ? c.color : "#fff";
  const texto = estado==="off" ? c.color
              : estado==="espera" ? c.tc : "#fff";
  const titulo = ocupado ? "Sincronizando…"
               : estado==="error" ? "Con error — clic para ver que corregir"
               : estado==="ok"    ? "Publicado"
               : estado==="espera"? "Habilitado, todavia sin publicar"
               : "Sin publicar en este canal";
  return (
    <button title={titulo}
      onMouseDown={()=>setDn(true)} onMouseUp={()=>{setDn(false);onClick();}}
      onMouseLeave={()=>setDn(false)} onTouchStart={()=>setDn(true)} onTouchEnd={()=>{setDn(false);onClick();}}
      style={{padding:"2px 0",width:"100%",border:`1.5px solid ${borde}`,borderRadius:5,
        fontSize:"10px",fontWeight:800,cursor:"pointer",letterSpacing:".02em",
        background:relleno, color:texto,
        outline: sel ? `2px solid ${borde}` : "none", outlineOffset: sel ? 1 : 0,
        boxShadow: estado!=="off" ? "inset 0 2px 5px rgba(0,0,0,.18)" : "0 2px 3px rgba(0,0,0,.08)",
        transform:dn?"translateY(1px) scale(.97)":"none",transition:"all .1s",
        opacity:ocupado?.55:1,
      }}>{ocupado?"···":c.label}</button>
  );
}

/**
 * Boton de la barra de acciones.
 *
 * Directo, sin desplegable: las acciones de esta pantalla son siete y entran
 * todas. Un menu que hay que abrir para elegir entre tres cosas cuesta dos
 * clics en lugar de uno y esconde lo que se puede hacer.
 */
/*
 * Acá vivía `Accion`, el botón de la barra. Se fue al shell
 * -components/BarraDeAcciones- porque cómo se ve una acción es una decisión del
 * panel, no de esta pantalla: teniéndolo acá, la pantalla siguiente lo copiaba
 * —o no— y el panel dejaba de parecer un solo producto.
 */

function PreciosEditor({form,setForm,color,lbl,inp}:{form:any;setForm:(f:any)=>void;color:string;lbl:any;inp:any}) {
  const GREEN = "var(--color-success)";
  const precios: any[] = (form.atributos?.precios)||[];
  const setPrecios = (ps:any[]) => {
    const nf = {...form, atributos:{...(form.atributos||{}),precios:ps}};
    if(ps.length>0){nf.precio=ps[0].precio||0;nf.precio_original=ps[0].oferta||undefined;}
    setForm(nf);
  };
  const addRow = () => {
    if(precios.length>=9) return;
    setPrecios([...precios,{precio:0,oferta:0,pct:0,fecha_ini:"",hora_ini:"",fecha_fin:"",hora_fin:"",etiqueta:""}]);
  };
  const updRow = (i:number,field:string,val:any) => {
    const ps=[...precios];
    ps[i]={...ps[i],[field]:val};
    if(field==="precio"||field==="oferta"){
      ps[i].pct=ps[i].precio&&ps[i].oferta&&ps[i].oferta<ps[i].precio
        ?Math.round((1-ps[i].oferta/ps[i].precio)*100):0;
    }
    setPrecios(ps);
  };
  const rows = precios.length>0 ? precios : [{precio:form.precio||0,oferta:form.precio_original||0,pct:0,fecha_ini:"",hora_ini:"",fecha_fin:"",hora_fin:"",etiqueta:"Principal"}];
  const s8:React.CSSProperties = {fontSize:"8px",color:"var(--gray-400)",fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:2};
  const ic:React.CSSProperties = {...inp,padding:"0.3rem 0.4rem",fontSize:"0.78rem"};
  // Los importes van a la derecha, igual que en el formulario y en la tabla.
  const icNum:React.CSSProperties = {...ic,...NUMERICO};
  // Placeholder watermark style inyectado globalmente una sola vez
  const placeholderStyle = `input::placeholder,textarea::placeholder{color:#D1D5DB!important;font-style:italic;font-size:0.72rem}`;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
      {rows.map((pr:any,i:number)=>(
        <div key={i} style={{padding:"0.4rem 0.6rem",background:"#fff",
          border:`1px solid ${i===0?color+"50":"#EAECF0"}`,borderRadius:7,
          display:"flex",flexDirection:"column",gap:"0.3rem"}}>
          {/* Fila 1: precio / % / oferta / etiqueta */}
          <div style={{display:"grid",gridTemplateColumns:"80px 30px 80px 1fr 18px",gap:"0.3rem",alignItems:"end"}}>
            <div><span style={s8}>Precio</span>
              <input type="number" style={icNum} value={pr.precio||""} min={0}
                onChange={e=>updRow(i,"precio",parseFloat(e.target.value)||0)}/></div>
            <div style={{textAlign:"center",paddingBottom:1}}>
              <span style={s8}>%</span>
              <div style={{fontSize:"0.82rem",fontWeight:800,color:pr.pct>0?GREEN:"#D1D5DB",lineHeight:1}}>
                {pr.pct>0?pr.pct:"—"}</div>
            </div>
            <div><span style={s8}>Oferta</span>
              <input type="number" style={icNum} value={pr.oferta||""} min={0} placeholder="—"
                onChange={e=>updRow(i,"oferta",parseFloat(e.target.value)||0)}/></div>
            <div><span style={s8}>Etiqueta</span>
              <input style={ic} value={pr.etiqueta||""} placeholder={i===0?"Principal":"Promo..."}
                onChange={e=>updRow(i,"etiqueta",e.target.value)}/></div>
            {i>0&&<button onClick={()=>setPrecios(precios.filter((_:any,j:number)=>j!==i))}
              style={{background:"none",border:"none",color:"#EF4444",cursor:"pointer",
              fontSize:"12px",fontWeight:700,alignSelf:"flex-end",paddingBottom:2}}>✕</button>}
          </div>
          {/* Fila 2: fechas */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 0.55fr 1fr 0.55fr",gap:"0.3rem"}}>
            <div><span style={s8}>Inicio</span>
              <input type="date" style={ic} value={pr.fecha_ini||""} onChange={e=>updRow(i,"fecha_ini",e.target.value)}/></div>
            <div><span style={s8}>Hora</span>
              <input type="time" style={ic} value={pr.hora_ini||""} onChange={e=>updRow(i,"hora_ini",e.target.value)}/></div>
            <div><span style={s8}>Fin</span>
              <input type="date" style={ic} value={pr.fecha_fin||""} onChange={e=>updRow(i,"fecha_fin",e.target.value)}/></div>
            <div><span style={s8}>Hora</span>
              <input type="time" style={ic} value={pr.hora_fin||""} onChange={e=>updRow(i,"hora_fin",e.target.value)}/></div>
          </div>
        </div>
      ))}
      {precios.length<9&&(
        <button onClick={addRow} style={{alignSelf:"flex-start",fontSize:"11px",fontWeight:700,
          color,border:`1px solid ${color}`,background:"#fff",borderRadius:5,
          padding:"2px 8px",cursor:"pointer",marginTop:2}}>+ Precio</button>
      )}
    </div>
  );
}

export default function AdminPublicaciones() {
  const {isSH, setTopStats} = useShop();
  // El alta se muestra dentro de esta misma pantalla: el usuario no pierde
  // de vista su lista ni los filtros que tenia puestos.
  const [showWizard,setShowWizard]=useState(false);
  // Qué toolbar-button abrió el alta: define en qué canal arranca el wizard
  // (Market / Second Hand). "Market +" y "Second +" funcionan siempre, sin
  // depender de que haya filas seleccionadas.
  const [wizardTipo,setWizardTipo]=useState<"market"|"secondhand">("market");

  /**
   * Lo que el formulario esta escribiendo, en vivo.
   *
   * Sin esto, dar de alta era escribir en un formulario y esperar a guardar
   * para ver si la fila queda como uno esperaba. Con el renglon arriba se ve
   * mientras se escribe: el titulo cortandose, el precio con su moneda, la
   * foto que quedo de portada.
   *
   * Sirve igual al editar. La regla es que mientras se edita la lista no se
   * reordena -reordenar debajo del cursor es perder el lugar-, pero la fila
   * del articulo que se esta tocando si tiene que reflejar lo que se toca.
   */
  const [resumen,setResumen]=useState<{
    nombre:string; precio:number; moneda:string; stock:number;
    imagen:string|null; estado:string; canales:string[]; tipo:string;
  }|null>(null);
  const [arts,   setArts]   = useState<Art[]>([]);
  const [deptos, setDeptos] = useState<any[]>([]);
  const [cats,   setCats]   = useState<any[]>([]);
  const [load,   setLoad]   = useState(true);
  const [sel,    setSel]    = useState<Set<string>>(new Set());
  const [exp,    setExp]    = useState<string|null>(null);
  const [sk,     setSk]     = useState<SK>(null);
  const [sd,     setSd]     = useState<"asc"|"desc">("asc");
  const [fst,    setFst]    = useState<string|null>(null);
  const [vcols,  setVcols]  = useState<Set<string>>(new Set(["alta"]));
  const [showC,  setShowC]  = useState(false);
  const [toast,  setToast]  = useState<{text:string;ok:boolean}|null>(null);
  const [eForm,  setEForm]  = useState<Partial<Art>>({});
  const [eTab,   setETab]   = useState(TABS[0]);
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);

  // Un error tiene que poder leerse: dura mas que una confirmacion, que solo
  // hay que registrar de reojo. Y se cancela el anterior para que dos avisos
  // seguidos no se pisen el temporizador.
  const tToast=useRef<number|undefined>(undefined);
  const notify=(t:string,ok=true)=>{
    window.clearTimeout(tToast.current);
    setToast({text:t,ok});
    tToast.current=window.setTimeout(()=>setToast(null),ok?3000:9000);
  };

  const reload = useCallback(async()=>{
    setLoad(true);
    const [dR,cR]=await Promise.all([
      supabase.from("departamentos").select("id,nombre").eq("activo",true).order("orden"),
      supabase.from("categorias").select("id,nombre,departamento_id").eq("activo",true).order("nombre"),
    ]);
    setDeptos(dR.data||[]);setCats(cR.data||[]);
    try{
      setArts((await fetchPublicaciones()).map(toArt));
    }catch(e){
      // Cero filas con sesión válida casi siempre significa que el claim
      // store_id no viaja en el JWT y RLS está filtrando todo.
      notify(e instanceof Error?e.message:String(e),false);
      setArts([]);
    }
    setLoad(false);
  },[]);

  useEffect(()=>{reload();},[reload]);

  const color = isSH ? GREEN : ACCENT;
  const tipo  = isSH ? "secondhand" : "market";

  const stats={
    total:arts.length,
    activos:arts.filter(a=>a.status==="active").length,
    borradores:arts.filter(a=>a.status==="draft").length,
    // catalog_* no registra clicks: impresiones/clicks/ranking_score no
    // tienen equivalente en el modelo nuevo. Ver nota en el handoff.
    clicks:0,
    errores:arts.filter(a=>(a.canales||[]).some(c=>c.status==="error")).length,
  };

  // Publicar stats a la topbar
  useEffect(()=>{
    setTopStats([
      {label:"Total",      value:stats.total,       color:"rgba(255,255,255,.75)"},
      {label:"Activos",    value:stats.activos,     color:GREEN},
      {label:"Borradores", value:stats.borradores,  color:"#F59E0B"},
      {label:"Clicks",     value:stats.clicks,      color:ACCENT},
      ...(stats.errores>0
        ? [{label:"Con error", value:stats.errores, color:"#EF4444"}]
        : []),
    ]);
    return()=>setTopStats([]);
  },[stats.total,stats.activos,stats.borradores,stats.clicks,stats.errores]);

  const activeArt = arts.find(a=>a.id===exp);
  const activeIds = sel.size>0?Array.from(sel):exp?[exp]:[];
  const has = activeIds.length>0;

  const sort=(k:SK)=>{if(sk===k)setSd(d=>d==="asc"?"desc":"asc");else{setSk(k);setSd("asc");}};
  const cycleSt=()=>{const o=[null,"active","draft","archived"];setFst(o[(o.indexOf(fst)+1)%o.length]);};

  const togSel=(id:string)=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const togAll=()=>{if(sel.size===filtered.length)setSel(new Set());else setSel(new Set(filtered.map(a=>a.id)));};
  const togExp=(id:string)=>{
    if(exp===id){setExp(null);setDirty(false);}
    else{const a=arts.find(x=>x.id===id);if(a){setEForm({...a});setETab(TABS[0]);}setExp(id);setDirty(false);}
  };

  // Chips seleccionados para el proximo Sincronizar, como "variantId|canal".
  // La clave compuesta permite elegir ML de un articulo y Meta de otro en la
  // misma pasada, que es lo que se hace cuando cada uno fallo por su lado.
  const [chips,setChips]=useState<Set<string>>(new Set());
  const [sincro,setSincro]=useState(false);
  // Chips en vuelo: sin esto la pantalla no cambia nada mientras se publica y
  // parece que el boton no hizo nada.
  const [sincronizando,setSincronizando]=useState<Set<string>>(new Set());
  // Lo que falta por articulo, segun la verificacion del servidor.
  const [problemas,setProblemas]=useState<Record<string,ProblemaPublicacion[]>>({});
  // Que canal se estaba mirando cuando se pidieron los problemas: el mismo
  // articulo puede fallar distinto en cada uno.
  const [canalConProblema,setCanalConProblema]=useState<Record<string,string>>({});
  // Un faltante y un rechazo se corrigen igual, pero no se cuentan igual: en el
  // rechazo el dato existe y el canal no lo acepto. Decir "falta el titulo"
  // sobre un titulo que esta cargado suena a error nuestro.
  const [origenProblema,setOrigenProblema]=useState<Record<string,"verificacion"|"rechazo">>({});
  // Lo que respondio el canal, textual. Se guarda siempre y se muestra siempre
  // -plegado-: si la traduccion se equivoca, el original es lo unico que
  // permite darse cuenta. Ocultarlo fue un error de mi parte y esto lo corrige.
  // `delCanal` distingue las palabras del canal de las nuestras: last_error
  // guarda las dos cosas -el rechazo textual, o el resumen de la verificacion
  // previa- y presentar lo segundo como "respuesta de Mercado Libre" es
  // atribuirle a otro lo que escribimos nosotros.
  const [crudoCanal,setCrudoCanal]=useState<Record<string,{texto:string;delCanal:boolean}>>({});

  // Los canales que se ofrecen son los que su motor declara operativos: no una
  // lista fija, ni lo que haya en los datos. Un canal cuyo modulo no esta
  // configurado -o cuya credencial vencio- no aparece, porque elegirlo solo
  // llevaria a un error mas adelante.
  const [canales,setCanales]=useState<CanalUI[]>([]);
  const [canalesFuera,setCanalesFuera]=useState<Array<{nombre:string;motivo:string}>>([]);
  // Nombre presentable por canal: en los textos va "Mercado Libre", no la clave
  // interna. Lo declara el motor, que es quien sabe como se llama.
  const [nombreCanal,setNombreCanal]=useState<Record<string,string>>({});

  useEffect(()=>{
    let vivo=true;
    (async()=>{
      const {disponibles,bloqueados}=await canalesDisponibles();
      if(!vivo)return;
      /*
       * Los canales que no estan habilitados TAMBIEN se muestran, apagados.
       *
       * Antes se ocultaban, y entonces una fila con Mercado Libre sin
       * configurar era indistinguible de una fila sin Mercado Libre: en las
       * dos no habia nada. Quien miraba no tenia forma de saber si el canal no
       * existe, si esta caido o si falta conectarlo.
       *
       * Van al final y en gris, con el motivo en el tooltip. El motivo lo
       * declara el motor del canal; la pantalla no sabe de ninguno por nombre.
       */
      setCanales([
        ...disponibles.map(d=>canalUI(d.channel)),
        ...bloqueados.map(b=>canalUI(b.channel, b.motivo)),
      ]);
      setNombreCanal(Object.fromEntries(
        [...disponibles,...bloqueados].map(d=>[d.channel,d.nombre])));
      setCanalesFuera(bloqueados.map(b=>({nombre:b.nombre,motivo:b.motivo})));
    })();
    return ()=>{vivo=false;};
  },[]);

  // Lo tipeado en el panel de correccion, por articulo y campo.
  const [correcciones,setCorrecciones]=useState<Record<string,Record<string,string>>>({});
  const [corrigiendo,setCorrigiendo]=useState(false);

  const claveChip=(id:string,canal:string)=>id+"|"+canal;

  /**
   * Guarda lo corregido y vuelve a preguntar que falta.
   *
   * Cada campo lo persiste el motor del canal, que es el que sabe donde vive:
   * unos son del catalogo y otros son atributos que solo existen para ese
   * canal. La pantalla solo junta lo que se escribio.
   */
  /**
   * Guarda lo corregido y publica.
   *
   * Antes eran dos pasos -guardar y verificar, despues elegir el chip y
   * sincronizar-, y el segundo habia que descubrirlo. Cuando alguien corrige
   * un rechazo lo que quiere es publicar; verificar es un medio, no el fin.
   */
  const guardarCorrecciones=async(a:Art)=>{
    const canal=canalConProblema[a.id];
    const vals=correcciones[a.id]??{};
    const pares=Object.entries(vals).filter(([,v])=>String(v).trim());
    if(!canal||!pares.length){notify("No hay nada nuevo para guardar",false);return;}
    setCorrigiendo(true);
    const fallos:string[]=[];
    for(const [campo,valor] of pares){
      const r=await corregirCampo(a.id,canal,campo,String(valor));
      if(!r.ok)fallos.push((r.motivo??campo));
    }
    setCorrecciones(p=>({...p,[a.id]:{}}));

    if(fallos.length){
      setCorrigiendo(false);
      await reload();
      notify(fallos[0],false);
      return;
    }

    // Guardado sin problemas: se publica. Si al canal todavia le falta algo, lo
    // dice el mismo camino de siempre y los campos quedan a la vista.
    const r=await sincronizarCanal(a.id,canal);
    setCorrigiendo(false);

    if(r.ok){
      setProblemas(p=>({...p,[a.id]:[]}));
      await reload();
      notify("Publicado en "+(nombreCanal[canal]??canal)+" ✓");
      return;
    }

    if(r.crudo)setCrudoCanal(p=>({...p,[a.id]:{texto:r.crudo!,delCanal:true}}));
    if(r.problemas?.length){
      setProblemas(p=>({...p,[a.id]:r.problemas!}));
      setOrigenProblema(p=>({...p,[a.id]:"rechazo"}));
      await reload();
      return; // lo que hay que hacer ya esta a la vista: no se repite en un aviso
    }
    // Sin campo que ofrecer, se vuelve a preguntar que falta antes de rendirse.
    const ps=await verificarCanal(a.id,canal);
    setProblemas(p=>({...p,[a.id]:ps}));
    setOrigenProblema(p=>({...p,[a.id]:"verificacion"}));
    await reload();
    if(ps.length===0)notify(r.motivo??"No se pudo publicar",false);
  };

  const togChip=(id:string,canal:string)=>{
    setChips(p=>{const n=new Set(p);const k=claveChip(id,canal);n.has(k)?n.delete(k):n.add(k);return n;});
  };

  /** Abre el articulo y trae del canal que hay que corregir. */
  const verProblemas=async(a:Art,canal:string)=>{
    if(exp!==a.id){setEForm({...a});setETab(TABS[0]);setExp(a.id);setDirty(false);}
    setProblemas(p=>({...p,[a.id]:[]}));
    const ps=await verificarCanal(a.id,canal);
    setProblemas(p=>({...p,[a.id]:ps}));
    setCanalConProblema(p=>({...p,[a.id]:canal}));
    setOrigenProblema(p=>({...p,[a.id]:"verificacion"}));
    // El rechazo anterior quedo guardado en el listing: se trae para que este
    // disponible aunque el fallo haya sido en otra sesion.
    const l=(a.canales??[]).find((x:any)=>x.channel===canal);
    // De last_error no se puede saber quien lo escribio, asi que no se le
    // atribuye al canal.
    if(l?.last_error)setCrudoCanal(p=>({...p,[a.id]:{texto:String(l.last_error),delCanal:false}}));
  };

  /**
   * Sincroniza los chips seleccionados.
   *
   * Se hace de a uno y en serie: son llamadas a APIs externas con limite de
   * frecuencia, y un lote en paralelo se come el rate limit sin ganar nada.
   */
  const sincronizar=async()=>{
    const pares=[...chips].map(k=>{const [id,canal]=k.split("|");return {id,canal};});
    if(!pares.length){
      notify("Primero elegí en qué canal publicar: tocá su botón en la columna Sync",false);
      return;
    }
    setSincro(true);
    let ok=0; const fallos:string[]=[]; let primerFallo:string|null=null;
    for(const {id,canal} of pares){
      const k=claveChip(id,canal);
      setSincronizando(p=>new Set(p).add(k));
      const r=await sincronizarCanal(id,canal);
      setSincronizando(p=>{const n=new Set(p);n.delete(k);return n;});
      if(r.ok){ok++;continue;}

      const nombre=arts.find(a=>a.id===id)?.nombre??id;
      // El motor ya devuelve el motivo redactado: quien lista no sabe traducir
      // la jerga de ningun canal, ni tiene por que aprenderla.
      fallos.push(nombre+" · "+canal+": "+(r.motivo??"No se pudo publicar"));

      // Y devuelve tambien QUE corregir, con la misma forma que un faltante.
      // Asi el rechazo termina en el formulario de siempre, con el campo
      // editable, en vez de en un aviso que hay que interpretar.
      if(r.problemas?.length){
        setProblemas(p=>({...p,[id]:r.problemas!}));
        setCanalConProblema(p=>({...p,[id]:canal}));
        setOrigenProblema(p=>({...p,[id]:"rechazo"}));
        primerFallo=primerFallo??id;
      }
      if(r.crudo)setCrudoCanal(p=>({...p,[id]:{texto:r.crudo!,delCanal:true}}));
    }
    setSincro(false);
    setChips(new Set());
    await reload();

    // Se abre el primero que fallo. Dejar el aviso y la fila cerrada obliga a
    // buscar cual fue y a abrirla a mano para hacer lo que ya sabemos que hay
    // que hacer.
    if(primerFallo){
      const a=arts.find(x=>x.id===primerFallo);
      if(a&&exp!==a.id){setEForm({...a});setETab(TABS[0]);setExp(a.id);setDirty(false);}
    }
    if(fallos.length===0){ notify("Sincronizado ✓ ("+ok+")"); return; }

    // Si el fallo abrio el panel con el campo, el aviso no lo repite: decir lo
    // mismo en dos lugares hace dudar de si son dos problemas. El panel gana
    // porque es donde se corrige.
    if(fallos.length===1&&primerFallo) return;
    if(fallos.length===1){ notify(fallos[0],false); return; }
    notify(fallos.length+" no se pudieron publicar. Tocá cada chip en rojo para ver qué corregir.",false);
  };

  const togSync=async(a:Art,k:string)=>{
    // sync_market/sync_second ya no son togglables: tipo se fija al crear el
    // producto (DEC-012). Solo los canales reales pasan por acá.
    if(k==="sync_market"||k==="sync_second")return;
    const canal=canales.find(c=>c.key===k);
    if(!canal)return;
    const v=!(a as any)[k];
    const{error}=await supabase.rpc("toggle_canal_publicacion",
      {p_variant_id:a.id,p_channel:canal.channel,p_activo:v});
    if(error){notify(error.message,false);return;}
    setArts(p=>p.map(x=>x.id===a.id?{...x,[k]:v}:x));
    if(exp===a.id)setEForm(f=>({...f,[k]:v}));
  };

  const chSt=async(ids:string[],status:string)=>{
    const rs=await Promise.all(ids.map(id=>
      supabase.rpc("actualizar_publicacion",{p_variant_id:id,p_status:status})));
    const err=rs.find(r=>r.error);
    if(err?.error){notify(err.error.message,false);return;}
    setArts(p=>p.map(a=>ids.includes(a.id)?{...a,status}:a));
    notify("Estado actualizado");
  };
  const clonar=async(a:Art)=>{
    const{error}=await supabase.rpc("crear_publicacion",{
      p_title:a.nombre+" (copia)", p_price:a.precio, p_tipo:a.tipo, p_currency:a.moneda||"UYU",
      p_description:a.descripcion??null, p_stock:a.stock??0,
      p_channels:canales.filter(c=>(a as any)[c.key]).map(c=>c.channel),
      p_status:"draft",
    });
    if(error){notify(error.message,false);return;}
    notify("Clonado");reload();
  };
  // catalog_items no tiene borrado lógico: 'archived' es su equivalente.
  const archivar=async(ids:string[])=>{await chSt(ids,"archived");};
  const eliminar=async(ids:string[])=>{
    if(!confirm("¿Archivar "+ids.length+" publicación(es)? Dejan de verse en la tienda pero no se borran."))return;
    await chSt(ids,"archived");
    setArts(p=>p.filter(a=>!ids.includes(a.id)));
    setExp(null);setSel(new Set());
  };

  const saveEdit=async()=>{
    if(!exp)return;setSaving(true);
    const{error}=await supabase.rpc("actualizar_publicacion",{
      p_variant_id:exp,
      p_title:eForm.nombre??null, p_description:eForm.descripcion??null,
      p_status:eForm.status??null, p_price:eForm.precio??null,
      p_currency:eForm.moneda||"UYU", p_sku:eForm.sku??null,
      p_stock:eForm.stock??null,
    });
    if(!error){setArts(p=>p.map(a=>a.id===exp?{...a,...eForm}:a));notify("Guardado");setDirty(false);}
    else notify(error.message,false);
    setSaving(false);
  };

  /**
   * Mientras hay un articulo abierto, la lista muestra solo ese.
   *
   * Las demas filas no aportan nada en ese momento y empujan el formulario
   * fuera de la pantalla. Se ocultan, no se descartan: el filtro y el orden
   * siguen intactos y al cerrar la lista vuelve como estaba.
   */
  let filtered=arts.filter(a=>{
    // Por `tipo` (DEC-012): Market y Second Hand son excluyentes -- un
    // producto vive en una lista o en la otra, nunca en las dos. Antes se
    // simulaba con un canal falso; ver catalog_producto_base.tipo.
    if(a.tipo!==tipo)return false;
    if(fst&&a.status!==fst)return false;
    return true;
  });
  if(sk){
    filtered=[...filtered].sort((a,b)=>{
      let va:any,vb:any;
      if(sk==="precio"){va=a.precio;vb=b.precio;}
      else if(sk==="stock"){va=a.stock;vb=b.stock;}
      else if(sk==="status"){va=a.status;vb=b.status;}
      else{va=a.published_at||a.created_at;vb=b.published_at||b.created_at;}
      return va<vb?(sd==="asc"?-1:1):va>vb?(sd==="asc"?1:-1):0;
    });
  }

  // Estilos tabla
  /*
   * Alto del encabezado, en pixeles.
   *
   * Sale de `thB`, no de medirlo: padding 0.45rem arriba y abajo (7.2 × 2),
   * texto de 10px con interlineado 1.2 (12), y el borde inferior de 2. Da 28,6
   * y se usa 29.
   *
   * Se necesita para pegar el renglon del articulo justo debajo del
   * encabezado. Medirlo en vivo fue peor: observar un elemento cuyo alto
   * depende de lo que se mide hace temblar la pantalla.
   */
  const ALTO_ENCABEZADO = 29;

  const thB:React.CSSProperties={padding:"0.45rem 0.65rem",textAlign:"left",fontSize:"10px",
    fontWeight:700,color:"var(--mute)",textTransform:"uppercase",letterSpacing:".05em",
    borderBottom:"2px solid #F3F4F6",background:"#FAFAFA",whiteSpace:"nowrap",userSelect:"none"};
  const thS=(k:SK):React.CSSProperties=>({...thB,cursor:"pointer",color:sk===k?color:"var(--mute)"});
  const td:React.CSSProperties={padding:"0.5rem 0.65rem",fontSize:"0.81rem",color:"#374151",
    borderBottom:"1px solid var(--gray-50)",verticalAlign:"middle"};
  const si=(k:SK)=>sk===k?(sd==="asc"?" ↑":" ↓"):" ↕";

  /** Celda que queda pegada justo debajo del encabezado al scrollear. */
  const pegado:React.CSSProperties={
    position:"sticky", top:ALTO_ENCABEZADO, zIndex:9, background:"#fff",
    borderBottom:"1px solid var(--border)",
  };

  const inp:React.CSSProperties={width:"100%",padding:"0.42rem 0.6rem",border:"1.5px solid var(--border)",
    borderRadius:7,fontSize:"0.81rem",outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"};
  const lbl:React.CSSProperties={fontSize:"10px",color:"var(--gray-400)",fontWeight:700,
    textTransform:"uppercase",marginBottom:3,display:"block"};

  // Panel expandido
  /**
   * Filas que se muestran.
   *
   * Con un articulo abierto, solo ese. Las demas no aportan en ese momento y
   * empujan el formulario fuera de la pantalla. Se ocultan, no se descartan:
   * el filtro y el orden siguen intactos y al cerrar la lista vuelve como
   * estaba.
   */
  const visibles = showWizard ? []
                 : exp ? filtered.filter(a => a.id === exp)
                 : filtered;

  const renderPanel=(a:Art|null,isNew=false)=>(
    <tr key={(a?.id||"new")+"-p"}>
      <td colSpan={99} style={{padding:0,borderBottom:`2px solid ${color}22`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr",background:"#F8F9FB",
          borderTop:`2px solid ${color}33`}}>
          {/* Izquierda: que falta + form */}
          <div style={{padding:"1rem 1.25rem",borderRight:"1px solid #EAECF0"}}>
            {!isNew&&a&&problemas[a.id]!==undefined&&(()=>{
              // Verde solo si de verdad esta todo bien. Con el canal en error y
              // sin faltantes no es "listo": es que no sabemos que mas pedir, y
              // decirlo en verde al lado de un chip rojo no cierra.
              const enError=(a.canales??[]).some((x:any)=>
                  x.channel===canalConProblema[a.id]&&x.status==="error");
              const tono=problemas[a.id].length?ROJO_SYNC:enError?"#B45309":VERDE_SYNC;
              const tonoFondo=problemas[a.id].length?"rgba(239,68,68,.06)"
                        :enError?"rgba(245,158,11,.10)":"rgba(22,163,74,.06)";
              return (
              <div style={{
                border:`1.5px solid ${tono}`, background:tonoFondo,
                borderRadius:9, padding:"0.7rem 0.85rem", marginBottom:"0.9rem",
              }}>
                <div style={{fontSize:"0.82rem",fontWeight:800,color:tono}}>
                  {(()=>{
                    const n=problemas[a.id].length;
                    const donde=nombreCanal[canalConProblema[a.id]]??canalConProblema[a.id]??"este canal";
                    if(n===0)return enError
                      ? donde+" rechazó la publicación y no pudimos deducir qué campo corregir"
                      : "No falta nada para publicar en "+donde;
                    if(origenProblema[a.id]==="rechazo")
                      return donde+" rechazó "+(n===1?"este dato":"estos "+n+" datos");
                    return n===1
                      ? "Falta una cosa para publicar en "+donde
                      : "Faltan "+n+" cosas para publicar en "+donde;
                  })()}
                </div>
                {problemas[a.id].length>0&&(
                  <>
                    {/* Cada faltante se muestra como el campo que hay que
                        completar, con las opciones que el canal acepta. Listar
                        el problema y mandar a otra pantalla a resolverlo es la
                        mitad del trabajo. */}
                    <div style={{display:"grid",gap:"0.55rem",marginTop:"0.6rem"}}>
                      {problemas[a.id].map((x,i)=>{
                        // Un rechazo no trae el valor actual -el canal informa
                        // que rechazo, no lo que tenemos-, asi que se toma del
                        // articulo. Sin esto el campo aparece vacio y parece
                        // que hay que escribirlo de cero.
                        const propio=x.campo==="title" ? a.nombre
                                   : x.campo==="price" ? String(a.precio??"")
                                   : x.campo==="stock" ? String(a.stock??"")
                                   : x.campo==="description" ? (a.descripcion??"")
                                   : "";
                        const val=correcciones[a.id]?.[x.campo]??x.valor??propio;
                        const listId="opc-"+a.id+"-"+x.campo.replace(/[^a-zA-Z0-9]/g,"");
                        return (
                          <label key={i} style={{display:"block"}}>
                            <span style={{fontSize:"0.73rem",color:"#374151",fontWeight:600}}>
                              {x.etiqueta}
                              <span style={{color:"var(--gray-400)",fontWeight:400}}> · {x.mensaje}</span>
                            </span>
                            <input
                              list={x.opciones?.length?listId:undefined}
                              type={x.tipo==="number"?"number":"text"}
                              value={val}
                              placeholder={x.opciones?.length?"Elegí o escribí…":""}
                              onChange={e=>setCorrecciones(p=>({
                                ...p,[a.id]:{...(p[a.id]??{}),[x.campo]:e.target.value},
                              }))}
                              style={{...inp,marginTop:3,
                                borderColor:String(val).trim()?"var(--border)":ROJO_SYNC}}/>
                            {!!x.opciones?.length&&(
                              <datalist id={listId}>
                                {x.opciones.map(o=><option key={o} value={o}/>)}
                              </datalist>
                            )}

                            {/* Contador: si el canal impone un largo, hay que
                                poder verlo mientras se escribe y no descubrirlo
                                al ser rechazado otra vez. */}
                            {!!x.maxLargo&&(
                              <div style={{fontSize:"0.7rem",marginTop:2,textAlign:"right",
                                color:String(val).length>x.maxLargo?ROJO_SYNC:"var(--gray-400)"}}>
                                {String(val).length} / {x.maxLargo}
                              </div>
                            )}

                            {/* Las reglas las declara el motor del canal. Decir
                                "no cumple las reglas" sin decir cuales deja a
                                la persona probando de a una. */}
                            {!!x.ayuda?.length&&(
                              <details style={{marginTop:4}}>
                                <summary style={{cursor:"pointer",fontSize:"0.72rem",color:BLUE,fontWeight:600}}>
                                  Cómo lo pide {nombreCanal[canalConProblema[a.id]]??"el canal"}
                                </summary>
                                <ul style={{margin:"5px 0 0",paddingLeft:17,fontSize:"0.72rem",
                                  color:"#4B5563",lineHeight:1.5}}>
                                  {x.ayuda.map((r,k)=><li key={k} style={{marginBottom:2}}>{r}</li>)}
                                </ul>
                              </details>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {!!crudoCanal[a.id]&&(
                      <details style={{marginTop:"0.6rem"}}>
                        <summary style={{cursor:"pointer",fontSize:"0.72rem",color:"var(--gray-400)"}}>
                          {crudoCanal[a.id].delCanal
                            ? "Respuesta textual de "+(nombreCanal[canalConProblema[a.id]]??"el canal")
                            : "Detalle del último intento"}
                        </summary>
                        <pre style={{fontSize:"0.68rem",whiteSpace:"pre-wrap",wordBreak:"break-word",
                          background:"#fff",border:"1px solid var(--border)",borderRadius:6,
                          padding:7,marginTop:5,maxHeight:130,overflow:"auto"}}>{crudoCanal[a.id].texto}</pre>
                      </details>
                    )}

                    {/* Es una acción, y se ve como cualquier otra del panel:
                        la dibuja el mismo componente del shell. */}
                    <div style={{display:"flex",gap:8,marginTop:"0.7rem"}}>
                      <BarraDeAccionesSuelta acciones={[{
                        label: corrigiendo ? "Publicando…" : "Guardar y sincronizar",
                        destacado: true, color: BLUE, desactivada: corrigiendo,
                        onClick: () => guardarCorrecciones(a),
                      }]}/>
                    </div>
                  </>
                )}
                {problemas[a.id].length===0&&(()=>{
                  // Que no falte nada no significa que el ultimo intento haya
                  // salido bien. Si el canal quedo en error, decirlo: si no, se
                  // lee "todo bien" arriba de un chip rojo y no cierra.
                  const canal=canalConProblema[a.id];
                  const l=(a.canales??[]).find((x:any)=>x.channel===canal);
                  const err=l?.status==="error"?l?.last_error:null;
                  return (
                    <div style={{fontSize:"0.78rem",color:"#374151",marginTop:2}}>
                      {err
                        ? <>El intento anterior falló, pero ya no falta ningún dato.
                            Volvé a tocar el canal y usá Sincronizar.
                            <details style={{marginTop:5}}>
                              <summary style={{cursor:"pointer",color:"var(--gray-400)",fontSize:"0.72rem"}}>
                                Ver el rechazo anterior
                              </summary>
                              <pre style={{fontSize:"0.68rem",whiteSpace:"pre-wrap",wordBreak:"break-word",
                                background:"#fff",border:"1px solid var(--border)",borderRadius:6,
                                padding:7,marginTop:5,maxHeight:120,overflow:"auto"}}>{String(err)}</pre>
                            </details>
                          </>
                        : "Tocá el canal en la columna Sync y usá Sincronizar."}
                    </div>
                  );
                })()}
              </div>
              );
            })()}

            {/* Los datos traidos de los canales pasaron al formulario, debajo de
                  la franja de avisos: es donde se editan las cosas, y tenerlos
                  en dos lugares los habria dejado diciendo distinto. */}

            {/*
              El mismo formulario que el alta, con el articulo cargado.
              Antes esto era un editor de pestañas propio: otra implementacion
              de lo mismo, que quedo atras de cada mejora hecha del lado del
              alta -el monitor de avisos, la condicion en una linea, las
              etiquetas adentro de los campos-. Uno solo no puede divergir.
            */}
            {a && (
              <AdminArticulos
                key={a.id}
                articulo={a}
                onResumen={setResumen}
                tipoInicial={(a as any).tipo === "secondhand" ? "secondhand" : "market"}
                onCancel={()=>{setExp(null);setResumen(null);}}
                onFinish={()=>{setExp(null);setResumen(null);reload();}}
              />
            )}

            {/* Canales y metricas, debajo del formulario y por ahora nada mas.
                Arriba competian con lo que se esta editando: lo primero que se
                ve al abrir un articulo tiene que ser el articulo. Donde van
                finalmente es una decision pendiente; abajo no estorban. */}
            {/* Canales del articulo: activar o dar de baja sin salir de aca */}
            {!isNew&&a&&(
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:"0.9rem"}}>
                <span style={{fontSize:"10px",fontWeight:700,color:"var(--gray-400)",
                  textTransform:"uppercase",letterSpacing:".08em"}}>Canales</span>
                {canales.map(c=>{
                  const activo=canalActivoEn(a,c.channel);
                  return (
                    <button key={c.key} onClick={()=>togSync(a,c.key)}
                      title={activo?"Dar de baja en este canal":"Activar este canal"}
                      style={{
                        padding:"3px 9px",borderRadius:999,fontSize:"0.72rem",fontWeight:700,
                        cursor:"pointer",border:`1.5px solid ${c.color}`,
                        background:activo?c.color:"#fff",color:activo?c.tc:c.color,
                      }}>{activo?"✓ ":"+ "}{c.label}</button>
                  );
                })}
                <span style={{fontSize:"0.7rem",color:"var(--gray-400)"}}>
                  Activar lo suma al catálogo; publicar es Sincronizar.
                </span>
              </div>
            )}


            {!isNew&&a&&(
              <div style={{marginTop:"0.9rem"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"var(--gray-400)",
                  textTransform:"uppercase",letterSpacing:".08em",marginBottom:"0.6rem"}}>Métricas</div>
                <BloqueMetricas a={a}/>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    /*
      Alto de la pagina, y minHeight 0 para que el scroll sea de la tabla.
   
      Sin minHeight, el contenedor de la tabla no se encoge por debajo de su
      contenido: el formulario lo empuja, el `overflow:hidden` de la tarjeta no
      alcanza a nada y termina scrolleando el main, llevandose la barra de
      acciones y el encabezado.
    */
    <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",
      height:"100%",minHeight:0}}>

      {/* TABLA — flex:1 + overflow hidden para scroll solo en tbody */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #EAECF0",
        display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>

        {/* La barra la dibuja el shell; acá sólo se declara qué hace esta
            pantalla. Antes el estilo vivía acá, así que cada pantalla nueva lo
            copiaba —o no— y el panel dejaba de parecer un solo producto. */}
        <BarraDeAcciones
          acciones={[
            /* Market + / Second + reemplazan a "Nuevo": llevan directo al alta
               de un artículo en el canal correspondiente. Sin `desactivada`:
               deben funcionar siempre, sin depender de que haya filas
               elegidas. */
            { label:"Market +", destacado:true, color:BLUE,
              onClick:()=>{setWizardTipo("market");setShowWizard(true);setExp(null);setResumen(null);} },
            { label:"Second +", destacado:true, color:GREEN,
              onClick:()=>{setWizardTipo("secondhand");setShowWizard(true);setExp(null);setResumen(null);} },
            "separador",
            { label:"Publicar", color:GREEN, desactivada:!has,
              motivo:"Elegí al menos una publicación",
              onClick:()=>chSt(activeIds,"active") },
            { label:"Ocultar", color:"#F59E0B", desactivada:!has,
              motivo:"Elegí al menos una publicación",
              onClick:()=>chSt(activeIds,"draft") },
            { label:"Archivar", color:"var(--mute)", desactivada:!has,
              motivo:"Elegí al menos una publicación",
              onClick:()=>archivar(activeIds) },
            { label:"Duplicar", color:BLUE, desactivada:!has||sel.size>1,
              motivo: sel.size>1 ? "Se duplica de a una" : "Elegí una publicación",
              onClick:()=>activeArt&&clonar(activeArt) },
            { label:"Eliminar", color:"#EF4444", desactivada:!has,
              motivo:"Elegí al menos una publicación",
              onClick:()=>eliminar(activeIds) },
            "separador",
            /* Sin chips elegidos el botón NO se apaga: se aprieta y dice que
               falta elegir. Un botón apagado que no explica por qué es la misma
               pregunta —"¿pasó algo?"— sin respuesta. */
            { label: sincro ? "Sincronizando…" : "Sincronizar"+(chips.size?" ("+chips.size+")":""),
              destacado:true, color:BLUE, desactivada:sincro,
              onClick:sincronizar },
            /* Volver: sólo con la ficha abierta. Va en la barra y no dentro del
               formulario porque es una acción sobre la pantalla, no sobre el
               artículo. */
            ...((showWizard||exp) ? [
              "separador" as const,
              { label:"← Volver", color:"var(--mute)",
                onClick:()=>{setShowWizard(false);setExp(null);setResumen(null);} },
            ] : []),
          ]}
          derecha={<>
            {/* Canales que no se ofrecen y por qué: no aparecen en la tabla,
                así que sin esto la ausencia no se distingue de un olvido. */}
            {canalesFuera.length>0&&(
              <span title={canalesFuera.map(c=>c.nombre+": "+c.motivo).join(" · ")}
                style={{fontSize:"0.72rem",color:"#B45309",fontWeight:600,
                  background:"rgba(245,158,11,.12)",padding:"3px 9px",borderRadius:999,
                  cursor:"help",whiteSpace:"nowrap"}}>
                {canalesFuera.length===1
                  ? canalesFuera[0].nombre+" no está disponible"
                  : canalesFuera.length+" canales no están disponibles"}
              </span>
            )}

            {sel.size>0&&(
              <span style={{fontSize:"0.72rem",color:BLUE,fontWeight:700,
                padding:"0.22rem 0.6rem",borderRadius:6,
                background:"color-mix(in srgb, var(--brand-navy) 8%, transparent)"}}>
                {sel.size} sel.
              </span>
            )}

            {/* Guardar / Cancelar — sólo cuando hay cambios */}
            {dirty&&(
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setExp(null);setDirty(false);}} style={{padding:"0.35rem 0.8rem",
                  border:"1.5px solid var(--border)",borderRadius:7,background:"#fff",
                  color:"var(--mute)",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                  Cancelar
                </button>
                <button onClick={saveEdit} disabled={saving} style={{
                  padding:"0.35rem 0.8rem",border:"none",borderRadius:7,
                  background:color,color:"#fff",fontSize:"0.78rem",fontWeight:700,
                  cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1,
                }}>{saving?"Guardando...":"Guardar"}</button>
              </div>
            )}

            {/* Columnas — al final del todo */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowC(p=>!p)} style={{
                padding:"0.5rem 0.8rem",border:"none",background:"transparent",cursor:"pointer",
                fontSize:"0.78rem",fontWeight:showC?700:500,color:showC?"#111":"#555",
                display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap",
              }}>Columnas <span style={{fontSize:"8px",opacity:.6}}>▾</span></button>
              {showC&&(
                <div style={{position:"absolute",right:0,top:"100%",background:"#fff",
                  border:"1.5px solid var(--border)",borderRadius:10,padding:"0.5rem",
                  zIndex:300,minWidth:155,boxShadow:"0 8px 24px rgba(0,0,0,.12)"}}
                  onMouseLeave={()=>setShowC(false)}>
                  {XCOLS.map(col=>(
                    <label key={col.id} style={{display:"flex",alignItems:"center",gap:8,
                      padding:"0.28rem 0",cursor:"pointer",fontSize:"0.8rem",color:"#374151"}}>
                      <input type="checkbox" checked={vcols.has(col.id)} style={{accentColor:color}}
                        onChange={()=>setVcols(p=>{const n=new Set(p);n.has(col.id)?n.delete(col.id):n.add(col.id);return n;})}/>
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>}
        />

        {/* Aviso en linea, en el flujo de la pagina y pegado a la barra.
            El cartel flotante abajo a la derecha se elimino: aparecia lejos de
            donde estaba pasando la cosa y, cuando el detalle ya mostraba el
            problema, terminaba diciendo lo mismo en dos lugares. */}
        {toast&&(
          <div style={{
            display:"flex",alignItems:"center",gap:8,flexShrink:0,
            padding:"0.6rem 1rem",fontSize:"0.8rem",fontWeight:600,
            background:toast.ok?"#f0fdf4":"#fef2f2",
            color:toast.ok?"#166534":"#dc2626",
            borderBottom:`1px solid ${toast.ok?"#bbf7d0":"#fecaca"}`,
          }}>
            <span>{toast.ok?"✓":"✕"}</span>
            <span style={{flex:1}}>{toast.text}</span>
            <button onClick={()=>setToast(null)} aria-label="Cerrar"
              style={{border:"none",background:"none",cursor:"pointer",
                color:"inherit",opacity:.7,fontSize:"1rem",lineHeight:1}}>×</button>
          </div>
        )}

        {/*
          La tabla no se va: se acota.

          Dar de alta o abrir un articulo deja de ser irse a otra pantalla. La
          tabla queda -con su encabezado, sus filtros y su orden- y solo se
          muestra la fila en cuestion, con el formulario debajo. Al cerrar, la
          lista vuelve tal cual estaba.

          Reemplazarla obligaba a reconstruir el contexto al volver: donde
          estaba, que habia filtrado, cual era la fila. Acotarla no.
        */}
        {load?(
          <div style={{textAlign:"center",padding:"3rem",color:"var(--gray-400)",flex:1}}>Cargando...</div>
        ):(
          /* El unico que scrollea: de acá para abajo. La barra de acciones, el
             encabezado de la tabla y la fila del articulo quedan arriba. */
          <div style={{overflowY:"auto",flex:1,minHeight:0}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr>
                  <th style={{...thB,width:34}}>
                    <input type="checkbox" checked={sel.size===filtered.length&&filtered.length>0}
                      onChange={togAll} style={{accentColor:color}}/>
                  </th>
                  <th style={{...thB,width:48}}>Foto</th>
                  <th style={thB}>Nombre</th>
                  {/* Importes a la derecha, encabezado incluido: una columna
                      de numeros se compara de un vistazo solo si las unidades
                      caen todas en la misma linea. */}
                  <th style={{...thS("precio"),textAlign:"right"}} onClick={()=>sort("precio")}>Precio{si("precio")}</th>
                  <th style={{...thS("stock"),textAlign:"right"}}  onClick={()=>sort("stock")}>Stock{si("stock")}</th>
                  <th style={{...thS("status"),cursor:"pointer"}} onClick={cycleSt}>
                    Estado{fst?" · "+S[fst]?.label:"↕"}
                  </th>
                  <th style={{...thB,textAlign:"center",minWidth:132}}>Sync</th>
                  <th style={thB}>Departamento</th>
                  <th style={thS("alta")} onClick={()=>sort("alta")}>Alta{si("alta")}</th>
                  {vcols.has("categoria")&&<th style={thB}>Categoría</th>}
                  {vcols.has("marca")    &&<th style={thB}>Marca</th>}
                  {vcols.has("ranking")  &&<th style={{...thB,textAlign:"right"}}>Ranking</th>}
                  {vcols.has("ctr")      &&<th style={{...thB,textAlign:"right"}}>CTR</th>}
                  {vcols.has("baja")     &&<th style={thB}>Baja</th>}
                  {vcols.has("mkt1")     &&<th style={thB}>MKT 1</th>}
                  {vcols.has("mkt2")     &&<th style={thB}>MKT 2</th>}
                  <th style={{...thB,width:34}}/>
                </tr>
              </thead>
              <tbody>
                {/* El alta va como una fila mas: la tabla no cambia de forma
                    para recibirla, y al terminar la fila real ocupa su lugar. */}
                {showWizard&&(
                  <>
                    {/* El renglon del articulo que se esta dando de alta, arriba
                        del formulario y completandose mientras se escribe.

                        Es la misma fila que va a quedar: mismas columnas, mismo
                        formato de precio, misma foto de portada. Por eso se ve
                        el titulo cortandose antes de guardar, y no despues.

                        Lo que todavia no se escribio se muestra con una raya
                        gris, no en blanco: un hueco no dice si falta o si no
                        aplica. */}
                    {/*
                      Queda pegado abajo del encabezado mientras se scrollea el
                      formulario. Es la fila del articulo que se esta cargando:
                      perderla de vista al bajar deja el formulario sin decir
                      sobre que se esta trabajando.

                      El sticky va en cada celda y no en el <tr>: un tr no
                      acepta position sticky en la mayoria de los navegadores.
                    */}
                    <tr style={{
                      background:"#fff",
                      borderLeft:`3px solid ${color}`,
                      // Punteado hasta que exista de verdad: es una fila que
                      // todavia no esta guardada, y tiene que verse asi.
                      outline:`1px dashed ${color}55`, outlineOffset:-1,
                    }}>
                      <td style={{...td,...pegado}}/>
                      <td style={{...td,...pegado}}>
                        <div style={{width:38,height:38,borderRadius:6,overflow:"hidden",background:"#F3F4F6"}}>
                          {resumen?.imagen
                            ?<img src={resumen.imagen} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",
                              justifyContent:"center",fontSize:"1.1rem",opacity:.5}}>
                              {wizardTipo==="secondhand"?"♻️":"🛍"}
                            </div>}
                        </div>
                      </td>
                      <td style={{...td,...pegado,maxWidth:200}}>
                        <div style={{fontWeight:600,color:resumen?.nombre?"#111":"var(--gray-400)",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {resumen?.nombre||"Sin título todavía"}
                        </div>
                      </td>
                      <td style={{...td,...pegado,fontWeight:700,...NUMERICO,
                        color:resumen?.precio?color:"var(--gray-400)"}}>
                        {resumen?.precio?fmtP(resumen.precio,resumen.moneda):"—"}
                      </td>
                      <td style={{...td,...pegado,...NUMERICO,color:"var(--gray-400)"}}>
                        {resumen?.stock??"—"}
                      </td>
                      <td style={{...td,...pegado}}>
                        <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:20,
                          background:"var(--gray-100,#F3F4F6)",color:"var(--gray-400)",fontWeight:700}}>
                          Sin guardar
                        </span>
                      </td>
                      <td colSpan={99} style={{...td,...pegado,color:"var(--gray-400)",fontSize:"0.78rem"}}>
                        Se completa mientras escribís. Al guardar ocupa su lugar en la lista.
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={99} style={{padding:0,background:"#fff"}}>
                        <AdminArticulos
                          key={wizardTipo}
                          tipoInicial={wizardTipo}
                          onResumen={setResumen}
                          onCancel={()=>{setShowWizard(false);setResumen(null);}}
                          onFinish={()=>{setShowWizard(false);setResumen(null);reload();}}
                        />
                      </td>
                    </tr>
                  </>
                )}
                {showWizard?null:filtered.length===0?(
                  <tr><td colSpan={99} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{fontSize:"2.5rem"}}>📦</div>
                    <div style={{fontWeight:700,color:"#374151",marginTop:"0.5rem"}}>Sin publicaciones</div>
                    <div style={{color:"var(--gray-400)",fontSize:"0.82rem",marginTop:"0.25rem"}}>
                      Usá el menú Artículo → + Nuevo artículo para empezar
                    </div>
                  </td></tr>
                ):visibles.map(aOrig=>{
                  const isE=exp===aOrig.id;
                  /*
                   * Mientras se edita, la fila muestra lo que el formulario
                   * tiene ahora, no lo que hay guardado. Ver el titulo
                   * cortandose o el precio con su moneda es justo lo que la
                   * fila puede decir y el formulario no.
                   *
                   * La lista NO se reordena por esto: el orden se recalcula
                   * recien al guardar. Reordenar debajo del cursor es hacerle
                   * perder el lugar a quien esta trabajando.
                   */
                  const a=(isE&&resumen)
                    ? {...aOrig,
                       nombre:           resumen.nombre,
                       precio:           resumen.precio,
                       moneda:           resumen.moneda,
                       stock:            resumen.stock,
                       imagen_principal: resumen.imagen ?? aOrig.imagen_principal,
                       status:           resumen.estado}
                    : aOrig;
                  const cfg=S[a.status]||S.draft;
                  const isS=sel.has(aOrig.id);
                  // Con el articulo abierto su fila queda pegada al
                  // encabezado: al bajar por el formulario hay que seguir
                  // viendo cual se esta editando.
                  const cel:React.CSSProperties = isE ? {...td,...pegado} : td;
                  const ctr=a.impresiones?Math.round((a.clicks||0)/a.impresiones*100):0;
                  return(
                    <>
                      <tr key={aOrig.id} style={{
                        background:isE?`${color}06`:isS?`${color}03`:"#fff",
                        borderLeft:isE?`3px solid ${color}`:"3px solid transparent",
                        transition:"all .1s",
                      }}>
                        <td style={cel}><input type="checkbox" checked={isS}
                          onChange={()=>togSel(aOrig.id)} style={{accentColor:color}}/></td>
                        <td style={cel}>
                          <div style={{width:38,height:38,borderRadius:6,overflow:"hidden",background:"#F3F4F6"}}>
                            {a.imagen_principal
                              ?<img src={a.imagen_principal} alt={a.nombre} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>
                                {a.tipo==="secondhand"?"♻️":"🛍"}
                              </div>
                            }
                          </div>
                        </td>
                        <td style={{...cel,maxWidth:200}}>
                          <div style={{fontWeight:600,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre}</div>
                          {a.condicion&&<div style={{fontSize:"10px",color:"var(--gray-400)"}}>{a.condicion}</div>}
                        </td>
                        <td style={{...cel,fontWeight:700,color,...NUMERICO}}>{fmtP(a.precio,a.moneda)}</td>
                        <td style={{...cel,...NUMERICO}}>
                          <span style={{color:a.stock===0?"#EF4444":a.stock<5?"#F59E0B":"#374151",fontWeight:a.stock<5?700:400}}>{a.stock}</span>
                        </td>
                        <td style={cel}>
                          <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:20,
                            background:cfg.bg,color:cfg.color,fontWeight:700}}>{cfg.label}</span>
                        </td>
                        <td style={{...cel,padding:"0.4rem 0.5rem"}}>
                          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,Math.min(canales.length,4))},1fr)`,gap:"3px"}}>
                            {canales.map(c=>{
                              const est=estadoDeCanal(a.canales?{channels:a.canales} as any:undefined,c.channel);
                              return (
                                <Canal key={c.key} c={c} estado={est}
                                  sel={chips.has(claveChip(aOrig.id,c.channel))}
                                  ocupado={sincronizando.has(claveChip(aOrig.id,c.channel))}
                                  // Un chip en rojo hace las dos cosas: queda
                                  // elegido y abre lo que hay que corregir. Que
                                  // no se pudiera elegir bloqueaba justo el
                                  // reintento despues de arreglarlo, y el boton
                                  // quedaba apagado sin decir por que.
                                  onClick={()=>{
                                    togChip(aOrig.id,c.channel);
                                    if(est==="error")verProblemas(aOrig,c.channel);
                                  }}/>
                              );
                            })}
                          </div>
                        </td>
                        <td style={cel}>{a.departamento_nombre||"—"}</td>
                        <td style={cel}>{fmt(a.published_at||a.created_at)}</td>
                        {vcols.has("categoria")&&<td style={cel}>{a.categoria_nombre||"—"}</td>}
                        {vcols.has("marca")    &&<td style={cel}>{a.atributos?.marca||"—"}</td>}
                        {vcols.has("ranking")  &&<td style={{...cel,...NUMERICO}}>{a.ranking_score?Number(a.ranking_score).toFixed(2):"—"}</td>}
                        {vcols.has("ctr")      &&<td style={{...cel,...NUMERICO}}>{ctr}%</td>}
                        {vcols.has("baja")     &&<td style={cel}>{fmt(a.baja_prevista||a.deleted_at)}</td>}
                        {vcols.has("mkt1")     &&<td style={{...cel,textAlign:"center"}}><input type="checkbox" checked={false} style={{accentColor:color}} onChange={()=>{}}/></td>}
                        {vcols.has("mkt2")     &&<td style={{...cel,textAlign:"center"}}><input type="checkbox" checked={false} style={{accentColor:color}} onChange={()=>{}}/></td>}
                        <td style={cel}>
                          <button onClick={()=>{togExp(aOrig.id);setResumen(null);}} style={{
                            background:"none",border:"none",cursor:"pointer",
                            color:isE?color:"#CBD5E1",fontSize:"12px",padding:"2px 4px",
                            transform:isE?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",
                          }}>▼</button>
                        </td>
                      </tr>
                      {isE&&renderPanel(aOrig,false)}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



