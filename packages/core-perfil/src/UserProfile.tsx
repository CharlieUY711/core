/**
 * ─────────────────────────────────────────────────────────────────
 *  UserProfile  –  Widget independiente de perfil de usuario
 * ─────────────────────────────────────────────────────────────────
 *  Instalación:
 *    npm install @supabase/supabase-js
 *
 *  Uso mínimo (con Supabase):
 *    <UserProfile supabase={supabaseClient} userId="uuid" />
 *
 *  Uso sin Supabase (storage local o propio backend):
 *    <UserProfile
 *      userId="uuid"
 *      userEmail="user@example.com"
 *      initialData={{ nombre: "Juan", ... }}
 *      onSave={async (data) => { await myApi.save(data); }}
 *    />
 *
 *  Props:
 *    supabase?       – cliente de Supabase (opcional)
 *    userId          – ID del usuario (requerido)
 *    userEmail?      – email a mostrar (si no se usa Supabase)
 *    initialData?    – datos iniciales del perfil
 *    onSave?         – callback personalizado al guardar
 *    onAvatarChange? – callback al cambiar el avatar (recibe base64)
 *    accentColor?    – color primario (default: #FF7A00)
 *    storageKey?     – clave para localStorage (default: "userprofile")
 *    AddressWidget?  – componente de direcciones externo (ver AddressGeo)
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Address {
  id:            string;
  label:         string;
  street:        string;
  doorNumber?:   string;
  corner?:       string;
  apartment?:    string;
  indicaciones?: string;
  city:          string;
  zip:           string;
  lat?:          number;
  lng?:          number;
  isDefault:     boolean;
}

export interface Contact {
  id:        string;
  type:      "phone" | "whatsapp" | "instagram" | "telegram";
  value:     string;
  preferred: boolean;
}

export interface ProfileData {
  nombre:            string;
  documento:         string;
  addresses:         Address[];
  contacts:          Contact[];
  prefContactMethod: string;
  prefSchedule:      string;
  notes:             string;
}

export interface UserProfileProps {
  // Identidad del usuario
  userId:       string;
  userEmail?:   string;
  userRole?:    string;

  // Integración con Supabase (opcional)
  supabase?:    any;

  // Datos e integración genérica
  initialData?: Partial<ProfileData>;
  onSave?:      (data: ProfileData) => Promise<void>;
  onAvatarChange?: (base64: string) => void;

  // Personalización visual
  accentColor?:  string;
  storageKey?:   string;

  // Slot para widget de direcciones externo
  AddressWidget?: (props: AddressWidgetSlotProps) => ReactNode;
}

export interface AddressWidgetSlotProps {
  addresses: Address[];
  onChange:  (addresses: Address[]) => void;
  accentColor: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONTACT_ICONS: Record<string, string> = {
  phone: "📞", whatsapp: "💬", instagram: "📸", telegram: "✈️",
};
const CONTACT_LABELS: Record<string, string> = {
  phone: "Teléfono", whatsapp: "WhatsApp", instagram: "Instagram", telegram: "Telegram",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfile({
  userId,
  userEmail: propEmail,
  userRole,
  supabase,
  initialData,
  onSave,
  onAvatarChange,
  accentColor = "#FF7A00",
  storageKey = "userprofile",
  AddressWidget,
}: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileData>({
    nombre: "", documento: "", addresses: [], contacts: [],
    prefContactMethod: "whatsapp", prefSchedule: "mañana", notes: "",
    ...initialData,
  });
  const [email,  setEmail]  = useState(propEmail || "");
  const [role,   setRole]   = useState(userRole || "");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [tab,    setTab]    = useState<"personal" | "addresses" | "contacts" | "preferences">("personal");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    // 1. localStorage
    const stored = localStorage.getItem(`${storageKey}_${userId}`);
    if (stored) {
      try { setProfile(p => ({ ...p, ...JSON.parse(stored) })); } catch {}
    }
    const av = localStorage.getItem(`${storageKey}_avatar_${userId}`);
    if (av) setAvatar(av);

    // 2. Supabase (sobreescribe localStorage si hay datos)
    if (supabase) {
      supabase.auth.getUser().then(({ data }: any) => {
        const u = data?.user;
        if (!u) return;
        const meta = u.user_metadata || {};
        setEmail(u.email || propEmail || "");
        setRole(meta.role || userRole || "");
        setProfile(p => ({ ...p, nombre: meta.nombre || p.nombre }));
      });
    }
  }, [userId]);

  // ── Persistencia local ─────────────────────────────────────────
  const save = (updates: Partial<ProfileData>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    localStorage.setItem(`${storageKey}_${userId}`, JSON.stringify(next));
  };

  // ── Guardar ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(profile);
      } else if (supabase) {
        await supabase.auth.updateUser({ data: { nombre: profile.nombre } });
        localStorage.setItem(`${storageKey}_${userId}`, JSON.stringify(profile));
      } else {
        localStorage.setItem(`${storageKey}_${userId}`, JSON.stringify(profile));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar ─────────────────────────────────────────────────────
  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setAvatar(url);
      localStorage.setItem(`${storageKey}_avatar_${userId}`, url);
      onAvatarChange?.(url);
    };
    reader.readAsDataURL(file);
  };

  const initials = profile.nombre
    ? profile.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : email?.[0]?.toUpperCase() || "U";

  const TABS = [
    { id: "personal",    label: "Datos personales", icon: "👤" },
    { id: "addresses",   label: "Direcciones",       icon: "📍" },
    { id: "contacts",    label: "Contacto",          icon: "📱" },
    { id: "preferences", label: "Preferencias",      icon: "⚙️"  },
  ] as const;

  // ── CSS variables como estilo inline ──────────────────────────
  const css = {
    "--accent":      accentColor,
    "--accent-10":   `${accentColor}1A`,
    "--accent-30":   `${accentColor}4D`,
  } as React.CSSProperties;

  return (
    <div style={{ ...css, maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div onClick={() => inputRef.current?.click()} style={{ width: "80px", height: "80px", borderRadius: "50%", cursor: "pointer", overflow: "hidden", background: avatar ? "transparent" : `linear-gradient(135deg,${accentColor},${accentColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", fontWeight: 700, color: "#fff", border: "3px solid #fff", boxShadow: `0 4px 12px ${accentColor}4D` }}>
            {avatar ? <img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div onClick={() => inputRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid #fff", fontSize: "0.7rem" }}>✏️</div>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>{profile.nombre || email?.split("@")[0] || "Usuario"}</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginTop: "2px" }}>{email}</div>
          <div style={{ marginTop: "0.5rem" }}>
            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: `${accentColor}1A`, color: accentColor }}>
              {role === "admin" ? "👑 Administrador" : "👤 Usuario"}
            </span>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: "0.6rem 1.5rem", background: saved ? "#6BB87A" : saving ? "#ccc" : accentColor, color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "0.875rem", whiteSpace: "nowrap", transition: "all 0.2s" }}>
          {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", background: "#fff", borderRadius: "12px", padding: "6px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: tab === t.id ? 700 : 400, fontSize: "0.85rem", background: tab === t.id ? accentColor : "transparent", color: tab === t.id ? "#fff" : "#666", transition: "all 0.15s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {tab === "personal" && <PersonalTab profile={profile} email={email} onChange={save} accentColor={accentColor} />}
        {tab === "addresses" && (
          AddressWidget
            ? <AddressWidget addresses={profile.addresses} onChange={a => save({ addresses: a })} accentColor={accentColor} />
            : <BuiltinAddressesTab addresses={profile.addresses} onChange={a => save({ addresses: a })} accentColor={accentColor} />
        )}
        {tab === "contacts"    && <ContactsTab    contacts={profile.contacts}  onChange={c => save({ contacts: c })} accentColor={accentColor} />}
        {tab === "preferences" && <PreferencesTab profile={profile} onChange={save} accentColor={accentColor} />}
      </div>
    </div>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({ profile, email, onChange, accentColor }: { profile: ProfileData; email: string; onChange: (u: Partial<ProfileData>) => void; accentColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SectionTitle title="Información personal" subtitle="Tus datos básicos de cuenta" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <InputField label="Nombre completo"         value={profile.nombre}    onChange={v => onChange({ nombre: v })}    placeholder="Ej: Carlos Varalla"  accentColor={accentColor} />
        <InputField label="Documento de identidad"  value={profile.documento} onChange={v => onChange({ documento: v })} placeholder="Ej: 12345678"        accentColor={accentColor} />
        <InputField label="Email"                   value={email}             onChange={() => {}}                         placeholder=""  disabled          accentColor={accentColor} />
      </div>
    </div>
  );
}

// ─── Addresses Tab (built-in, sin mapa) ───────────────────────────────────────
// Si se pasa el prop AddressWidget se usa ese; sino este built-in básico.

function BuiltinAddressesTab({ addresses, onChange, accentColor }: { addresses: Address[]; onChange: (a: Address[]) => void; accentColor: string }) {
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ label: "Casa", street: "", city: "", zip: "" });

  const handleAdd = () => {
    if (!form.street) return;
    onChange([...addresses, { id: Date.now().toString(), ...form, isDefault: addresses.length === 0 }] as Address[]);
    setForm({ label: "Casa", street: "", city: "", zip: "" }); setAdding(false);
  };
  const handleDelete  = (id: string) => onChange(addresses.filter(a => a.id !== id));
  const handleDefault = (id: string) => onChange(addresses.map(a => ({ ...a, isDefault: a.id === id })));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle title="Mis direcciones" subtitle="Gestioná tus ubicaciones de entrega" />
        <button onClick={() => setAdding(true)} style={{ padding: "0.5rem 1rem", background: accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>+ Agregar</button>
      </div>
      {adding && (
        <div style={{ background: "#FFF8F5", border: `2px solid ${accentColor}`, borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["Casa", "Trabajo"].map(l => (
              <button key={l} onClick={() => setForm(p => ({ ...p, label: l }))} style={{ padding: "0.4rem 0.9rem", border: `1.5px solid ${form.label === l ? accentColor : "#E5E7EB"}`, background: form.label === l ? `${accentColor}1A` : "#fff", color: form.label === l ? accentColor : "#6B7280", borderRadius: "8px", cursor: "pointer", fontWeight: form.label === l ? 700 : 400, fontSize: "0.82rem" }}>
                {l === "Casa" ? "🏠" : "💼"} {l}
              </button>
            ))}
          </div>
          <input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="Dirección" style={{ padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Ciudad" style={{ padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none" }} />
            <input value={form.zip}  onChange={e => setForm(p => ({ ...p, zip:  e.target.value }))} placeholder="Código postal" style={{ padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={() => setAdding(false)} style={{ padding: "0.5rem 1rem", background: "transparent", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>Cancelar</button>
            <button onClick={handleAdd} style={{ padding: "0.5rem 1.25rem", background: accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>Agregar</button>
          </div>
        </div>
      )}
      {addresses.length === 0 && !adding
        ? <EmptyState icon="📍" title="Sin direcciones" subtitle="Agregá una dirección para facilitar tus compras" />
        : addresses.map(addr => (
          <div key={addr.id} style={{ border: `1.5px solid ${addr.isDefault ? accentColor : "#E5E7EB"}`, borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", background: addr.isDefault ? `${accentColor}08` : "#fff" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: addr.isDefault ? `${accentColor}1A` : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
              {addr.label === "Casa" ? "🏠" : addr.label === "Trabajo" ? "💼" : "📌"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111" }}>{addr.label}</span>
                {addr.isDefault && <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700, background: accentColor, color: "#fff" }}>Predeterminada</span>}
              </div>
              <div style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: "2px" }}>{addr.street}{addr.city ? `, ${addr.city}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {!addr.isDefault && <button onClick={() => handleDefault(addr.id)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${accentColor}`, color: accentColor, borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>Predeterminar</button>}
              <button onClick={() => handleDelete(addr.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #EF4444", color: "#EF4444", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>🗑</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function ContactsTab({ contacts, onChange, accentColor }: { contacts: Contact[]; onChange: (c: Contact[]) => void; accentColor: string }) {
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ type: "phone" as Contact["type"], value: "" });
  const [delId,  setDelId]  = useState<string | null>(null);

  const handleAdd       = () => { if (!form.value) return; onChange([...contacts, { id: Date.now().toString(), ...form, preferred: contacts.length === 0 }]); setForm({ type: "phone", value: "" }); setAdding(false); };
  const handlePreferred = (id: string) => onChange(contacts.map(c => ({ ...c, preferred: c.id === id })));
  const handleDelete    = (id: string) => { onChange(contacts.filter(c => c.id !== id)); setDelId(null); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle title="Mis contactos" subtitle="Cómo podemos contactarte" />
        <button onClick={() => setAdding(true)} style={{ padding: "0.5rem 1rem", background: accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>+ Agregar contacto</button>
      </div>
      {adding && (
        <div style={{ background: "#FFF8F5", border: `2px solid ${accentColor}`, borderRadius: "12px", padding: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} style={{ padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem" }}>
            {Object.entries(CONTACT_LABELS).map(([k, v]) => <option key={k} value={k}>{CONTACT_ICONS[k]} {v}</option>)}
          </select>
          <input value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="Ej: +598 99 123 456" style={{ flex: 1, minWidth: "180px", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none" }} />
          <button onClick={handleAdd} style={{ padding: "0.6rem 1.25rem", background: accentColor, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>Agregar</button>
          <button onClick={() => setAdding(false)} style={{ padding: "0.6rem 0.75rem", background: "transparent", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {contacts.length === 0 && !adding
        ? <EmptyState icon="📱" title="Sin contactos" subtitle="Agregá un teléfono o red social" />
        : contacts.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.25rem", border: `1.5px solid ${c.preferred ? accentColor : "#E5E7EB"}`, borderRadius: "12px", background: c.preferred ? `${accentColor}08` : "#fff" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: c.preferred ? `${accentColor}1A` : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{CONTACT_ICONS[c.type]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", color: "#9CA3AF", fontWeight: 600 }}>{CONTACT_LABELS[c.type]}</div>
              <div style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>{c.value}</div>
            </div>
            {c.preferred && <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700, background: accentColor, color: "#fff" }}>Preferido</span>}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {!c.preferred && <button onClick={() => handlePreferred(c.id)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${accentColor}`, color: accentColor, borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>Preferir</button>}
              {delId === c.id
                ? <><button onClick={() => handleDelete(c.id)} style={{ padding: "4px 10px", background: "#EF4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>Confirmar</button><button onClick={() => setDelId(null)} style={{ padding: "4px 8px", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem" }}>✕</button></>
                : <button onClick={() => setDelId(c.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #EF4444", color: "#EF4444", borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>🗑</button>
              }
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

function PreferencesTab({ profile, onChange, accentColor }: { profile: ProfileData; onChange: (u: Partial<ProfileData>) => void; accentColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SectionTitle title="Preferencias" subtitle="Personalizá tu experiencia" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Método de contacto preferido</label>
          <select value={profile.prefContactMethod} onChange={e => onChange({ prefContactMethod: e.target.value })} style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem" }}>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="phone">📞 Teléfono</option>
            <option value="email">📧 Email</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Horario preferido</label>
          <select value={profile.prefSchedule} onChange={e => onChange({ prefSchedule: e.target.value })} style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem" }}>
            <option value="mañana">🌅 Mañana (9-12h)</option>
            <option value="tarde">☀️ Tarde (12-18h)</option>
            <option value="noche">🌙 Noche (18-21h)</option>
            <option value="cualquier">🕐 Cualquier horario</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>Notas adicionales</label>
        <textarea value={profile.notes} onChange={e => onChange({ notes: e.target.value })} rows={4} placeholder="Ej: Preferir contacto por WhatsApp después de las 18h..." style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111" }}>{title}</div>
      <div style={{ color: "#9CA3AF", fontSize: "0.8rem", marginTop: "2px" }}>{subtitle}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, disabled, accentColor }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; accentColor: string;
}) {
  return (
    <div>
      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "4px" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "0.875rem", outline: "none", background: disabled ? "#F9FAFB" : "#fff", color: disabled ? "#9CA3AF" : "#111", boxSizing: "border-box", transition: "border-color 0.15s" }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = accentColor; }}
        onBlur={e => { e.target.style.borderColor = "#E5E7EB"; }} />
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ padding: "3rem", textAlign: "center", background: "#FAFAFA", borderRadius: "12px", border: "1.5px dashed #E5E7EB" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>{title}</div>
      <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>{subtitle}</div>
    </div>
  );
}
