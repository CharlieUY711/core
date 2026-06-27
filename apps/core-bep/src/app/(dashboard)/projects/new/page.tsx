import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewProjectForm } from "@/components/bep/new-project-form";

export const metadata = { title: "Nuevo proyecto" };

export default async function NewProjectPage() {
  const supabase = createClient();

  // Load workspaces + orgs for the selector
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, organizations ( id, name )")
    .order("name");

  return (
    <div className="max-w-2xl">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} /> Proyectos
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Nuevo proyecto</h1>

      <div className="bep-card p-6">
        <NewProjectForm workspaces={workspaces ?? []} />
      </div>
    </div>
  );
}
