/**
 * src/app/admin/pages/AdminML.tsx
 *
 * Módulo ML & MercadoPago — sobre catalog_* (catalog_items, catalog_variants,
 * catalog_listings, catalog_sync_log).
 *
 * Tablas eliminadas: admin_products, admin_ml_errors, ml_sync_queue,
 *   productos_market, product_prices.
 * Tablas nuevas: v_catalog_variants_full, catalog_listings, catalog_sync_log.
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

// Variante publicada en ML — join de v_catalog_variants_full + catalog_listings
interface MLListing {
  // de catalog_listings
  listing_id:    string;
  external_id:   string | null;
  listing_status: string;
  channel_attrs: Record<string, unknown>;
  synced_at:     string | null;
  last_error:    string | null;
  // de v_catalog_variants_full
  variant_id:    string;
  sku:           string;
  item_title:    string;
  total_available: number;
}

// Error de sync — de catalog_sync_log
interface SyncError {
  id:          string;
  listing_id:  string;
  action:      string;
  error_code:  string | null;
  created_at:  string;
  // join
  external_id: string | null;
  item_title:  string;
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

async function callMlSync(body: Record<string, unknown>) {
  const res = await fetch(`${FUNCTIONS_URL}/ml-sync`, {
    method: "POST",
    headers: { Authorization: await getAuthHeader(), "Content-Type": "application/json" },
    body:   JSON.stringify(body),
  });
  return res.json();
}

async function callPublicar(variantId: string) {
  const res = await fetch(`${FUNCTIONS_URL}/publicar-en-ml`, {
    method: "POST",
    headers: { Authorization: await getAuthHeader(), "Content-Type": "application/json" },
    body:   JSON.stringify({ variantId }),
  });
  return res.json();
}

// ── Componente principal ──────────────────────────────────────────────────────

type TabId = "ml-publicados" | "ml-pendientes" | "ml-errores" | "mp-pagos";

export default function AdminML() {
  const [tab,           setTab]           = useState<TabId>("ml-publicados");
  const [listings,      setListings]      = useState<MLListing[]>([]);
  const [pendientes,    setPendientes]    = useState<MLListing[]>([]);
  const [syncErrors,    setSyncErrors]    = useState<SyncError[]>([]);
  const [creds,         setCreds]         = useState<Credential[]>([]);
  const [mpPayments,    setMpPayments]    = useState<MPPayment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [credsLoading,  setCredsLoading]  = useState(true);
  const [saving,        setSaving]        = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg,           setMsg]           = useState<{ text: string; type: "ok" | "err" | "warn" } | null>(null);

  const notify = (text: string, type: "ok" | "err" | "warn" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Cargar datos ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);

    const [activeRes, pendingRes, errorsRes, paymentsRes] = await Promise.all([

      // Publicados activos en ML
      supabase
        .from("catalog_listings")
        .select(`
          id, external_id, status, channel_attrs, synced_at, last_error,
          variant_id,
          catalog_variants!inner (
            sku,
            catalog_items!inner ( title )
          )
        `)
        .eq("channel", "mercadolibre")
        .in("status", ["active", "syncing", "paused"])
        .order("synced_at", { ascending: false })
        .limit(100),

      // Pendientes / error (cola)
      supabase
        .from("catalog_listings")
        .select(`
          id, external_id, status, channel_attrs, synced_at, last_error,
          variant_id,
          catalog_variants!inner (
            sku,
            catalog_items!inner ( title )
          )
        `)
        .eq("channel", "mercadolibre")
        .in("status", ["pending", "error"])
        .order("updated_at", { ascending: false })
        .limit(50),

      // Últimos errores en sync_log
      supabase
        .from("catalog_sync_log")
        .select(`
          id, listing_id, action, error_code, created_at,
          catalog_listings!inner (
            external_id,
            catalog_variants!inner (
              catalog_items!inner ( title )
            )
          )
        `)
        .eq("result", "error")
        .order("created_at", { ascending: false })
        .limit(50),

      // Pagos — columnas reales de la tabla orders
      supabase
        .from("orders")
        .select("id, total, currency, status, ml_order_id, created_at")
        .not("ml_order_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Mapear listings activos
    setListings(
      (activeRes.data ?? []).map((r: any) => ({
        listing_id:      r.id,
        external_id:     r.external_id,
        listing_status:  r.status,
        channel_attrs:   r.channel_attrs ?? {},
        synced_at:       r.synced_at,
        last_error:      r.last_error,
        variant_id:      r.variant_id,
        sku:             r.catalog_variants?.sku ?? "—",
        item_title:      r.catalog_variants?.catalog_items?.title ?? "—",
        total_available: 0, // se puede agregar join a catalog_inventory si se necesita en tabla
      }))
    );

    // Mapear pendientes
    setPendientes(
      (pendingRes.data ?? []).map((r: any) => ({
        listing_id:      r.id,
        external_id:     r.external_id,
        listing_status:  r.status,
        channel_attrs:   r.channel_attrs ?? {},
        synced_at:       r.synced_at,
        last_error:      r.last_error,
        variant_id:      r.variant_id,
        sku:             r.catalog_variants?.sku ?? "—",
        item_title:      r.catalog_variants?.catalog_items?.title ?? "—",
        total_available: 0,
      }))
    );

    // Mapear errores
    setSyncErrors(
      (errorsRes.data ?? []).map((r: any) => ({
        id:          r.id,
        listing_id:  r.listing_id,
        action:      r.action,
        error_code:  r.error_code,
        created_at:  r.created_at,
        external_id: r.catalog_listings?.external_id ?? null,
        item_title:  r.catalog_listings?.catalog_variants?.catalog_items?.title ?? "—",
      }))
    );

    // Mapear pagos
    setMpPayments(paymentsRes.data ?? []);

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

  // Sync completo — llama ml-sync con statuses pending+error
  const handleSyncAll = async () => {
    setSaving("all");
    try {
      const data = await callMlSync({ statuses: ["pending", "error", "active"], limit: 100 });
      if (data.ok) {
        const conError = (data.results ?? []).filter((r: any) => r?.result === "error").length;
        notify(`Procesados: ${data.processed} · Errores: ${conError}`, conError > 0 ? "warn" : "ok");
        await load();
      } else notify(data.error ?? "Error", "err");
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  // Republicar una variante específica
  const handlePublicar = async (variantId: string) => {
    setSaving(variantId);
    try {
      const data = await callPublicar(variantId);
      if (data.ok) notify(`Publicado ✓ (${data.action})`);
      else notify(detalleMl(data), "err");
      // Se recarga tambien al fallar: la funcion ya dejo status='error' y
      // last_error en el listing, y sin recargar la tabla seguia mostrando
      // PENDING con la columna de error vacia.
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  // Pausar / activar listing directo en catalog_listings
  const handleSetStatus = async (listingId: string, status: "paused" | "active") => {
    setSaving(`status_${listingId}`);
    try {
      const { error } = await supabase
        .from("catalog_listings")
        .update({ status })
        .eq("id", listingId);
      if (error) throw error;
      notify(`Estado → "${status}" ✓`);
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  /**
   * Publica todo lo que esta en cola.
   *
   * Antes este boton llamaba a ml-sync, que filtra por
   * `.not("external_id","is",null)`: solo actualiza publicaciones que YA
   * existen en Mercado Libre. Los items en cola nunca se publicaron, asi que
   * no tienen external_id y ml-sync los saltaba, devolviendo "Procesados: 0"
   * sin error. La primera publicacion la hace publicar-en-ml.
   */
  const handleProcesarCola = async () => {
    if (pendientes.length === 0) { notify("No hay nada en cola"); return; }
    setSaving("all");
    let ok = 0;
    const fallos: string[] = [];
    try {
      for (const l of pendientes) {
        const data = await callPublicar(l.variant_id);
        if (data?.ok) ok++;
        else fallos.push(`${l.sku}: ${detalleMl(data)}`);
      }
      if (fallos.length === 0) notify(`Publicados: ${ok}`);
      else notify(`Publicados: ${ok} · Fallaron ${fallos.length} — ${fallos[0]}`, ok > 0 ? "warn" : "err");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  /**
   * Mercado Libre devuelve { message, error, status, cause: [...] }. Mostrar
   * solo "ML API error" no le sirve a nadie: el motivo accionable esta en
   * `message` y en `cause`.
   */
  const detalleMl = (data: any): string => {
    const d = data?.detail ?? data;
    if (!d) return data?.error ?? "Error desconocido";
    const partes: string[] = [];
    if (d.message) partes.push(String(d.message));
    const causas = Array.isArray(d.cause) ? d.cause : [];
    for (const c of causas.slice(0, 2)) {
      const txt = c?.message ?? c?.code ?? (typeof c === "string" ? c : null);
      if (txt) partes.push(String(txt));
    }
    if (partes.length === 0 && typeof d === "string") partes.push(d);
    const msg = partes.join(" · ");
    return msg || data?.error || "Error desconocido";
  };

  // Reintentar listing con error: resetear a pending
  const handleRetry = async (listingId: string) => {
    setSaving(listingId);
    try {
      const { error } = await supabase
        .from("catalog_listings")
        .update({ status: "pending", last_error: null })
        .eq("id", listingId);
      if (error) throw error;
      notify("Reintento encolado ✓");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; section: "ml" | "mp" }[] = [
    { id: "ml-publicados",  label: `Publicados (${listings.length})`,            section: "ml" },
    { id: "ml-pendientes",  label: `Cola (${pendientes.length})`,                section: "ml" },
    { id: "ml-errores",     label: `Errores (${syncErrors.length})`,             section: "ml" },
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
            <Btn label={saving === "all" ? "Sincronizando…" : "↺ Sync Todo"}
              variant="primary" disabled={saving === "all"} onClick={handleSyncAll} />
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
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          {[
            { label: "Cuentas conectadas", value: creds.length,         accent: T.success },
            { label: "Publicados en ML",   value: listings.length,      accent: T.accent  },
            { label: "Errores de sync",    value: syncErrors.length,    accent: T.danger  },
            { label: "Cola pendiente",     value: pendientes.length,    accent: T.primary },
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
                    hasAlert={t.id === "ml-errores" && syncErrors.length > 0} />
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

      {/* ══ TAB: ML — PUBLICADOS ══════════════════════════════════════════════ */}
      {tab === "ml-publicados" && (
        <Card>
          <TableHeader cols={["Producto", "SKU", "ML Item ID", "Estado", "Último sync", "Acciones"]} />
          <tbody>
            {loading ? (
              <LoadingRow colSpan={6} />
            ) : listings.length === 0 ? (
              <EmptyRow colSpan={6} text="Sin publicaciones activas en ML" />
            ) : listings.map((l, idx) => (
              <tr key={l.listing_id} style={{
                borderBottom: `1px solid ${T.borderLight}`,
                background: idx % 2 === 0 ? T.bgCard : T.bgMain,
              }}>
                <td style={tdStyle({ maxWidth: 200 })}>{l.item_title}</td>
                <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>
                  {l.sku}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  {l.external_id ? (
                    <a href={`https://articulo.mercadolibre.com.uy/${l.external_id}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: T.primary, textDecoration: "none" }}>
                      {l.external_id} ↗
                    </a>
                  ) : <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: "10px 16px" }}><ListingStatusBadge status={l.listing_status} /></td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>
                  {l.synced_at
                    ? new Date(l.synced_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn label="↺ Sync" variant="primary" size="xs"
                      disabled={saving === l.variant_id} onClick={() => handlePublicar(l.variant_id)} />
                    {l.listing_status === "active"
                      ? <Btn label="⏸ Pausar" variant="ghost" size="xs"
                          disabled={saving === `status_${l.listing_id}`}
                          onClick={() => handleSetStatus(l.listing_id, "paused")} />
                      : l.listing_status === "paused"
                      ? <Btn label="▶ Activar" variant="success" size="xs"
                          disabled={saving === `status_${l.listing_id}`}
                          onClick={() => handleSetStatus(l.listing_id, "active")} />
                      : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Card>
      )}

      {/* ══ TAB: ML — COLA (PENDIENTES) ═══════════════════════════════════════ */}
      {tab === "ml-pendientes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn label={saving === "all" ? "Publicando…" : "▶ Procesar ahora"}
              variant="primary" disabled={saving === "all"} onClick={handleProcesarCola} />
          </div>
          <Card>
            <TableHeader cols={["Producto", "SKU", "Estado", "Último error", "Acciones"]} />
            <tbody>
              {pendientes.length === 0 ? (
                <EmptyRow colSpan={5} text="Cola vacía ✓" success />
              ) : pendientes.map((l, idx) => (
                <tr key={l.listing_id} style={{
                  borderBottom: `1px solid ${T.borderLight}`,
                  background: idx % 2 === 0 ? T.bgCard : T.bgMain,
                }}>
                  <td style={tdStyle({ maxWidth: 200 })}>{l.item_title}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>{l.sku}</td>
                  <td style={{ padding: "10px 16px" }}><ListingStatusBadge status={l.listing_status} /></td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: T.danger, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.last_error ?? "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Btn label="▶ Publicar" variant="primary" size="xs"
                      disabled={saving === l.variant_id}
                      onClick={() => handlePublicar(l.variant_id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Card>
        </div>
      )}

      {/* ══ TAB: ML — ERRORES ═════════════════════════════════════════════════ */}
      {tab === "ml-errores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {syncErrors.length === 0 ? (
            <div style={{
              padding: "3rem", textAlign: "center", color: T.success,
              fontWeight: 700, fontSize: 14,
              background: T.bgCard, borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
            }}>
              ✓ Sin errores de sincronización
            </div>
          ) : syncErrors.map(e => (
            <div key={e.id} style={{
              background: T.bgCard, borderRadius: T.radiusMd,
              border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.danger}`,
              padding: "14px 20px", boxShadow: T.shadowCard,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.textDark }}>{e.item_title}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  ML ID: <code style={{ fontFamily: "'Courier New', monospace" }}>{e.external_id || "—"}</code>
                  {" · "}Acción: {e.action}
                  {e.error_code && <>{" · "}<span style={{ color: T.danger }}>{e.error_code}</span></>}
                  {" · "}{new Date(e.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <Btn label="🔁 Reintentar" variant="danger" size="sm"
                disabled={saving === e.listing_id}
                onClick={() => handleRetry(e.listing_id)} />
            </div>
          ))}
        </div>
      )}

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

function tdStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.textDark,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    ...extra,
  };
}

function ListingStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:   [T.successBg, T.success],
    syncing:  [T.primaryLight, T.primary],
    paused:   [T.warningBg, T.warning],
    pending:  [T.warningBg, T.warning],
    error:    [T.dangerBg,  T.danger],
    delisted: ["#f1f5f9",   T.textMuted],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", T.textMuted];
  return (
    <span style={{ padding: "2px 9px", borderRadius: T.radiusPill, fontSize: 10, fontWeight: 700, background: bg, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {status || "—"}
    </span>
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
