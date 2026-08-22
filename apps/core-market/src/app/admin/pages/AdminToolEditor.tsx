/**
 * AdminToolEditor.tsx — versión simplificada
 * El editor se monta directo, sin dropzone intermedia.
 * ToolEditor ya tiene su propio drag & drop interno.
 */

import { useState, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";
import ToolEditor from "../../../lib/tool-editor/src/components/ToolEditor";
import AdminBiblioteca from "./AdminBiblioteca";

interface UploadStatus {
  state: "idle" | "uploading" | "done" | "error";
  message: string;
  url?: string;
}

const EDITOR_CONFIG = {
  features: {
    removeBackground: false,
    watermarkVisible: false,
  },
  export: {
    formats: ["jpeg", "png", "webp"],
    defaultFormat: "jpeg",
    defaultQuality: 90,
  },
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]/g, "-").replace(/-+/g, "-");
}

function UploadBanner({ status }: { status: UploadStatus }) {
  if (status.state === "idle") return null;
  const map: Record<string, { bg: string; color: string; icon: string }> = {
    uploading: { bg: "rgba(26,79,156,.08)",  color: "#1A4F9C", icon: "⏳" },
    done:      { bg: "rgba(29,158,117,.08)", color: "#1D9E75", icon: "✓"  },
    error:     { bg: "rgba(192,57,43,.08)",  color: "#C0392B", icon: "✕"  },
  };
  const s = map[status.state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 16px", fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.color,
      borderBottom: `1px solid ${s.color}22`,
    }}>
      <span>{s.icon}</span>
      <span>{status.message}</span>
      {status.url && status.state === "done" && (
        <a href={status.url} target="_blank" rel="noreferrer"
          style={{ marginLeft: "auto", fontSize: 11, color: "#1A4F9C", fontWeight: 600, textDecoration: "none" }}>
          Ver imagen →
        </a>
      )}
    </div>
  );
}

export default function AdminToolEditor() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: "idle", message: "" });
  const [aiEnabled, setAiEnabled]       = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [incomingImage, setIncoming]    = useState<{ url: string; name: string; key: number } | null>(null);

  const handleExport = useCallback(async (blob: Blob, format: string) => {
    setUploadStatus({ state: "uploading", message: "Subiendo imagen editada…" });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const ext      = format === "jpeg" ? "jpg" : format;
      const fileName = `edited-${Date.now()}.${ext}`;
      const path     = `uploads/${user.id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from("biblioteca").upload(path, blob, { contentType: blob.type, upsert: false });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("biblioteca").getPublicUrl(path);

      const { error: dbError } = await supabase.from("media_library").insert({
        bucket: "biblioteca", path, tipo: "imagen", nombre: fileName,
        size_bytes: blob.size, categoria: "articulo",
        etiquetas: ["editada", "tool-editor"], status: "ready", user_id: user.id,
        metadata: { format },
      });
      if (dbError) throw dbError;

      setUploadStatus({ state: "done", message: `"${fileName}" guardada en Biblioteca`, url: urlData.publicUrl });
    } catch (err: any) {
      setUploadStatus({ state: "error", message: err.message ?? "Error al subir" });
    }
  }, []);

  const handlePickFromLibrary = useCallback((items: any[]) => {
    setPickerOpen(false);
    const it = items && items[0];
    if (!it) return;
    const { data } = supabase.storage.from(it.bucket || "biblioteca").getPublicUrl(it.path);
    setIncoming({ url: data.publicUrl, name: it.nombre || "biblioteca", key: Date.now() });
  }, []);

  const activeConfig = {
    ...EDITOR_CONFIG,
    features: { ...EDITOR_CONFIG.features, removeBackground: aiEnabled },
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif",
      background: "#F2F5FA",
    }}>
      {/* Banner upload */}
      <UploadBanner status={uploadStatus} />

      {/* Editor — ocupa todo el espacio restante */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ToolEditor
          config={activeConfig}
          aiEnabled={aiEnabled}
          onToggleAI={() => setAiEnabled(v => !v)}
          onSaveToLibrary={handleExport}
          onRequestLibrary={() => setPickerOpen(true)}
          incomingImage={incomingImage}
          onError={(err: { message: string }) =>
            setUploadStatus({ state: "error", message: err.message })}
        />
      </div>

      {pickerOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setPickerOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900,
            maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0D2B55" }}>Abrir desde biblioteca</span>
              <button onClick={() => setPickerOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--mute)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
              <AdminBiblioteca mode="modal" maxImages={1} maxVideos={0}
                onSelect={handlePickFromLibrary} selectedIds={[]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
