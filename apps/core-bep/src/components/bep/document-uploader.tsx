"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type DocumentType =
  | "pliego" | "plano" | "anexo" | "norma" | "contrato" | "memoria"
  | "ficha_tecnica" | "catalogo" | "circular" | "consulta" | "correo" | "otro";

const TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "pliego",        label: "Pliego" },
  { value: "plano",         label: "Plano" },
  { value: "anexo",         label: "Anexo" },
  { value: "norma",         label: "Norma" },
  { value: "contrato",      label: "Contrato" },
  { value: "memoria",       label: "Memoria técnica" },
  { value: "ficha_tecnica", label: "Ficha técnica" },
  { value: "catalogo",      label: "Catálogo" },
  { value: "circular",      label: "Circular" },
  { value: "consulta",      label: "Consulta" },
  { value: "correo",        label: "Correo" },
  { value: "otro",          label: "Otro" },
];

interface FileItem {
  file: File;
  type: DocumentType;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  id?: string;
}

export function DocumentUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({
        file: f,
        type: "otro" as DocumentType,
        status: "pending" as const,
      })),
    ]);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function updateType(index: number, type: DocumentType) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, type } : f)));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;

      // Update status to uploading
      setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f));

      const item = files[i];
      const ext = item.file.name.split(".").pop() ?? "bin";
      const path = `${projectId}/${Date.now()}-${item.file.name.replace(/\s+/g, "_")}`;

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("bep-documents")
        .upload(path, item.file, { upsert: false });

      if (storageError) {
        setFiles((prev) => prev.map((f, idx) =>
          idx === i ? { ...f, status: "error", error: storageError.message } : f
        ));
        continue;
      }

      // 2. Create document record
      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          project_id: projectId,
          name: item.file.name,
          type: item.type,
          mime_type: item.file.type || "application/octet-stream",
          storage_path: path,
          size_bytes: item.file.size,
          status: "pending",
          uploaded_by: user.id,
        })
        .select("id")
        .single();

      if (dbError) {
        setFiles((prev) => prev.map((f, idx) =>
          idx === i ? { ...f, status: "error", error: dbError.message } : f
        ));
        continue;
      }

      // 3. Trigger AI processing (fire and forget)
      fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, projectId }),
      }).catch(() => {}); // Background — don't block UI

      setFiles((prev) => prev.map((f, idx) =>
        idx === i ? { ...f, status: "done", id: doc.id } : f
      ));
    }

    setUploading(false);

    // If all done, redirect after short delay
    const allDone = files.every((f) => f.status === "done");
    if (allDone) {
      setTimeout(() => router.push(`/projects/${projectId}/documents`), 1200);
    }
  }

  const pending = files.filter((f) => f.status === "pending").length;
  const done = files.filter((f) => f.status === "done").length;
  const hasErrors = files.some((f) => f.status === "error");

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-brand-400 bg-brand-50"
            : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
        }`}
      >
        <Upload size={32} className={`mx-auto mb-3 ${dragging ? "text-brand-500" : "text-gray-300"}`} />
        <p className="font-medium text-gray-700 text-sm mb-1">
          {dragging ? "Soltá los archivos acá" : "Arrastrá archivos o hacé clic para seleccionar"}
        </p>
        <p className="text-xs text-gray-400">PDF, DOCX, XLSX, DWG, IFC, ZIP, imágenes, MSG…</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInput}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.rvt,.ifc,.zip,.msg,.png,.jpg,.jpeg,.gif,.mp4,.eml"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.status === "done"  ? "border-green-200 bg-green-50" :
                item.status === "error" ? "border-red-200 bg-red-50" :
                "border-gray-200 bg-white"
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {item.status === "uploading" && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                {item.status === "done"      && <CheckCircle2 size={16} className="text-green-500" />}
                {item.status === "error"     && <AlertCircle size={16} className="text-red-500" />}
                {item.status === "pending"   && <File size={16} className="text-gray-400" />}
              </div>

              {/* Name + size */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(item.file.size)}</p>
                {item.error && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
              </div>

              {/* Type selector */}
              {item.status === "pending" && (
                <select
                  value={item.type}
                  onChange={(e) => updateType(i, e.target.value as DocumentType)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}

              {/* Remove */}
              {item.status === "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pending > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bep-btn-primary w-full justify-center"
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Subiendo {done + 1} de {files.length}...
            </>
          ) : (
            <>
              <Upload size={15} />
              Subir {pending} archivo{pending !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}

      {done > 0 && !uploading && (
        <p className="text-sm text-green-700 text-center">
          ✓ {done} archivo{done !== 1 ? "s" : ""} subido{done !== 1 ? "s" : ""} · procesamiento IA en curso…
        </p>
      )}
    </div>
  );
}
