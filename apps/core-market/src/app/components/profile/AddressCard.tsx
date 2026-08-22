import { useState } from "react";
import AddressMap from "../maps/AddressMap";

interface Address { id:string; label:string; street:string; city:string; zip:string; lat?:number; lng?:number; isDefault:boolean; }
interface Props { address:Address; onDefault:(id:string)=>void; onEdit:(id:string)=>void; onDelete:(id:string)=>void; }

const ICONS: Record<string,string> = { Casa:"🏠", Trabajo:"💼", Otro:"📌" };

export default function AddressCard({ address, onDefault, onEdit, onDelete }: Props) {
  const [hov, setHov] = useState(false);
  const [del, setDel] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ border:`1.5px solid ${address.isDefault?"var(--brand-madre)":hov?"#CBD5E1":"var(--border)"}`,
        borderRadius:"14px", overflow:"hidden", background:"#fff",
        boxShadow:hov?"0 4px 16px rgba(0,0,0,0.08)":"0 1px 3px rgba(0,0,0,0.05)", transition:"all 0.2s" }}>
      {address.lat && address.lng
        ? <AddressMap lat={address.lat} lng={address.lng} height="130px" />
        : <div style={{ height:"80px", background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>🗺️</div>
      }
      <div style={{ padding:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.35rem" }}>
          <span>{ICONS[address.label]||"📌"}</span>
          <span style={{ fontWeight:700, fontSize:"0.9rem" }}>{address.label}</span>
          {address.isDefault && <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:"20px", fontSize:"0.65rem", fontWeight:700, background:"var(--brand-madre)", color:"#fff" }}>Predeterminada</span>}
        </div>
        <div style={{ color:"var(--mute)", fontSize:"0.8rem" }}>{address.street}{address.city?`, ${address.city}`:""}</div>
        <div style={{ display:"flex", gap:"0.4rem", marginTop:"0.75rem" }}>
          {!address.isDefault && <button onClick={()=>onDefault(address.id)} style={{ flex:1, padding:"5px 0", background:"color-mix(in srgb, var(--brand-madre) 8%, transparent)", color:"var(--brand-madre)", border:"1px solid color-mix(in srgb, var(--brand-madre) 30%, transparent)", borderRadius:"7px", cursor:"pointer", fontSize:"0.72rem", fontWeight:700 }}>Predeterminar</button>}
          <button onClick={()=>onEdit(address.id)} style={{ flex:1, padding:"5px 0", background:"rgba(59,130,246,0.08)", color:"#3B82F6", border:"1px solid rgba(59,130,246,0.3)", borderRadius:"7px", cursor:"pointer", fontSize:"0.72rem", fontWeight:700 }}>✏️ Editar</button>
          {del ? (
            <>
              <button onClick={()=>onDelete(address.id)} style={{ flex:1, padding:"5px 0", background:"#EF4444", color:"#fff", border:"none", borderRadius:"7px", cursor:"pointer", fontSize:"0.72rem", fontWeight:700 }}>Confirmar</button>
              <button onClick={()=>setDel(false)} style={{ padding:"5px 8px", background:"#f1f5f9", border:"none", borderRadius:"7px", cursor:"pointer", fontSize:"0.72rem" }}>✕</button>
            </>
          ) : <button onClick={()=>setDel(true)} style={{ padding:"5px 10px", background:"rgba(239,68,68,0.08)", color:"#EF4444", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"7px", cursor:"pointer", fontSize:"0.72rem" }}>🗑</button>}
        </div>
      </div>
    </div>
  );
}


