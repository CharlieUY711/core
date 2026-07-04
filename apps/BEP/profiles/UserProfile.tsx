"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  role: string;
}

interface ProfileData {
  full_name: string;
  role: string;
  entity: string;
  department: string;
  phone: string;
  avatar_url: string;
}

interface Props {
  userId: string;
  userEmail: string;
  initialProfile: Partial<ProfileData>;
  projects: Project[];
}

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { group: "Internos", options: [
    "Administrador", "Director", "Bid Manager", "Manager",
    "Ingeniero", "Compras", "Costos", "PMO", "Consultor",
  ]},
  { group: "Externos", options: [
    "Fabricante", "Distribuidor", "Proveedor", "Subcontrato", "Cliente", "Invitado",
  ]},
];

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "Activo",    color: "#2E7D57", bg: "#E8F5EE" },
  closed:    { label: "Cerrado",   color: "#6B7280", bg: "#F3F4F6" },
  draft:     { label: "Borrador",  color: "#B45309", bg: "#FEF3C7" },
  cancelled: { label: "Cancelado", color: "#991B1B", bg: "#FEE2E2" },
};

const BRAND = { primary: "#3D5689", dark: "#0D2B55", accent: "#2E7D57" };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfile({ userId, userEmail, initialProfile, projects }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [tab, setTab] = useState<"personal" | "projects" | "preferences">("personal");
  const [profile, setProfile] = useState<ProfileData>({
    full_name:  initialProfile.full_name  ?? "",
    role:       initialProfile.role       ?? "",
    entity:     initialProfile.entity     ?? "",
    department: initialProfile.department ?? "",
    phone:      initialProfile.phone      ?? "",
    avatar_url: initialProfile.avatar_url ?? "",
  });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState<string | null>(null);

  const activeProjects = projects.filter(p => p.status === "active" || p.status === "draft");
  const closedProjects = projects.filter(p => p.status === "closed" || p.status === "cancelled");

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : userEmail[0]?.toUpperCase() ?? "U";

  const displayName = profile.full_name || userEmail.split("@")[0];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: "personal",    label: "Datos personales" },
    { id: "projects",    label: `Proyectos (${projects.length})` },
    { id: "preferences", label: "Preferencias" },
  ] as const;

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem", fontFamily: "system-ui, sans-serif" }}>

      {/* Header card */}
      <div className="bep-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.75rem 2rem" }}>
        {/* Avatar */}
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.dark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", fontWeight: 700, color: "#fff",
          boxShadow: `0 4px 12px ${BRAND.primary}40`,
        }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111" }}>{displayName}</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.85rem", marginTop: "2px" }}>{userEmail}</div>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {profile.role && (
              <span className="bep-badge" style={{ background: `${BRAND.primary}15`, color: BRAND.primary }}>
                {profile.role}
              </span>
            )}
            {profile.entity && (
              <span className="bep-badge" style={{ background: "#F3F4F6", color: "#6B7280" }}>
                {profile.entity}
              </span>
            )}
            {profile.department && (
              <span className="bep-badge" style={{ background: "#F3F4F6", color: "#6B7280" }}>
                {profile.department}
              </span>
            )}
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bep-btn-primary"
            style={{ opacity: saving ? 0.7 : 1, background: saved ? BRAND.accent : BRAND.primary }}
          >
            {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {error && <span style={{ fontSize: "0.75rem", color: "#EF4444" }}>{error}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "2px solid #E5E7EB" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.65rem 1.25rem",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
              marginBottom: "-2px",
              background: "transparent",
              color: tab === t.id ? BRAND.primary : "#6B7280",
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bep-card" style={{ padding: "2rem" }}>
        {tab === "personal" && (
          <PersonalTab
            profile={profile}
            userEmail={userEmail}
            onChange={updates => setProfile(p => ({ ...p, ...updates }))}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab active={activeProjects} closed={closedProjects} />
        )}
        {tab === "preferences" && (
          <PreferencesTab />
        )}
      </div>
    </div>
  );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({
  profile, userEmail, onChange,
}: {
  profile: ProfileData;
  userEmail: string;
  onChange: (u: Partial<ProfileData>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Información personal */}
      <section>
        <SectionTitle title="Información personal" subtitle="Tus datos de identificación en la plataforma" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem" }}>
          <InputField
            label="Nombre completo"
            value={profile.full_name}
            onChange={v => onChange({ full_name: v })}
            placeholder="Ej: Carlos Varalla"
            span={2}
          />
          <InputField
            label="Email"
            value={userEmail}
            onChange={() => {}}
            disabled
          />
          <InputField
            label="Teléfono"
            value={profile.phone}
            onChange={v => onChange({ phone: v })}
            placeholder="Ej: +598 99 123 456"
          />
        </div>
      </section>

      <Divider />

      {/* Rol y organización */}
      <section>
        <SectionTitle title="Rol y organización" subtitle="Tu función y empresa dentro de los proyectos" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem" }}>

          {/* Función */}
          <div>
            <label style={labelStyle}>Función</label>
            <select
              value={profile.role}
              onChange={e => onChange({ role: e.target.value })}
              style={inputStyle}
            >
              <option value="">— Seleccioná tu función —</option>
              {ROLE_OPTIONS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <InputField
            label="Empresa / Entidad"
            value={profile.entity}
            onChange={v => onChange({ entity: v })}
            placeholder="Ej: SONDA, ABB, Schneider..."
          />
          <InputField
            label="Departamento / Área"
            value={profile.department}
            onChange={v => onChange({ department: v })}
            placeholder="Ej: Ingeniería Eléctrica"
            span={2}
          />
        </div>
      </section>
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────

function ProjectsTab({ active, closed }: { active: Project[]; closed: Project[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <section>
        <SectionTitle
          title="Proyectos activos"
          subtitle={active.length === 0 ? "No tenés proyectos activos asignados" : `${active.length} proyecto${active.length !== 1 ? "s" : ""}`}
        />
        {active.length === 0
          ? <EmptyState icon="📂" title="Sin proyectos activos" subtitle="Cuando te asignen a un proyecto aparecerá aquí" />
          : <ProjectList projects={active} />
        }
      </section>

      {closed.length > 0 && (
        <>
          <Divider />
          <section>
            <SectionTitle title="Proyectos cerrados" subtitle={`${closed.length} proyecto${closed.length !== 1 ? "s" : ""}`} />
            <ProjectList projects={closed} />
          </section>
        </>
      )}
    </div>
  );
}

function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "1rem" }}>
      {projects.map(p => {
        const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.active;
        return (
          <a
            key={p.id}
            href={`/projects/${p.id}`}
            style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.875rem 1.25rem",
              border: "1.5px solid #E5E7EB", borderRadius: "10px",
              background: "#fff", textDecoration: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = BRAND.primary;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${BRAND.primary}20`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: `${BRAND.primary}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 700, color: BRAND.primary,
              flexShrink: 0, fontFamily: "monospace",
            }}>
              {p.code?.slice(0, 4) ?? "BEP"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111" }}>{p.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "1px" }}>
                {p.code} · {p.role}
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: "20px",
              fontSize: "0.72rem", fontWeight: 700,
              color: st.color, background: st.bg,
            }}>
              {st.label}
            </span>
          </a>
        );
      })}
    </div>
  );
}

