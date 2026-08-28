/**
 * Lo que los canales saben del producto: fotos del fabricante, ficha tecnica,
 * precio de mercado por canal, competencia y descripcion sugerida.
 *
 * Vivia dentro de AdminPublicaciones y dependia de que esa pantalla le pasara
 * los canales ya resueltos, asi que no se podia poner en otro lado. Extraido y
 * autonomo, va donde tenga sentido -hoy, debajo de la franja de avisos del
 * formulario-.
 */
import React, { useState, useEffect } from "react";
import { supabase } from "../../../../utils/supabase/client";
import { canalesDisponibles, fichasDeCanales, type FichaCanal } from "../../utils/canalesSync";

const VERDE_SYNC = "#16A34A";
const BLUE       = "#1A4F9C";

/** Estetica de un canal. Un canal desconocido cae en el neutro. */
const ESTETICA: Record<string,{label:string;color:string;tc:string}> = {
  mercadolibre: {label:"ML",   color:"#F5C518",     tc:"#333"},
  meta:         {label:"Meta", color:"#1877F2",     tc:"#fff"},
  whatsapp:     {label:"WA",   color:"#25D366",     tc:"#fff"},
  web:          {label:"Web",  color:"var(--mute)", tc:"#fff"},
};
export interface CanalUI { key:string; channel:string; label:string; color:string; tc:string }
const canalUI = (channel:string):CanalUI => {
  const e = ESTETICA[channel];
  return {
    key: "sync_"+channel, channel,
    label: e?.label ?? (channel.length<=5 ? channel.toUpperCase() : channel.slice(0,4).toUpperCase()),
    color: e?.color ?? "#64748B",
    tc:    e?.tc    ?? "#fff",
  };
};

/**
 * Lo que los canales ya saben del producto.
 *
 * Una vez que alguien definio QUE producto es, el resto -codigos, fotos del
 * fabricante, caracteristicas, a que precio se vende hoy- es informacion
 * publica del producto. Hacersela cargar a mano es pedirle que copie algo que
 * podemos traer.
 *
 * Se muestra por canal y no mezclado: el mismo producto no vale lo mismo ni
 * tiene la misma competencia en cada uno, y esa es justamente la comparacion
 * que permite decidir con que precio salir en cada lado.
 */
