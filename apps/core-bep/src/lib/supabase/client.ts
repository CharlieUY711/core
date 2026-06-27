"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@core/bep-supabase/bep/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_BEP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY!
  );
}
