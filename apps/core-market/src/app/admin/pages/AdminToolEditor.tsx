/**
 * CORE Editor.
 *
 * El editor se monta directo, sin dropzone intermedia: ToolEditor ya tiene su
 * propio arrastrar y soltar adentro.
 *
 * UNA SOLA BARRA
 * El editor traía la suya, azul, con quince controles y su propio nombre.
 * Arriba la del panel, abajo la del editor: dos filas de botones, dos
 * criterios, y el nombre repetido porque ya está en la barra de arriba.
 *
 * Se reparte por lo que la acción TOCA:
 *   - El ARCHIVO —abrir, subir, guardar, descargar, nuevo, IA— va acá, al
 *     MenuBar, que es donde están las acciones en todas las vistas.
 *   - La IMAGEN —deshacer, rehacer, rotar, espejar, aplicar— se queda en el
 *     editor, al lado de las herramientas: es donde ya está la mano.
 *
 * El puente son dos props. `onApi` entrega las acciones UNA vez, en un objeto
 * que se muta en vez de reemplazarse: entregar funciones nuevas en cada dibujo
 * volvería a dibujar el panel, y el panel al editor, sin parar. Lo que cambia
 * —si se puede deshacer, qué archivo hay— viaja aparte como datos sueltos, que
 * es lo único que debe disparar un dibujo nuevo.
 *
 * EL BUSCADOR BUSCA EN LA BIBLIOTECA
 * Acá no hay una lista que acotar —hay una imagen—, pero sí hay algo que
 * buscar: cuál abrir. Escribir y apretar Enter abre la Biblioteca ya filtrada,
 * que es el mismo gesto que "Abrir desde Biblioteca" pero sin mirar dos veces.
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "../../../utils/supabase/client";
import ToolEditor from "../../../lib/tool-editor/src/components/ToolEditor";
import { Pantalla, usePantalla } from "../components/Pantalla";
import { ItemDeBarra } from "../components/BarraDeAcciones";
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

/** Lo que el editor puede hacer con el archivo. Lo entrega una sola vez. */
interface ApiDelEditor {
  abrir?: () => void;
  subir?: () => void;
  guardar?: () => void;
  descargar?: () => void;
  nuevo?: () => void;
}

/** Lo que cambia mientras se edita. Esto sí redibuja la barra. */
interface EstadoDelEditor {
  canUndo: boolean;
  canRedo: boolean;
  archivo: string;
}

export default function AdminToolEditor() {
  const p = usePantalla();
  const [busca, setBusca] = useState("");
  const api = useRef<ApiDelEditor>({});
  const [estado, setEstado] = useState<EstadoDelEditor>(
    { canUndo: false, canRedo: false, archivo: "" });
  const recibirApi = useCallback((a: ApiDelEditor) => { api.current = a; }, []);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ state: "idle", message: "" });
  const [aiEnabled, setAiEnabled]       = useState(false);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [incomingImage, setIncoming]    = useState<{ url: string; name: string; key: number } | null>(null);

  const handleExport = useCallback(async (blob: Blob, format: string) => {
    setUploadStatus({ state: "uploading", message: "Subiendo imagen editada…" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
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

  /* Lo que hace el Editor y no es crear, editar, grabar ni borrar una fila:
     va a la izquierda de las cuatro, en el mismo lugar que en todas. Y está
     siempre, apagado cuando no corresponde. */
  /* Las que necesitan una imagen cargada se APAGAN, no desaparecen: un botón
     que se va se busca donde ya no está. El motivo va en el tooltip. */
  const hayImagen = !!estado.archivo;
  const sinImagen = "Cargá una imagen primero";

  const acciones: ItemDeBarra[] = [
    { label: "Abrir", destacado: true, color: "var(--brand-madre)",
      title: "Abrir desde la Biblioteca",
      onClick: () => setPickerOpen(true) },
    { label: "Subir", color: "var(--brand-navy)",
      title: "Subir un archivo del equipo",
      onClick: () => api.current.subir?.() },

    "separador",

    { label: "Guardar", color: "var(--brand-madre)",
      desactivada: !hayImagen, motivo: sinImagen,
      title: "Guardar en la Biblioteca",
      onClick: () => api.current.guardar?.() },
    { label: "Descargar", desactivada: !hayImagen, motivo: sinImagen,
      title: "Bajar la imagen al equipo",
      onClick: () => api.current.descargar?.() },

    "separador",

    { label: "Nuevo", desactivada: !hayImagen, motivo: sinImagen,
      title: "Descarta lo que hay y empieza de cero",
      onClick: () => api.current.nuevo?.() },
    { label: aiEnabled ? "IA encendida" : "IA apagada",
      activa: aiEnabled, color: "var(--brand-navy)",
      title: "Quitar el fondo usa IA y tarda: se prende sólo cuando hace falta",
      onClick: () => setAiEnabled(v => !v) },
  ];

  return (
    /* La barra, el aviso, el error y el ancho los define `Pantalla`. */
    <Pantalla p={p}
      extra={acciones}
      /* Buscar acá es buscar QUÉ ABRIR. Enter abre la Biblioteca con lo
         escrito ya aplicado. */
      buscador={{ valor: busca, onCambio: setBusca,
        placeholder: "Buscar una imagen en la Biblioteca",
        onAceptar: () => setPickerOpen(true) }}
      error={uploadStatus.state === "error" ? uploadStatus.message : null}
      aviso={uploadStatus.state === "uploading" || uploadStatus.state === "done" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          padding: "0.45rem 0.7rem", borderRadius: 8, fontSize: "0.75rem",
          fontWeight: 600,
          background: uploadStatus.state === "done" ? "#F0FDF4" : "rgba(26,79,156,.08)",
          color: uploadStatus.state === "done" ? "#166534" : "#1A4F9C" }}>
          <span>{uploadStatus.state === "done" ? "\u2713" : "\u23F3"}</span>
          <span>{uploadStatus.message}</span>
          {uploadStatus.url && uploadStatus.state === "done" && (
            <a href={uploadStatus.url} target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#1A4F9C",
                fontWeight: 700, textDecoration: "none" }}>
              Ver imagen \u2192
            </a>
          )}
        </div>
      ) : null}>

      {/* El editor. El alto se lo da su propio contenido: adentro de `main`,
          que ya desplaza, forzarlo a `100%` no le daba ningun alto. */}
      <div style={{ overflow: "hidden", borderRadius: 12,
        fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif",
        background: "#F2F5FA" }}>
        <ToolEditor
          onApi={recibirApi}
          onEstado={setEstado}
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
                busca={busca}
                onSelect={handlePickFromLibrary} selectedIds={[]} />
            </div>
          </div>
        </div>
      )}
    </Pantalla>
  );
}
