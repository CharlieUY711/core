import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";
import { fetchPublicaciones, type Publicacion } from "../hooks/useCatalogPublicaciones";
import { sincronizarCanal, verificarCanal, canalesDisponibles, corregirCampo,
         type ProblemaPublicacion } from "../utils/canalesSync";
import AdminArticulos from "./AdminArticulos";

const ACCENT = "var(--brand-madre)";
const GREEN  = "var(--color-success)";
const BLUE   = "var(--brand-navy)";

const TABS = ["Información","Multimedia","Moneda y Precio","Detalles","Inventario","Vista previa"];
// Pestañas cuyos campos aún no tienen destino en catalog_*: se avisa en el
// formulario en vez de descartar lo que el usuario escribe sin decir nada.
const PENDIENTES = ["Multimedia","Detalles","Vista previa"];
const CONDICIONES = ["Nuevo","Excelente","Muy bueno","Bueno","Regular","Para reparar"];
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

export interface CanalUI { key:string; channel:string; label:string; color:string; tc:string }

const canalUI = (channel:string):CanalUI => {
  const e = ESTETICA_CANAL[channel];
  return {
    key:     "sync_" + channel,
    channel,
    label:   e?.label ?? etiquetaDe(channel),
    color:   e?.color ?? NEUTRO.color,
    tc:      e?.tc    ?? NEUTRO.tc,
  };
};

