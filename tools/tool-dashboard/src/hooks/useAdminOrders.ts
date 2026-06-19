import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useAdminOrders(limit = 50, isAdmin = false) {
  const [orders,  setOrders]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("ordenes")
      .select("id, created_at, total_uyu, total_usd, moneda, estado, payment_status, source, mp_payment_id, paypal_order_id, user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!isAdmin) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) setError(error.message);
    else setOrders(data || []);
    setLoading(false);
  }, [limit, isAdmin]);

  useEffect(() => { refetch(); }, [refetch]);
  return { orders, loading, error, refetch };
}




