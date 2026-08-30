import { useState, useEffect, useRef, useCallback } from "react";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { ItemDeBarra } from "../components/BarraDeAcciones";
import { supabase } from "../../../utils/supabase/client";
import AddressAutocomplete from "../../components/maps/AddressAutocomplete";
import AddressCard from "../../components/profile/AddressCard";
import AddressMap from "../../components/maps/AddressMap";
import { useOutletContext } from "react-router-dom";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Address {
  id:           string;
  label:        string;
  street:       string;
  doorNumber?:  string;
  corner?:      string;
  apartment?:   string;
  indicaciones?: string;
  city:         string;
  zip:          string;
  lat?:         number;
  lng?:         number;
  isDefault:    boolean;
}

interface Contact {
  id:        string;
  type:      "phone" | "whatsapp" | "instagram" | "telegram";
  value:     string;
  preferred: boolean;
}

interface ProfileData {
  nombre:    string;
  documento: string;
  addresses: Address[];
  contacts:  Contact[];
  prefContactMethod: string;
  prefSchedule:      string;
  notes:             string;
}

const CONTACT_ICONS: Record<string, string> = {
  phone:     "📞",
  whatsapp:  "💬",
  instagram: "📸",
  telegram:  "✈️",
};

const CONTACT_LABELS: Record<string, string> = {
  phone:     "Teléfono",
  whatsapp:  "WhatsApp",
  instagram: "Instagram",
  telegram:  "Telegram",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminProfile() {
  const { user } = useOutletContext<any>() || {};
  const p = usePantalla();
  const [profile, setProfile] = useState<ProfileData>({
    nombre:"", documento:"", addresses:[], contacts:[],
    prefContactMethod:"whatsapp", prefSchedule:"mañana", notes:"",
  });
  const [avatar,   setAvatar]   = useState<string|null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [tab,      setTab]      = useState<"personal"|"addresses"|"contacts"|"preferences">("personal");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const saved = localStorage.getItem(`profile_${user.id}`);
    const local = saved ? JSON.parse(saved) : {};
    setProfile(p => ({ ...p, nombre: meta.nombre || "", ...local }));
    const av = localStorage.getItem(`avatar_${user.id}`);
    if (av) setAvatar(av);
  }, [user]);

  const save = (updates: Partial<ProfileData>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    localStorage.setItem(`profile_${user?.id}`, JSON.stringify(next));
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.auth.updateUser({ data: { nombre: profile.nombre } });
    localStorage.setItem(`profile_${user?.id}`, JSON.stringify(profile));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setAvatar(url);
      localStorage.setItem(`avatar_${user?.id}`, url);
    };
    reader.readAsDataURL(file);
  };

  /* Las solapas son las secciones de la barra, como en todo el panel. Antes
     eran una fila de pestanas propia debajo de la ficha: otro lugar mas donde
     mirar, y distinto al de las demas pantallas. */
  const SECCIONES = [
    { valor:"personal",    label:"Datos personales" },
    { valor:"addresses",   label:"Direcciones" },
    { valor:"contacts",    label:"Contacto" },
    { valor:"preferences", label:"Preferencias" },
  ];

  const initials = profile.nombre
    ? profile.nombre.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  /* "Grabar" esta siempre, apagado hasta que haya algo que grabar. Antes era
     un boton propio adentro de la ficha, con su color y su tamano. */
  const acciones: ItemDeBarra[] = [
    { label: saving ? "Grabando…" : saved ? "Grabado" : "Grabar",
      destacado: true, color: "var(--brand-madre)",
      desactivada: saving,
      motivo: "Esperá a que termine de grabar",
      onClick: () => { void handleSave(); } },
  ];

  return (
    /* La barra, el aviso y el ancho los define `Pantalla`. Acá había un
       `maxWidth: 860` centrado, así que Perfil se veía más angosto que el resto
       del panel sin ninguna razón. */
    <Pantalla p={p}
      secciones={{ valor: tab, opciones: SECCIONES,
        onCambio: v => setTab(v as typeof tab) }}
      extra={acciones}>

      {/* ── La ficha de la persona ──
          Siempre son personas físicas las que acceden: el perfil es de la
          persona, y una persona puede administrar N tiendas. */}
      <div style={{ background:"#fff", borderRadius:"16px", padding:"2rem", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", alignItems:"center", gap:"1.5rem" }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <div onClick={() => inputRef.current?.click()}
            style={{ width:"80px", height:"80px", borderRadius:"50%", cursor:"pointer", overflow:"hidden",
              background: avatar ? "transparent" : "linear-gradient(135deg,var(--brand-madre),#FF4500)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.75rem", fontWeight:700, color:"#fff",
              border:"3px solid #fff", boxShadow:"0 4px 12px color-mix(in srgb, var(--brand-madre) 30%, transparent)" }}>
            {avatar ? <img src={avatar} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : initials}
          </div>
          <div onClick={() => inputRef.current?.click()}
            style={{ position:"absolute", bottom:0, right:0, width:"24px", height:"24px", borderRadius:"50%",
              background:"var(--brand-madre)", display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", border:"2px solid #fff", fontSize:"0.7rem" }}>✏️</div>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:"none" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"1.25rem", fontWeight:800, color:"#111" }}>
            {profile.nombre || user?.email?.split("@")[0] || "Usuario"}
          </div>
          <div style={{ color:"var(--gray-400)", fontSize:"0.875rem", marginTop:"2px" }}>{user?.email}</div>
          <div style={{ marginTop:"0.5rem" }}>
            <span style={{ padding:"3px 10px", borderRadius:"20px", fontSize:"0.72rem", fontWeight:700,
              background:"color-mix(in srgb, var(--brand-madre) 10%, transparent)", color:"var(--brand-madre)" }}>
              {user?.user_metadata?.role === "admin" ? "👑 Administrador" : "👤 Usuario"}
            </span>
          </div>
        </div>
      </div>

      {/* ── La sección abierta ── */}
      <div style={{ background:"#fff", borderRadius:"16px", padding:"2rem", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>

        {tab === "personal" && (
          <PersonalTab profile={profile} email={user?.email||""} onChange={save} />
        )}
        {tab === "addresses" && (
          <AddressesTab addresses={profile.addresses} onChange={a => save({ addresses: a })} />
        )}
        {tab === "contacts" && (
          <ContactsTab contacts={profile.contacts} onChange={c => save({ contacts: c })} />
        )}
        {tab === "preferences" && (
          <PreferencesTab profile={profile} onChange={save} />
        )}
      </div>
    </Pantalla>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────
function PersonalTab({ profile, email, onChange }: { profile: ProfileData; email: string; onChange: (u: Partial<ProfileData>) => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <SectionTitle title="Información personal" subtitle="Tus datos básicos de cuenta" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <InputField label="Nombre completo" value={profile.nombre} onChange={v => onChange({ nombre: v })} placeholder="Ej: Carlos Varalla" />
        <InputField label="Documento de identidad" value={profile.documento} onChange={v => onChange({ documento: v })} placeholder="Ej: 12345678" />
        <InputField label="Email" value={email} onChange={() => {}} placeholder="" disabled />
      </div>
    </div>
  );
}

// ─── Addresses Tab ────────────────────────────────────────────────────────────
function AddressesTab({ addresses, onChange }: { addresses: Address[]; onChange: (a: Address[]) => void }) {
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState<string|null>(null);
  const [form,    setForm]    = useState({ label:"Casa", street:"", city:"", zip:"", lat:0, lng:0 });
  const [delId,   setDelId]   = useState<string|null>(null);

  const handleAdd = () => {
    if (!form.street) return;
    const newAddr: Address = { id: Date.now().toString(), label: form.label, street: form.street, city: form.city, zip: form.zip, lat: form.lat, lng: form.lng, isDefault: addresses.length === 0 };
    onChange([...addresses, newAddr]);
    setForm({ label:"Casa", street:"", doorNumber:"", corner:"", apartment:"", indicaciones:"", city:"", zip:"", lat:0, lng:0 }); setAdding(false);
  };

  const handleEdit = () => {
    onChange(addresses.map(a => a.id===editId ? { ...a, ...form } : a));
    setEditId(null);
  };

  const handleDelete = (id: string) => { onChange(addresses.filter(a => a.id !== id)); setDelId(null); };
  const handleDefault = (id: string) => onChange(addresses.map(a => ({ ...a, isDefault: a.id === id })));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <SectionTitle title="Mis direcciones" subtitle="Gestioná tus ubicaciones de entrega" />
        <button onClick={() => setAdding(true)}
          style={{ padding:"0.5rem 1rem", background:"var(--brand-madre)", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"0.85rem" }}>
          + Agregar dirección
        </button>
      </div>

      {/* Form agregar */}
      {(adding || editId) && (
        <AddressForm
          form={form}
          setForm={setForm}
          editId={editId}
          onCancel={() => { setAdding(false); setEditId(null); setForm({ label:"Casa", street:"", doorNumber:"", corner:"", apartment:"", indicaciones:"", city:"", zip:"", lat:0, lng:0 }); }}
          onSubmit={editId ? handleEdit : handleAdd}
        />
      )}

      {/* Lista */}
      {addresses.length === 0 && !adding ? (
        <EmptyState icon="📍" title="Sin direcciones" subtitle="Agregá una dirección para facilitar tus compras" />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          {addresses.map(addr => (
            <div key={addr.id} style={{ border:"1.5px solid var(--border)", borderRadius:"12px", padding:"1rem 1.25rem",
              display:"flex", alignItems:"center", gap:"1rem",
              borderColor: addr.isDefault ? "var(--brand-madre)" : "var(--border)",
              background: addr.isDefault ? "#FFF8F5" : "#fff" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"10px", background: addr.isDefault ? "color-mix(in srgb, var(--brand-madre) 10%, transparent)" : "#F3F4F6",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.25rem", flexShrink:0 }}>
                {addr.label === "Casa" ? "🏠" : addr.label === "Trabajo" ? "💼" : "📌"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <span style={{ fontWeight:700, fontSize:"0.9rem", color:"#111" }}>{addr.label}</span>
                  {addr.isDefault && <span style={{ padding:"2px 8px", borderRadius:"20px", fontSize:"0.68rem", fontWeight:700, background:"var(--brand-madre)", color:"#fff" }}>Predeterminada</span>}
                </div>
                <div style={{ color:"var(--mute)", fontSize:"0.82rem", marginTop:"2px" }}>{addr.street}{addr.city ? `, ${addr.city}` : ""}{addr.zip ? ` (${addr.zip})` : ""}</div>
              </div>
              <div style={{ display:"flex", gap:"0.4rem", flexShrink:0 }}>
                {!addr.isDefault && (
                  <button onClick={() => handleDefault(addr.id)}
                    style={{ padding:"4px 10px", background:"transparent", border:"1px solid var(--brand-madre)", color:"var(--brand-madre)", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600 }}>
                    Predeterminar
                  </button>
                )}
                <button onClick={() => { setEditId(addr.id); setForm({ label:addr.label, street:addr.street, city:addr.city, zip:addr.zip }); setAdding(false); }}
                  style={{ padding:"4px 10px", background:"transparent", border:"1px solid #3B82F6", color:"#3B82F6", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600 }}>✏️</button>
                {delId === addr.id ? (
                  <>
                    <button onClick={() => handleDelete(addr.id)}
                      style={{ padding:"4px 10px", background:"#EF4444", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:700 }}>Confirmar</button>
                    <button onClick={() => setDelId(null)}
                      style={{ padding:"4px 8px", background:"#f1f5f9", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem" }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setDelId(addr.id)}
                    style={{ padding:"4px 10px", background:"transparent", border:"1px solid #EF4444", color:"#EF4444", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600 }}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────
function ContactsTab({ contacts, onChange }: { contacts: Contact[]; onChange: (c: Contact[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ type:"phone" as Contact["type"], value:"" });
  const [delId,  setDelId]  = useState<string|null>(null);

  const handleAdd = () => {
    if (!form.value) return;
    onChange([...contacts, { id: Date.now().toString(), ...form, preferred: contacts.length === 0 }]);
    setForm({ type:"phone", value:"" }); setAdding(false);
  };

  const handlePreferred = (id: string) => onChange(contacts.map(c => ({ ...c, preferred: c.id === id })));
  const handleDelete    = (id: string) => { onChange(contacts.filter(c => c.id !== id)); setDelId(null); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <SectionTitle title="Mis contactos" subtitle="Cómo podemos contactarte" />
        <button onClick={() => setAdding(true)}
          style={{ padding:"0.5rem 1rem", background:"var(--brand-madre)", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"0.85rem" }}>
          + Agregar contacto
        </button>
      </div>

      {adding && (
        <div style={{ background:"#FFF8F5", border:"2px solid var(--brand-madre)", borderRadius:"12px", padding:"1.25rem", display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value as any}))}
            style={{ padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.875rem" }}>
            {Object.entries(CONTACT_LABELS).map(([k,v])=><option key={k} value={k}>{CONTACT_ICONS[k]} {v}</option>)}
          </select>
          <input value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} placeholder="Ej: +598 99 123 456"
            style={{ flex:1, minWidth:"180px", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.875rem", outline:"none" }} />
          <button onClick={handleAdd} style={{ padding:"0.6rem 1.25rem", background:"var(--brand-madre)", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700 }}>Agregar</button>
          <button onClick={() => setAdding(false)} style={{ padding:"0.6rem 0.75rem", background:"transparent", border:"1px solid var(--border)", borderRadius:"8px", cursor:"pointer" }}>✕</button>
        </div>
      )}

      {contacts.length === 0 && !adding ? (
        <EmptyState icon="📱" title="Sin contactos" subtitle="Agregá un teléfono o red social para recibir notificaciones" />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {contacts.map(c => (
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:"1rem", padding:"0.875rem 1.25rem",
              border:`1.5px solid ${c.preferred ? "var(--brand-madre)" : "var(--border)"}`, borderRadius:"12px",
              background: c.preferred ? "#FFF8F5" : "#fff" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background: c.preferred ? "color-mix(in srgb, var(--brand-madre) 10%, transparent)" : "#F3F4F6",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>
                {CONTACT_ICONS[c.type]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.75rem", color:"var(--gray-400)", fontWeight:600 }}>{CONTACT_LABELS[c.type]}</div>
                <div style={{ fontWeight:600, color:"#111", fontSize:"0.9rem" }}>{c.value}</div>
              </div>
              {c.preferred && <span style={{ padding:"2px 8px", borderRadius:"20px", fontSize:"0.68rem", fontWeight:700, background:"var(--brand-madre)", color:"#fff" }}>Preferido</span>}
              <div style={{ display:"flex", gap:"0.4rem" }}>
                {!c.preferred && <button onClick={() => handlePreferred(c.id)}
                  style={{ padding:"4px 10px", background:"transparent", border:"1px solid var(--brand-madre)", color:"var(--brand-madre)", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600 }}>Preferir</button>}
                {delId===c.id ? (
                  <>
                    <button onClick={() => handleDelete(c.id)} style={{ padding:"4px 10px", background:"#EF4444", color:"#fff", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:700 }}>Confirmar</button>
                    <button onClick={() => setDelId(null)} style={{ padding:"4px 8px", background:"#f1f5f9", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem" }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setDelId(c.id)} style={{ padding:"4px 10px", background:"transparent", border:"1px solid #EF4444", color:"#EF4444", borderRadius:"6px", cursor:"pointer", fontSize:"0.72rem", fontWeight:600 }}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────
function PreferencesTab({ profile, onChange }: { profile: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <SectionTitle title="Preferencias" subtitle="Personalizá tu experiencia" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <div>
          <label style={{ fontSize:"0.75rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Método de contacto preferido</label>
          <select value={profile.prefContactMethod} onChange={e=>onChange({ prefContactMethod:e.target.value })}
            style={{ width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.875rem" }}>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="phone">📞 Teléfono</option>
            <option value="email">📧 Email</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:"0.75rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Horario preferido</label>
          <select value={profile.prefSchedule} onChange={e=>onChange({ prefSchedule:e.target.value })}
            style={{ width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.875rem" }}>
            <option value="mañana">🌅 Mañana (9-12h)</option>
            <option value="tarde">☀️ Tarde (12-18h)</option>
            <option value="noche">🌙 Noche (18-21h)</option>
            <option value="cualquier">🕐 Cualquier horario</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize:"0.75rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Notas adicionales</label>
        <textarea value={profile.notes} onChange={e=>onChange({ notes:e.target.value })} rows={4}
          placeholder="Ej: Preferir contacto por WhatsApp después de las 18h..."
          style={{ width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.875rem", outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }} />
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontWeight:700, fontSize:"1rem", color:"#111" }}>{title}</div>
      <div style={{ color:"var(--gray-400)", fontSize:"0.8rem", marginTop:"2px" }}>{subtitle}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize:"0.75rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid var(--border)", borderRadius:"8px",
          fontSize:"0.875rem", outline:"none", background: disabled?"var(--gray-50)":"#fff",
          color: disabled?"var(--gray-400)":"#111", boxSizing:"border-box", transition:"border-color 0.15s" }}
        onFocus={e=>{ if(!disabled) e.target.style.borderColor="var(--brand-madre)"; }}
        onBlur={e=>{ e.target.style.borderColor="var(--border)"; }} />
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ padding:"3rem", textAlign:"center", background:"#FAFAFA", borderRadius:"12px", border:"1.5px dashed var(--border)" }}>
      <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>{icon}</div>
      <div style={{ fontWeight:700, color:"#374151", marginBottom:"0.25rem" }}>{title}</div>
      <div style={{ color:"var(--gray-400)", fontSize:"0.85rem" }}>{subtitle}</div>
    </div>
  );
}

// ─── AddressForm Component ────────────────────────────────────────────────────
function AddressForm({ form, setForm, editId, onCancel, onSubmit }: any) {
  const hasCoords = !!(form.lat && form.lng);
  const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      // 1. Obtener dirección
      const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&language=es&types=address&limit=1`);
      const data = await res.json();
      const feat = data.features?.[0];
      if (!feat) return;
      const address = feat.place_name;
      const parts   = address.split(",");
      const city    = parts.length > 1 ? parts[parts.length-3]?.trim() || "" : "";
      const doorNum = feat.address || "";

      // 2. Obtener calles cercanas para esquina
      let corner = "";
      try {
        const resR = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=60&limit=10&layers=road&access_token=${TOKEN}`);
        const dataR = await resR.json();
        const mainStreet = feat.text || "";
        const roads = [...new Set(
          dataR.features
            ?.map((f: any) => f.properties?.name)
            .filter((n: any) => n && n !== mainStreet && !n.match(/^\d/))
        )].slice(0,2) as string[];
        if (roads.length > 0) corner = `entre ${roads.join(" y ")}`;
      } catch {}

      setForm((p: any) => ({ ...p, street: address, lat, lng, city, doorNumber: doorNum || p.doorNumber, corner: corner || p.corner }));
    } catch {}
  };

  // Geolocalizar si no hay coords aun
  const [locating, setLocating] = useState(!hasCoords);
  useState(() => {
    if (!hasCoords) {
      navigator.geolocation?.getCurrentPosition(
        pos => {
          setForm((p: any) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
          setLocating(false);
        },
        () => {
          setForm((p: any) => ({ ...p, lat: -34.9011, lng: -56.1645 }));
          setLocating(false);
        }
      );
    }
  });

  return (
    <div style={{ background:"#FFF8F5", border:"2px solid var(--brand-madre)", borderRadius:"14px", overflow:"hidden" }}>
      <div style={{ padding:"0.875rem 1.25rem", borderBottom:"1px solid #FFE0CC", fontWeight:700, color:"var(--brand-madre)", fontSize:"0.9rem" }}>
        {editId ? "✏️ Editar dirección" : "📍 Nueva dirección"}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>

        {/* ── Formulario ── */}
        <div style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.875rem", overflowY:"auto", maxHeight:"520px" }}>

          {/* Etiqueta */}
          <div>
            <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Etiqueta</label>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              {["Casa","Trabajo"].map(l => (
                <button key={l} onClick={()=>setForm((p:any)=>({...p,label:l}))}
                  style={{ padding:"0.45rem 1rem", border:`1.5px solid ${form.label===l?"var(--brand-madre)":"var(--border)"}`,
                    background: form.label===l?"color-mix(in srgb, var(--brand-madre) 8%, transparent)":"#fff",
                    color: form.label===l?"var(--brand-madre)":"var(--mute)",
                    borderRadius:"8px", cursor:"pointer", fontWeight:form.label===l?700:400, fontSize:"0.82rem" }}>
                  {l==="Casa"?"🏠":"💼"} {l}
                </button>
              ))}
              <input
                value={!["Casa","Trabajo"].includes(form.label) ? form.label : ""}
                onChange={e => setForm((p:any) => ({...p, label: e.target.value || "Otro"}))}
                onFocus={e => { setForm((p:any) => ({...p, label: e.target.value || ""})); e.target.style.borderColor="var(--brand-madre)"; }}
                onBlur={e => { if(!e.target.value) setForm((p:any)=>({...p,label:"Otro"})); e.target.style.borderColor="var(--border)"; }}
                placeholder="📌 Otro (ej: Casa de playa)"
                style={{ flex:1, padding:"0.45rem 0.75rem",
                  border:`1.5px solid ${!["Casa","Trabajo"].includes(form.label)?"var(--brand-madre)":"var(--border)"}`,
                  background: !["Casa","Trabajo"].includes(form.label)?"color-mix(in srgb, var(--brand-madre) 8%, transparent)":"#fff",
                  borderRadius:"8px", fontSize:"0.82rem", outline:"none",
                  color: !["Casa","Trabajo"].includes(form.label)?"var(--brand-madre)":"var(--mute)" }} />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>
              Calle <span style={{color:"var(--gray-400)",fontWeight:400}}>(buscá o mové el mapa →)</span>
            </label>
            <AddressAutocomplete
              value={form.street}
              onChange={v => setForm((p:any) => ({...p, street:v}))}
              onSelect={async ({address, lat, lng}) => {
                const parts = address.split(",");
                const city = parts.length > 1 ? parts[parts.length-3]?.trim() || "" : "";
                setForm((p:any) => ({...p, street:address, lat, lng, city}));
                // Auto-detectar esquinas
                try {
                  const resR = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=60&limit=10&layers=road&access_token=${TOKEN}`);
                  const dataR = await resR.json();
                  const mainStreet = address.split(",")[0].replace(/\d+/g,"").trim();
                  const roads = [...new Set(
                    dataR.features?.map((f:any) => f.properties?.name)
                    .filter((n:any) => n && n !== mainStreet && !n.match(/^\d/))
                  )].slice(0,2) as string[];
                  if (roads.length > 0) setForm((p:any) => ({...p, corner: `entre ${roads.join(" y ")}`}));
                } catch {}
              }}
              placeholder="Ej: Convención 1267"
            />
          </div>

          {/* Nro puerta + Esquina */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem" }}>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Nº de puerta</label>
              <input value={form.doorNumber} onChange={e=>setForm((p:any)=>({...p,doorNumber:e.target.value}))}
                placeholder="Ej: 1267"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={async e => {
                  e.target.style.borderColor="var(--border)";
                  const num = e.target.value.trim();
                  if (!num || !form.street) return;
                  const streetBase = form.street.split(",")[0].replace(/\d+/g,"").trim();
                  const query = encodeURIComponent(`${streetBase} ${num}, ${form.city||"Montevideo"}`);
                  try {
                    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${TOKEN}&language=es&limit=1&types=address`);
                    const data = await res.json();
                    const feat = data.features?.[0];
                    if (feat) {
                      const [lng, lat] = feat.center;
                      const parts = feat.place_name.split(",");
                      const city = parts.length > 1 ? parts[parts.length-3]?.trim() || "" : "";
                      // Esquinas
                      const resR = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=60&limit=10&layers=road&access_token=${TOKEN}`);
                      const dataR = await resR.json();
                      const mainStreet = feat.text || "";
                      const roads = [...new Set(
                        dataR.features?.map((f:any) => f.properties?.name)
                        .filter((n:any) => n && n !== mainStreet && !n.match(/^\d/))
                      )].slice(0,2) as string[];
                      const corner = roads.length > 0 ? `entre ${roads.join(" y ")}` : "";
                      setForm((p:any) => ({...p, street: feat.place_name, lat, lng, city, corner: corner || p.corner}));
                    }
                  } catch {}
                }} />
            </div>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Esquina / entre calles</label>
              <input value={form.corner} onChange={e=>setForm((p:any)=>({...p,corner:e.target.value}))}
                placeholder="Auto-detectada"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
          </div>

          {/* Apto + Ciudad */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem" }}>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Nº de apartamento</label>
              <input value={form.apartment} onChange={e=>setForm((p:any)=>({...p,apartment:e.target.value}))}
                placeholder="Ej: Apto 302"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Ciudad</label>
              <input value={form.city} onChange={e=>setForm((p:any)=>({...p,city:e.target.value}))}
                placeholder="Ej: Montevideo"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
          </div>

          {/* CP + Indicaciones */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"0.6rem" }}>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Código postal</label>
              <input value={form.zip} onChange={e=>setForm((p:any)=>({...p,zip:e.target.value}))}
                placeholder="Ej: 11300"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
            <div>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"var(--mute)", display:"block", marginBottom:"4px" }}>Indicaciones de entrega</label>
              <input value={form.indicaciones} onChange={e=>setForm((p:any)=>({...p,indicaciones:e.target.value}))}
                placeholder="Ej: Timbre roto, llamar al llegar"
                style={{ width:"100%", padding:"0.55rem 0.7rem", border:"1.5px solid var(--border)", borderRadius:"8px", fontSize:"0.85rem", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="var(--brand-madre)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
          </div>

          {/* Estado validación */}
          {hasCoords ? (
            <div style={{ padding:"0.5rem 0.75rem", background:"#f0fdf4", border:"1px solid color-mix(in srgb, var(--color-success) 70%, white)",
              borderRadius:"8px", fontSize:"0.78rem", color:"#166534", display:"flex", gap:"0.5rem", alignItems:"center" }}>
              ✅ Validada · {form.lat?.toFixed(4)}, {form.lng?.toFixed(4)}
              {form.corner && <span style={{color:"var(--mute)"}}>· {form.corner}</span>}
            </div>
          ) : (
            <div style={{ padding:"0.5rem 0.75rem", background:"#fffbeb", border:"1px solid #FCD34D",
              borderRadius:"8px", fontSize:"0.78rem", color:"#92400e" }}>
              📍 Buscá una dirección o hacé click en el mapa
            </div>
          )}

          {/* Botones */}
          <div style={{ display:"flex", gap:"0.5rem", justifyContent:"flex-end" }}>
            <button onClick={onCancel}
              style={{ padding:"0.55rem 1rem", background:"transparent", border:"1.5px solid var(--border)",
                borderRadius:"8px", cursor:"pointer", fontSize:"0.85rem", color:"var(--mute)" }}>
              Cancelar
            </button>
            <button onClick={onSubmit} disabled={!form.street?.trim()}
              style={{ padding:"0.55rem 1.25rem",
                background: !form.street?.trim() ? "#ccc" : "var(--brand-madre)",
                color:"#fff", border:"none", borderRadius:"8px",
                cursor: !form.street?.trim() ? "not-allowed" : "pointer",
                fontWeight:700, fontSize:"0.85rem" }}>
              {editId ? "Guardar cambios" : "Agregar dirección"}
            </button>
          </div>
        </div>

        {/* ── Mapa siempre visible ── */}
        <div style={{ borderLeft:"1px solid #FFE0CC", display:"flex", flexDirection:"column", minHeight:"400px" }}>
          <div style={{ padding:"0.6rem 1rem", fontSize:"0.75rem", fontWeight:600, color:"var(--gray-400)",
            borderBottom:"1px solid #FFE0CC", background:"rgba(255,255,255,0.5)",
            display:"flex", alignItems:"center", gap:"0.4rem" }}>
            🗺️ {hasCoords ? "Ajustá el pin o hacé click en el mapa" : "Detectando tu ubicación..."}
          </div>
          {(hasCoords || locating) && (
            <div style={{ flex:1 }}>
              <AddressMap
                lat={form.lat || -34.9011}
                lng={form.lng || -56.1645}
                height="100%"
                interactive
                onLocationChange={async ({address, lat, lng}) => {
                  await reverseGeocode(lng, lat);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