// Market y Second Hand NO son canales de distribucion: son el tipo del
// articulo (nuevo o usado) y son excluyentes entre si. Viven aca solo para que
// toArt y clonar puedan resolver a que lista pertenece cada publicacion.
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
  peso_kg?:number; garantia_tipo?:string; garantia_meses?:number;
  sync_ml?:boolean; sync_meta?:boolean; sync_wa?:boolean; sync_web?:boolean;
  // Añadidos por la migración a catalog_*: `id` es el variant_id, y estos dos
  // conservan lo que la forma plana de Art no puede representar.
  item_id?:string; canales?:Publicacion["channels"];
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
    tipo:        canalActivo(p,"secondhand") && !canalActivo(p,"market") ? "secondhand" : "market",
    status:      p.item_status,
    precio:      p.master_price ?? 0,
    moneda:      p.master_currency,
    stock:       p.total_available,
    created_at:  p.created_at,
    published_at:p.item_status === "active" ? p.updated_at : undefined,
    canales:     p.channels,
    sync_market: canalActivo(p,"market"),
    sync_second: canalActivo(p,"secondhand"),
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
function Accion({label,onClick,dis,color,destacado}:{
  label:string; onClick:()=>void; dis?:boolean; color?:string; destacado?:boolean;
}) {
  return (
    <button onClick={()=>!dis&&onClick()} disabled={dis} title={dis?"Elegí al menos una publicación":undefined}
      style={{
        padding:"0.42rem 0.7rem", borderRadius:7, whiteSpace:"nowrap",
        fontSize:"0.76rem", fontWeight:700, fontFamily:"DM Sans,sans-serif",
        cursor:dis?"not-allowed":"pointer", transition:"all .12s",
        border: destacado?"none":`1.5px solid ${dis?"#E5E7EB":(color??"var(--border)")}`,
        background: destacado?(dis?"#CBD5E1":(color??"#111")):"#fff",
        color: destacado?"#fff":(dis?"#CBD5E1":(color??"#374151")),
        opacity: dis?.75:1,
      }}>{label}</button>
  );
}



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
              <input type="number" style={ic} value={pr.precio||""} min={0}
                onChange={e=>updRow(i,"precio",parseFloat(e.target.value)||0)}/></div>
            <div style={{textAlign:"center",paddingBottom:1}}>
              <span style={s8}>%</span>
              <div style={{fontSize:"0.82rem",fontWeight:800,color:pr.pct>0?GREEN:"#D1D5DB",lineHeight:1}}>
                {pr.pct>0?pr.pct:"—"}</div>
            </div>
            <div><span style={s8}>Oferta</span>
              <input type="number" style={ic} value={pr.oferta||""} min={0} placeholder="—"
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
  const [crudoCanal,setCrudoCanal]=useState<Record<string,string>>({});

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
      setCanales(disponibles.map(d=>canalUI(d.channel)));
      setNombreCanal(Object.fromEntries(disponibles.map(d=>[d.channel,d.nombre])));
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

    if(r.crudo)setCrudoCanal(p=>({...p,[a.id]:r.crudo!}));
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
    if(l?.last_error)setCrudoCanal(p=>({...p,[a.id]:String(l.last_error)}));
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
      if(r.crudo)setCrudoCanal(p=>({...p,[id]:r.crudo!}));
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
    const canal=[...CANALES_BASE,...canales].find(c=>c.key===k);
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
      p_title:a.nombre+" (copia)", p_price:a.precio, p_currency:a.moneda||"UYU",
      p_description:a.descripcion??null, p_stock:a.stock??0,
      p_channels:[...CANALES_BASE,...canales].filter(c=>(a as any)[c.key]).map(c=>c.channel),
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

  let filtered=arts.filter(a=>{
    // Por canal, no por `tipo`: un producto publicado en Market y en Second
    // Hand debe aparecer en las dos vistas, no solo en una.
    if(!(a.canales||[]).some(c=>c.channel===tipo&&c.status!=="delisted"))return false;
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
  const thB:React.CSSProperties={padding:"0.45rem 0.65rem",textAlign:"left",fontSize:"10px",
    fontWeight:700,color:"var(--mute)",textTransform:"uppercase",letterSpacing:".05em",
    borderBottom:"2px solid #F3F4F6",background:"#FAFAFA",whiteSpace:"nowrap",userSelect:"none"};
  const thS=(k:SK):React.CSSProperties=>({...thB,cursor:"pointer",color:sk===k?color:"var(--mute)"});
  const td:React.CSSProperties={padding:"0.5rem 0.65rem",fontSize:"0.81rem",color:"#374151",
    borderBottom:"1px solid var(--gray-50)",verticalAlign:"middle"};
  const si=(k:SK)=>sk===k?(sd==="asc"?" ↑":" ↓"):" ↕";

  const inp:React.CSSProperties={width:"100%",padding:"0.42rem 0.6rem",border:"1.5px solid var(--border)",
    borderRadius:7,fontSize:"0.81rem",outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"};
  const lbl:React.CSSProperties={fontSize:"10px",color:"var(--gray-400)",fontWeight:700,
    textTransform:"uppercase",marginBottom:3,display:"block"};



  // Render form tabs
  const renderForm=(form:Partial<Art>,setForm:(f:Partial<Art>)=>void,tab:string,setTab:(t:string)=>void)=>{
    const cf=cats.filter(c=>c.departamento_id===form.departamento_id);
    return(
      <>
        <div style={{display:"flex",marginBottom:"0.9rem",gap:"2px",flexWrap:"nowrap",overflow:"hidden"}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"0.35rem 0.7rem",border:"none",cursor:"pointer",
              fontSize:"0.72rem",fontWeight:tab===t?800:500,whiteSpace:"nowrap",
              color:tab===t?color:"var(--gray-400)",
              background:tab===t?`${color}12`:"transparent",
              borderRadius:6, transition:"all .15s",
            }}>{t}</button>
          ))}
        </div>
        {PENDIENTES.includes(tab)&&(
          <div style={{marginBottom:"0.8rem",padding:"0.5rem 0.7rem",borderRadius:7,
            fontSize:"0.72rem",lineHeight:1.5,color:"#854d0e",background:"#fef9c3",
            border:"1px solid #fde68a"}}>
            Los campos de esta pestaña <strong>todavía no se guardan</strong>. La publicación
            se crea con título, descripción, SKU, precio, moneda, stock y canales.
            Categorías, imágenes y detalles se conectan en la próxima fase.
          </div>
        )}
        {tab==="Información"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
            <div><span style={lbl}>Nombre *</span>
              <input style={inp} value={form.nombre||""} placeholder="Ej: iPhone 14 Pro 256GB Negro"
                onChange={e=>setForm({...form,nombre:e.target.value})}/>
            </div>
            <div><span style={lbl}>Descripción</span>
              <textarea style={{...inp,minHeight:75,resize:"vertical"}} value={form.descripcion||""}
                onChange={e=>setForm({...form,descripcion:e.target.value})}/>
            </div>
            <div style={{fontSize:"0.68rem",color:"var(--gray-400)",marginBottom:4}}>
              Departamento y categoria todavia no se guardan: la taxonomia del
              modelo multicanal se conecta en la proxima fase.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              <div><span style={lbl}>Departamento</span>
                <select style={inp} value={form.departamento_id||""} onChange={e=>{
                  const d=deptos.find(x=>x.id===e.target.value);
                  setForm({...form,departamento_id:e.target.value,departamento_nombre:d?.nombre||"",categoria_id:"",categoria_nombre:""});
                }}>
                  <option value="">Seleccionar...</option>
                  {deptos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div><span style={lbl}>Categoría</span>
                <select style={inp} value={form.categoria_id||""} onChange={e=>{
                  const c=cats.find(x=>x.id===e.target.value);
                  setForm({...form,categoria_id:e.target.value,categoria_nombre:c?.nombre||""});
                }}>
                  <option value="">Seleccionar...</option>
                  {cf.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            {isSH&&<div><span style={lbl}>Condición *</span>
              <select style={inp} value={form.condicion||""} onChange={e=>setForm({...form,condicion:e.target.value})}>
                <option value="">Seleccionar...</option>
                {CONDICIONES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>}

          </div>
        )}
        {tab==="Multimedia"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            {/* Preview de imágenes seleccionadas */}
            {(form.imagenes||[]).length>0&&(
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                {(form.imagenes||[]).map((img:any,i:number)=>{
                  const url = typeof img==="string"?img:img?.url;
                  return url?(
                    <div key={i} style={{position:"relative",width:64,height:64,borderRadius:8,
                      overflow:"hidden",border:i===0?`2.5px solid ${color}`:"1.5px solid var(--border)",
                      flexShrink:0}}>
                      <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}
                        onError={e=>(e.currentTarget.style.display="none")}/>
                      {i===0&&<div style={{position:"absolute",bottom:0,left:0,right:0,
                        background:"rgba(0,0,0,.5)",color:"#fff",fontSize:"8px",
                        textAlign:"center",padding:"1px",fontWeight:700}}>PRINCIPAL</div>}
                      <button onClick={()=>{
                        const imgs=(form.imagenes||[]).filter((_:any,j:number)=>j!==i);
                        setForm({...form,imagenes:imgs,imagen_principal:(imgs[0] as any)?.url||undefined});
                      }} style={{position:"absolute",top:1,right:1,width:16,height:16,borderRadius:"50%",
                        background:"rgba(0,0,0,.6)",color:"#fff",border:"none",cursor:"pointer",
                        fontSize:"9px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ):null;
                })}
              </div>
            )}
            {/* Selector biblioteca */}
            <SelectorMediaArticulo
              imagenes={(form.imagenes||[]).map((i:any)=>typeof i==="string"?i:i?.url).filter(Boolean)}
              videos={(form.videos||[]).map((v:any)=>typeof v==="string"?v:v?.url).filter(Boolean)}
              onChangeImagenes={(imgs:string[])=>{
                const imgObjs=imgs.map((url,i)=>({url,orden:i,principal:i===0}));
                setForm({...form, imagenes:imgObjs, imagen_principal:imgs[0]||form.imagen_principal});
              }}
              onChangeVideos={(vids:string[])=>{
                const vidObjs=vids.map((url,i)=>({url,orden:i}));
                setForm({...form, videos:vidObjs});
              }}
            />
          </div>
        )}
        {tab==="Moneda y Precio"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>

            {/* MONEDAS */}
            <div style={{display:"grid",gridTemplateColumns:"0.8fr 0.8fr 0.8fr 2fr",gap:"0.5rem",
              padding:"0.5rem 0.75rem",background:"#F8F9FB",borderRadius:8,border:"1px solid #EAECF0",alignItems:"end"}}>
              {/* Moneda principal */}
              <div><span style={lbl}>Moneda principal</span>
                <select style={inp} value={form.moneda||"UYU"}
                  onChange={e=>setForm({...form,moneda:e.target.value})}>
                  {["UYU","USD","EUR","ARS","BRL"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              {/* Moneda secundaria */}
              <div><span style={lbl}>Moneda secundaria</span>
                <select style={inp} value={(form.atributos as any)?.moneda_sec||"USD"}
                  onChange={e=>setForm({...form,atributos:{...(form.atributos||{}),moneda_sec:e.target.value}})}>
                  {["USD","EUR","UYU","ARS","BRL"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              {/* Tipo de cambio + fuente — ocupa todo el ancho */}
              {/* TC */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={lbl}>TC</span>
                  <label style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:"9px",color:"var(--gray-400)",fontWeight:600}}>
                    <input type="checkbox"
                      checked={!(form.atributos as any)?.tc_manual}
                      style={{accentColor:color,width:10,height:10}}
                      onChange={e=>setForm({...form,atributos:{...(form.atributos||{}),tc_manual:!e.target.checked}})}/>
                    Auto
                  </label>
                </div>
                <input type="number" style={{...inp,
                  background:(form.atributos as any)?.tc_manual?"#fff":"#F3F4F6",
                  color:(form.atributos as any)?.tc_manual?"#111":"var(--gray-400)",
                }} min={0} step="0.01"
                  readOnly={!(form.atributos as any)?.tc_manual}
                  value={(form.atributos as any)?.tipo_cambio||""}
                  placeholder={(form.atributos as any)?.tc_manual?"0.00":"Auto"}
                  onChange={e=>setForm({...form,atributos:{...(form.atributos||{}),tipo_cambio:parseFloat(e.target.value)||undefined}})}/>
              </div>
              {/* Fuente */}
              <div>
                <span style={lbl}>Fuente · Actualización</span>
                <div style={{...inp,background:"#F3F4F6",color:"var(--mute)",
                  display:"flex",alignItems:"center",gap:5,fontSize:"0.72rem"}}>
                  <span style={{fontWeight:700,color:"#374151"}}>{(form.atributos as any)?.tc_fuente||"BCU"}</span>
                  <span style={{color:"#D1D5DB"}}>·</span>
                  <span>{(form.atributos as any)?.tc_fecha||"—"}</span>
                  <span style={{color:"#D1D5DB"}}>·</span>
                  <span>{(form.atributos as any)?.tc_hora||"—"}</span>
                </div>
              </div>
            </div>

            {/* PRECIOS */}
            <PreciosEditor form={form} setForm={setForm} color={color} lbl={lbl} inp={inp}/>

          </div>
        )}
        {tab==="Detalles"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              <div><span style={lbl}>SKU</span>
                <input style={inp} value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/>
              </div>
              <div><span style={lbl}>Garantía tipo</span>
                <select style={inp} value={form.garantia_tipo||""} onChange={e=>setForm({...form,garantia_tipo:e.target.value})}>
                  <option value="">Sin garantía</option>
                  <option value="vendedor">Del vendedor</option>
                  <option value="fabrica">De fábrica</option>
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              <div><span style={lbl}>Garantía (meses)</span>
                <input type="number" style={inp} value={form.garantia_meses||""} min={0}
                  onChange={e=>setForm({...form,garantia_meses:parseInt(e.target.value)||undefined})}/>
              </div>
              <div><span style={lbl}>Peso kg</span>
                <input type="number" style={inp} value={form.peso_kg||""} min={0} step="0.1"
                  onChange={e=>setForm({...form,peso_kg:parseFloat(e.target.value)||undefined})}/>
              </div>
            </div>
            <div><span style={lbl}>Tipo de envío</span>
              <select style={inp} value={form.envio_tipo||"retiro"} onChange={e=>setForm({...form,envio_tipo:e.target.value})}>
                <option value="retiro">Solo retiro</option>
                <option value="custom">Envío propio</option>
                <option value="meli_like">Tipo MercadoEnvíos</option>
                <option value="pickup">Pickup point</option>
              </select>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.82rem"}}>
              <input type="checkbox" checked={!!form.envio_gratis} style={{accentColor:color}}
                onChange={e=>setForm({...form,envio_gratis:e.target.checked})}/>
              Envío gratis
            </label>
          </div>
        )}
        {tab==="Inventario"&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
              <div><span style={lbl}>Stock</span>
                <input type="number" style={inp} value={form.stock||1} min={0}
                  disabled={!!form.stock_ilimitado}
                  onChange={e=>setForm({...form,stock:parseInt(e.target.value)||0})}/>
              </div>
              <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.82rem"}}>
                  <input type="checkbox" checked={!!form.stock_ilimitado} style={{accentColor:color}}
                    onChange={e=>setForm({...form,stock_ilimitado:e.target.checked})}/>
                  Ilimitado
                </label>
              </div>
            </div>
            <div><span style={lbl}>Estado de publicación</span>
              <select style={inp} value={form.status||"draft"} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="draft">Borrador</option>
                <option value="active">Publicar ahora</option>
                <option value="paused">Pausado</option>
              </select>
            </div>
          </div>
        )}
        {tab==="Vista previa"&&(
          <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",padding:"0.75rem",
            background:"#fff",borderRadius:10,border:"1px solid var(--border)"}}>
            {form.imagen_principal&&<img src={form.imagen_principal} alt="" style={{width:84,height:84,objectFit:"cover",borderRadius:8}} onError={e=>(e.currentTarget.style.display="none")}/>}
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:"1rem",color:"#111"}}>{form.nombre||"Sin nombre"}</div>
              <div style={{color,fontWeight:700,fontSize:"0.95rem",margin:"4px 0"}}>
                {form.moneda} {Number(form.precio||0).toLocaleString("es-UY")}
                {form.precio_original&&form.precio_original>0&&<span style={{textDecoration:"line-through",color:"var(--gray-400)",marginLeft:8,fontSize:"0.8rem"}}>{form.moneda} {Number(form.precio_original).toLocaleString("es-UY")}</span>}
              </div>
              <div style={{fontSize:"0.78rem",color:"var(--mute)"}}>
                {form.departamento_nombre||"Sin departamento"}
                {form.condicion&&" · "+form.condicion}
                {" · Stock: "+(form.stock_ilimitado?"∞":form.stock||0)}
              </div>
              {form.descripcion&&<div style={{fontSize:"0.78rem",color:"#374151",marginTop:6,lineHeight:1.5}}>{form.descripcion.slice(0,180)}</div>}
            </div>
          </div>
        )}
      </>
    );
  };

  // Panel expandido
  const renderPanel=(a:Art|null,isNew=false)=>(
    <tr key={(a?.id||"new")+"-p"}>
      <td colSpan={99} style={{padding:0,borderBottom:`2px solid ${color}22`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 0.48fr",background:"#F8F9FB",
          borderTop:`2px solid ${color}33`}}>
          {/* Izquierda: que falta + form */}
          <div style={{padding:"1rem 1.25rem",borderRight:"1px solid #EAECF0"}}>
            {!isNew&&a&&problemas[a.id]!==undefined&&(
              <div style={{
                border:`1.5px solid ${problemas[a.id].length?ROJO_SYNC:VERDE_SYNC}`,
                background:problemas[a.id].length?"rgba(239,68,68,.06)":"rgba(22,163,74,.06)",
                borderRadius:9, padding:"0.7rem 0.85rem", marginBottom:"0.9rem",
              }}>
                <div style={{fontSize:"0.82rem",fontWeight:800,
                  color:problemas[a.id].length?ROJO_SYNC:VERDE_SYNC}}>
                  {(()=>{
                    const n=problemas[a.id].length;
                    const donde=nombreCanal[canalConProblema[a.id]]??canalConProblema[a.id]??"este canal";
                    if(n===0)return "No falta nada para publicar en "+donde;
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
                          Respuesta textual de {nombreCanal[canalConProblema[a.id]]??"el canal"}
                        </summary>
                        <pre style={{fontSize:"0.68rem",whiteSpace:"pre-wrap",wordBreak:"break-word",
                          background:"#fff",border:"1px solid var(--border)",borderRadius:6,
                          padding:7,marginTop:5,maxHeight:130,overflow:"auto"}}>{crudoCanal[a.id]}</pre>
                      </details>
                    )}

                    <div style={{display:"flex",gap:8,marginTop:"0.7rem"}}>
                      <Accion label={corrigiendo?"Publicando…":"Guardar y sincronizar"} destacado color={BLUE}
                        dis={corrigiendo} onClick={()=>guardarCorrecciones(a)}/>
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
            )}

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

            {renderForm(eForm,(f)=>{setEForm(f);setDirty(true);},eTab,setETab)}
          </div>
          {/* Derecha: métricas */}
          <div style={{padding:"1rem"}}>
            {!isNew&&a&&(
              <>
                <div style={{fontSize:"10px",fontWeight:700,color:"var(--gray-400)",
                  textTransform:"uppercase",letterSpacing:".08em",marginBottom:"0.6rem"}}>Métricas</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"5px"}}>
                  {[
                    {l:"Impresiones",v:a.impresiones||0},
                    {l:"Clicks",     v:a.clicks||0},
                    {l:"CTR",        v:(a.impresiones?(((a.clicks||0)/a.impresiones)*100).toFixed(1):0)+"%"},
                    {l:"Ranking",    v:a.ranking_score?Number(a.ranking_score).toFixed(3):"—"},
                    {l:"Rating",     v:a.rating_promedio?Number(a.rating_promedio).toFixed(1)+" ★":"—"},
                    {l:"Reseñas",    v:a.rating_count||0},
                  ].map(m=>(
                    <div key={m.l} style={{background:"#fff",borderRadius:7,
                      padding:"0.38rem 0.5rem",border:"1px solid var(--border)"}}>
                      <div style={{fontSize:"9px",color:"var(--gray-400)",textTransform:"uppercase"}}>{m.l}</div>
                      <div style={{fontWeight:700,color:"#374151",fontSize:"0.85rem"}}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"0.75rem",height:"100%"}}>

      {toast&&(
        <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:9999,
          padding:"0.75rem 1.25rem",borderRadius:10,fontWeight:600,fontSize:"0.875rem",
          background:toast.ok?"#f0fdf4":"#fef2f2",color:toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":"#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
          {toast.text}
        </div>
      )}

      {/* STATS tira compacta */}
      <div style={{display:"flex",gap:"0.5rem"}}>
        {[
          {label:"Total",     value:stats.total,      c:BLUE},
          {label:"Activos",   value:stats.activos,    c:GREEN},
          {label:"Borradores",value:stats.borradores, c:"#F59E0B"},
          {label:"Clicks",    value:stats.clicks,     c:color},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",borderRadius:8,flex:1,
            padding:"0.55rem 1rem",border:"1px solid #F0F0F0",
            borderLeft:`3px solid ${s.c}`,display:"flex",flexDirection:"column",gap:"2px"}}>
            <span style={{fontSize:"1.4rem",fontWeight:800,color:s.c,lineHeight:1}}>{s.value}</span>
            <span style={{fontSize:"0.63rem",color:"var(--gray-400)",textTransform:"uppercase",
              letterSpacing:".05em",fontWeight:700}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* TABLA — flex:1 + overflow hidden para scroll solo en tbody */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #EAECF0",
        display:"flex",flexDirection:"column",flex:1,overflow:"hidden",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>

        {/* MENU BAR — world class */}
        <div style={{
          display:"flex", alignItems:"center", flexShrink:0,
          background:"#fff", borderBottom:"1px solid #EAECF0",
          padding:"0 1rem", gap:"2px",
          boxShadow:"0 1px 3px rgba(0,0,0,.04)",
        }}>


          {/* Columnas */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowC(p=>!p)} style={{
              padding:"0.5rem 0.8rem",border:"none",background:"transparent",cursor:"pointer",
              fontSize:"0.78rem",fontWeight:showC?700:500,color:showC?"#111":"#555",
              display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap",
            }}>Columnas <span style={{fontSize:"8px",opacity:.6}}>▾</span></button>
            {showC&&(
              <div style={{position:"absolute",left:0,top:"100%",background:"#fff",
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

          <div style={{width:1,height:28,background:"var(--border)",margin:"0 6px"}}/>

          {/* ACCIONES — directas, sin desplegables */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",padding:"6px 0"}}>
            <Accion label="Nuevo" destacado color={color}
              onClick={()=>{setShowWizard(true);setExp(null);}}/>
            <Accion label="Publicar"  dis={!has} color={GREEN}
              onClick={()=>chSt(activeIds,"active")}/>
            <Accion label="Ocultar"   dis={!has} color="#F59E0B"
              onClick={()=>chSt(activeIds,"draft")}/>
            <Accion label="Archivar"  dis={!has} color="var(--mute)"
              onClick={()=>archivar(activeIds)}/>
            <Accion label="Duplicar"  dis={!has||sel.size>1} color={BLUE}
              onClick={()=>activeArt&&clonar(activeArt)}/>
            <Accion label="Eliminar"  dis={!has} color="#EF4444"
              onClick={()=>eliminar(activeIds)}/>
            <div style={{width:1,height:22,background:"var(--border)",margin:"0 2px"}}/>
            {/* Sin chips elegidos el boton no se apaga: se aprieta y dice que
                falta elegir. Un boton apagado que no explica por que es la
                misma pregunta -"paso algo?"- sin respuesta. */}
            <Accion label={sincro?"Sincronizando…":"Sincronizar"+(chips.size?" ("+chips.size+")":"")}
              destacado color={BLUE} dis={sincro}
              onClick={sincronizar}/>
          </div>

          <div style={{flex:1}}/>

          {/* Canales que no se ofrecen y por que: no aparecen en la tabla, asi
              que sin esto la ausencia no se distingue de un olvido. */}
          {canalesFuera.length>0&&(
            <span title={canalesFuera.map(c=>c.nombre+": "+c.motivo).join(" · ")}
              style={{fontSize:"0.72rem",color:"#B45309",fontWeight:600,
                background:"rgba(245,158,11,.12)",padding:"3px 9px",borderRadius:999,
                marginRight:8,cursor:"help",whiteSpace:"nowrap"}}>
              {canalesFuera.length===1
                ? canalesFuera[0].nombre+" no está disponible"
                : canalesFuera.length+" canales no están disponibles"}
            </span>
          )}

          {/* Selección */}
          {sel.size>0&&(
            <span style={{fontSize:"0.72rem",color:BLUE,fontWeight:700,
              padding:"0.22rem 0.6rem",background:"color-mix(in srgb, var(--brand-navy) 8%, transparent)",borderRadius:6,marginRight:"0.5rem"}}>
              {sel.size} sel.
            </span>
          )}

          {/* Guardar / Cancelar — solo cuando hay cambios */}
          {dirty&&(
            <div style={{display:"flex",gap:6,padding:"0.3rem 0.5rem"}}>
              <button onClick={()=>{setExp(null);setDirty(false);}} style={{padding:"0.35rem 0.8rem",border:"1.5px solid var(--border)",borderRadius:7,
                background:"#fff",color:"var(--mute)",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={saving} style={{
                padding:"0.35rem 0.8rem",border:"none",borderRadius:7,
                background:color,color:"#fff",fontSize:"0.78rem",fontWeight:700,
                cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1,
              }}>{saving?"Guardando...":"Guardar"}</button>
            </div>
          )}
        </div>

        {/* El alta reemplaza la tabla, sin cambiar de pantalla ni perder filtros */}
        {showWizard?(
          <div style={{overflowY:"auto",flex:1}}>
            <AdminArticulos
              onCancel={()=>setShowWizard(false)}
              onFinish={()=>{setShowWizard(false);reload();}}
            />
          </div>
        ):load?(
          <div style={{textAlign:"center",padding:"3rem",color:"var(--gray-400)",flex:1}}>Cargando...</div>
        ):(
          <div style={{overflowY:"auto",flex:1}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr>
                  <th style={{...thB,width:34}}>
                    <input type="checkbox" checked={sel.size===filtered.length&&filtered.length>0}
                      onChange={togAll} style={{accentColor:color}}/>
                  </th>
                  <th style={{...thB,width:48}}>Foto</th>
                  <th style={thB}>Nombre</th>
                  <th style={thS("precio")} onClick={()=>sort("precio")}>Precio{si("precio")}</th>
                  <th style={thS("stock")}  onClick={()=>sort("stock")}>Stock{si("stock")}</th>
                  <th style={{...thS("status"),cursor:"pointer"}} onClick={cycleSt}>
                    Estado{fst?" · "+S[fst]?.label:"↕"}
                  </th>
                  <th style={{...thB,textAlign:"center",minWidth:132}}>Sync</th>
                  <th style={thB}>Departamento</th>
                  <th style={thS("alta")} onClick={()=>sort("alta")}>Alta{si("alta")}</th>
                  {vcols.has("categoria")&&<th style={thB}>Categoría</th>}
                  {vcols.has("marca")    &&<th style={thB}>Marca</th>}
                  {vcols.has("ranking")  &&<th style={thB}>Ranking</th>}
                  {vcols.has("ctr")      &&<th style={thB}>CTR</th>}
                  {vcols.has("baja")     &&<th style={thB}>Baja</th>}
                  {vcols.has("mkt1")     &&<th style={thB}>MKT 1</th>}
                  {vcols.has("mkt2")     &&<th style={thB}>MKT 2</th>}
                  <th style={{...thB,width:34}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0?(
                  <tr><td colSpan={99} style={{textAlign:"center",padding:"3rem"}}>
                    <div style={{fontSize:"2.5rem"}}>📦</div>
                    <div style={{fontWeight:700,color:"#374151",marginTop:"0.5rem"}}>Sin publicaciones</div>
                    <div style={{color:"var(--gray-400)",fontSize:"0.82rem",marginTop:"0.25rem"}}>
                      Usá el menú Artículo → + Nuevo artículo para empezar
                    </div>
                  </td></tr>
                ):filtered.map(a=>{
                  const cfg=S[a.status]||S.draft;
                  const isE=exp===a.id;
                  const isS=sel.has(a.id);
                  const ctr=a.impresiones?Math.round((a.clicks||0)/a.impresiones*100):0;
                  return(
                    <>
                      <tr key={a.id} style={{
                        background:isE?`${color}06`:isS?`${color}03`:"#fff",
                        borderLeft:isE?`3px solid ${color}`:"3px solid transparent",
                        transition:"all .1s",
                      }}>
                        <td style={td}><input type="checkbox" checked={isS}
                          onChange={()=>togSel(a.id)} style={{accentColor:color}}/></td>
                        <td style={td}>
                          <div style={{width:38,height:38,borderRadius:6,overflow:"hidden",background:"#F3F4F6"}}>
                            {a.imagen_principal
                              ?<img src={a.imagen_principal} alt={a.nombre} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>
                                {a.tipo==="secondhand"?"♻️":"🛍"}
                              </div>
                            }
                          </div>
                        </td>
                        <td style={{...td,maxWidth:200}}>
                          <div style={{fontWeight:600,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre}</div>
                          {a.condicion&&<div style={{fontSize:"10px",color:"var(--gray-400)"}}>{a.condicion}</div>}
                        </td>
                        <td style={{...td,fontWeight:700,color}}>{fmtP(a.precio,a.moneda)}</td>
                        <td style={{...td,textAlign:"center"}}>
                          <span style={{color:a.stock===0?"#EF4444":a.stock<5?"#F59E0B":"#374151",fontWeight:a.stock<5?700:400}}>{a.stock}</span>
                        </td>
                        <td style={td}>
                          <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:20,
                            background:cfg.bg,color:cfg.color,fontWeight:700}}>{cfg.label}</span>
                        </td>
                        <td style={{...td,padding:"0.4rem 0.5rem"}}>
                          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,Math.min(canales.length,4))},1fr)`,gap:"3px"}}>
                            {canales.map(c=>{
                              const est=estadoDeCanal(a.canales?{channels:a.canales} as any:undefined,c.channel);
                              return (
                                <Canal key={c.key} c={c} estado={est}
                                  sel={chips.has(claveChip(a.id,c.channel))}
                                  ocupado={sincronizando.has(claveChip(a.id,c.channel))}
                                  // Un chip en rojo hace las dos cosas: queda
                                  // elegido y abre lo que hay que corregir. Que
                                  // no se pudiera elegir bloqueaba justo el
                                  // reintento despues de arreglarlo, y el boton
                                  // quedaba apagado sin decir por que.
                                  onClick={()=>{
                                    togChip(a.id,c.channel);
                                    if(est==="error")verProblemas(a,c.channel);
                                  }}/>
                              );
                            })}
                          </div>
                        </td>
                        <td style={td}>{a.departamento_nombre||"—"}</td>
                        <td style={td}>{fmt(a.published_at||a.created_at)}</td>
                        {vcols.has("categoria")&&<td style={td}>{a.categoria_nombre||"—"}</td>}
                        {vcols.has("marca")    &&<td style={td}>{a.atributos?.marca||"—"}</td>}
                        {vcols.has("ranking")  &&<td style={td}>{a.ranking_score?Number(a.ranking_score).toFixed(2):"—"}</td>}
                        {vcols.has("ctr")      &&<td style={td}>{ctr}%</td>}
                        {vcols.has("baja")     &&<td style={td}>{fmt(a.baja_prevista||a.deleted_at)}</td>}
                        {vcols.has("mkt1")     &&<td style={{...td,textAlign:"center"}}><input type="checkbox" checked={false} style={{accentColor:color}} onChange={()=>{}}/></td>}
                        {vcols.has("mkt2")     &&<td style={{...td,textAlign:"center"}}><input type="checkbox" checked={false} style={{accentColor:color}} onChange={()=>{}}/></td>}
                        <td style={td}>
                          <button onClick={()=>togExp(a.id)} style={{
                            background:"none",border:"none",cursor:"pointer",
                            color:isE?color:"#CBD5E1",fontSize:"12px",padding:"2px 4px",
                            transform:isE?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",
                          }}>▼</button>
                        </td>
                      </tr>
                      {isE&&renderPanel(a,false)}
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



