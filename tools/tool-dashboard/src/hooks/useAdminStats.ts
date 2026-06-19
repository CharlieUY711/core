import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useAdminStats() {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    supabase.from("admin_stats").select("*").single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setStats(data);
        setLoading(false);
      });
  }, []);

  return { stats, loading, error };
}




