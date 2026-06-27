import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DocumentUploader } from "@/components/bep/document-uploader";

export const metadata = { title: "Subir documentos" };

export default async function UploadPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, code")
    .eq("id", params.id)
    .single();

  return (
    <div className="max-w-2xl">
      <Link
        href={`/projects/${params.id}/documents`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} /> Documentos
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Subir documentos</h1>
      <p className="text-sm text-gray-500 mb-6">
        {project?.code} — {project?.name}
      </p>

      <div className="bep-card p-6">
        <DocumentUploader projectId={params.id} />
      </div>

      <div className="mt-4 bep-card p-4 bg-brand-50 border-brand-100">
        <p className="text-sm font-medium text-brand-800 mb-1">✨ Procesamiento automático con IA</p>
        <p className="text-sm text-brand-700">
          Cada documento subido será procesado automáticamente: extracción de texto, clasificación por disciplina,
          detección de fabricantes, normas y cantidades, indexación para búsqueda semántica, y vinculación
          con otros documentos del proyecto.
        </p>
      </div>
    </div>
  );
}
