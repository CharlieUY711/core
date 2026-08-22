/**
 * src/app/admin/pages/AdminML.tsx
 *
 * Conexión con Mercado Libre y Mercado Pago: conectar cuentas, renovar tokens,
 * desconectar, y ver el estado de las credenciales.
 *
 * ALCANCE, A PROPÓSITO
 * Este módulo NO muestra artículos. Las publicaciones, la cola y los errores
 * de sincronización viven en la pantalla de Publicaciones, que es donde están
 * los artículos y donde se pueden corregir. Tener las dos vistas del mismo
 * estado garantizaba que dijeran cosas distintas, y obligaba a saltar de una a
 * otra para entender un solo problema.
 *
 * La publicación en sí la resuelve el motor del canal
 * (src/app/admin/utils/canalesSync.ts), al que esta pantalla no llama: acá
 * sólo se administra la cuenta que ese motor después usa.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL     = `${SUPABASE_URL}/functions/v1`;

// ── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  primary:       "#1A4F9C",
  primaryDark:   "#0D2B55",
  primaryLight:  "rgba(26,79,156,.1)",
  accent:        "#C9A84C",
  accentDark:    "#A8893C",
  accentLight:   "rgba(201,168,76,.1)",
  success:       "#1D9E75",
  successBg:     "rgba(29,158,117,.1)",
  warning:       "#C9A84C",
  warningBg:     "rgba(201,168,76,.1)",
  danger:        "#C0392B",
  dangerBg:      "rgba(192,57,43,.1)",
  info:          "#2E6FC4",
  bgMain:        "#F2F5FA",
  bgDark:        "#081C38",
  bgCard:        "#ffffff",
  textDark:      "#0D2B55",
  textBody:      "#4A4A4A",
  textMuted:     "#7A7A7A",
  textLight:     "#ffffff",
  border:        "#C8D5E8",
  borderLight:   "#E8EDF5",
  radiusSm:      "4px",
  radiusMd:      "8px",
  radiusLg:      "12px",
  radiusPill:    "999px",
  shadowCard:    "0 2px 8px rgba(13,43,85,.08)",
  shadowMd:      "0 2px 8px rgba(13,43,85,.09)",
  shadowLg:      "0 8px 24px rgba(13,43,85,.14)",
  fontBase:      "Calibri, 'Segoe UI', system-ui, sans-serif",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Credential {
  id: string; name: string;
  platform: "MercadoLibre" | "MercadoPago";
  siteId: string; storeId: string | null; isGlobal: boolean;
  nickname?: string; sellerId?: string; expiresAt: string;
  isExpired: boolean; expiringSoon: boolean;
}



// Pago — de tabla orders
interface MPPayment {
  id:           string;
  total:        number;
  currency:     string;
  status:       string;
  ml_order_id:  string | null;
  created_at:   string;
}

// ── Helpers API ───────────────────────────────────────────────────────────────

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`;
}

async function callOAuth(
  method: "GET" | "POST" | "DELETE",
  params: Record<string, string>,
  body?: object,
) {
  const url = new URL(`${FUNCTIONS_URL}/ml-oauth`);
  if (method === "GET") Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: await getAuthHeader(), "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify({ ...params, ...body }) : undefined,
  });
  return res.json();
}



// ── Componente principal ──────────────────────────────────────────────────────

type TabId = "mp-pagos";

export default function AdminML() {
  const [tab,           setTab]           = useState<TabId>("mp-pagos");
  const [creds,         setCreds]         = useState<Credential[]>([]);
  const [mpPayments,    setMpPayments]    = useState<MPPayment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [credsLoading,  setCredsLoading]  = useState(true);
  // Fila cuya vista previa se esta mostrando; null = modal cerrado.
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg,           setMsg]           = useState<{ text: string; type: "ok" | "err" | "warn" } | null>(null);

  const notify = (text: string, type: "ok" | "err" | "warn" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Cargar datos ────────────────────────────────────────────────────────────

  /**
   * Este modulo se ocupa de la conexion, no de los articulos.
   *
   * Las publicaciones, la cola y los errores de sync se ven y se resuelven en
   * la pantalla de Publicaciones, que es donde estan los articulos y donde se
   * pueden corregir. Tener las dos vistas garantizaba que dijeran cosas
   * distintas sobre el mismo estado.
   */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, total, currency, status, ml_order_id, created_at")
      .not("ml_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    setMpPayments((data ?? []) as MPPayment[]);
    setLoading(false);
  }, []);

  const loadCreds = useCallback(async () => {
    setCredsLoading(true);
    try {
      const data = await callOAuth("GET", { action: "status" });
      if (data.ok) setCreds(data.credentials ?? []);
    } catch { /* silencioso */ }
    setCredsLoading(false);
  }, []);

  useEffect(() => { load(); loadCreds(); }, []);

  const mlCreds = creds.filter(c => c.platform === "MercadoLibre");
  const mpCreds = creds.filter(c => c.platform === "MercadoPago");

  // ── Acciones OAuth ──────────────────────────────────────────────────────────

  const handleConnect = async (platform: "MercadoLibre" | "MercadoPago", siteId = "MLU") => {
    const { data: { session } } = await supabase.auth.getSession();
    const token  = session?.access_token ?? SUPABASE_ANON_KEY;
    const params = new URLSearchParams({ action: "connect", platform, site_id: siteId });
    window.location.href = `${FUNCTIONS_URL}/ml-oauth?${params}&token=${token}`;
  };

  const handleRefresh = async (cred: Credential) => {
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      const data = await callOAuth("POST", { action: "refresh" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      if (data.ok) { notify("Token renovado ✓"); await loadCreds(); }
      else notify(data.error ?? "Error al renovar", "err");
    } catch { notify("Error de conexión", "err"); }
    setActionLoading(null);
  };

  const handleDisconnect = async (cred: Credential) => {
    if (!confirm(`¿Desconectar ${cred.platform} ${cred.siteId}?`)) return;
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      await callOAuth("DELETE", { action: "disconnect" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      notify("Cuenta desconectada");
      await loadCreds();
    } catch { notify("Error al desconectar", "err"); }
    setActionLoading(null);
  };

  // ── Acciones de Sync ML ─────────────────────────────────────────────────────






  // ── Tabs ────────────────────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; section: "ml" | "mp" }[] = [
    { id: "mp-pagos",       label: `Pagos ML (${mpPayments.length})`,            section: "mp" },
  ];

  const mlTab = tab.startsWith("ml-");
  const mpTab = tab.startsWith("mp-");

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: T.fontBase, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Header */}
      <div style={{
        background: T.bgCard, borderRadius: T.radiusLg,
        boxShadow: T.shadowCard, marginBottom: 16,
        border: `1px solid ${T.border}`, overflow: "hidden",
      }}>

        {/* Título + acciones globales */}
        <div style={{
          padding: "20px 24px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textDark, letterSpacing: "-0.3px" }}>
              MercadoLibre & MercadoPago
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMuted }}>
              Gestión de integraciones, publicaciones y sincronización
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn label="Actualizar" variant="ghost" disabled={false}
              onClick={() => { load(); loadCreds(); }} />
          </div>
        </div>

        {/* Toast */}
        {msg && (
          <div style={{
            padding: "10px 24px", fontSize: 12, fontWeight: 600,
            background: msg.type === "ok" ? T.successBg : msg.type === "warn" ? T.warningBg : T.dangerBg,
            color: msg.type === "ok" ? T.success : msg.type === "warn" ? T.warning : T.danger,
            borderBottom: `1px solid ${T.borderLight}`,
          }}>
            {msg.type === "ok" ? "✓" : msg.type === "warn" ? "⚠" : "✕"} {msg.text}
          </div>
        )}

        {/* KPIs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          {[
            { label: "Cuentas conectadas", value: creds.length, accent: T.success },
            { label: "Mercado Libre",      value: mlCreds.length, accent: T.accent },
            { label: "Mercado Pago",       value: mpCreds.length, accent: T.primary },
          ].map((k, i) => (
            <div key={k.label} style={{
              padding: "16px 24px",
              borderLeft: i > 0 ? `1px solid ${T.borderLight}` : "none",
            }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.textDark }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Cuentas + tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>

          {/* MercadoLibre */}
          <div style={{ flex: 1, borderRight: `1px solid ${T.border}` }}>
            <div style={{
              padding: "12px 20px 0",
              background: mlTab ? T.bgMain : "transparent",
              borderBottom: mlTab ? `2px solid ${T.accent}` : "2px solid transparent",
            }}>
              {credsLoading ? (
                <div style={{ fontSize: 11, color: T.textMuted, padding: "8px 0 10px" }}>Cargando…</div>
              ) : mlCreds.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src="/ML_logo.png" alt="ML" style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>MercadoLibre</span>
                  <button onClick={() => handleConnect("MercadoLibre", "MLU")} style={{
                    marginLeft: "auto", padding: "4px 10px", background: T.accent, color: "#fff",
                    border: "none", borderRadius: T.radiusSm, cursor: "pointer", fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                  }}>+ Conectar</button>
                </div>
              ) : mlCreds.map(cred => {
                const diffMs   = new Date(cred.expiresAt).getTime() - Date.now();
                const diffHrs  = Math.max(0, Math.floor(diffMs / 3_600_000));
                const diffDays = Math.floor(diffHrs / 24);
                const expiryLabel = cred.isExpired ? "Vencido" : diffDays > 1 ? `Vence en ${diffDays}d` : diffHrs > 0 ? `Vence en ${diffHrs}h` : "Vence pronto";
                const statusColor = cred.isExpired ? T.danger : cred.expiringSoon ? T.warning : T.success;
                const isLoading   = actionLoading === `${cred.platform}_${cred.siteId}`;
                return (
                  <div key={cred.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src="/ML_logo.png" alt="ML" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textDark }}>{cred.nickname || cred.siteId}</span>
                    {cred.isGlobal && <span style={{ fontSize: 9, fontWeight: 700, color: T.primary, background: T.primaryLight, padding: "1px 5px", borderRadius: T.radiusPill }}>Global</span>}
                    <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>● {expiryLabel}</span>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                      <button onClick={() => handleRefresh(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.primary }}>↺</button>
                      <button onClick={() => handleDisconnect(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.danger}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.danger }}>✕</button>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 0 }}>
                {TABS.filter(t => t.section === "ml").map(t => (
                  <TabBtn key={t.id} label={t.label} active={tab === t.id}
                    onClick={() => setTab(t.id)}
                    hasAlert={false} />
                ))}
              </div>
            </div>
          </div>

          {/* MercadoPago */}
          <div style={{ flex: 1 }}>
            <div style={{
              padding: "12px 20px 0",
              background: mpTab ? T.bgMain : "transparent",
              borderBottom: mpTab ? `2px solid #009EE3` : "2px solid transparent",
            }}>
              {credsLoading ? (
                <div style={{ fontSize: 11, color: T.textMuted, padding: "8px 0 10px" }}>Cargando…</div>
              ) : mpCreds.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src="/MP_logo.png" alt="MP" style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>MercadoPago</span>
                  <button onClick={() => handleConnect("MercadoPago", "MLU")} style={{
                    marginLeft: "auto", padding: "4px 10px", background: "#009EE3", color: "#fff",
                    border: "none", borderRadius: T.radiusSm, cursor: "pointer", fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                  }}>+ Conectar</button>
                </div>
              ) : mpCreds.map(cred => {
                const diffMs   = new Date(cred.expiresAt).getTime() - Date.now();
                const diffHrs  = Math.max(0, Math.floor(diffMs / 3_600_000));
                const diffDays = Math.floor(diffHrs / 24);
                const expiryLabel = cred.isExpired ? "Vencido" : diffDays > 1 ? `Vence en ${diffDays}d` : diffHrs > 0 ? `Vence en ${diffHrs}h` : "Vence pronto";
                const statusColor = cred.isExpired ? T.danger : cred.expiringSoon ? T.warning : T.success;
                const isLoading   = actionLoading === `${cred.platform}_${cred.siteId}`;
                return (
                  <div key={cred.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src="/MP_logo.png" alt="MP" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textDark }}>{cred.nickname || cred.siteId}</span>
                    {cred.isGlobal && <span style={{ fontSize: 9, fontWeight: 700, color: "#009EE3", background: "rgba(0,158,227,.1)", padding: "1px 5px", borderRadius: T.radiusPill }}>Global</span>}
                    <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>● {expiryLabel}</span>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                      <button onClick={() => handleRefresh(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: "#009EE3" }}>↺</button>
                      <button onClick={() => handleDisconnect(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.danger}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.danger }}>✕</button>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 0 }}>
                {TABS.filter(t => t.section === "mp").map(t => (
                  <TabBtn key={t.id} label={t.label} active={tab === t.id}
                    accentColor="#009EE3" onClick={() => setTab(t.id)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TAB: MP — PAGOS ══════════════════════════════════════════════════ */}
      {tab === "mp-pagos" && (
        <Card>
          <TableHeader cols={["Orden ID", "Total", "Estado", "ML Order ID", "Fecha"]} />
          <tbody>
            {loading ? (
              <LoadingRow colSpan={5} />
            ) : mpPayments.length === 0 ? (
              <EmptyRow colSpan={5} text="Sin órdenes de ML registradas" />
            ) : mpPayments.map((pay, idx) => (
              <tr key={pay.id} style={{
                borderBottom: `1px solid ${T.borderLight}`,
                background: idx % 2 === 0 ? T.bgCard : T.bgMain,
              }}>
                <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>
                  {pay.id?.substring(0, 14)}…
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: T.textDark }}>
                  {pay.currency} {Number(pay.total).toLocaleString("es-UY")}
                </td>
                <td style={{ padding: "10px 16px" }}><OrderStatusBadge status={pay.status} /></td>
                <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>
                  {pay.ml_order_id ?? "—"}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>
                  {new Date(pay.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </Card>
      )}

    </div>
  );
}

// ── Componentes UI ─────────────────────────────────────────────────────────────

function TabBtn({ label, active, accentColor, hasAlert, onClick }: {
  label: string; active: boolean; accentColor?: string;
  hasAlert?: boolean; onClick: () => void;
}) {
  const accent = accentColor ?? T.accent;
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px 10px", background: "none", border: "none",
      borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
      marginBottom: "-2px", cursor: "pointer",
      fontWeight: active ? 700 : 500, fontSize: 12,
      color: active ? accent : T.textMuted,
      transition: "all 0.12s", position: "relative",
    }}>
      {label}
      {hasAlert && (
        <span style={{
          position: "absolute", top: 4, right: 2, width: 6, height: 6,
          borderRadius: "50%", background: T.danger,
        }} />
      )}
    </button>
  );
}





function Btn({ label, variant = "secondary", size = "md", disabled, onClick }: {
  label: string; variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md"; disabled: boolean; onClick: () => void;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: T.primary,     color: "#fff",       border: "none" },
    secondary: { background: "transparent", color: T.primary,    border: `1px solid ${T.border}` },
    ghost:     { background: "transparent", color: T.textMuted,  border: `1px solid ${T.border}` },
    danger:    { background: "transparent", color: T.danger,     border: `1px solid ${T.danger}` },
    success:   { background: "transparent", color: T.success,    border: `1px solid ${T.success}` },
  };
  const padding  = size === "xs" ? "3px 8px"  : size === "sm" ? "5px 12px" : "7px 16px";
  const fontSize = size === "xs" ? 10         : size === "sm" ? 11          : 11;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], padding, fontSize, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", borderRadius: T.radiusSm,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.12s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: T.bgCard, borderRadius: T.radiusMd,
      border: `1px solid ${T.border}`, boxShadow: T.shadowCard, overflow: "hidden",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: T.primaryDark }}>
        {cols.map(c => (
          <th key={c} style={{
            padding: "10px 16px", textAlign: "left",
            fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.75)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function LoadingRow({ colSpan = 5 }: { colSpan?: number }) {
  return (
    <tr><td colSpan={colSpan} style={{ padding: "2.5rem", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      Cargando…
    </td></tr>
  );
}

function EmptyRow({ colSpan, text, success }: { colSpan: number; text: string; success?: boolean }) {
  return (
    <tr><td colSpan={colSpan} style={{
      padding: "2.5rem", textAlign: "center", fontSize: 13,
      color: success ? T.success : T.textMuted, fontWeight: success ? 700 : 400,
    }}>
      {success ? "✓ " : ""}{text}
    </td></tr>
  );
}



function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    confirmed: [T.successBg, T.success],
    pending:   [T.warningBg, T.warning],
    cancelled: [T.dangerBg,  T.danger],
    delivered: [T.successBg, T.success],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", T.textMuted];
  return (
    <span style={{ padding: "2px 9px", borderRadius: T.radiusPill, fontSize: 10, fontWeight: 700, background: bg, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {status || "—"}
    </span>
  );
}
