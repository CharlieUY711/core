import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export function useAdminOrders(limit = 200, isAdmin = false) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const query = supabase
      .from('admin_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isAdmin) query.eq('user_id', user.id);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [isAdmin]);

  return { orders, loading, error, refetch: fetch };
}
