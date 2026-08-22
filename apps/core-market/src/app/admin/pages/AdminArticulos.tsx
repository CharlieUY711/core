import { useState, useEffect } from "react";
import { buscarProductos, fichaPorTitulo, type FichaCanal } from "../utils/canalesSync";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";

interface Depto  { id: string; nombre: string; }
interface Cat    { id: string; nombre: string; departamento_id: string; }
interface SubCat { id: string; nombre: string; categoria_id: string; }

const ACCENT = "var(--brand-madre)";
const BLUE   = "var(--brand-navy)";
const GREEN  = "var(--color-success)";

const CONDICIONES = ["Nuevo","Excelente","Muy bueno","Bueno","Regular","Para reparar"];
const MONEDAS     = ["UYU","USD","EUR"];
const DISPONIBILIDADES = [
  { id:"inmediata",    label:"Inmediata",     desc:"Disponible para envío hoy" },
  { id:"bajo_pedido",  label:"Bajo pedido",   desc:"Se consigue en 3-5 días" },
  { id:"agotado",      label:"Sin stock",     desc:"Pausar publicación" },
];

const STEPS = [
  { id:1, label:"Tipo",       icon:"🏷" },
  { id:2, label:"Información",icon:"📝" },
  { id:3, label:"Imágenes",   icon:"🖼" },
  { id:4, label:"Precio",     icon:"💰" },
  { id:5, label:"Detalles",   icon:"⚙️" },
  { id:6, label:"Destinos",   icon:"📡" },
  { id:7, label:"Revisión",   icon:"✅" },
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
 */
export default function AdminArticulos(
  { onFinish, onCancel }: { onFinish?: () => void; onCancel?: () => void } = {}
) {
  const { isAdmin } = useOutletContext<any>() || {};
  const navigate    = useNavigate();
  const salir = (recargar: boolean) => {
    const cb = recargar ? onFinish : onCancel;
    if (cb) cb();
    else navigate("/admin/publicaciones");
  };
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState<{text:string;ok:boolean}|null>(null);

  // Catálogo
  const [deptos,  setDeptos]  = useState<Depto[]>([]);
  const [cats,    setCats]    = useState<Cat[]>([]);
  const [subcats, setSubcats] = useState<SubCat[]>([]);

  // PASO 1: Tipo
  const [tipo, setTipo] = useState<"market"|"secondhand">("market");

  // PASO 2: Información
  const [nombre,      setNombre]      = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Lo que el canal sabe del producto. Se busca mientras se escribe el nombre:
  // todo lo que no es una decision de quien vende -las versiones que existen,
  // la descripcion, las fotos del fabricante, el precio de mercado- es
  // informacion publica del producto y no hay por que hacersela cargar.
  const [candidatos, setCandidatos] = useState<Array<{id:string;nombre:string;imagen:string|null;rasgos:string[]}>>([]);
  const [buscandoProd, setBuscandoProd] = useState(false);
  const [elegido, setElegido] = useState<FichaCanal|null>(null);
  const [idElegido, setIdElegido] = useState<string|null>(null);
  const [condicion,   setCondicion]   = useState("Nuevo");

  // Se espera a que deje de escribir: buscar en cada tecla castiga la API y
  // hace parpadear la lista sin que nadie llegue a leerla.
  useEffect(() => {
    if (idElegido) return;              // ya eligio: no se le cambia debajo
    const q = nombre.trim();
    if (q.length < 4) { setCandidatos([]); return; }
    let vivo = true;
    setBuscandoProd(true);
    const t = setTimeout(async () => {
      const r = await buscarProductos(q);
      if (!vivo) return;
      setCandidatos(r);
      setBuscandoProd(false);
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [nombre, idElegido]);

  /**
   * Adopta la version elegida.
   *
   * Se completa lo que esta vacio y no se pisa lo escrito: si alguien ya
   * redacto su descripcion o cargo sus fotos, son suyas y valen mas que las
   * del catalogo.
   */
  const adoptarProducto = async (id: string) => {
    setBuscandoProd(true);
    const f = await fichaPorTitulo("", "mercadolibre", id);
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

  // PASO 6: Destinos
  const [canales, setCanales] = useState<string[]>([]);

  // PASO 3: Media
  const [imagenes,  setImagenes]  = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // PASO 4: Precio
  const [precio,      setPrecio]      = useState("");
  const [precioOrig,  setPrecioOrig]  = useState("");
  const [moneda,      setMoneda]      = useState("UYU");
  const descuento = precio && precioOrig && parseFloat(precioOrig) > parseFloat(precio)
    ? Math.round((1 - parseFloat(precio) / parseFloat(precioOrig)) * 100)
    : null;

  // PASO 5: Detalles
  const [deptoId,       setDeptoId]       = useState("");
  const [catId,         setCatId]         = useState("");
  const [subcatId,      setSubcatId]      = useState("");
  const [stock,         setStock]         = useState("1");
  const [disponibilidad,setDisponibilidad] = useState("inmediata");
  const [publicarComo,  setPublicarComo]  = useState<"active"|"draft">("active");

  const filteredCats = cats.filter(c => c.departamento_id === deptoId);
  const filteredSubs = subcats.filter(s => s.categoria_id === catId);

  const notify = (text: string, ok = true) => {
    setToast({text, ok});
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("departamentos").select("id, nombre").eq("activo", true).order("orden"),
      supabase.from("categorias").select("id, nombre, departamento_id").eq("activo", true).order("orden"),
      supabase.from("subcategorias").select("id, nombre, categoria_id").eq("activo", true).order("orden"),
    ]).then(([d, c, s]) => {
      setDeptos(d.data || []);
      setCats(c.data || []);
      setSubcats(s.data || []);
    });
  }, []);

  const canNext = (): boolean => {
    if (step === 1) return true;
    if (step === 2) return nombre.trim().length > 0 && descripcion.trim().length > 0;
    if (step === 3) return imagenes.length > 0;
    if (step === 4) return precio.length > 0 && parseFloat(precio) > 0;
    if (step === 5) return true; // departamento opcional temporalmente
    if (step === 6) return true; // el canal base del paso 1 siempre esta
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

      const { error } = await supabase.rpc("crear_publicacion", {
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
  const card: React.CSSProperties = {
    background:"#fff", borderRadius:14, padding:"1.5rem",
    border:"1px solid #F3F4F6", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ maxWidth:760, margin:"0 auto", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

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

      {/* Stepper */}
      <div style={{ ...card, padding:"1rem 1.5rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {STEPS.map((s, i) => {
            const done    = step > s.id;
            const active  = step === s.id;
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", cursor: done ? "pointer" : "default" }}
                  onClick={() => done && setStep(s.id)}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:"14px",
                    background: done ? GREEN : active ? ACCENT : "#F3F4F6",
                    color: done || active ? "#fff" : "var(--gray-400)",
                    fontWeight:700, transition:"all .2s",
                    border: active ? `2px solid ${ACCENT}` : "none",
                  }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span style={{ fontSize:"10px", fontWeight: active ? 700 : 400,
                    color: active ? ACCENT : done ? GREEN : "var(--gray-400)", whiteSpace:"nowrap" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex:1, height:2, background: done ? GREEN : "var(--border)",
                    margin:"0 4px", marginBottom:"18px", transition:"background .2s" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenido del paso */}
      <div style={card}>

        {/* PASO 1: Tipo */}
        {step === 1 && (
          <div>
            <h2 style={{ margin:"0 0 0.5rem", fontSize:"1.1rem", fontWeight:800, color:"#111" }}>¿Qué vas a publicar?</h2>
            <p style={{ color:"var(--mute)", fontSize:"0.875rem", marginBottom:"1.5rem" }}>
              Elegí el tipo de publicación para tu artículo.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
              {([
                { id:"market",     icon:"🛍", title:"Market",      desc:"Producto nuevo, precio fijo, stock ilimitado" },
                { id:"secondhand", icon:"♻️", title:"Second Hand", desc:"Artículo usado, negociable, unidad única" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTipo(t.id)} style={{
                  padding:"1.5rem", borderRadius:12, textAlign:"left",
                  border:`2px solid ${tipo===t.id ? ACCENT : "var(--border)"}`,
                  background: tipo===t.id ? "color-mix(in srgb, var(--brand-madre) 4%, transparent)" : "#fff",
                  cursor:"pointer", transition:"all .15s",
                }}>
                  <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>{t.icon}</div>
                  <div style={{ fontWeight:800, fontSize:"1rem", color: tipo===t.id ? ACCENT : "#111", marginBottom:"4px" }}>{t.title}</div>
                  <div style={{ fontSize:"0.8rem", color:"var(--mute)", lineHeight:1.4 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Información */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Información del artículo</h2>
            <div>
              <label style={lbl}>Nombre *</label>
              <input style={inp} value={nombre}
                onChange={e => { setNombre(e.target.value); setIdElegido(null); setElegido(null); }}
                placeholder="Ej: iPhone 14 Pro 256GB Negro" />

              {buscandoProd && !elegido && (
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
                    <button key={c.id} onClick={() => adoptarProducto(c.id)}
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
                        {c.rasgos.length > 0 && (
                          <span style={{ fontSize:"0.72rem", color:"var(--gray-400)" }}>
                            {c.rasgos.join(" · ")}
                          </span>
                        )}
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
            <div>
              <label style={lbl}>Descripción *</label>
              <textarea style={{ ...inp, minHeight:100, resize:"vertical" }}
                value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Describí el artículo con detalle: características, uso, accesorios incluidos..." />
              <div style={{ fontSize:"11px", color:"var(--gray-400)", textAlign:"right", marginTop:"3px" }}>
                {descripcion.length} / 2000
              </div>
            </div>
            {tipo === "secondhand" && (
              <div>
                <label style={lbl}>Condición *</label>
                <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                  {CONDICIONES.map(c => (
                    <button key={c} onClick={() => setCondicion(c)} style={{
                      padding:"0.4rem 0.75rem", borderRadius:8, fontSize:"0.8rem",
                      border:`1.5px solid ${condicion===c ? ACCENT : "var(--border)"}`,
                      background: condicion===c ? "color-mix(in srgb, var(--brand-madre) 8%, transparent)" : "#fff",
                      color: condicion===c ? ACCENT : "var(--mute)",
                      fontWeight: condicion===c ? 700 : 400, cursor:"pointer",
                    }}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Imágenes */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <h2 style={{ margin:"0 0 4px", fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Imágenes y videos</h2>
              <p style={{ color:"var(--mute)", fontSize:"0.875rem", margin:0 }}>
                Seleccioná desde tu Biblioteca. La primera imagen es la principal.
              </p>
            </div>
            <SelectorMediaArticulo
              imagenes={imagenes}
              videos={videoUrls}
              onChangeImagenes={setImagenes}
              onChangeVideos={setVideoUrls}
            />
            {imagenes.length === 0 && (
              <div style={{ padding:"0.75rem", background:"#FFFBEB", border:"1px solid #FDE68A",
                borderRadius:8, fontSize:"0.8rem", color:"#92400E" }}>
                ⚠ Al menos una imagen es obligatoria para publicar.
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Precio */}
        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Precio</h2>
            <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:"1rem" }}>
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
              <div>
                <label style={lbl}>Precio original <span style={{ fontWeight:400, color:"var(--gray-400)" }}>(sin descuento)</span></label>
                <input style={inp} type="number" value={precioOrig}
                  onChange={e => setPrecioOrig(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
            {descuento && (
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.75rem 1rem",
                background:"#f0fdf4", border:"1px solid color-mix(in srgb, var(--color-success) 70%, white)", borderRadius:8 }}>
                <span style={{ fontSize:"1.25rem" }}>🏷</span>
                <span style={{ fontWeight:700, color:"#166534", fontSize:"0.9rem" }}>
                  Descuento del {descuento}% calculado automáticamente
                </span>
              </div>
            )}
            {precio && (
              <div style={{ padding:"1rem", background:"var(--gray-50)", borderRadius:8, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:"0.8rem", color:"var(--mute)", marginBottom:"4px" }}>Vista previa del precio</div>
                {precioOrig && parseFloat(precioOrig) > parseFloat(precio) && (
                  <div style={{ fontSize:"0.9rem", color:"var(--gray-400)", textDecoration:"line-through" }}>
                    {moneda} {parseFloat(precioOrig).toLocaleString("es-UY")}
                  </div>
                )}
                <div style={{ fontSize:"1.5rem", fontWeight:900, color:ACCENT }}>
                  {moneda} {parseFloat(precio || "0").toLocaleString("es-UY")}
                </div>
                {descuento && (
                  <div style={{ display:"inline-block", background:ACCENT, color:"#fff",
                    fontSize:"0.75rem", fontWeight:700, padding:"2px 8px", borderRadius:20, marginTop:"4px" }}>
                    -{descuento}% OFF
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 5: Detalles */}
        {step === 5 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Detalles y disponibilidad</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
              <div>
                <label style={lbl}>Departamento *</label>
                <select style={inp} value={deptoId}
                  onChange={e => { setDeptoId(e.target.value); setCatId(""); setSubcatId(""); }}>
                  <option value="">Seleccionar...</option>
                  {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={catId}
                  onChange={e => { setCatId(e.target.value); setSubcatId(""); }}
                  disabled={!deptoId}>
                  <option value="">Seleccionar...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {filteredSubs.length > 0 && (
                <div>
                  <label style={lbl}>Subcategoría</label>
                  <select style={inp} value={subcatId}
                    onChange={e => setSubcatId(e.target.value)} disabled={!catId}>
                    <option value="">Seleccionar...</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Stock</label>
                <input style={inp} type="number" value={stock}
                  onChange={e => setStock(e.target.value)} min="0" />
              </div>
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

        {/* PASO 6: Revisión */}
        {step === 6 && (
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
        {step === 7 && (
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

      {/* Navegación */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button
          onClick={() => step > 1 ? setStep(s => s-1) : salir(false)}
          style={{ padding:"0.65rem 1.25rem", background:"transparent",
            border:"1.5px solid var(--border)", borderRadius:10,
            color:"var(--mute)", cursor:"pointer", fontSize:"0.875rem" }}>
          {step === 1 ? "← Cancelar" : "← Anterior"}
        </button>

        <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
          <span style={{ fontSize:"0.8rem", color:"var(--gray-400)" }}>Paso {step} de {STEPS.length}</span>
          {step < 6 ? (
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



