import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ProfileClient from "./ProfileClient";

function createBepServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_BEP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
}

export default async function ProfilePage() {
  const supabase = createBepServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, entity, department, phone, avatar_url")
    .eq("id", userId)
    .single();

  // Fetch projects the user is a member of
  const { data: memberships } = await supabase
    .from("project_members")
    .select("role, projects(id, name, code, status)")
    .eq("user_id", userId);

  const projects = (memberships ?? []).map((m: any) => ({
    id:     m.projects?.id     ?? "",
    name:   m.projects?.name   ?? "",
    code:   m.projects?.code   ?? "",
    status: m.projects?.status ?? "active",
    role:   m.role             ?? "",
  })).filter(p => p.id);

  return (
    <ProfileClient
      userId={userId}
      userEmail={session.user.email ?? ""}
      initialProfile={profile ?? {}}
      projects={projects}
    />
  );
}
