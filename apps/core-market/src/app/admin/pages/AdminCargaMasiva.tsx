"use client";

import { useState, useRef, useMemo } from "react";
import {
  importCatalogFromUrl,
  importCatalogFromCsv,
  importCatalogFromPdf,
  extractCatalogFromText,
  CargaMasivaResult,
} from "@/api/cargaMasivaClient";

type ImportMode = "url" | "csv" | "pdf";

const MODES: { id: ImportMode; label: string; accept?: string }[] = [
  { id: "url", label: "URL" },
  { id: "csv", label: "CSV", accept: ".csv,text/csv" },
  { id: "pdf", label: "PDF", accept: ".pdf,application/pdf" },
];

// ── Campos destino del catálogo ──────────────────────────────────────────────
const TARGET_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "nombre", label: "Nombre", required: true },
  { key: "descripcion", label: "Descripción" },
  { key: "marca", label: "Marca" },
  { key: "codigo", label: "Código / SKU" },
  { key: "numero_parte", label: "N° de parte (MPN)" },
  { key: "ean", label: "EAN / GTIN" },
  { key: "modelo", label: "Modelo" },
  { key: "precio", label: "Precio", required: true },
  { key: "precio_original", label: "Precio original" },
  { key: "moneda", label: "Moneda" },
  { key: "stock", label: "Stock" },
  { key: "imagenes", label: "Imágenes (URL)" },
  { key: "departamento", label: "Departamento" },
  { key: "categoria", label: "Categoría" },
  { key: "subcategoria", label: "Subcategoría" },
];

