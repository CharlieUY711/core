import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export function useAdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_products').select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setProducts(data || []);
    setLoading(false);
  }, []);

  const pauseProduct = async (id: string) => {
    await supabase.rpc('admin_pause_product', { p_product_id: id });
    await refetch();
  };

  const fixStock = async (id: string, stock: number) => {
    await supabase.rpc('admin_fix_stock', { p_product_id: id, p_new_stock: stock });
    await refetch();
  };

  useEffect(() => { refetch(); }, []);
  return { products, loading, error, refetch, pauseProduct, fixStock };
}
