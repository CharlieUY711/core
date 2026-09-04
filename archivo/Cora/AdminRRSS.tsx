/**
 * src/app/admin/pages/AdminRRSS.tsx
 *
 * Herramienta de generación de publicaciones para RRSS.
 * Integrada en el dashboard de Market como una página más del admin.
 *
 * Flujo:
 *   1. Listado de artículos del catálogo con buscador
 *   2. Seleccionar artículo → generar borrador automático
 *   3. Revisar/editar texto en 3 tabs: Facebook · Instagram · WhatsApp
 *   4. Publicar (FB/IG via Edge Function) o Compartir (WA via wa.me)
 *
 * Patrón seguido: AdminML.tsx
 *   - Design tokens T inline
 *   - Componentes locales: Btn, TabBtn, Card, Badge
 *   - Llamadas directas a FUNCTIONS_URL
 *   - Sin librerías de UI externas
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../utils/supabase/client";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY      = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// ── Design tokens (consistentes con AdminML / brand.css) ──────────────────────
const T = {
  primary:      "#1A4F9C",
  primaryDark:  "#0D2B55",
  primaryLight: "rgba(26,79,156,.1)",
  accent:       "#C9A84C",
  accentLight:  "rgba(201,168,76,.1)",
  success:      "#1D9E75",
  successBg:    "rgba(29,158,117,.1)",
  warning:      "#C9A84C",
  warningBg:    "rgba(201,168,76,.1)",
  danger:       "#C0392B",
  dangerBg:     "rgba(192,57,43,.1)",
  bgMain:       "#F2F5FA",
  bgCard:       "#ffffff",
  textDark:     "#0D2B55",
  textBody:     "#4A4A4A",
  textMuted:    "#7A7A7A",
  border:       "#C8D5E8",
  borderLight:  "#E8EDF5",
  radiusSm:     "4px",
  radiusMd:     "8px",
  radiusLg:     "12px",
  radiusPill:   "999px",
  shadowCard:   "0 2px 8px rgba(13,43,85,.08)",
  shadowMd:     "0 2px 8px rgba(13,43,85,.09)",
  font:         "Calibri, 'Segoe UI', system-ui, sans-serif",
  // Canales
  fb:           "#1877F2",
  ig:           "#E1306C",
  wa:           "#25D366",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Articulo {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  moneda: string;
  stock: number;
  imagen_principal?: string;
  imagenes?: { url: string }[];
  status: string;
  sync_meta?: boolean;
  sync_wa?: boolean;
}

type Canal = "facebook" | "instagram" | "whatsapp";

interface Borrador {
  facebook: string;
  instagram: string;
  whatsapp: string;
}

interface SyncResult {
  canal: Canal;
  ok: boolean;
  external_id?: string;
  error?: string;
}

// ── Helper auth ───────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? ANON_KEY}`;
}

// ── Helpers de texto ──────────────────────────────────────────────────────────

function buildBorrador(art: Articulo): Borrador {
  const precio = `${art.moneda} ${Number(art.precio).toLocaleString("es-UY")}`;
  const desc   = art.descripcion
    ? art.descripcion.slice(0, 220) + (art.descripcion.length > 220 ? "…" : "")
    : "";
  const stock  = art.stock > 0 ? `Stock: ${art.stock} unidades.` : "Consultar disponibilidad.";

  const fb = [
    `✨ ${art.nombre}`,
    desc,
    `💰 ${precio}`,
    stock,
    "📩 Escribinos para más info o compralo directamente desde nuestra tienda.",
  ].filter(Boolean).join("\n\n");

  const ig = [
    `✨ ${art.nombre}`,
    desc,
    `💰 ${precio}`,
    stock,
    "👇 Link en bio · 📩 DM para consultas",
    "#market #tienda #oferta",
  ].filter(Boolean).join("\n\n");

  const wa = [
    `*${art.nombre}*`,
    desc,
    `💰 *${precio}*`,
    stock,
    "¿Te interesa? Respondé este mensaje y te damos más info.",
  ].filter(Boolean).join("\n\n");

  return { facebook: fb, instagram: ig, whatsapp: wa };
}

function buildWaUrl(texto: string, imagenUrl?: string): string {
  // El link al producto se puede agregar si hay URL pública
  const msg = encodeURIComponent(texto);
  return `https://wa.me/?text=${msg}`;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminRRSS() {
  const [articulos,     setArticulos]     = useState<Articulo[]>([]);
  const [filtro,        setFiltro]        = useState("");
  const [loadingList,   setLoadingList]   = useState(true);
  const [selected,      setSelected]      = useState<Articulo | null>(null);
  const [borrador,      setBorrador]      = useState<Borrador | null>(null);
  const [tab,           setTab]           = useState<Canal>("facebook");
  const [publishing,    setPublishing]    = useState<Canal | null>(null);
  const [results,       setResults]       = useState<SyncResult[]>([]);
  const [msg,           setMsg]           = useState<{ text: string; type: "ok" | "err" | "warn" } | null>(null);
  // Estado de conexión Meta
  const [metaConectado, setMetaConectado] = useState<boolean | null>(null);

  const notify = (text: string, type: "ok" | "err" | "warn" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Cargar artículos ────────────────────────────────────────────────────────

  const loadArticulos = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("admin_products")
      .select("id, nombre, descripcion, precio, moneda, stock, imagen_principal, imagenes, status, sync_meta, sync_wa")
      .eq("status", "active")
      .order("nombre", { ascending: true });
    if (!error) setArticulos(data ?? []);
    setLoadingList(false);
  }, []);

  // ── Verificar conexión Meta ─────────────────────────────────────────────────

  const checkMetaConexion = useCallback(async () => {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/meta-oauth?action=status`, {
        headers: { Authorization: await getAuthHeader() },
      });
      const data = await res.json();
      setMetaConectado(data.ok === true);
    } catch {
      setMetaConectado(false);
    }
  }, []);

  useEffect(() => { loadArticulos(); checkMetaConexion(); }, []);

  // ── Seleccionar artículo ────────────────────────────────────────────────────

  const handleSelect = (art: Articulo) => {
    setSelected(art);
    setBorrador(buildBorrador(art));
    setResults([]);
    setTab("facebook");
  };

  // ── Publicar en FB / IG ────────────────────────────────────────────────────

  const handlePublish = async (canal: "facebook" | "instagram") => {
    if (!selected || !borrador) return;
    setPublishing(canal);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/publicar-en-meta`, {
        method: "POST",
        headers: {
          Authorization: await getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: selected.id,
          channels: [canal],
          caption: canal === "facebook" ? borrador.facebook : borrador.instagram,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const r = data.results?.[canal];
        setResults(prev => [
          ...prev.filter(x => x.canal !== canal),
          { canal, ok: true, external_id: r?.id },
        ]);
        notify(`Publicado en ${canal === "facebook" ? "Facebook" : "Instagram"} ✓`);
      } else {
        setResults(prev => [
          ...prev.filter(x => x.canal !== canal),
          { canal, ok: false, error: data.error },
        ]);
        notify(data.error ?? "Error al publicar", "err");
      }
    } catch (err: any) {
      notify(err.message || "Error de conexión", "err");
    }
    setPublishing(null);
  };

  // ── Compartir por WA ────────────────────────────────────────────────────────

  const handleShareWA = () => {
    if (!borrador) return;
    const url = buildWaUrl(borrador.whatsapp, selected?.imagen_principal);
    window.open(url, "_blank");
    setResults(prev => [
      ...prev.filter(x => x.canal !== "whatsapp"),
      { canal: "whatsapp", ok: true },
    ]);
    notify("Link de WhatsApp abierto ✓");
  };

  // ── Conectar Meta ───────────────────────────────────────────────────────────

  const handleConectarMeta = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? ANON_KEY;
    // El storeId viene del claim del JWT; si no, se puede pedir al usuario
    window.location.href = `${FUNCTIONS_URL}/meta-oauth?action=authorize&token=${token}`;
  };

  // ── Filtrado ────────────────────────────────────────────────────────────────

  const artFiltrados = articulos.filter(a =>
    a.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  // ── Resultado por canal ─────────────────────────────────────────────────────

  const getResult = (c: Canal) => results.find(r => r.canal === c);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: T.font, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: T.bgCard, borderRadius: T.radiusLg,
        border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 24px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textDark, letterSpacing: "-0.3px" }}>
              Publicar en Redes Sociales
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMuted }}>
              Seleccioná un artículo y generá el borrador para Facebook, Instagram y WhatsApp
            </p>
          </div>

          {/* Estado conexión Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {metaConectado === false && (
              <Btn label="Conectar Meta" variant="primary" disabled={false} onClick={handleConectarMeta} />
            )}
            {metaConectado === true && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.success,
                background: T.successBg, padding: "4px 10px",
                borderRadius: T.radiusPill,
              }}>● Meta conectado</span>
            )}
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

        {/* KPIs rápidos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {[
            { label: "Artículos activos", value: articulos.length, accent: T.primary },
            { label: "Publicados en Meta", value: articulos.filter(a => a.sync_meta).length, accent: T.fb },
            { label: "Publicados en WA",  value: articulos.filter(a => a.sync_wa).length,   accent: T.wa },
          ].map((k, i) => (
            <div key={k.label} style={{
              padding: "14px 24px",
              borderLeft: i > 0 ? `1px solid ${T.borderLight}` : "none",
            }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.textDark }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Layout de 2 columnas ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Columna izquierda: lista de artículos ──────────────────────────── */}
        <div style={{
          background: T.bgCard, borderRadius: T.radiusLg,
          border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
            <input
              type="text"
              placeholder="Buscar artículo…"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", fontSize: 13,
                border: `1px solid ${T.border}`, borderRadius: T.radiusMd,
                outline: "none", color: T.textDark,
                fontFamily: T.font, boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {loadingList ? (
              <div style={{ padding: "2rem", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
                Cargando artículos…
              </div>
            ) : artFiltrados.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
                {filtro ? "Sin resultados para esa búsqueda." : "No hay artículos activos."}
              </div>
            ) : artFiltrados.map(art => {
              const isSelected = selected?.id === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => handleSelect(art)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", cursor: "pointer",
                    borderBottom: `1px solid ${T.borderLight}`,
                    background: isSelected ? T.primaryLight : "transparent",
                    borderLeft: isSelected ? `3px solid ${T.primary}` : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Imagen */}
                  <div style={{
                    width: 44, height: 44, borderRadius: T.radiusMd, flexShrink: 0,
                    background: T.bgMain, overflow: "hidden",
                    border: `1px solid ${T.borderLight}`,
                  }}>
                    {art.imagen_principal
                      ? <img src={art.imagen_principal} alt={art.nombre}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: 18, color: T.textMuted }}>📦</div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: isSelected ? 700 : 600,
                      color: isSelected ? T.primary : T.textDark,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{art.nombre}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {art.moneda} {Number(art.precio).toLocaleString("es-UY")}
                      {" · "}Stock: {art.stock}
                    </div>
                    {/* Badges de canales ya publicados */}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {art.sync_meta && <ChannelBadge canal="facebook" size="xs" />}
                      {art.sync_wa   && <ChannelBadge canal="whatsapp" size="xs" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Columna derecha: editor de borrador ───────────────────────────── */}
        {!selected ? (
          <div style={{
            background: T.bgCard, borderRadius: T.radiusLg,
            border: `2px dashed ${T.border}`, padding: "4rem 2rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📲</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textDark, marginBottom: 6 }}>
              Seleccioná un artículo
            </div>
            <div style={{ fontSize: 13, color: T.textMuted }}>
              Elegí un producto de la lista para generar el borrador de publicación.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Preview del artículo seleccionado */}
            <div style={{
              background: T.bgCard, borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
              padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              {selected.imagen_principal && (
                <img src={selected.imagen_principal} alt={selected.nombre}
                  style={{ width: 56, height: 56, borderRadius: T.radiusMd,
                    objectFit: "cover", border: `1px solid ${T.borderLight}` }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.textDark }}>
                  {selected.nombre}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  {selected.moneda} {Number(selected.precio).toLocaleString("es-UY")}
                  {" · "}Stock: {selected.stock}
                </div>
              </div>
              <Btn label="Cambiar" variant="ghost" disabled={false}
                onClick={() => { setSelected(null); setBorrador(null); }} />
            </div>

            {/* Editor con tabs por canal */}
            <div style={{
              background: T.bgCard, borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
              overflow: "hidden",
            }}>
              {/* Tabs */}
              <div style={{
                display: "flex", borderBottom: `1px solid ${T.border}`,
                padding: "0 20px", gap: 4,
              }}>
                {(["facebook","instagram","whatsapp"] as Canal[]).map(c => (
                  <ChannelTab
                    key={c}
                    canal={c}
                    active={tab === c}
                    result={getResult(c)}
                    onClick={() => setTab(c)}
                  />
                ))}
              </div>

              {/* Editor de texto */}
              <div style={{ padding: "20px" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 10,
                }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Texto del post
                  </label>
                  <button
                    onClick={() => setBorrador(b => b ? { ...b, [tab]: buildBorrador(selected!)[tab] } : b)}
                    style={{
                      fontSize: 11, color: T.primary, background: "transparent",
                      border: "none", cursor: "pointer", fontWeight: 600, padding: 0,
                    }}
                  >
                    ↺ Regenerar
                  </button>
                </div>

                <textarea
                  value={borrador?.[tab] ?? ""}
                  onChange={e => setBorrador(b => b ? { ...b, [tab]: e.target.value } : b)}
                  rows={10}
                  style={{
                    width: "100%", padding: "12px 14px",
                    border: `1px solid ${T.border}`, borderRadius: T.radiusMd,
                    fontSize: 13, lineHeight: 1.6, color: T.textDark,
                    fontFamily: T.font, resize: "vertical",
                    outline: "none", boxSizing: "border-box",
                    background: T.bgMain,
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>
                    {(borrador?.[tab] ?? "").length} caracteres
                    {tab === "instagram" && " · Máx recomendado: 2200"}
                    {tab === "whatsapp"  && " · El receptor lo verá como mensaje"}
                  </span>

                  {/* Botón de copiar */}
                  <CopyBtn texto={borrador?.[tab] ?? ""} />
                </div>
              </div>

              {/* Acciones de publicación */}
              <div style={{
                padding: "14px 20px",
                borderTop: `1px solid ${T.borderLight}`,
                display: "flex", gap: 10, alignItems: "center",
                background: T.bgMain,
              }}>
                {tab === "facebook" && (
                  <>
                    <Btn
                      label={publishing === "facebook" ? "Publicando…" : "Publicar en Facebook"}
                      variant="primary"
                      disabled={publishing !== null || metaConectado === false}
                      onClick={() => handlePublish("facebook")}
                    />
                    {metaConectado === false && (
                      <span style={{ fontSize: 11, color: T.warning }}>
                        ⚠ Conectá Meta para publicar automáticamente
                      </span>
                    )}
                    <ResultBadge result={getResult("facebook")} />
                  </>
                )}

                {tab === "instagram" && (
                  <>
                    <Btn
                      label={publishing === "instagram" ? "Publicando…" : "Publicar en Instagram"}
                      variant="primary"
                      disabled={publishing !== null || metaConectado === false}
                      onClick={() => handlePublish("instagram")}
                    />
                    {!selected.imagen_principal && (
                      <span style={{ fontSize: 11, color: T.warning }}>
                        ⚠ Instagram requiere al menos una imagen
                      </span>
                    )}
                    <ResultBadge result={getResult("instagram")} />
                  </>
                )}

                {tab === "whatsapp" && (
                  <>
                    <Btn
                      label="Compartir por WhatsApp"
                      variant="success"
                      disabled={false}
                      onClick={handleShareWA}
                    />
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      Abre WhatsApp con el mensaje listo para enviar
                    </span>
                    <ResultBadge result={getResult("whatsapp")} />
                  </>
                )}
              </div>
            </div>

            {/* Resumen de publicaciones de esta sesión */}
            {results.length > 0 && (
              <div style={{
                background: T.bgCard, borderRadius: T.radiusLg,
                border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
                padding: "14px 20px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Estado de publicación — {selected.nombre}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {results.map(r => (
                    <div key={r.canal} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: T.radiusMd,
                      background: r.ok ? T.successBg : T.dangerBg,
                      border: `1px solid ${r.ok ? T.success : T.danger}`,
                    }}>
                      <ChannelBadge canal={r.canal} size="sm" />
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: r.ok ? T.success : T.danger }}>
                        {r.ok ? "✓ Publicado" : `✕ ${r.error ?? "Error"}`}
                      </span>
                      {r.external_id && (
                        <span style={{ fontSize: 10, color: T.textMuted,
                          fontFamily: "'Courier New', monospace" }}>
                          {r.external_id.slice(0, 16)}…
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes UI ────────────────────────────────────────────────────────────

function Btn({ label, variant = "secondary", size = "md", disabled, onClick }: {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md";
  disabled: boolean;
  onClick: () => void;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: T.primary,  color: "#fff",       border: "none" },
    secondary: { background: "transparent", color: T.primary, border: `1px solid ${T.border}` },
    ghost:     { background: "transparent", color: T.textMuted, border: `1px solid ${T.border}` },
    danger:    { background: "transparent", color: T.danger,  border: `1px solid ${T.danger}` },
    success:   { background: T.wa,        color: "#fff",       border: "none" },
  };
  const padding  = size === "xs" ? "3px 8px" : size === "sm" ? "5px 12px" : "7px 16px";
  const fontSize = size === "xs" ? 10 : size === "sm" ? 11 : 12;

  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], padding, fontSize,
      fontWeight: 700, letterSpacing: "0.04em", borderRadius: T.radiusSm,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      transition: "opacity 0.12s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

const CANAL_META: Record<Canal, { label: string; color: string; icon: string }> = {
  facebook:  { label: "Facebook",  color: T.fb, icon: "f" },
  instagram: { label: "Instagram", color: T.ig, icon: "ig" },
  whatsapp:  { label: "WhatsApp",  color: T.wa, icon: "wa" },
};

function ChannelTab({ canal, active, result, onClick }: {
  canal: Canal; active: boolean;
  result?: SyncResult;
  onClick: () => void;
}) {
  const { label, color } = CANAL_META[canal];
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px 12px", background: "none", border: "none",
      borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
      marginBottom: "-1px", cursor: "pointer",
      fontWeight: active ? 700 : 500, fontSize: 13,
      color: active ? color : T.textMuted,
      display: "flex", alignItems: "center", gap: 6,
      transition: "all 0.12s",
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, borderRadius: "50%",
        background: active ? color : T.borderLight,
        color: active ? "#fff" : T.textMuted,
        fontSize: 9, fontWeight: 800,
      }}>
        {canal === "facebook" ? "f" : canal === "instagram" ? "ig" : "wa"}
      </span>
      {label}
      {result && (
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: result.ok ? T.success : T.danger,
          display: "inline-block",
        }} />
      )}
    </button>
  );
}

function ChannelBadge({ canal, size }: { canal: Canal; size: "xs" | "sm" }) {
  const { label, color } = CANAL_META[canal];
  const p = size === "xs" ? "1px 5px" : "2px 8px";
  const fs = size === "xs" ? 9 : 10;
  return (
    <span style={{
      padding: p, borderRadius: T.radiusPill, fontSize: fs,
      fontWeight: 700, background: `${color}18`, color,
      textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {label}
    </span>
  );
}

function ResultBadge({ result }: { result?: SyncResult }) {
  if (!result) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: result.ok ? T.success : T.danger,
      marginLeft: 4,
    }}>
      {result.ok ? "✓ Publicado" : `✕ ${result.error ?? "Error"}`}
    </span>
  );
}

function CopyBtn({ texto }: { texto: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      fontSize: 11, color: copied ? T.success : T.primary,
      background: "transparent", border: "none",
      cursor: "pointer", fontWeight: 700, padding: 0,
      transition: "color 0.2s",
    }}>
      {copied ? "✓ Copiado" : "Copiar texto"}
    </button>
  );
}
