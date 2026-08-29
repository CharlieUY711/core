import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabase/client";

export type MediaTipo      = "imagen" | "video" | "documento";
export type MediaCategoria = "articulo" | "documento" | "producto" | "venta" | "otro";

export interface MediaItem {
  id:            string;
  bucket:        string;
  path:          string;
  tipo:          MediaTipo;
  nombre:        string;
  size_bytes:    number;
  width?:        number;
  height?:       number;
  duracion_seg?: number;
  thumbnail_path?: string;
  categoria:     MediaCategoria;
  etiquetas:     string[];
  venta_id?:     string;
  status:        "uploading" | "ready" | "failed";
  created_at:    string;
  url?:          string;
}

export interface MediaFilter {
  tipo?:      MediaTipo | "all";
  categoria?: MediaCategoria | "all";
  search?:    string;
  venta_id?:  string;
}

export function useMediaLibrary(filter: MediaFilter = {}) {
  const [items,   setItems]   = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const getUrl = (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const getThumb = (item: MediaItem): string => {
    if (item.tipo === "documento") return "";
    if (item.tipo === "video") {
      return item.thumbnail_path ? getUrl("biblioteca", item.thumbnail_path) : "";
    }
    return `${getUrl(item.bucket, item.path)}?width=200&height=200&resize=cover`;
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) throw new Error("No autenticado");

      let q = supabase
        .from("media_library")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false });

      if (filter.tipo && filter.tipo !== "all")           q = q.eq("tipo", filter.tipo);
      if (filter.categoria && filter.categoria !== "all") q = q.eq("categoria", filter.categoria);
      if (filter.venta_id)                                q = q.eq("venta_id", filter.venta_id);

      const { data, error: dbErr } = await q;
      if (dbErr) throw dbErr;

      let results: MediaItem[] = (data || []).map(item => ({
        ...item,
        url: getUrl(item.bucket, item.path),
      }));

      // Filtro por search (nombre + etiquetas) en cliente
      if (filter.search?.trim()) {
        const s = filter.search.toLowerCase();
        results = results.filter(i =>
          i.nombre.toLowerCase().includes(s) ||
          (i.etiquetas || []).some(t => t.toLowerCase().includes(s))
        );
      }

      setItems(results.map(i => ({ ...i, thumbUrl: getThumb(i) } as any)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter.tipo, filter.categoria, filter.search, filter.venta_id]);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (item: MediaItem) => {
    await supabase.storage.from(item.bucket).remove([item.path]);
    if (item.thumbnail_path) await supabase.storage.from("biblioteca").remove([item.thumbnail_path]);
    await supabase.from("media_library").delete().eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const stats = {
    total:      items.length,
    imagenes:   items.filter(i => i.tipo === "imagen").length,
    videos:     items.filter(i => i.tipo === "video").length,
    documentos: items.filter(i => i.tipo === "documento").length,
    totalBytes: items.reduce((s, i) => s + (i.size_bytes || 0), 0),
  };

  return { items, loading, error, reload: load, deleteItem, stats };
}



