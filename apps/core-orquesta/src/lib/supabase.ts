import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@core/bep-supabase/bep/types'

export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_BEP_SUPABASE_URL,
  import.meta.env.VITE_BEP_SUPABASE_ANON_KEY
)
