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

import { useState, useEffect, useCallback, useRef } from "react";
import { traducirErrorMl, resumirErrorMl, camposAEditar } from "../utils/mlErrores";
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
  // Fila cuya vista previa se esta mostrando; null = modal cerrado.
  const [preview,       setPreview]       = useState<any>(null);
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
      else { const t = traducirErrorMl(data); notify(t.accion ? `${t.motivo} — ${t.accion}` : t.motivo, "err"); }
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
        else fallos.push(`${l.sku}: ${resumirErrorMl(data)}`);
      }
      if (fallos.length === 0) notify(`Publicados: ${ok}`);
      else notify(`Publicados: ${ok} · Fallaron ${fallos.length} — ${fallos[0]}`, ok > 0 ? "warn" : "err");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
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

      {preview && (
        <ModalPreview fila={preview} onClose={() => setPreview(null)}
          onPublicar={handlePublicar} />
      )}

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
            <TableHeader cols={["Producto", "SKU", "Estado", "Último error", "Ver", "Acciones"]} />
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
                    {l.last_error
                      ? (() => { const t = traducirErrorMl(l.last_error);
                          return (
                            <span title={t.crudo}>
                              {t.motivo}
                              {t.accion && (
                                <span style={{ display: "block", fontSize: 11, color: T.textMuted }}>
                                  → {t.accion}
                                </span>
                              )}
                            </span>
                          ); })()
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Btn label="👁 Ver" variant="secondary" size="xs"
                      disabled={false} onClick={() => setPreview(l)} />
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


/**
 * Vista previa de una publicacion, sin salir del panel.
 *
 * Dos fuentes segun el estado, porque significan cosas distintas:
 *  - Ya publicado (hay external_id): se trae el item real de la API publica de
 *    Mercado Libre. Es lo que el comprador ve hoy, no lo que creemos haber
 *    mandado.
 *  - Todavia en cola: se arma desde nuestro catalogo via catalog_vidriera, la
 *    misma puerta publica que usa la tienda. Es "asi se va a publicar".
 *
 * El boton de abrir en Mercado Libre usa el permalink que devuelve su API; si
 * no hay, se cae al buscador por id. Nunca se inventa una URL.
 */
// onGuardado ya no hace falta: publicar lo hace el padre, y su handler recarga.
function ModalPreview({ fila, onClose, onPublicar }: {
  fila: any; onClose: () => void;
  onPublicar?: (variantId: string) => void;
}) {
  const [datos, setDatos]   = useState<any>(null);
  const [cargando, setCarg] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const publicado = Boolean(fila?.external_id);
  // Edicion en linea: lo que falta se corrige aca, sin ir a otra pantalla.
  const [edit, setEdit]       = useState<Record<string, string>>({});
  const [guardando, setGuard] = useState(false);
  const [aviso, setAviso]     = useState<string | null>(null);
  const [ruta, setRuta]       = useState<string | null>(null);

  // Atributos obligatorios de la categoria. Se arrancan con lo ya guardado en
  // channel_attrs.extra_attributes para no pedir dos veces lo mismo.
  const [atrs, setAtrs] = useState<Record<string, string>>(() => {
    const previos = fila?.channel_attrs?.extra_attributes;
    const out: Record<string, string> = {};
    if (Array.isArray(previos)) {
      for (const a of previos) {
        if (a && typeof a === "object" && a.id) out[String(a.id)] = String(a.value_name ?? "");
      }
    }
    return out;
  });
  const [atrsFaltan, setAtrsFaltan] = useState<string[]>([]);
  const recibirFaltan = useCallback((n: string[]) => {
    setAtrsFaltan((p) => (p.length === n.length && p.every((x, i) => x === n[i]) ? p : n));
  }, []);
  const traduccion = fila?.last_error ? traducirErrorMl(fila.last_error) : null;
  const detectados  = (!publicado && fila?.last_error) ? camposAEditar(fila.last_error, datos) : [];
  // Si hubo un error pero no se pudo deducir que campo tocar, igual se ofrecen
  // los que suelen faltar. Dejar a la persona mirando un aviso sin nada que
  // hacer es peor que ofrecerle de mas.
  // Los campos editables se ofrecen SIEMPRE que la publicacion no este en
  // Mercado Libre, no solo despues de un fallo: si hay que corregir algo,
  // conviene poder hacerlo antes de intentar y no despues de que rebote.
  // Cuando ya hubo error y se pudo deducir que campo tocar, se muestran esos
  // primero; si no, se ofrecen los que Mercado Libre exige siempre.
  const BASICOS = [
    { campo: "category_id", etiqueta: "Categoría de Mercado Libre" },
    { campo: "price",       etiqueta: "Precio" },
    { campo: "title",       etiqueta: "Título" },
    { campo: "stock",       etiqueta: "Stock" },
  ];
  const valorActual = (campo: string) => {
    switch (campo) {
      case "category_id": return datos?.categoria ?? null;
      case "price":       return datos?.precio ?? null;
      case "title":       return datos?.titulo ?? null;
      case "stock":       return datos?.stock ?? null;
      default:            return null;
    }
  };
  // La categoria que efectivamente se va a mandar: la recien elegida, o la
  // guardada solo si tiene forma de id de Mercado Libre.
  const catGuardada = String(fila?.channel_attrs?.category_id ?? "").trim();
  const catEfectiva = (edit["category_id"] ?? "").trim() || (esIdMl(catGuardada) ? catGuardada : "");

  // La ruta completa es lo unico que permite verificar que la categoria sea la
  // correcta: "MLU203672" no dice nada, "Farmacia > Analgesicos" si.
  useEffect(() => {
    let cancelado = false;
    if (!esIdMl(catEfectiva)) { setRuta(null); return; }
    (async () => {
      try {
        const r = await fetch("https://api.mercadolibre.com/categories/" + catEfectiva);
        if (!r.ok) return;
        const d = await r.json();
        const camino = (d?.path_from_root ?? []).map((x: any) => x?.name).filter(Boolean).join(" > ");
        if (!cancelado) setRuta(camino || d?.name || null);
      } catch (_) { /* la ruta es una ayuda, no un requisito */ }
    })();
    return () => { cancelado = true; };
  }, [catEfectiva]);

  const faltantes = publicado
    ? []
    : detectados.length > 0
      ? detectados
      : BASICOS.map((b) => {
          const actual = valorActual(b.campo);
          return { ...b, actual, vacio: actual === null || actual === undefined || actual === "" || actual === 0 };
        });

  // Que falta AHORA. El ultimo error es del intento anterior y puede estar
  // resuelto: mostrarlo como si fuera el estado actual confunde mas de lo que
  // ayuda -por eso viaja aparte, abajo-.
  const faltanAhora: string[] = [
    ...(!catEfectiva ? ["la categoria"] : []),
    ...faltantes
      .filter((f) => f.campo !== "category_id")
      .filter((f) => !(edit[f.campo] ?? String(f.actual ?? "")).trim())
      .map((f) => f.etiqueta.toLowerCase()),
    ...atrsFaltan.map((n) => n.toLowerCase()),
  ];

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarg(true); setError(null);
      try {
        if (publicado) {
          const r = await fetch(`https://api.mercadolibre.com/items/${fila.external_id}`);
          if (!r.ok) throw new Error(`Mercado Libre respondio ${r.status}`);
          const d = await r.json();
          if (!cancelado) setDatos({
            titulo: d.title, precio: d.price, moneda: d.currency_id,
            stock: d.available_quantity, estado: d.status,
            imagenes: (d.pictures ?? []).map((p: any) => p.secure_url ?? p.url),
            permalink: d.permalink, categoria: d.category_id, real: true,
          });
        } else {
          const { data, error } = await supabase.rpc("catalog_vidriera", { p_ids: [fila.variant_id] });
          if (error) throw new Error(error.message);
          const p = (data ?? [])[0];
          if (!p) throw new Error("El producto no esta publicado en la tienda, asi que no hay nada que previsualizar todavia.");
          if (!cancelado) setDatos({
            titulo: p.nombre, precio: Number(p.precio), moneda: p.moneda,
            stock: p.stock, estado: null, descripcion: p.descripcion,
            imagenes: (p.imagenes ?? []).map((i: any) => i.url ?? i),
            permalink: null, categoria: fila?.channel_attrs?.category_id ?? null, real: false,
          });
        }
      } catch (e: any) {
        if (!cancelado) setError(e.message || "No se pudo cargar la vista previa");
      } finally {
        if (!cancelado) setCarg(false);
      }
    })();
    return () => { cancelado = true; };
  }, [fila, publicado]);

  /**
   * Guarda las correcciones y vuelve a publicar, sin salir del modal.
   * La categoria vive en channel_attrs del listing; el resto son datos del
   * producto y van por actualizar_publicacion, el mismo RPC que usa la
   * pantalla de publicaciones.
   */
  const guardarYPublicar = async () => {
    setGuard(true); setAviso(null);
    try {
      // Mercado Libre no acepta el nombre de una categoria nuestra. Si la que
      // hay guardada no tiene forma de id de ML y no se eligio otra, se avisa
      // ahora: intentar publicar solo produciria el mismo rechazo de vuelta.
      const cat = edit["category_id"]?.trim();
      const catGuardada = String(fila?.channel_attrs?.category_id ?? "").trim();
      const formaDeIdMl = (v: string) => /^ML[A-Z][0-9]+$/.test(v);
      if (cat && !formaDeIdMl(cat)) {
        throw new Error(`"${cat}" no es una categoria de Mercado Libre. Elegi una de la lista.`);
      }
      if (!cat && catGuardada && !formaDeIdMl(catGuardada)) {
        throw new Error(`La categoria guardada ("${catGuardada}") es de tu catalogo, no de Mercado Libre. Elegi una de la lista.`);
      }

      // Los atributos obligatorios van a extra_attributes, que publicar-en-ml ya
      // mezcla en el payload de Mercado Libre.
      const extra = Object.entries(atrs)
        .filter(([, v]) => String(v).trim())
        .map(([id, value_name]) => ({ id, value_name: String(value_name).trim() }));

      if (cat || extra.length > 0) {
        const attrs: Record<string, unknown> = { ...(fila.channel_attrs ?? {}) };
        if (cat) { attrs.category_id = cat; attrs.category_id_origen = "manual"; }
        if (extra.length > 0) attrs.extra_attributes = extra;
        const { error } = await supabase
          .from("catalog_listings").update({ channel_attrs: attrs }).eq("id", fila.listing_id);
        if (error) throw new Error(error.message);
      }

      const patch: Record<string, unknown> = { p_variant_id: fila.variant_id };
      if (edit["title"]?.trim())       patch.p_title       = edit["title"].trim();
      if (edit["description"]?.trim()) patch.p_description = edit["description"].trim();
      if (edit["price"]?.trim()) {
        const precio = Number(edit["price"]);
        if (!Number.isFinite(precio) || precio <= 0) throw new Error("El precio tiene que ser un numero mayor que cero.");
        patch.p_price = precio;
      }
      if (edit["stock"]?.trim())       patch.p_stock       = parseInt(edit["stock"], 10);
      if (Object.keys(patch).length > 1) {
        const { error } = await supabase.rpc("actualizar_publicacion", patch);
        if (error) throw new Error(error.message);
      }

      // Guardar es rapido; publicar tarda porque va contra Mercado Libre. El
      // modal se cierra apenas termina el guardado y la publicacion la sigue
      // el padre, que ya sabe avisar y recargar la tabla. Esperar adentro
      // dejaba el modal congelado varios segundos sin razon.
      onClose();
      onPublicar?.(fila.variant_id);
    } catch (e: any) {
      setAviso(e.message || "No se pudo guardar");
    } finally {
      setGuard(false);
    }
  };

  const urlMl = datos?.permalink
    ?? (fila?.external_id ? `https://articulo.mercadolibre.com.uy/${fila.external_id}` : null);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(8,28,56,.55)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.bgCard, borderRadius: T.radiusLg, maxWidth: 620, width: "100%",
        maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(8,28,56,.3)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <div style={{ fontWeight: 700, color: T.textDark }}>
              {publicado ? "Publicacion en Mercado Libre" : "Asi se va a publicar"}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              {publicado
                ? `Datos reales de Mercado Libre · ${fila.external_id}`
                : "Vista previa desde tu catalogo · todavia no esta en Mercado Libre"}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            border: "none", background: "none", fontSize: 22, cursor: "pointer", color: T.textMuted,
          }}>x</button>
        </div>

        <div style={{ padding: 20 }}>
          {cargando && <div style={{ color: T.textMuted }}>Cargando vista previa...</div>}

          {error && !cargando && (
            <div style={{
              background: T.dangerBg, color: T.danger, padding: "10px 12px",
              borderRadius: T.radiusMd, fontSize: 13,
            }}>{error}</div>
          )}

          {datos && !cargando && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {datos.imagenes?.length > 0 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                  {datos.imagenes.slice(0, 6).map((u: string, i: number) => (
                    <img key={i} src={u} alt="" style={{
                      width: 92, height: 92, objectFit: "cover", borderRadius: T.radiusMd,
                      border: `1px solid ${T.borderLight}`, flexShrink: 0,
                    }} />
                  ))}
                </div>
              )}

              <div style={{ fontSize: 17, fontWeight: 700, color: T.textDark }}>{datos.titulo}</div>

              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "baseline" }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: T.primary }}>
                  {datos.moneda} {Number(datos.precio ?? 0).toLocaleString("es-UY")}
                </span>
                <span style={{ fontSize: 13, color: T.textMuted }}>Stock: {datos.stock ?? 0}</span>
                {datos.estado && <span style={{ fontSize: 13, color: T.textMuted }}>Estado: {datos.estado}</span>}
              </div>

              {datos.categoria && publicado && (
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  Categoria: {datos.categoria}
                  {fila?.channel_attrs?.category_id_origen === "prediccion_ml" && !publicado && (
                    <span style={{ color: T.warning }}> · sugerida automaticamente</span>
                  )}
                </div>
              )}

              {datos.descripcion && (
                <div style={{ fontSize: 13, color: T.textBody, whiteSpace: "pre-wrap" }}>
                  {String(datos.descripcion).slice(0, 400)}
                  {String(datos.descripcion).length > 400 ? "..." : ""}
                </div>
              )}

              {faltantes.length > 0 && (
                <div style={{
                  border: `1px solid ${T.border}`, borderRadius: T.radiusMd, padding: 14,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div>
                    {/* Un solo mensaje, el mismo que muestran el aviso de
                        arriba y la columna de la tabla: sale del traductor,
                        no de un texto propio del modal. Antes el modal
                        redactaba lo suyo y aparte repetia "Ultimo intento",
                        asi que el mismo rechazo se leia de tres formas. */}
                    <div style={{
                      fontWeight: 700, fontSize: 14,
                      color: traduccion ? T.danger : faltanAhora.length ? T.danger : T.success,
                    }}>
                      {traduccion
                        ? traduccion.motivo
                        : faltanAhora.length
                          ? "Falta " + faltanAhora.join(", ")
                          : "No falta ningún dato obligatorio"}
                    </div>
                    <div style={{ fontSize: 12, color: T.textBody, marginTop: 2 }}>
                      {traduccion
                        ? traduccion.detalle
                        : faltanAhora.length
                          ? "Completá lo marcado en rojo y guardá."
                          : "Podés publicar. Si Mercado Libre igual lo rechaza, el motivo va a quedar acá."}
                    </div>
                    {traduccion?.accion && (
                      <div style={{ fontSize: 12, color: T.textDark, marginTop: 6, fontWeight: 600 }}>
                        {traduccion.accion}
                      </div>
                    )}
                    {traduccion && faltanAhora.length > 0 && (
                      <div style={{ fontSize: 12, color: T.danger, marginTop: 4 }}>
                        Además falta {faltanAhora.join(", ")}.
                      </div>
                    )}
                    {/* El original nunca se oculta: si la traduccion no
                        acerto, el texto de Mercado Libre es lo unico que
                        sirve para entender el rechazo. */}
                    {traduccion && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ fontSize: 11, color: T.textMuted, cursor: "pointer" }}>
                          Ver lo que respondió Mercado Libre
                        </summary>
                        <pre style={{
                          fontSize: 10, color: T.textBody, background: T.bgMain,
                          padding: 8, borderRadius: T.radiusSm, marginTop: 6,
                          maxHeight: 180, overflow: "auto",
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>{traduccion.crudo}</pre>
                      </details>
                    )}
                  </div>
                  {faltantes.map((f) => f.campo === "category_id" ? (
                    <div key={f.campo} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <SelectorCategoria
                        titulo={datos?.titulo ?? null}
                        valorActual={f.actual != null ? String(f.actual) : null}
                        valor={edit["category_id"] ?? ""}
                        ruta={ruta}
                        onChange={(id) => setEdit((p) => ({ ...p, category_id: id }))} />
                      {catEfectiva && (
                        <AtributosCategoria categoria={catEfectiva} valores={atrs}
                          onChange={(id, v) => setAtrs((p) => ({ ...p, [id]: v }))}
                          onFaltan={recibirFaltan} />
                      )}
                    </div>
                  ) : (
                    <label key={f.campo} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 12, color: T.textMuted }}>
                        {f.etiqueta}
                        {f.vacio
                          ? <span style={{ color: T.danger }}> · falta</span>
                          : <span style={{ color: T.textMuted }}> · actual: {String(f.actual)}</span>}
                      </span>
                      <input
                        value={edit[f.campo] ?? (f.vacio ? "" : String(f.actual ?? ""))}
                        onChange={(e) => setEdit((p) => ({ ...p, [f.campo]: e.target.value }))}
                        style={{
                          padding: "8px 10px", fontSize: 13, outline: "none",
                          borderRadius: T.radiusSm,
                          border: `1px solid ${(edit[f.campo] ?? String(f.actual ?? "")).trim() ? T.border : T.danger}`,
                        }} />
                    </label>
                  ))}
                  {/* Solo problemas al guardar: si se llego a publicar, el
                      resultado se ve en la tabla y el modal ya se cerro. */}
                  {aviso && (
                    <div style={{
                      background: T.dangerBg, border: `1px solid ${T.danger}`,
                      borderRadius: T.radiusSm, padding: "8px 10px",
                      fontSize: 12, color: T.danger, fontWeight: 600,
                    }}>{aviso}</div>
                  )}
                </div>
              )}

              {!publicado && (
                <div style={{
                  background: T.warningBg, color: T.warning, padding: "8px 12px",
                  borderRadius: T.radiusMd, fontSize: 12,
                }}>
                  {faltanAhora.length
                    ? "Completá lo que falta y usá Guardar y publicar."
                    : "Todavía no está en Mercado Libre. Usá Guardar y publicar para intentarlo; el resultado queda en la tabla."}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "14px 20px", borderTop: `1px solid ${T.borderLight}`,
        }}>
          <Btn label="Cerrar" variant="secondary" disabled={guardando} onClick={onClose} />
          {faltantes.length > 0 && (
            <Btn label={guardando ? "Publicando…" : (traduccion ? "Guardar y reintentar" : "Guardar y publicar")} variant="primary"
              disabled={guardando} onClick={guardarYPublicar} />
          )}
          {urlMl && (
            <a href={urlMl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Btn label="Abrir en Mercado Libre" variant="primary" disabled={false} onClick={() => {}} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Selector de categoria de Mercado Libre.
 *
 * Nadie sabe de memoria que MLU203672 es Analgesicos, asi que un campo de
 * texto libre no sirve. Ademas los productos traen una categoria propia
 * -"Varios"- que no significa nada para Mercado Libre.
 *
 * Se comporta como un combo: cerrado muestra que hay elegido, se abre al
 * hacer clic, se cierra al elegir, con Escape o al hacer clic afuera. La
 * busqueda usa domain_discovery, el endpoint publico que Mercado Libre expone
 * para sugerir categoria a partir de un texto -el mismo que usa publicar-en-ml
 * para predecir-.
 */
function esIdMl(v: unknown): boolean {
  return typeof v === "string" && /^ML[A-Z][0-9]+$/.test(v.trim());
}

function SelectorCategoria({ titulo, valorActual, valor, ruta, onChange }: {
  titulo: string | null;
  valorActual: string | null;
  valor: string;
  ruta: string | null;
  onChange: (id: string) => void;
}) {
  const [abierto, setAbierto]   = useState(false);
  const [consulta, setConsulta] = useState("");
  const [opciones, setOpciones] = useState<Array<{ id: string; nombre: string; dominio: string }>>([]);
  const [buscando, setBuscando] = useState(false);
  const [fallo, setFallo]       = useState<string | null>(null);
  const caja  = useRef<HTMLDivElement | null>(null);
  const busca = useRef<HTMLInputElement | null>(null);

  const elegido = valor || (esIdMl(valorActual) ? String(valorActual).trim() : "");
  const heredadaInvalida = !!valorActual && !esIdMl(valorActual);

  const buscar = useCallback(async (texto: string) => {
    const q = texto.trim();
    if (q.length < 2) { setOpciones([]); setFallo(null); return; }
    setBuscando(true); setFallo(null);
    try {
      const r = await fetch(
        // limit acepta 1..8; con 10 Mercado Libre devuelve 400 y el combo quedaba
        // mostrando "respondio 400" en vez de las categorias.
        "https://api.mercadolibre.com/sites/MLU/domain_discovery/search?limit=8&q=" + encodeURIComponent(q)
      );
      if (!r.ok) throw new Error("Mercado Libre respondio " + r.status);
      const d = await r.json();
      setOpciones((Array.isArray(d) ? d : [])
        .filter((x: any) => x?.category_id)
        .map((x: any) => ({
          id: String(x.category_id),
          nombre: String(x.category_name ?? x.category_id),
          dominio: String(x.domain_name ?? ""),
        })));
    } catch (e: any) {
      setFallo(e?.message ?? "No se pudieron traer las sugerencias");
      setOpciones([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  // Al abrir se sugiere por el titulo del producto, que es el dato que ya
  // existe, y el foco va a la busqueda para poder escribir de una.
  useEffect(() => {
    if (!abierto) return;
    busca.current?.focus();
    if (!consulta.trim()) void buscar(titulo ?? "");
  }, [abierto]);

  // Cerrar con clic afuera o con Escape. Sin esto la lista queda abierta y
  // tapando el resto del formulario.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setAbierto(false); }
    };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  const elegir = (id: string) => { onChange(id); setAbierto(false); };

  return (
    <div ref={caja} style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
      <span style={{ fontSize: 12, color: T.textMuted }}>Categoria de Mercado Libre</span>

      <button onClick={() => setAbierto((v) => !v)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: "9px 11px", fontSize: 13, textAlign: "left", cursor: "pointer",
        background: T.bgCard, color: T.textDark,
        border: "1px solid " + (elegido ? T.border : T.danger),
        borderRadius: T.radiusSm,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {elegido
            ? (ruta ? ruta : elegido)
            : <span style={{ color: T.danger }}>Sin categoria - elegi una</span>}
        </span>
        <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>
          {elegido ? elegido + "  v" : "v"}
        </span>
      </button>

      {heredadaInvalida && !valor && (
        <div style={{ fontSize: 11, color: T.warning, background: T.warningBg, padding: "6px 8px", borderRadius: T.radiusSm }}>
          "{valorActual}" es una categoria de tu catalogo, no de Mercado Libre.
        </div>
      )}

      {abierto && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, marginTop: 4,
          background: T.bgCard, border: "1px solid " + T.border, borderRadius: T.radiusSm,
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)", overflow: "hidden",
        }}>
          <input ref={busca}
            value={consulta}
            onChange={(e) => { setConsulta(e.target.value); void buscar(e.target.value); }}
            placeholder="Que es el producto? ej. remera, celular, analgesico"
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 11px", fontSize: 13,
              border: "none", borderBottom: "1px solid " + T.borderLight, outline: "none",
            }} />

          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {buscando && (
              <div style={{ padding: "9px 11px", fontSize: 12, color: T.textMuted }}>Buscando...</div>
            )}

            {!buscando && fallo && (
              <div style={{ padding: "9px 11px", fontSize: 12, color: T.textMuted }}>
                No se pudieron traer las categorias en este momento. Proba de nuevo
                escribiendo otra palabra.
              </div>
            )}

            {!buscando && !fallo && opciones.length === 0 && (
              <div style={{ padding: "9px 11px", fontSize: 12, color: T.textMuted }}>
                {consulta.trim().length >= 2
                  ? "Sin resultados para \"" + consulta.trim() + "\". Proba con otra palabra."
                  : "Escribi que es el producto para ver categorias."}
              </div>
            )}

            {!buscando && opciones.map((o) => {
              const activa = o.id === elegido;
              return (
                <button key={o.id} onClick={() => elegir(o.id)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 11px", fontSize: 12, cursor: "pointer", border: "none",
                  background: activa ? T.primary : "transparent",
                  color: activa ? "#fff" : T.textDark,
                }}>
                  {o.nombre}
                  <span style={{ opacity: 0.65, marginLeft: 6, fontSize: 11 }}>
                    {o.dominio ? o.dominio + " - " : ""}{o.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Atributos que la categoria elegida exige.
 *
 * Es la respuesta concreta a "que falta": Mercado Libre publica, por
 * categoria, cuales atributos son obligatorios. Decir "faltan datos
 * obligatorios" sin nombrarlos deja a la persona adivinando.
 *
 * Lo que se completa aca se guarda en channel_attrs.extra_attributes, que
 * publicar-en-ml ya mezcla en el payload; no hace falta tocar la funcion.
 */
function AtributosCategoria({ categoria, valores, onChange, onFaltan }: {
  categoria: string;
  valores: Record<string, string>;
  onChange: (id: string, valor: string) => void;
  onFaltan: (nombres: string[]) => void;
}) {
  const [reqs, setReqs] = useState<Array<{ id: string; nombre: string; opciones: string[] }> | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setReqs(null); setFallo(false);
    if (!esIdMl(categoria)) return;
    (async () => {
      try {
        const r = await fetch("https://api.mercadolibre.com/categories/" + categoria + "/attributes");
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        const lista = (Array.isArray(d) ? d : [])
          .filter((a: any) => a?.tags?.required)
          .map((a: any) => ({
            id: String(a.id),
            nombre: String(a.name ?? a.id),
            opciones: (a.values ?? []).map((v: any) => String(v?.name)).filter(Boolean).slice(0, 60),
          }));
        if (!cancelado) setReqs(lista);
      } catch (_) {
        if (!cancelado) setFallo(true);
      }
    })();
    return () => { cancelado = true; };
  }, [categoria]);

  // El resumen de arriba tiene que poder nombrar estos atributos: si no, la
  // persona lee "faltan datos" y no sabe cuales.
  useEffect(() => {
    if (reqs === null) { onFaltan([]); return; }
    onFaltan(reqs.filter((a) => !(valores[a.id] ?? "").trim()).map((a) => a.nombre));
  }, [reqs, valores, onFaltan]);

  if (fallo || reqs === null || reqs.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: T.textMuted }}>
        Esta categoria exige {reqs.length === 1 ? "este atributo" : "estos atributos"}:
      </div>
      {reqs.map((a) => {
        const v = valores[a.id] ?? "";
        return (
          <label key={a.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>
              {a.nombre}
              {!v.trim() && <span style={{ color: T.danger }}> - falta</span>}
            </span>
            <input list={a.opciones.length ? "opc-" + a.id : undefined}
              value={v}
              onChange={(e) => onChange(a.id, e.target.value)}
              style={{
                padding: "8px 10px", border: "1px solid " + (v.trim() ? T.border : T.danger),
                borderRadius: T.radiusSm, fontSize: 13, outline: "none",
              }} />
            {a.opciones.length > 0 && (
              <datalist id={"opc-" + a.id}>
                {a.opciones.map((o) => <option key={o} value={o} />)}
              </datalist>
            )}
          </label>
        );
      })}
    </div>
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
