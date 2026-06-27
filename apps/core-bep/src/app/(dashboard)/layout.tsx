/**
 * apps/core-bep/src/app/(dashboard)/layout.tsx
 *
 * Replacement for the original DashboardLayout.
 * - Server Component: fetches user session + org from BEP Supabase
 * - Delegates client interactivity (signOut, active nav) to DashboardShellClient
 * - Auth guard: redirects to /login if no session
 *
 * Supabase client used here: BEP instance (NEXT_PUBLIC_BEP_SUPABASE_URL)
 * NOT @core/auth — that client points to the CORE Supabase.
 */

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ShellUser, ShellOrg } from "@core/shell";
import { DashboardShellClient } from "@/components/layout/DashboardShellClient";

// ---------------------------------------------------------------------------
// BEP Supabase server client (reads cookies, no route handler needed)
// ---------------------------------------------------------------------------
function createBepServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_BEP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Org query — matches the SQL in the task brief
// ---------------------------------------------------------------------------
async function fetchOrg(supabase: ReturnType<typeof createBepServerClient>, userId: string): Promise<ShellOrg | undefined> {
  const { data, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      logo_url,
      workspaces!inner (
        projects!inner (
          project_members!inner ( user_id )
        )
      )
    `)
    .eq("workspaces.projects.project_members.user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

  return {
    id: data.id as string,
    name: data.name as string,
    logoUrl: (data.logo_url as string | null) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createBepServerClient();

  // ── Auth guard ──────────────────────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { user: supaUser } = session;

  // ── Resolve ShellUser ───────────────────────────────────────────────────
  const shellUser: ShellUser = {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name:
      (supaUser.user_metadata?.full_name as string | undefined) ??
      (supaUser.user_metadata?.name as string | undefined) ??
      undefined,
    avatarUrl:
      (supaUser.user_metadata?.avatar_url as string | undefined) ?? undefined,
    role:
      (supaUser.user_metadata?.role as string | undefined) ?? undefined,
  };

  // ── Resolve ShellOrg ────────────────────────────────────────────────────
  const org = await fetchOrg(supabase, supaUser.id);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <DashboardShellClient user={shellUser} org={org}>
      {children}
    </DashboardShellClient>
  );
}