// Sinónimos para auto-sugerir el mapeo según el nombre de la columna.
const SYNONYMS: Record<string, string[]> = {
  nombre: ["nombre", "name", "titulo", "title", "producto", "articulo"],
  descripcion: ["descripcion", "description", "detalle", "desc"],
  marca: ["marca", "brand", "fabricante", "manufacturer"],
  codigo: ["codigo", "sku", "cod", "code", "referencia", "ref", "item"],
  numero_parte: ["mpn", "numerodeparte", "numparte", "partnumber", "nrodeparte", "parte", "pn"],
  ean: ["ean", "gtin", "barcode", "codigobarras", "upc", "ean13"],
  modelo: ["modelo", "model"],
  precio: ["precio", "price", "pvp", "valor", "precioventa", "importe"],
  precio_original: ["preciooriginal", "preciolista", "listprice", "precioanterior", "preciotachado"],
  moneda: ["moneda", "currency", "divisa"],
  stock: ["stock", "cantidad", "qty", "quantity", "existencia", "disponible"],
  imagenes: ["imagen", "imagenes", "image", "images", "img", "foto", "fotos", "imageurl"],
  departamento: ["departamento", "department", "rubro"],
  categoria: ["categoria", "category", "cat"],
  subcategoria: ["subcategoria", "subcategory", "subcat"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

// Auto-mapeo: 1ra pasada por coincidencia exacta, 2da por inclusión.
function autoMap(columns: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  const normCols = columns.map((c) => ({ raw: c, n: norm(c) }));

  for (const pass of ["exact", "loose"] as const) {
    for (const f of TARGET_FIELDS) {
      if (map[f.key]) continue;
      const syns = SYNONYMS[f.key] ?? [f.key];
      const hit = normCols.find(
        (c) =>
          !used.has(c.raw) &&
          syns.some((s) => (pass === "exact" ? c.n === s : c.n.includes(s)))
      );
      if (hit) {
        map[f.key] = hit.raw;
        used.add(hit.raw);
      }
    }
  }
  for (const f of TARGET_FIELDS) if (!map[f.key]) map[f.key] = "";
  return map;
}

const PREVIEW_LIMIT = 12;

interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
  fileName?: string;
}

export default function AdminCargaMasiva() {
  const [activeMode, setActiveMode] = useState<ImportMode>("csv");
  const [urlValue, setUrlValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resultado tabular (CSV / URL-CSV) → habilita el mapeo.
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  // Resultado de texto (PDF / URL no-tabular).
  const [textResult, setTextResult] = useState<unknown | null>(null);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentMode = MODES.find((m) => m.id === activeMode)!;

  function reset() {
    setError(null);
    setParsed(null);
    setTextResult(null);
    setMapping({});
    setConfirmed(false);
    setExtracting(false);
    setExtractProgress({ done: 0, total: 0 });
  }

  function handleModeChange(mode: ImportMode) {
    setActiveMode(mode);
    reset();
    setFile(null);
    setUrlValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    setLoading(true);
    reset();
    try {
      let res: CargaMasivaResult;

      if (activeMode === "url") {
        if (!urlValue.trim()) {
          setError("Ingresá una URL válida.");
          return;
        }
        res = await importCatalogFromUrl(urlValue.trim());
      } else if (activeMode === "csv") {
        if (!file) {
          setError("Seleccioná un archivo CSV.");
          return;
        }
        res = await importCatalogFromCsv(file);
      } else {
        if (!file) {
          setError("Seleccioná un archivo PDF.");
          return;
        }
        res = await importCatalogFromPdf(file);
      }

      if (!res.success) {
        setError(res.error ?? "Error al importar.");
        return;
      }

      const data = res.data as any;
      if (data?.columns && Array.isArray(data.rows)) {
        const p: ParsedCsv = {
          columns: data.columns,
          rows: data.rows,
          rowCount: data.rowCount ?? data.rows.length,
          fileName: data.fileName,
        };
        setParsed(p);
        setMapping(autoMap(p.columns));
      } else {
        setTextResult(data);
      }
    } catch {
      setError("Error inesperado al importar.");
    } finally {
      setLoading(false);
    }
  }

  // Estructura el texto (PDF/URL) con IA → filas para la grilla.
  async function handleExtract() {
    const t = (textResult as any)?.text as string | undefined;
    if (!t) return;
    setExtracting(true);
    setError(null);
    setExtractProgress({ done: 0, total: 0 });
    try {
      const res = await extractCatalogFromText(t, (done, total) =>
        setExtractProgress({ done, total })
      );
      if (!res.success) {
        setError(res.error ?? "No se pudo estructurar.");
        return;
      }
      const data = res.data as any;
      if (data?.columns && Array.isArray(data.rows) && data.rows.length) {
        const p: ParsedCsv = {
          columns: data.columns,
          rows: data.rows,
          rowCount: data.rowCount ?? data.rows.length,
          fileName: "Extraído con IA",
        };
        setParsed(p);
        setMapping(autoMap(p.columns));
        setTextResult(null);
      } else {
        setError("La IA no devolvió productos en este contenido. Revisá el texto o probá otro archivo.");
      }
    } catch {
      setError("Error inesperado al estructurar.");
    } finally {
      setExtracting(false);
    }
  }

  // Columnas del CSV que no quedaron asignadas a ningún campo → van a `extra`.
  const mappedCols = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping]
  );
  const extraColumns = useMemo(
    () => (parsed ? parsed.columns.filter((c) => !mappedCols.has(c)) : []),
    [parsed, mappedCols]
  );

  const missingRequired = TARGET_FIELDS.filter(
    (f) => f.required && !mapping[f.key]
  );

  function setField(target: string, col: string) {
    setMapping((prev) => ({ ...prev, [target]: col }));
    setConfirmed(false);
  }

  // Construye las filas mapeadas (Fase 1: preview / aún sin persistir).
  const mappedPreview = useMemo(() => {
    if (!parsed || !confirmed) return [];
    return parsed.rows.slice(0, PREVIEW_LIMIT).map((row) => {
      const out: Record<string, unknown> = {};
      for (const f of TARGET_FIELDS) {
        const col = mapping[f.key];
        if (col) out[f.key] = row[col] ?? null;
      }
      if (extraColumns.length) {
        out.extra = Object.fromEntries(extraColumns.map((c) => [c, row[c] ?? null]));
      }
      return out;
    });
  }, [parsed, confirmed, mapping, extraColumns]);

  return (
    <div className="cm-root">
      <header className="cm-header">
        <span className="cm-header-eyebrow">Admin</span>
        <h1 className="cm-header-title">Carga Masiva</h1>
        <p className="cm-header-sub">
          Importá catálogos desde CSV, URL o PDF y mapeá los campos a mano antes de cargar.
        </p>
      </header>

      <div className="cm-card">
        {/* Mode tabs */}
        <div className="cm-tabs" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={activeMode === m.id}
              className={`cm-tab ${activeMode === m.id ? "cm-tab--active" : ""}`}
              onClick={() => handleModeChange(m.id)}
            >
              {m.id === "url" && <IconLink />}
              {m.id === "csv" && <IconTable />}
              {m.id === "pdf" && <IconFile />}
              {m.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="cm-body">
          {activeMode === "url" ? (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-url">URL del catálogo</label>
              <input
                id="cm-url"
                type="url"
                className="cm-input"
                placeholder="https://proveedor.com/catalogo.csv"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
            </div>
          ) : (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-file">Archivo {currentMode.label}</label>
              <div
                className="cm-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
              >
                {file ? (
                  <>
                    <IconCheck />
                    <span className="cm-dropzone-name">{file.name}</span>
                    <span className="cm-dropzone-hint">
                      {(file.size / 1024).toFixed(1)} KB — clic para cambiar
                    </span>
                  </>
                ) : (
                  <>
                    <IconUpload />
                    <span className="cm-dropzone-hint">
                      Arrastrá o hacé clic para subir un {currentMode.label}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="cm-file"
                  type="file"
                  accept={currentMode.accept}
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          <button className="cm-btn" onClick={handleImport} disabled={loading} aria-busy={loading}>
            {loading ? (
              <><span className="cm-spinner" aria-hidden="true" /> Procesando…</>
            ) : (
              <><IconImport /> Leer {currentMode.label}</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="cm-result cm-result--err" role="status">
            <div className="cm-result-badge"><IconAlert /><span>Error</span></div>
            <pre className="cm-pre">{error}</pre>
          </div>
        )}

        {/* Resultado de texto (PDF / URL no-tabular) */}
        {textResult !== null && (
          <div className="cm-result cm-result--ok" role="status">
            <div className="cm-result-badge"><IconCheck /><span>Contenido leído</span></div>
            <pre className="cm-pre">
              {(textResult as any).preview ?? JSON.stringify(textResult, null, 2)}
            </pre>
            {(textResult as any).text && (
              <button
                className="cm-btn"
                style={{ marginTop: "var(--space-4)" }}
                onClick={handleExtract}
                disabled={extracting}
                aria-busy={extracting}
              >
                {extracting ? (
                  <>
                    <span className="cm-spinner" aria-hidden="true" />
                    Estructurando…{extractProgress.total ? ` (${extractProgress.done}/${extractProgress.total})` : ""}
                  </>
                ) : (
                  <><IconSparkles /> Estructurar con IA</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Preview + Mapeo (solo cuando hay columnas) ── */}
      {parsed && (
        <>
          <div className="cm-card cm-card--wide">
            <div className="cm-section-head">
              <div>
                <span className="cm-header-eyebrow">Preview</span>
                <h2 className="cm-section-title">{parsed.fileName ?? "Archivo"}</h2>
              </div>
              <span className="cm-pill">
                {parsed.rowCount} filas · {parsed.columns.length} columnas
              </span>
            </div>

            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>{parsed.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                    <tr key={i}>
                      {parsed.columns.map((c) => <td key={c}>{row[c]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.rowCount > PREVIEW_LIMIT && (
              <p className="cm-note">Mostrando las primeras {PREVIEW_LIMIT} de {parsed.rowCount} filas.</p>
            )}
          </div>

          <div className="cm-card cm-card--wide">
            <div className="cm-section-head">
              <div>
                <span className="cm-header-eyebrow">Mapeo</span>
                <h2 className="cm-section-title">Correspondencia de campos</h2>
              </div>
            </div>

            <div className="cm-map-grid">
              {TARGET_FIELDS.map((f) => (
                <div className="cm-map-row" key={f.key}>
                  <label className="cm-map-label">
                    {f.label}
                    {f.required && <span className="cm-req">*</span>}
                  </label>
                  <select
                    className="cm-select"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  >
                    <option value="">— sin asignar —</option>
                    {parsed.columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {extraColumns.length > 0 && (
              <p className="cm-note">
                <strong>{extraColumns.length}</strong> columna(s) sin asignar se guardan en <code>extra</code>: {extraColumns.join(", ")}
              </p>
            )}

            {missingRequired.length > 0 && (
              <div className="cm-result cm-result--err" style={{ borderTop: "none", padding: 0, marginTop: "var(--space-3)" }}>
                <div className="cm-result-badge"><IconAlert /><span>Faltan campos obligatorios: {missingRequired.map((f) => f.label).join(", ")}</span></div>
              </div>
            )}

            <button
              className="cm-btn"
              style={{ marginTop: "var(--space-4)", alignSelf: "flex-start" }}
              disabled={missingRequired.length > 0}
              onClick={() => setConfirmed(true)}
            >
              <IconCheck /> Confirmar mapeo
            </button>
          </div>

          {confirmed && (
            <div className="cm-card cm-card--wide">
              <div className="cm-section-head">
                <div>
                  <span className="cm-header-eyebrow">Resultado</span>
                  <h2 className="cm-section-title">Filas mapeadas (preview)</h2>
                </div>
                <span className="cm-pill cm-pill--ok">{parsed.rowCount} listas para cargar</span>
              </div>
              <pre className="cm-pre cm-pre--plain">{JSON.stringify(mappedPreview, null, 2)}</pre>
              <p className="cm-note">
                Preview de las primeras {PREVIEW_LIMIT}. La persistencia a Supabase y el enriquecimiento por marca/MPN/EAN son el siguiente paso.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Scoped styles — 100% sobre tokens CORE Market ── */}
      <style>{`
        .cm-root {
          font-family: var(--font-base);
          color: var(--color-text-dark);
          padding: var(--space-6) var(--space-5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-5);
        }
        .cm-header { width: 100%; max-width: 640px; }
        .cm-header-eyebrow {
          display: inline-block;
          font-size: 10px; font-weight: var(--fw-bold);
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--color-primary); margin-bottom: var(--space-1);
        }
        .cm-header-title {
          font-size: 20px; font-weight: var(--fw-black);
          letter-spacing: -0.01em; margin: 0 0 var(--space-1);
          color: var(--color-text-dark);
        }
        .cm-header-sub { font-size: 12px; color: var(--gray-400); margin: 0; }

        .cm-card {
          width: 100%; max-width: 640px;
          background: var(--card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .cm-card--wide { max-width: 920px; padding: var(--space-5); }

        /* Tabs */
        .cm-tabs { display: flex; border-bottom: 1px solid var(--color-border); }
        .cm-tab {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: var(--space-1); padding: var(--space-3) var(--space-2);
          background: none; border: none; color: var(--gray-400);
          font-family: var(--font-base); font-size: 11px; font-weight: var(--fw-bold);
          letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
          transition: color 0.2s ease-in-out, background 0.2s ease-in-out;
        }
        .cm-tab svg { width: 15px; height: 15px; }
        .cm-tab:hover { color: var(--color-primary); background: var(--gray-50); }
        .cm-tab--active {
          color: var(--brand-accent-dark);
          background: var(--brand-accent-light);
          box-shadow: inset 0 -2px 0 var(--brand-accent);
        }

        .cm-body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); }
        .cm-field { display: flex; flex-direction: column; gap: var(--space-2); }
        .cm-label {
          font-size: 10px; font-weight: var(--fw-bold);
          letter-spacing: 0.06em; text-transform: uppercase; color: var(--gray-400);
        }
        .cm-input, .cm-select {
          background: var(--card); border: 1px solid var(--color-border);
          border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3);
          color: var(--color-text-dark); font-family: var(--font-base);
          font-size: 14px; outline: none; width: 100%;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .cm-input::placeholder { color: var(--gray-400); }
        .cm-input:focus, .cm-select:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--brand-primary-light);
        }

        .cm-dropzone {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: var(--space-1); border: 1.5px dashed var(--color-border);
          border-radius: var(--radius-md); padding: var(--space-6) var(--space-4);
          cursor: pointer; text-align: center;
          transition: border-color 0.2s ease-in-out, background 0.2s ease-in-out;
        }
        .cm-dropzone:hover { border-color: var(--color-primary); background: var(--brand-primary-light); }
        .cm-dropzone svg { width: 28px; height: 28px; color: var(--gray-400); }
        .cm-dropzone:hover svg { color: var(--color-primary); }
        .cm-dropzone-name { font-size: 14px; font-weight: var(--fw-bold); color: var(--gray-600); word-break: break-all; }
        .cm-dropzone-hint { font-size: 12px; color: var(--gray-400); }

        .cm-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: var(--space-2); padding: var(--space-2) var(--space-5);
          border: none; border-radius: var(--radius-sm);
          background: var(--color-primary); color: var(--color-text-light);
          font-family: var(--font-base); font-size: 11px; font-weight: var(--fw-bold);
          letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
          transition: background 0.2s ease-in-out, transform 0.1s, opacity 0.2s;
        }
        .cm-btn svg { width: 16px; height: 16px; }
        .cm-btn:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); }
        .cm-btn:active:not(:disabled) { transform: translateY(0); }
        .cm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .cm-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid color-mix(in srgb, var(--color-text-light) 35%, transparent);
          border-top-color: var(--color-text-light); border-radius: 50%;
          animation: cm-spin 0.7s linear infinite;
        }
        @keyframes cm-spin { to { transform: rotate(360deg); } }

        .cm-result { border-top: 1px solid var(--color-border); padding: var(--space-4) var(--space-5) var(--space-5); }
        .cm-result--ok { --cm-accent: var(--color-success); --cm-bg: color-mix(in srgb, var(--color-success) 8%, transparent); }
        .cm-result--err { --cm-accent: var(--color-danger); --cm-bg: color-mix(in srgb, var(--color-danger) 8%, transparent); }
        .cm-result-badge {
          display: flex; align-items: center; gap: var(--space-1);
          font-size: 10px; font-weight: var(--fw-black); letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--cm-accent); margin-bottom: var(--space-2);
        }
        .cm-result-badge svg { width: 15px; height: 15px; }
        .cm-pre {
          background: var(--cm-bg);
          border: 1px solid color-mix(in srgb, var(--cm-accent) 20%, transparent);
          border-radius: var(--radius-sm); padding: var(--space-4);
          font-size: 12px; color: var(--gray-600); overflow: auto; max-height: 280px;
          white-space: pre-wrap; word-break: break-all; margin: 0; font-family: var(--font-mono);
        }
        .cm-pre--plain {
          background: var(--gray-50);
          border: 1px solid var(--color-border);
          color: var(--gray-600);
        }

        /* Section head */
        .cm-section-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: var(--space-3); margin-bottom: var(--space-4);
        }
        .cm-section-title { font-size: 16px; font-weight: var(--fw-bold); color: var(--color-text-dark); margin: 0; }
        .cm-pill {
          font-size: 11px; font-weight: var(--fw-bold); color: var(--color-primary);
          background: var(--brand-primary-light); border-radius: var(--radius-pill);
          padding: var(--space-1) var(--space-3); white-space: nowrap;
        }
        .cm-pill--ok { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 10%, transparent); }

        /* Tabla preview */
        .cm-table-wrap { overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
        .cm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cm-table thead tr { background: var(--color-bg-sidebar); }
        .cm-table th {
          color: var(--color-text-light); font-weight: var(--fw-bold); text-align: left;
          padding: var(--space-2) var(--space-3); font-size: 11px;
          letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap;
        }
        .cm-table tbody tr:nth-child(even) { background: var(--gray-50); }
        .cm-table tbody tr:hover { background: var(--gray-100); }
        .cm-table td {
          padding: var(--space-2) var(--space-3); color: var(--gray-600);
          border-bottom: 1px solid var(--color-border);
          max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Grilla de mapeo */
        .cm-map-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--space-3) var(--space-4);
        }
        .cm-map-row { display: flex; flex-direction: column; gap: var(--space-1); }
        .cm-map-label {
          font-size: 11px; font-weight: var(--fw-bold); color: var(--color-text-dark);
          display: flex; align-items: center; gap: var(--space-1);
        }
        .cm-req { color: var(--color-danger); }

        .cm-note { font-size: 12px; color: var(--gray-400); margin: var(--space-3) 0 0; }
        .cm-note code {
          font-family: var(--font-mono); font-size: 11px;
          background: var(--gray-100); padding: 1px 5px; border-radius: var(--radius-sm); color: var(--gray-600);
        }
      `}</style>
    </div>
  );
}

/* ── Inline SVG icons (heredan currentColor) ── */
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IconTable() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}
function IconImport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z"/>
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
    </svg>
  );
}