export function DatosDelProducto({ variantId, precioActual, guardada, fuente, traidaEl, onAplicado }: {
  variantId: string;
  precioActual: number;
  /** Lo ultimo que se guardo del producto, para mostrar mientras se consulta. */
  guardada?: Record<string,any>|null;
  fuente?: string|null;
  traidaEl?: string|null;
  onAplicado?: () => void;
}) {
  /*
   * Resuelve sus propios canales en vez de recibirlos.
   *
   * Antes se los pasaba la pantalla, asi que solo podia vivir donde esa
   * pantalla ya los tenia resueltos. Preguntandolos el mismo, se puede poner
   * en cualquier lado -que es lo que hacia falta para bajarlo debajo de la
   * franja de avisos, en el formulario-.
   */
  const [canales, setCanales] = useState<CanalUI[]>([]);
  const [nombreCanal, setNombreCanal] = useState<Record<string,string>>({});
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { disponibles } = await canalesDisponibles();
      if (!vivo) return;
      setCanales(disponibles.map(d => canalUI(d.channel)));
      setNombreCanal(Object.fromEntries(disponibles.map(d => [d.channel, d.nombre])));
    })();
    return () => { vivo = false; };
  }, []);

  const [fichas, setFichas] = useState<Record<string, FichaCanal|null>|null>(null);
  const [objetivo, setObjetivo] = useState<Record<string,string>>({});
  const [guardando, setGuardando] = useState<string|null>(null);
  const [aviso, setAviso] = useState<string|null>(null);

  useEffect(() => {
    let vivo = true;
    setFichas(null);
    (async () => {
      const f = await fichasDeCanales(variantId, canales.map(c => c.channel));
      if (!vivo) return;
      setFichas(f);

      // Lo que se acaba de traer se guarda: la proxima vez el articulo tiene
      // su ficha aunque el canal no conteste.
      const primera = Object.entries(f).find(([,x]) => x);
      if (primera) {
        const [canal, datos] = primera;
        await supabase.rpc("guardar_ficha_articulo", {
          p_variant_id: variantId, p_ficha: datos, p_fuente: canal,
          p_producto_id: (datos as FichaCanal).productoId ?? null,
        });
      }
    })();
    return () => { vivo = false; };
  }, [variantId, canales.map(c=>c.channel).join(",")]);

  // Mientras se consulta se muestra lo guardado: tener la ficha en pantalla
  // vale mas que un cartel de espera, y si el canal no contesta queda esa.
  const efectivas: Array<[string, FichaCanal]> = fichas
    ? Object.entries(fichas).filter(([,f]) => f) as Array<[string, FichaCanal]>
    : (guardada ? [[fuente ?? "guardada", guardada as FichaCanal]] : []);

  if (!efectivas.length) {
    return fichas === null
      ? <div style={{fontSize:"0.75rem",color:"var(--gray-400)",marginBottom:"0.9rem"}}>
          Buscando datos del producto…
        </div>
      : null;
  }
  const conDatos = efectivas;

  // La descripcion sugerida se toma del primer canal que la tenga: es del
  // producto, no del canal, asi que no tiene sentido repetirla por cada uno.
  const sugerida = conDatos.map(([,f]) => f!.descripcionSugerida).find(Boolean) ?? null;
  const argumentos = conDatos.map(([,f]) => f!.argumentosDeVenta).find(a => a?.length) ?? [];
  const fotos = conDatos.map(([,f]) => f!.imagenes).find(i => i?.length) ?? [];

  const fijarPrecio = async (channel: string) => {
    const bruto = (objetivo[channel] ?? "").trim();
    const monto = bruto === "" ? null : Number(bruto);
    if (bruto !== "" && (!Number.isFinite(monto!) || monto! < 0)) {
      setAviso("El precio tiene que ser un número."); return;
    }
    setGuardando(channel); setAviso(null);
    const { error } = await supabase.rpc("fijar_precio_canal", {
      p_variant_id: variantId, p_channel: channel, p_amount: monto, p_currency: "UYU",
    });
    setGuardando(null);
    if (error) { setAviso(error.message); return; }
    setAviso(monto === null || monto === 0
      ? "Sin precio propio: vuelve a valer el precio general."
      : "Precio guardado para ese canal.");
    onAplicado?.();
  };

  const usarDescripcion = async () => {
    if (!sugerida) return;
    setGuardando("desc"); setAviso(null);
    const { error } = await supabase.rpc("actualizar_publicacion", {
      p_variant_id: variantId, p_description: sugerida,
    });
    setGuardando(null);
    setAviso(error ? error.message : "Descripción actualizada.");
    if (!error) onAplicado?.();
  };

  const th: React.CSSProperties = {textAlign:"right",padding:"3px 6px",fontSize:"0.68rem",
    color:"var(--gray-400)",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"};
  const tdc: React.CSSProperties = {textAlign:"right",padding:"4px 6px",fontSize:"0.76rem",color:"#374151"};
  const money = (n:number,m:string) => (m?m+" ":"") + Number(n).toLocaleString("es-UY");

  return (
    <div style={{border:"1px solid var(--border)",borderRadius:9,padding:"0.75rem 0.85rem",
      marginBottom:"0.9rem",background:"#fff"}}>
      <div style={{fontSize:"10px",fontWeight:700,color:"var(--gray-400)",
        textTransform:"uppercase",letterSpacing:".08em",marginBottom:"0.5rem"}}>
        Datos del producto, traídos de los canales
      </div>
      {/* De donde salio y cuando: dos fuentes pueden diferir, y una ficha
          vieja sigue sirviendo pero conviene saber que lo es. */}
      {traidaEl && (
        <div style={{fontSize:"0.68rem",color:"var(--gray-400)",marginTop:-4,marginBottom:"0.55rem"}}>
          {fuente ? nombreCanal[fuente] ?? fuente : "Origen desconocido"}
          {" · actualizada el "}
          {new Date(traidaEl).toLocaleDateString("es-UY",{day:"2-digit",month:"2-digit",year:"numeric"})}
        </div>
      )}

      {fotos.length > 0 && (
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:"0.7rem"}}>
          {fotos.slice(0,8).map((u,i)=>(
            <img key={i} src={u} alt="" style={{width:56,height:56,objectFit:"cover",
              borderRadius:6,border:"1px solid var(--border)",flexShrink:0}}/>
          ))}
        </div>
      )}

      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"0.6rem"}}>
        <thead>
          <tr>
            <th style={{...th,textAlign:"left"}}>Canal</th>
            <th style={th}>Publicaciones</th>
            <th style={th}>Mínimo</th>
            <th style={th}>Mediana</th>
            <th style={th}>Máximo</th>
            <th style={{...th,textAlign:"center"}}>Tu precio ahí</th>
          </tr>
        </thead>
        <tbody>
          {canales.map(c => {
            // `fichas` puede ser null mientras se consulta; ahi vale la
            // guardada, que es lo que `efectivas` ya resolvio.
            const f = fichas?.[c.channel] ?? efectivas.find(([k])=>k===c.channel)?.[1] ?? null;
            const m = f?.mercado;
            return (
              <tr key={c.channel} style={{borderTop:"1px solid var(--gray-50)"}}>
                <td style={{...tdc,textAlign:"left",fontWeight:700}}>
                  {nombreCanal[c.channel] ?? c.label}
                </td>
                {m ? (
                  <>
                    <td style={tdc}>{m.ofertas}</td>
                    <td style={tdc}>{money(m.min,m.moneda)}</td>
                    <td style={{...tdc,fontWeight:700}}>{money(m.mediana,m.moneda)}</td>
                    <td style={tdc}>{money(m.max,m.moneda)}</td>
                  </>
                ) : (
                  <td colSpan={4} style={{...tdc,color:"var(--gray-400)"}}>
                    {/* El motivo, no un "sin datos" que no distingue un
                        producto que nadie mas vende de una consulta caida. */}
                    {f?.mercadoMotivo ?? "Sin datos de mercado en este canal"}
                  </td>
                )}
                <td style={{padding:"3px 6px",textAlign:"center",whiteSpace:"nowrap"}}>
                  <input value={objetivo[c.channel] ?? ""}
                    onChange={e=>setObjetivo(p=>({...p,[c.channel]:e.target.value}))}
                    placeholder={String(precioActual||"")}
                    style={{width:88,padding:"3px 6px",fontSize:"0.75rem",textAlign:"right",
                      border:"1px solid var(--border)",borderRadius:5}}/>
                  <button onClick={()=>fijarPrecio(c.channel)} disabled={guardando===c.channel}
                    style={{marginLeft:5,padding:"3px 8px",fontSize:"0.7rem",fontWeight:700,
                      border:"none",borderRadius:5,background:BLUE,color:"#fff",
                      cursor:guardando===c.channel?"wait":"pointer"}}>
                    {guardando===c.channel?"…":"Fijar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{fontSize:"0.68rem",color:"var(--gray-400)",marginBottom:"0.6rem"}}>
        Dejar el precio vacío y fijar quita el precio propio de ese canal: vuelve a valer el general.
      </div>

      {/* Ficha tecnica: lo que define al producto, no a la publicacion. */}
      {(() => {
        const attrs = conDatos.map(([,f]) => f.atributos).find(a => a?.length) ?? [];
        if (!attrs.length) return null;
        return (
          <details style={{marginBottom:"0.5rem"}}>
            <summary style={{cursor:"pointer",fontSize:"0.75rem",fontWeight:700,color:BLUE}}>
              Ficha técnica ({attrs.length})
            </summary>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",
              gap:"3px 14px",marginTop:6}}>
              {attrs.map((at,i)=>(
                <div key={i} style={{fontSize:"0.73rem",display:"flex",gap:6,
                  borderBottom:"1px solid var(--gray-50)",padding:"2px 0"}}>
                  <span style={{color:"var(--gray-400)",flex:"0 0 45%",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {at.id.replace(/_/g," ").toLowerCase()}
                  </span>
                  <span style={{color:"#111",fontWeight:600,minWidth:0,
                    overflow:"hidden",textOverflow:"ellipsis"}}>{at.valor}</span>
                </div>
              ))}
            </div>
          </details>
        );
      })()}

      {/* Competencia: a que precio y en que condiciones lo vende el resto. */}
      {(() => {
        const comp = conDatos.map(([,f]) => f.mercado?.competencia).find(c => c?.length) ?? [];
        if (!comp.length) return null;
        return (
          <details style={{marginBottom:"0.5rem"}}>
            <summary style={{cursor:"pointer",fontSize:"0.75rem",fontWeight:700,color:BLUE}}>
              Competencia ({comp.length})
            </summary>
            <table style={{width:"100%",borderCollapse:"collapse",marginTop:6}}>
              <tbody>
                {comp.map((c,i)=>(
                  <tr key={i} style={{borderTop:"1px solid var(--gray-50)"}}>
                    <td style={{...tdc,textAlign:"left",fontWeight:700}}>
                      {money(c.precio,c.moneda)}
                      {c.ganaLaCompra && <span style={{color:VERDE_SYNC,fontWeight:700}}> · gana la compra</span>}
                    </td>
                    <td style={tdc}>{c.envioGratis?"Envío gratis":"—"}</td>
                    <td style={tdc}>{c.vendidos>0?c.vendidos+" vendidos":"—"}</td>
                    <td style={tdc}>{c.condicion==="new"?"Nuevo":c.condicion==="used"?"Usado":c.condicion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        );
      })()}

      {argumentos.length > 0 && (
        <details style={{marginBottom:"0.5rem"}}>
          <summary style={{cursor:"pointer",fontSize:"0.75rem",fontWeight:700,color:BLUE}}>
            Para vender ({argumentos.length})
          </summary>
          <ul style={{margin:"5px 0 0",paddingLeft:17,fontSize:"0.75rem",color:"#374151",lineHeight:1.5}}>
            {argumentos.map((a,i)=><li key={i} style={{marginBottom:2}}>{a}</li>)}
          </ul>
        </details>
      )}

      {sugerida && (
        <details>
          <summary style={{cursor:"pointer",fontSize:"0.75rem",fontWeight:700,color:BLUE}}>
            Descripción ampliada sugerida
          </summary>
          <pre style={{fontSize:"0.72rem",whiteSpace:"pre-wrap",wordBreak:"break-word",
            background:"var(--gray-25, #FAFBFC)",border:"1px solid var(--border)",borderRadius:6,
            padding:8,marginTop:6,maxHeight:180,overflow:"auto",fontFamily:"inherit"}}>{sugerida}</pre>
          <button onClick={usarDescripcion} disabled={guardando==="desc"}
            style={{marginTop:6,padding:"5px 11px",fontSize:"0.73rem",fontWeight:700,
              border:"none",borderRadius:6,background:BLUE,color:"#fff",
              cursor:guardando==="desc"?"wait":"pointer"}}>
            {guardando==="desc"?"Guardando…":"Usar esta descripción"}
          </button>
        </details>
      )}

      {aviso && <div style={{fontSize:"0.73rem",color:"#374151",marginTop:"0.5rem"}}>{aviso}</div>}
    </div>
  );
}
