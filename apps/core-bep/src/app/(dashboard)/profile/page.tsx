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

  return (
    <ProfileClient
      userId={session.user.id}
      userEmail={session.user.email ?? ""}
      userName={session.user.user_metadata?.full_name ?? session.user.user_metadata?.nombre ?? ""}
      userRole={session.user.user_metadata?.role ?? "usuario"}
    />
  );
}
