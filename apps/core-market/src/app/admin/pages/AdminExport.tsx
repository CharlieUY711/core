import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase/client";

const ACCENT = "var(--brand-madre)";
const GREEN  = "var(--color-success)";
const BLUE   = "var(--brand-navy)";

interface Filtros {
  tipo: "all"|"market"|"secondhand";
  status: "all"|"active"|"draft"|"paused";
  departamento_id: string;
  con_variantes: boolean;
}

export default function AdminExport() {
  const [articulos,  setArticulos]  = useState<any[]>([]);
  const [variantes,  setVariantes]  = useState<any[]>([]);
  const [deptos,     setDeptos]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [preview,    setPreview]    = useState<any[]>([]);
  const [filtros,    setFiltros]    = useState<Filtros>({
    tipo:"all", status:"active", departamento_id:"", con_variantes:false,
  });
  const [exporting,  setExporting]  = useState(false);
  const [toast,      setToast]      = useState<{text:string;ok:boolean}|null>(null);

  const notify = (text:string, ok=true) => {
    setToast({text,ok}); setTimeout(()=>setToast(null),3000);
  };

  useEffect(()=>{
    supabase.from("departamentos").select("id,nombre").eq("activo",true).order("orden")
      .then(({data})=>setDeptos(data||[]));
  },[]);

  const cargar = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;

    let q = supabase.from("articulos").select("*").eq("vendedor_id", user.id).is("deleted_at", null);
    if (filtros.tipo !== "all")           q = q.eq("tipo", filtros.tipo);
    if (filtros.status !== "all")         q = q.eq("status", filtros.status);
    if (filtros.departamento_id)          q = q.eq("departamento_id", filtros.departamento_id);

    const {data: arts} = await q.order("created_at", {ascending:false});
    setArticulos(arts||[]);

    // Cargar variantes de estos artículos
    if (arts && arts.length > 0) {
      const ids = arts.map((a:any)=>a.id);
      const {data: vars} = await supabase.from("articulo_variantes")
        .select("*").in("articulo_id", ids).eq("status","active");
      setVariantes(vars||[]);
    } else {
      setVariantes([]);
    }

    setLoading(false);
  };

  // Generar preview de filas CSV
  useEffect(()=>{
    const rows: any[] = [];

    articulos.forEach(a => {
      const varsDeEste = variantes.filter((v:any)=>v.articulo_id===a.id);

      if (varsDeEste.length > 0) {
        // Fila padre sin precio
        rows.push({
          sku:               a.id.slice(0,8).toUpperCase(),
          name:              a.nombre,
          description:       (a.descripcion||"").slice(0,200),
          category:          a.departamento_nombre||"",
          price:             "",
          currency:          a.moneda||"UYU",
          stock:             "",
          parent_sku:        "",
          variant_attributes:"",
          image_url:         a.imagen_principal||"",
          _tipo:             "padre",
        });
        // Filas variante
        varsDeEste.forEach((v:any)=>{
          const attrs = Object.entries(v.atributos||{})
            .map(([k,val])=>`${k}:${val}`).join("|");
          rows.push({
            sku:               v.sku,
            name:              v.nombre || a.nombre,
            description:       (a.descripcion||"").slice(0,200),
            category:          a.departamento_nombre||"",
            price:             v.precio,
            currency:          v.moneda||a.moneda||"UYU",
            stock:             v.stock,
            parent_sku:        a.id.slice(0,8).toUpperCase(),
            variant_attributes:attrs,
            image_url:         v.imagen_principal||a.imagen_principal||"",
            _tipo:             "variante",
          });
        });
      } else {
        // Artículo simple sin variantes
        rows.push({
          sku:               a.id.slice(0,8).toUpperCase(),
          name:              a.nombre,
          description:       (a.descripcion||"").slice(0,200),
          category:          a.departamento_nombre||"",
          price:             a.precio,
          currency:          a.moneda||"UYU",
          stock:             a.stock,
          parent_sku:        "",
          variant_attributes:"",
          image_url:         a.imagen_principal||"",
          _tipo:             "simple",
        });
      }
    });

    // Filtro opcional: solo con variantes
    const filtered = filtros.con_variantes
      ? rows.filter(r=>r._tipo!=="simple")
      : rows;

    setPreview(filtered);
  },[articulos, variantes, filtros.con_variantes]);

  const exportCSV = () => {
    if (!preview.length) return;
    setExporting(true);
    const cols = ["sku","name","description","category","price","currency","stock","parent_sku","variant_attributes","image_url"];
    const header = cols.join(",");
    const esc = (v:any) => {
      const s = String(v??'').replace(/"/g,'""');
      return s.includes(",") || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const rows = preview.map(r=>cols.map(c=>esc(r[c])).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `charlie-market-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`✓ ${preview.length} filas exportadas`);
    setExporting(false);
  };

  const cols = ["sku","name","price","currency","stock","parent_sku","variant_attributes"];

  const thB:React.CSSProperties = {
    padding:"0.4rem 0.65rem", textAlign:"left", fontSize:"10px", fontWeight:700,
    color:"var(--mute)", textTransform:"uppercase", letterSpacing:".05em",
    borderBottom:"2px solid #F3F4F6", background:"#FAFAFA", whiteSpace:"nowrap",
  };
  const td:React.CSSProperties = {
    padding:"0.4rem 0.65rem", fontSize:"0.78rem", color:"#374151",
    borderBottom:"1px solid var(--gray-50)", verticalAlign:"middle",
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1rem",height:"100%"}}>

      {toast&&(
        <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:9999,
          padding:"0.75rem 1.25rem",borderRadius:10,fontWeight:600,fontSize:"0.875rem",
          background:toast.ok?"#f0fdf4":"#fef2f2",color:toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":"#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
          {toast.text}
        </div>
      )}

      {/* FILTROS */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #EAECF0",
        padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{fontSize:"0.72rem",fontWeight:700,color:"var(--gray-400)",
          textTransform:"uppercase",letterSpacing:".08em",marginBottom:"0.75rem"}}>
          Filtros de exportación
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto auto",
          gap:"0.75rem",alignItems:"end"}}>

          <div>
            <div style={{fontSize:"10px",color:"var(--gray-400)",fontWeight:700,
              textTransform:"uppercase",marginBottom:3}}>Tipo</div>
            <select style={{width:"100%",padding:"0.42rem 0.6rem",border:"1.5px solid var(--border)",
              borderRadius:7,fontSize:"0.81rem",outline:"none"}}
              value={filtros.tipo}
              onChange={e=>setFiltros(f=>({...f,tipo:e.target.value as any}))}>
              <option value="all">Todos</option>
              <option value="market">Market</option>
              <option value="secondhand">Second Hand</option>
            </select>
          </div>

          <div>
            <div style={{fontSize:"10px",color:"var(--gray-400)",fontWeight:700,
              textTransform:"uppercase",marginBottom:3}}>Estado</div>
            <select style={{width:"100%",padding:"0.42rem 0.6rem",border:"1.5px solid var(--border)",
              borderRadius:7,fontSize:"0.81rem",outline:"none"}}
              value={filtros.status}
              onChange={e=>setFiltros(f=>({...f,status:e.target.value as any}))}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="draft">Borradores</option>
              <option value="paused">Pausados</option>
            </select>
          </div>

          <div>
            <div style={{fontSize:"10px",color:"var(--gray-400)",fontWeight:700,
              textTransform:"uppercase",marginBottom:3}}>Departamento</div>
            <select style={{width:"100%",padding:"0.42rem 0.6rem",border:"1.5px solid var(--border)",
              borderRadius:7,fontSize:"0.81rem",outline:"none"}}
              value={filtros.departamento_id}
              onChange={e=>setFiltros(f=>({...f,departamento_id:e.target.value}))}>
              <option value="">Todos</option>
              {deptos.map((d:any)=><option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}>
            <label style={{display:"flex",alignItems:"center",gap:8,
              cursor:"pointer",fontSize:"0.82rem",color:"#374151"}}>
              <input type="checkbox" checked={filtros.con_variantes}
                style={{accentColor:ACCENT}}
                onChange={e=>setFiltros(f=>({...f,con_variantes:e.target.checked}))}/>
              Solo con variantes
            </label>
          </div>

          <button onClick={cargar} disabled={loading} style={{
            padding:"0.5rem 1.25rem",background:BLUE,color:"#fff",
            border:"none",borderRadius:8,fontWeight:700,fontSize:"0.82rem",
            cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,
            whiteSpace:"nowrap",
          }}>{loading?"Cargando...":"Cargar"}</button>

          <button onClick={exportCSV} disabled={!preview.length||exporting} style={{
            padding:"0.5rem 1.25rem",background:preview.length?ACCENT:"var(--border)",
            color:preview.length?"#fff":"var(--gray-400)",
            border:"none",borderRadius:8,fontWeight:700,fontSize:"0.82rem",
            cursor:preview.length?"pointer":"not-allowed",whiteSpace:"nowrap",
          }}>↓ Exportar CSV</button>
        </div>
      </div>

      {/* STATS */}
      {preview.length>0&&(
        <div style={{display:"flex",gap:"0.5rem"}}>
          {[
            {label:"Total filas",  value:preview.length,                              c:BLUE},
            {label:"Artículos",    value:preview.filter(r=>!r.parent_sku).length,     c:ACCENT},
            {label:"Variantes",    value:preview.filter(r=>!!r.parent_sku).length,    c:GREEN},
            {label:"Sin precio",   value:preview.filter(r=>r.price==="").length,      c:"#F59E0B"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:7,flex:1,
              padding:"0.35rem 0.85rem",border:"1px solid #F0F0F0",
              borderLeft:`2.5px solid ${s.c}`,display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <span style={{fontSize:"1.1rem",fontWeight:800,color:s.c,lineHeight:1}}>{s.value}</span>
              <span style={{fontSize:"0.65rem",color:"var(--gray-400)",textTransform:"uppercase",
                letterSpacing:".04em",fontWeight:700}}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* PREVIEW */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #EAECF0",
        flex:1,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        {preview.length===0?(
          <div style={{textAlign:"center",padding:"4rem",color:"var(--gray-400)"}}>
            <div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>📤</div>
            <div style={{fontWeight:700,color:"#374151"}}>
              {articulos.length===0?"Aplicá los filtros y presioná Cargar":"Sin resultados con estos filtros"}
            </div>
            <div style={{fontSize:"0.82rem",marginTop:"0.25rem"}}>
              El CSV se genera en formato Charlie Market
            </div>
          </div>
        ):(
          <div style={{overflowY:"auto",height:"100%"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr>
                  {cols.map(c=><th key={c} style={thB}>{c}</th>)}
                  <th style={thB}>tipo</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r,i)=>(
                  <tr key={i} style={{
                    background: r._tipo==="padre"?"color-mix(in srgb, var(--brand-navy) 3%, transparent)":
                                r._tipo==="variante"?`color-mix(in srgb, var(--brand-madre) 3%, transparent)`:"#fff",
                    borderLeft: r._tipo==="variante"?`3px solid ${ACCENT}22`:
                                r._tipo==="padre"?`3px solid ${BLUE}22`:"3px solid transparent",
                  }}>
                    {cols.map(c=>(
                      <td key={c} style={{...td,
                        maxWidth:c==="name"?180:undefined,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        fontWeight:c==="sku"?700:400,
                        color:c==="price"&&r.price===""?"#D1D5DB":
                              c==="price"?ACCENT:"#374151",
                      }}>
                        {r[c]===""?"—":r[c]}
                      </td>
                    ))}
                    <td style={td}>
                      <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:10,fontWeight:700,
                        background:r._tipo==="padre"?"color-mix(in srgb, var(--brand-navy) 10%, transparent)":
                                   r._tipo==="variante"?"color-mix(in srgb, var(--brand-madre) 10%, transparent)":"color-mix(in srgb, var(--color-success) 10%, transparent)",
                        color:r._tipo==="padre"?BLUE:r._tipo==="variante"?ACCENT:GREEN,
                      }}>{r._tipo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