// ─── Preferences Tab ─────────────────────────────────────────────────────────

function PreferencesTab() {
  return (
    <div>
      <SectionTitle title="Preferencias" subtitle="Configuración de notificaciones e idioma — próximamente" />
      <div style={{ marginTop: "1.5rem", padding: "2.5rem", textAlign: "center", background: "#FAFAFA", borderRadius: "10px", border: "1.5px dashed #E5E7EB" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚙️</div>
        <div style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>Las preferencias de notificación y configuración de cuenta estarán disponibles próximamente.</div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem", fontWeight: 600, color: "#6B7280",
  display: "block", marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem",
  border: "1.5px solid #E5E7EB", borderRadius: "8px",
  fontSize: "0.875rem", outline: "none",
  background: "#fff", color: "#111",
  boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
};

function InputField({
  label, value, onChange, placeholder, disabled, span,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; span?: number;
}) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...inputStyle,
          background: disabled ? "#F9FAFB" : "#fff",
          color: disabled ? "#9CA3AF" : "#111",
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = BRAND.primary; }}
        onBlur={e => { e.target.style.borderColor = "#E5E7EB"; }}
      />
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111" }}>{title}</div>
      <div style={{ color: "#9CA3AF", fontSize: "0.8rem", marginTop: "2px" }}>{subtitle}</div>
    </div>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid #F3F4F6", margin: "0" }} />;
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ padding: "2.5rem", textAlign: "center", background: "#FAFAFA", borderRadius: "10px", border: "1.5px dashed #E5E7EB", marginTop: "1rem" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{icon}</div>
      <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>{title}</div>
      <div style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>{subtitle}</div>
    </div>
  );
}
