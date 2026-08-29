import { useState, useRef, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import { NUMERICO } from "../ui/numeros";

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";
const GREEN  = "var(--color-success)";
const RED    = "#EF4444";

type Source  = "url"|"pdf"|"csv";
type Stage   = "input"|"reviewing"|"done";
type JobSt   = "idle"|"running"|"done"|"error";

interface ExtractedVariant {
  id: string;
  sku: string;
  product_name: string;
  price: number;
  currency: string;
  stock: number|null;
  attributes: Record<string,string>;
  images: string[];
  source_url: string;
  confidence: number;
  approved: boolean;
  edited: boolean;
}

interface SourcePreview {
  title: string;
  description: string;
  images: string[];
  price_raw: string;
  source_url: string;
}

// ── Styles ────────────────────────────────────────
const card: React.CSSProperties = {
  background:"#fff", borderRadius:12, border:"1px solid #EAECF0", overflow:"hidden",
};
const inp = (focused=false): React.CSSProperties => ({
  width:"100%", padding:"0.45rem 0.65rem",
  border:`1.5px solid ${focused?"var(--brand-madre)":"var(--border)"}`,
  borderRadius:7, fontSize:"0.8rem", outline:"none",
  fontFamily:"DM Sans,sans-serif", boxSizing:"border-box" as const,
  transition:"border-color .15s",
});
const btn = (bg:string, sm=false, disabled=false): React.CSSProperties => ({
  padding: sm?"0.35rem 0.75rem":"0.55rem 1.1rem",
  background: disabled?"#F3F4F6":bg, color: disabled?"var(--gray-400)":"#fff",
  border:"none", borderRadius:8, fontWeight:700,
  fontSize: sm?"0.75rem":"0.82rem",
  cursor: disabled?"not-allowed":"pointer", transition:"all .15s",
  whiteSpace:"nowrap" as const,
});
const badge = (color:string): React.CSSProperties => ({
  display:"inline-block", padding:"2px 8px", borderRadius:20,
  background:color+"20", color, fontSize:"10px", fontWeight:700,
  textTransform:"uppercase" as const, letterSpacing:".04em",
});
const thS: React.CSSProperties = {
  padding:"0.4rem 0.6rem", textAlign:"left" as const,
  fontSize:"10px", fontWeight:700, color:"var(--gray-400)",
  textTransform:"uppercase" as const, letterSpacing:".05em",
  borderBottom:"2px solid #F3F4F6", background:"#FAFAFA",
  position:"sticky" as const, top:0,
};
const tdS: React.CSSProperties = {
  padding:"0.4rem 0.6rem", fontSize:"0.78rem", color:"#374151",
  borderBottom:"1px solid var(--gray-50)", verticalAlign:"middle" as const,
};

// ── Confidence badge ──────────────────────────────
function ConfBadge({ score }: { score: number }) {
  const color = score >= 0.7 ? GREEN : score >= 0.4 ? ACCENT : RED;
  return <span style={badge(color)}>{Math.round(score*100)}%</span>;
}

// ── Variant editor row ────────────────────────────
function VariantRow({
  v, index, onChange, onToggle
}: {
  v: ExtractedVariant;
  index: number;
  onChange: (id:string, field:string, val:any) => void;
  onToggle: (id:string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr style={{ background: v.approved ? "#F0FDF4" : index%2===0?"#fff":"#FAFAFA",
                   opacity: v.approved ? 1 : 0.6 }}>
        {/* Approve toggle */}
        <td style={tdS}>
          <input type="checkbox" checked={v.approved}
            onChange={() => onToggle(v.id)}
            style={{ width:16, height:16, cursor:"pointer", accentColor:GREEN }} />
        </td>
        {/* Confidence */}
        <td style={tdS}><ConfBadge score={v.confidence} /></td>
        {/* Image */}
        <td style={tdS}>
          {v.images[0]
            ? <img src={v.images[0]} alt=""
                style={{ width:36, height:36, objectFit:"cover", borderRadius:6,
                         border:"1px solid var(--border)" }} />
            : <div style={{ width:36, height:36, borderRadius:6, background:"#F3F4F6",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"1.1rem" }}>📷</div>
          }
        </td>
        {/* Product name */}
        <td style={{...tdS, maxWidth:180}}>
          <input style={{...inp(), width:"100%"}}
            value={v.product_name}
            onChange={e => onChange(v.id, "product_name", e.target.value)} />
        </td>
        {/* SKU */}
        <td style={tdS}>
          <input style={{...inp(), width:110, fontFamily:"monospace", fontSize:"11px"}}
            value={v.sku}
            onChange={e => onChange(v.id, "sku", e.target.value)} />
        </td>
        {/* Price */}
        <td style={tdS}>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <select value={v.currency} onChange={e => onChange(v.id, "currency", e.target.value)}
              style={{ padding:"0.3rem 0.4rem", border:"1.5px solid var(--border)",
                       borderRadius:6, fontSize:"0.75rem", background:"#FAFAFA" }}>
              {["UYU","USD","ARS","BRL","EUR"].map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" style={{...inp(), width:80, ...NUMERICO}}
              value={v.price}
              onChange={e => onChange(v.id, "price", parseFloat(e.target.value)||0)} />
          </div>
        </td>
        {/* Attrs summary */}
        <td style={tdS}>
          <div style={{ display:"flex", gap:3, flexWrap:"wrap" as const }}>
            {Object.entries(v.attributes).slice(0,3).map(([k,val]) => (
              <span key={k} style={{ fontSize:"10px", padding:"1px 6px",
                borderRadius:10, background:"#F3F4F6", color:"#374151" }}>
                {k}: {val}
              </span>
            ))}
            {Object.keys(v.attributes).length > 3 &&
              <span style={{ fontSize:"10px", color:"var(--gray-400)" }}>
                +{Object.keys(v.attributes).length-3}
              </span>
            }
          </div>
        </td>
        {/* Expand */}
        <td style={tdS}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     fontSize:"0.8rem", color:"var(--gray-400)" }}>
            {expanded ? "▲" : "▼"}
          </button>
        </td>
      </tr>
      {/* Expanded editor */}
      {expanded && (
        <tr style={{ background:"#F8F9FB" }}>
          <td colSpan={8} style={{ padding:"0.75rem 1rem" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem" }}>
              {/* Attributes editor */}
              <div>
                <div style={{ fontSize:"10px", fontWeight:700, color:"var(--gray-400)",
                  textTransform:"uppercase", marginBottom:6 }}>Atributos</div>
                {Object.entries(v.attributes).map(([k, val]) => (
                  <div key={k} style={{ display:"flex", gap:4, marginBottom:4 }}>
                    <input style={{...inp(), width:90}} defaultValue={k}
                      onBlur={e => {
                        const newAttrs = {...v.attributes};
                        delete newAttrs[k];
                        newAttrs[e.target.value] = val;
                        onChange(v.id, "attributes", newAttrs);
                      }} />
                    <input style={{...inp()}} value={val}
                      onChange={e => onChange(v.id, "attributes",
                        {...v.attributes, [k]: e.target.value})} />
                  </div>
                ))}
              </div>
              {/* Stock */}
              <div>
                <div style={{ fontSize:"10px", fontWeight:700, color:"var(--gray-400)",
                  textTransform:"uppercase", marginBottom:6 }}>Stock</div>
                <input type="number" style={{...inp(), ...NUMERICO}}
                  value={v.stock ?? ""}
                  placeholder="Sin stock definido"
                  onChange={e => onChange(v.id, "stock",
                    e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              {/* Images */}
              <div>
                <div style={{ fontSize:"10px", fontWeight:700, color:"var(--gray-400)",
                  textTransform:"uppercase", marginBottom:6 }}>
                  Imágenes ({v.images.length})
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" as const }}>
                  {v.images.slice(0,4).map((img,i) => (
                    <img key={i} src={img} alt=""
                      style={{ width:44, height:44, objectFit:"cover",
                               borderRadius:6, border:"1px solid var(--border)" }} />
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Source preview panel ──────────────────────────
function SourcePanel({ preview, tab }: { preview: SourcePreview|null; tab: Source }) {
  return (
    <div style={{ ...card, height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"0.75rem 1rem", borderBottom:"1px solid #F0F0F0",
        fontSize:"11px", fontWeight:700, color:"var(--gray-400)", textTransform:"uppercase" as const }}>
        Fuente original
      </div>
      {!preview ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", gap:"0.5rem", color:"var(--gray-400)", padding:"2rem" }}>
          <div style={{ fontSize:"3rem" }}>
            {tab==="url"?"🌐":tab==="pdf"?"📄":"📊"}
          </div>
          <div style={{ fontWeight:600, color:"#374151", textAlign:"center" }}>
            Ingresá una fuente para ver la vista original
          </div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto" as const, padding:"1rem" }}>
          {preview.images[0] && (
            <img src={preview.images[0]} alt=""
              style={{ width:"100%", borderRadius:10, marginBottom:"0.75rem",
                       border:"1px solid var(--border)", objectFit:"cover", maxHeight:220 }} />
          )}
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#111",
            lineHeight:1.3, marginBottom:"0.5rem" }}>{preview.title}</div>
          {preview.price_raw && (
            <div style={{ fontSize:"1.2rem", fontWeight:800, color:ACCENT,
              marginBottom:"0.5rem" }}>{preview.price_raw}</div>
          )}
          {preview.description && (
            <div style={{ fontSize:"0.78rem", color:"var(--mute)", lineHeight:1.6,
              marginBottom:"0.75rem" }}>{preview.description.slice(0,400)}</div>
          )}
          {preview.images.length > 1 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
              {preview.images.slice(1,5).map((img,i) => (
                <img key={i} src={img} alt=""
                  style={{ width:56, height:56, objectFit:"cover",
                           borderRadius:6, border:"1px solid var(--border)" }} />
              ))}
            </div>
          )}
          <div style={{ marginTop:"0.75rem", padding:"0.5rem 0.75rem",
            background:"#F8F9FB", borderRadius:8 }}>
            <div style={{ fontSize:"10px", color:"var(--gray-400)", fontWeight:700,
              textTransform:"uppercase" as const }}>Fuente</div>
            <div style={{ fontSize:"11px", color:BLUE, marginTop:2,
              wordBreak:"break-all" as const }}>{preview.source_url}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────
export default function AdminImport() {
  const [tab,         setTab]         = useState<Source>("url");
  const [stage,       setStage]       = useState<Stage>("input");
  const [url,         setUrl]         = useState("");
  const [file,        setFile]        = useState<File|null>(null);
  const [jobSt,       setJobSt]       = useState<JobSt>("idle");
  const [variants,    setVariants]    = useState<ExtractedVariant[]>([]);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview|null>(null);
  const [toast,       setToast]       = useState<{text:string;ok:boolean}|null>(null);
  const [ingesting,   setIngesting]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (text:string, ok=true) => {
    setToast({text,ok}); setTimeout(()=>setToast(null), 5000);
  };

  const approved  = variants.filter(v => v.approved);
  const allOk     = variants.length > 0 && variants.every(v => v.approved);

  // ── Field change handler ───────────────────────
  const handleChange = useCallback((id:string, field:string, val:any) => {
    setVariants(prev => prev.map(v =>
      v.id===id ? {...v, [field]:val, edited:true} : v
    ));
  }, []);

  const handleToggle = useCallback((id:string) => {
    setVariants(prev => prev.map(v =>
      v.id===id ? {...v, approved:!v.approved} : v
    ));
  }, []);

  const toggleAll = () => {
    const newVal = !variants.every(v => v.approved);
    setVariants(prev => prev.map(v => ({...v, approved:newVal})));
  };

  // ── Mock extraction (reemplazar con API call real) ─
  const runExtraction = async () => {
    setJobSt("running");
    setVariants([]);
    setSourcePreview(null);
    try {
      await new Promise(r => setTimeout(r, 2000)); // simula latencia

      const mockSource: SourcePreview = {
        title: tab==="url" ? "Catálogo " + new URL(url).hostname : file?.name || "PDF",
        description: "Productos importados automáticamente por el motor PSRE v1.0.",
        images: ["https://via.placeholder.com/400x300/0F3460/FFFFFF?text=Producto"],
        price_raw: "UYU 1.200",
        source_url: tab==="url" ? url : file?.name || "pdf-upload",
      };
      setSourcePreview(mockSource);

      const mockVariants: ExtractedVariant[] = [
        {
          id: "v1", sku:`PROD-A1B2-1`, product_name:"Extractor Multifunción 750W",
          price:3490, currency:"UYU", stock:12,
          attributes:{ voltaje:"220V", color:"Plateado" },
          images:["https://via.placeholder.com/80/E5E7EB/374151?text=IMG"],
          source_url: mockSource.source_url, confidence:0.92, approved:true, edited:false,
        },
        {
          id: "v2", sku:`PROD-A1B2-2`, product_name:"Extractor Multifunción 750W",
          price:3290, currency:"UYU", stock:8,
          attributes:{ voltaje:"110V", color:"Plateado" },
          images:["https://via.placeholder.com/80/E5E7EB/374151?text=IMG"],
          source_url: mockSource.source_url, confidence:0.88, approved:true, edited:false,
        },
        {
          id: "v3", sku:`LICUA-C3D4-1`, product_name:"Licuadora Profesional 1000W",
          price:5200, currency:"UYU", stock:5,
          attributes:{ capacidad:"2L", color:"Negro" },
          images:[],
          source_url: mockSource.source_url, confidence:0.55, approved:false, edited:false,
        },
      ];
      setVariants(mockVariants);
      setJobSt("done");
      setStage("reviewing");
      notify(`✓ ${mockVariants.length} variantes detectadas — revisá y aprobá`);
    } catch(e:any) {
      setJobSt("error");
      notify(e.message, false);
    }
  };

  // ── Ingest approved variants ────────────────────
  const handleIngest = async () => {
    if (!approved.length) return;
    setIngesting(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      let ok = 0; const errors: string[] = [];

      for (const v of approved) {
        const { data:art, error:e1 } = await supabase
          .from("articulos")
          .insert({
            vendedor_id: user.id, nombre: v.product_name,
            tipo:"market", status:"draft",
            precio: v.price, moneda: v.currency, stock: v.stock||0,
            imagen_principal: v.images[0]||null,
          }).select("id").single();
        if (e1) { errors.push(`${v.sku}: ${e1.message}`); continue; }

        const { error:e2 } = await supabase.from("articulo_variantes").upsert({
          articulo_id: art.id, sku: v.sku, nombre: v.product_name,
          precio: v.price, moneda: v.currency, stock: v.stock||0,
          atributos: v.attributes, imagen_principal: v.images[0]||null,
          status:"active",
        }, { onConflict:"sku" });
        if (e2) errors.push(`variante ${v.sku}: ${e2.message}`);
        else ok++;
      }

      if (errors.length) notify(`${ok} ingresados, ${errors.length} errores`, false);
      else {
        notify(`✓ ${ok} variantes ingresadas al catálogo`);
        setStage("done");
      }
    } catch(e:any) {
      notify(e.message, false);
    } finally {
      setIngesting(false);
    }
  };

  const reset = () => {
    setStage("input"); setVariants([]); setSourcePreview(null);
    setJobSt("idle"); setUrl(""); setFile(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem", height:"100%" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:10, fontWeight:600, fontSize:"0.875rem",
          background:toast.ok?"#f0fdf4":"#fef2f2", color:toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"color-mix(in srgb, var(--color-success) 70%, white)":RED}`,
          boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>
            Importar Catálogo
          </h2>
          <p style={{ margin:"3px 0 0", fontSize:"0.78rem", color:"var(--gray-400)" }}>
            {stage==="input" && "Ingresá una URL, PDF o CSV para extraer productos"}
            {stage==="reviewing" && `${variants.length} variantes detectadas — revisá y aprobá antes de ingresar`}
            {stage==="done" && "Importación completada ✓"}
          </p>
        </div>
        {/* Progress steps */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {[["1","Fuente","input"],["2","Revisar","reviewing"],["3","Listo","done"]].map(([n,l,s],i)=>(
            <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", fontWeight:800,
                  fontSize:"11px", display:"flex", alignItems:"center", justifyContent:"center",
                  background: stage===s?ACCENT:["input","reviewing","done"].indexOf(stage as any)>i?"#E8F5E9":undefined,
                  border: `2px solid ${stage===s?ACCENT:["input","reviewing","done"].indexOf(stage as any)>i?GREEN:"var(--border)"}`,
                  color: stage===s?"#fff":["input","reviewing","done"].indexOf(stage as any)>i?GREEN:"var(--gray-400)",
                }}>
                  {["input","reviewing","done"].indexOf(stage as any)>i?"✓":n}
                </div>
                <span style={{ fontSize:"11px", fontWeight:600,
                  color:stage===s?"#111":"var(--gray-400)" }}>{l}</span>
              </div>
              {i<2 && <div style={{ width:24, height:2, background:"var(--border)" }}/>}
            </div>
          ))}
        </div>
      </div>

      {/* ── STAGE: INPUT ── */}
      {stage==="input" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", flex:1 }}>
          {/* Input panel */}
          <div style={card}>
            <div style={{ display:"flex", borderBottom:"2px solid #F0F0F0" }}>
              {([["url","🌐 URL"],["pdf","📄 PDF"],["csv","📊 CSV"]] as [Source,string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{
                  flex:1, padding:"0.65rem", border:"none", cursor:"pointer",
                  fontSize:"0.82rem", fontWeight:tab===k?700:500,
                  background:tab===k?"#fff":"#FAFAFA",
                  color:tab===k?ACCENT:"var(--mute)",
                  borderBottom:tab===k?`2.5px solid ${ACCENT}`:"2.5px solid transparent",
                  marginBottom:"-2px",
                }}>{l}</button>
              ))}
            </div>
            <div style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {tab==="url" && <>
                <div>
                  <div style={{ fontSize:"10px", color:"var(--gray-400)", fontWeight:700,
                    textTransform:"uppercase" as const, marginBottom:4 }}>URL del catálogo</div>
                  <input style={inp()} value={url} placeholder="https://tienda.com/productos"
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && url && runExtraction()} />
                </div>
                <div style={{ fontSize:"11px", color:"var(--gray-400)", lineHeight:1.5,
                  padding:"0.65rem", background:"#F8F9FB", borderRadius:8 }}>
                  Motor PSRE detecta automáticamente: títulos, precios, imágenes y variantes.<br/>
                  Soporta Shopify, WooCommerce, HTML estático y sitios con JS.
                </div>
                <button onClick={runExtraction} disabled={!url.trim()||jobSt==="running"}
                  style={btn(ACCENT, false, !url.trim()||jobSt==="running")}>
                  {jobSt==="running"?"⏳ Extrayendo...":"🌐 Extraer productos"}
                </button>
              </>}
              {tab==="pdf" && <>
                <div onClick={()=>fileRef.current?.click()}
                  style={{ border:`2px dashed ${file?ACCENT:"var(--border)"}`, borderRadius:10,
                    padding:"2rem", textAlign:"center" as const, cursor:"pointer",
                    background:file?"color-mix(in srgb, var(--brand-madre) 4%, transparent)":"#FAFAFA" }}>
                  {file
                    ? <><div style={{ fontSize:"2rem" }}>📄</div>
                        <div style={{ fontWeight:700, color:ACCENT }}>{file.name}</div>
                        <div style={{ fontSize:"11px", color:"var(--gray-400)" }}>
                          {(file.size/1024/1024).toFixed(2)} MB
                        </div>
                      </>
                    : <><div style={{ fontSize:"2.5rem", color:"#D1D5DB" }}>📁</div>
                        <div style={{ fontWeight:600, color:"#374151", marginTop:4 }}>
                          Click para seleccionar PDF
                        </div>
                      </>
                  }
                </div>
                <input ref={fileRef} type="file" accept=".pdf"
                  style={{ display:"none" }} onChange={e=>setFile(e.target.files?.[0]||null)}/>
                <button onClick={runExtraction} disabled={!file||jobSt==="running"}
                  style={btn(ACCENT, false, !file||jobSt==="running")}>
                  {jobSt==="running"?"⏳ Procesando...":"📄 Importar PDF"}
                </button>
              </>}
              {tab==="csv" && (
                <div style={{ padding:"1rem", background:"#F8F9FB", borderRadius:8 }}>
                  <div style={{ fontSize:"11px", color:"#374151", lineHeight:1.7 }}>
                    <b>Formato esperado:</b><br/>
                    <code style={{ fontSize:"10px", background:"var(--border)",
                      padding:"2px 6px", borderRadius:4 }}>
                      sku, nombre, precio, moneda, stock, atributos_json
                    </code>
                  </div>
                  <button onClick={()=>fileRef.current?.click()}
                    style={{ ...btn(BLUE), marginTop:"0.75rem" }}>
                    📊 Seleccionar CSV
                  </button>
                  <input ref={fileRef} type="file" accept=".csv"
                    style={{ display:"none" }} onChange={e=>setFile(e.target.files?.[0]||null)}/>
                </div>
              )}
            </div>
          </div>
          {/* Source preview */}
          <SourcePanel preview={sourcePreview} tab={tab} />
        </div>
      )}

      {/* ── STAGE: REVIEWING ── */}
      {stage==="reviewing" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem", flex:1 }}>
          {/* Stats + actions */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0.75rem 1rem", ...card }}>
            <div style={{ display:"flex", gap:"1.5rem" }}>
              {[
                { label:"Detectadas", value:variants.length, color:"#374151" },
                { label:"Aprobadas",  value:approved.length,  color:GREEN },
                { label:"Pendientes", value:variants.length-approved.length, color:ACCENT },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize:"1.25rem", fontWeight:800, color:s.color,
                    lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:"10px", color:"var(--gray-400)", fontWeight:600,
                    textTransform:"uppercase" as const }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={toggleAll} style={btn("var(--mute)", true)}>
                {allOk?"☐ Desaprobar todo":"☑ Aprobar todo"}
              </button>
              <button onClick={reset} style={btn("var(--mute)", true)}>
                ← Volver
              </button>
              <button onClick={handleIngest}
                disabled={!approved.length||ingesting}
                style={btn(GREEN, false, !approved.length||ingesting)}>
                {ingesting
                  ? "⏳ Ingresando..."
                  : `✓ Ingresar ${approved.length} variante${approved.length!==1?"s":""}`
                }
              </button>
            </div>
          </div>

          {/* Review grid: source left + table right */}
          <div style={{ display:"grid", gridTemplateColumns:"260px 1fr",
            gap:"1rem", flex:1, minHeight:0 }}>
            <SourcePanel preview={sourcePreview} tab={tab} />

            {/* Variants table */}
            <div style={{ ...card, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ overflowY:"auto" as const, flex:1 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
                  <thead>
                    <tr>
                      <th style={thS}>✓</th>
                      <th style={thS}>Conf.</th>
                      <th style={thS}>Img</th>
                      <th style={thS}>Nombre</th>
                      <th style={thS}>SKU</th>
                      <th style={thS}>Precio</th>
                      <th style={thS}>Atributos</th>
                      <th style={thS}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v,i) => (
                      <VariantRow key={v.id} v={v} index={i}
                        onChange={handleChange} onToggle={handleToggle} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE: DONE ── */}
      {stage==="done" && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center" as const, maxWidth:400 }}>
            <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🎉</div>
            <h3 style={{ margin:0, fontSize:"1.25rem", fontWeight:800, color:"#111" }}>
              Importación completada
            </h3>
            <p style={{ color:"var(--mute)", fontSize:"0.875rem", marginTop:8, lineHeight:1.6 }}>
              Las variantes fueron ingresadas al catálogo y están disponibles en
              <strong> Mis Publicaciones</strong>.
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:"1.5rem" }}>
              <button onClick={reset} style={btn(BLUE)}>
                + Nueva importación
              </button>
              <a href="/admin/publicaciones"
                style={{ ...btn(GREEN), textDecoration:"none", display:"inline-block" }}>
                Ver publicaciones →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

