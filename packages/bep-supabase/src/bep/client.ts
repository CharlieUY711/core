import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const BEP_URL = process.env.NEXT_PUBLIC_BEP_SUPABASE_URL!;
const BEP_ANON = process.env.NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY!;

/** Browser / client-side Supabase client for BEP */
export function createBepBrowserClient() {
  return createClient<Database>(BEP_URL, BEP_ANON);
}

/** Server-side Supabase client for BEP (service role — never expose to browser) */
export function createBepServerClient() {
  const serviceKey = process.env.BEP_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("BEP_SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(BEP_URL, serviceKey, {
    auth: { persistSession: false },
  });
}
