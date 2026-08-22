import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../utils/supabase/client";
import { useShop } from "../components/AdminLayout";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";
import { fetchPublicaciones, type Publicacion } from "../hooks/useCatalogPublicaciones";
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
const CANALES = [
  {key:"sync_ml",  channel:"mercadolibre", label:"ML",   color:"#F5C518", tc:"#333"},
  {key:"sync_meta",channel:"meta",         label:"Meta", color:"#1877F2", tc:"#fff"},
  {key:"sync_wa",  channel:"whatsapp",     label:"WA",   color:"#25D366", tc:"#fff"},
  {key:"sync_web", channel:"web",          label:"Web",  color:"var(--mute)", tc:"#fff"},
];

// Market y Second Hand NO son canales de distribucion: son el tipo del
// articulo (nuevo o usado) y son excluyentes entre si. Viven aca solo para que
// toArt y clonar puedan resolver a que lista pertenece cada publicacion.
const CANALES_BASE = [
  {key:"sync_market", channel:"market",     label:"Market",      color:ACCENT, tc:"#fff"},
  {key:"sync_second", channel:"secondhand", label:"Second Hand", color:GREEN,  tc:"#fff"},
];
const TODOS_CANALES = [...CANALES_BASE, ...CANALES];

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

// ── Canal toggle button ───────────────────────────────────────────────────
function Canal({c,active,onClick}:{c:typeof CANALES[0];active:boolean;onClick:()=>void}) {
  const [dn,setDn]=useState(false);
  return (
    <button onMouseDown={()=>setDn(true)} onMouseUp={()=>{setDn(false);onClick();}}
      onMouseLeave={()=>setDn(false)} onTouchStart={()=>setDn(true)} onTouchEnd={()=>{setDn(false);onClick();}}
      style={{padding:"2px 0",width:"100%",border:`1.5px solid ${c.color}`,borderRadius:5,
        fontSize:"10px",fontWeight:800,cursor:"pointer",letterSpacing:".02em",
        background:active?c.color:"#fff", color:active?c.tc:c.color,
        boxShadow:active?"inset 0 2px 5px rgba(0,0,0,.25)":"0 2px 3px rgba(0,0,0,.08)",
        transform:(active||dn)?"translateY(1px) scale(.97)":"none",transition:"all .1s",
      }}>{c.label}</button>
  );
}

// ── Dropdown menu ─────────────────────────────────────────────────────────
function Drop({label,items,dis=false}:{
  label:string;
  items:{label:string;onClick:()=>void;color?:string;sep?:boolean}[];
  dis?:boolean;
}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(p=>!p)} style={{
        padding:"0.5rem 0.8rem",border:"none",background:"transparent",cursor:"pointer",
        fontSize:"0.78rem",fontWeight:open?700:500,color:open?"#111":"#555",
        display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap",transition:"color .1s",
      }}>{label} <span style={{fontSize:"8px",opacity:.6}}>▾</span></button>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,background:"#fff",
          border:"1.5px solid var(--border)",borderRadius:10,padding:"0.3rem",
          zIndex:300,minWidth:180,boxShadow:"0 8px 28px rgba(0,0,0,.13)"}}>
          {items.map((it,i)=>it.sep?(
            <div key={i} style={{borderTop:"1px solid #F0F0F0",margin:"0.2rem 0"}}/>
          ):(
            <button key={i} onClick={()=>{it.onClick();setOpen(false);}} style={{
              display:"block",width:"100%",textAlign:"left",padding:"0.42rem 0.8rem",
              border:"none",background:"none",fontSize:"0.8rem",cursor:"pointer",
              color:it.color||"#374151",fontWeight:600,borderRadius:7,transition:"background .1s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.background="#F5F5F5")}
            onMouseLeave={e=>(e.currentTarget.style.background="none")}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
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

  const notify=(t:string,ok=true)=>{setToast({text:t,ok});setTimeout(()=>setToast(null),3000);};

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

  const togSync=async(a:Art,k:string)=>{
    const canal=TODOS_CANALES.find(c=>c.key===k);
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
      p_channels:TODOS_CANALES.filter(c=>(a as any)[c.key]).map(c=>c.channel),
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

  const artMenu=[
    {label:"+ Nueva publicación",onClick:()=>{setShowWizard(true);setExp(null);},color},
    {label:"Clonar",          onClick:()=>activeArt&&clonar(activeArt), color:has&&sel.size<=1?color:"#CBD5E1"},
    {sep:true,label:"",onClick:()=>{}},
    {label:"Activar",         onClick:()=>has&&chSt(activeIds,"active"),  color:GREEN},
    {label:"Despublicar",     onClick:()=>has&&chSt(activeIds,"draft"),   color:"#F59E0B"},
    {label:"Archivar",        onClick:()=>has&&archivar(activeIds),       color:"var(--mute)"},
    {sep:true,label:"",onClick:()=>{}},
    {label:"Eliminar",        onClick:()=>has&&eliminar(activeIds),       color:"#EF4444"},
  ];

  const syncMenu=CANALES.map(c=>({
    label:(activeArt&&(activeArt as any)[c.key]?"✓ ":"○ ")+c.label,
    color:activeArt&&(activeArt as any)[c.key]?c.color:"#CBD5E1",
    onClick:()=>activeArt&&(activeArt as any)[c.key]&&notify("Sync "+c.label+" — próximamente"),
  }));

  const verMenu=[
    ...CANALES.filter(c=>activeArt&&(activeArt as any)[c.key]).map(c=>({
      label:"Abrir en "+c.label, color:c.color, onClick:()=>notify("Abriendo "+c.label+"..."),
    })),
    {label:"Mi web", color:"var(--mute)", onClick:()=>notify("Abriendo web...")},
  ];

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
          {/* Izquierda: form */}
          <div style={{padding:"1rem 1.25rem",borderRight:"1px solid #EAECF0"}}>
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

          <Drop label="Artículo" items={artMenu}/>
          <div style={{width:1,height:28,background:"var(--border)",margin:"0 2px"}}/>
          <Drop label="Sync" items={syncMenu} dis={!activeArt}/>
          <Drop label="Ver"  items={verMenu}  dis={!activeArt}/>
          <div style={{width:1,height:28,background:"var(--border)",margin:"0 2px"}}/>

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

          <div style={{flex:1}}/>

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
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"3px"}}>
                            {CANALES.map(c=>(
                              <Canal key={c.key} c={c} active={!!(a as any)[c.key]}
                                onClick={()=>togSync(a,c.key)}/>
                            ))}
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



