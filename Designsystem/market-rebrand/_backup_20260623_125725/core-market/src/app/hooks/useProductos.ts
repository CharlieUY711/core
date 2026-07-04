/* =====================================================
   Hook para cargar productos desde la API
   Charlie Marketplace Builder v1.5
   ===================================================== */
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';
import { supabase } from '../../utils/supabase/client';
import { 
  fetchProductosMarket, 
  fetchProductosSecondHand,
  type ProductoMarket,
  type ProductoSecondHand 
} from '../services/productosApi';
import { fetchDepartamentos, type Departamento } from '../services/departamentosApi';

// Tipos del componente (compatibilidad)
export interface MktProduct {
  id: number;
  img: string;
  d: string;
  n: string;
  p: string;
  o: string | null;
  b: string | null;
  bt: string;
  desc: string;
  r: number;
  rv: number;
  q: string;
  vids?: string[];
  publishedDate?: string;
}

export interface ShProduct {
  id: number;
  img: string;
  d: string;
  n: string;
  p: string;
  og: string;
  c: number;
  desc: string;
  r: number;
  rv: number;
  q: string;
  vids?: string[];
  publishedDate?: string;
}

// Transformar ProductoMarket a MktProduct
function transformMarketProduct(p: ProductoMarket, deptColors: Record<string, string>): MktProduct {
  const precio = p.precio ? p.precio.toLocaleString('es-UY') : '0';
  const precioOriginal = p.precio_original ? p.precio_original.toLocaleString('es-UY') : null;
  const descuento = precioOriginal && p.precio_original && p.precio
    ? Math.round(((p.precio_original - p.precio) / p.precio_original) * 100)
    : null;
  const badge = descuento ? `-${descuento}%` : p.badge || null;
  
  return {
    id: parseInt(p.id.replace(/-/g, '').substring(0, 8), 16) || Math.random() * 1000000, // Convertir UUID a número
    img: p.imagen_principal || '',
    d: p.departamento_nombre || p.departamento?.nombre || 'Sin categoría',
    n: p.nombre,
    p: precio,
    o: precioOriginal,
    b: badge,
    bt: p.badge_color || '',
    desc: p.descripcion || '',
    r: p.rating || 0,
    rv: p.rating_count || 0,
    q: '', // Se cargará desde preguntas
    vids: (p.videos || []).map((v: any) => typeof v === 'string' ? v : v?.url).filter(Boolean),
    publishedDate: p.published_date ? new Date(p.published_date).toLocaleDateString('es-UY') : undefined,
  };
}

// Transformar ProductoSecondHand a ShProduct
function transformSecondHandProduct(p: ProductoSecondHand, deptColors: Record<string, string>): ShProduct {
  const precio = p.precio ? p.precio.toLocaleString('es-UY') : '0';
  const precioOriginal = p.precio_original ? p.precio_original.toLocaleString('es-UY') : '';
  const condicionMap: Record<string, number> = {
    'Excelente': 5,
    'Muy bueno': 4,
    'Bueno': 3,
    'Regular': 2,
    'Aceptable': 1,
  };
  
  return {
    id: parseInt(p.id.replace(/-/g, '').substring(0, 8), 16) || Math.random() * 1000000,
    img: p.imagen_principal || '',
    d: p.departamento_nombre || p.departamento?.nombre || 'Sin categoría',
    n: `${p.nombre}${p.condicion ? ` · ${p.condicion}` : ''}`,
    p: precio,
    og: precioOriginal,
    c: p.condicion ? condicionMap[p.condicion] || 3 : 3,
    desc: p.descripcion || '',
    r: p.rating || 0,
    rv: p.rating_count || 0,
    q: '',
    vids: (p.videos || []).map((v: any) => typeof v === 'string' ? v : v?.url).filter(Boolean),
    publishedDate: p.published_date ? new Date(p.published_date).toLocaleDateString('es-UY') : undefined,
  };
}

export function useProductos() {
  const [productosMarket, setProductosMarket] = useState<MktProduct[]>([]);
  const [productosSecondHand, setProductosSecondHand] = useState<ShProduct[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [deptColors, setDeptColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Cargar departamentos primero
        const depts = await fetchDepartamentos(true);
        setDepartamentos(depts);
        
        // Crear mapa de colores de departamentos
        const colors: Record<string, string> = {};
        depts.forEach(dept => {
          colors[dept.nombre] = dept.color || '#C8C4BE';
        });
        setDeptColors(colors);

        // Cargar desde articulos (tabla canónica)
        const { data: artData } = await supabase
          .from('articulos')
          .select('*')
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('ranking_score', { ascending: false })
          .limit(100);

        const arts = artData || [];
        const artMarket = arts.filter((a: any) => a.tipo === 'market');
        const artSecondHand = arts.filter((a: any) => a.tipo === 'secondhand');

        // Transformar articulos a formato del storefront
        const toMkt = (a: any): MktProduct => {
          const precio = a.precio ? Number(a.precio).toLocaleString('es-UY') : '0';
          const precioOrig = a.precio_original ? Number(a.precio_original).toLocaleString('es-UY') : null;
          const desc = a.precio_original && a.precio_original > a.precio
            ? Math.round((1 - a.precio / a.precio_original) * 100) : null;
          return {
            id: parseInt(a.id.replace(/-/g,'').substring(0,8), 16) || Math.random()*1000000,
            img: a.imagen_principal || (a.imagenes?.[0]?.url) || '',
            d: a.departamento_nombre || 'Sin categoría',
            n: a.nombre,
            p: precio,
            o: precioOrig,
            b: desc ? ("-" + desc + "%") : null,
            bt: '',
            desc: a.descripcion || '',
            r: a.rating_promedio || 0,
            rv: a.rating_count || 0,
            q: '',
            vids: (a.videos || []).map((v: any) => typeof v === 'string' ? v : v?.url).filter(Boolean),
            publishedDate: a.published_at ? new Date(a.published_at).toLocaleDateString('es-UY') : undefined,
          };
        };

        const toSh = (a: any): ShProduct => {
          const condMap: Record<string,number> = { 'Excelente':5,'Muy bueno':4,'Bueno':3,'Regular':2,'Para reparar':1 };
          return {
            id: parseInt(a.id.replace(/-/g,'').substring(0,8), 16) || Math.random()*1000000,
            img: a.imagen_principal || (a.imagenes?.[0]?.url) || '',
            d: a.departamento_nombre || 'Sin categoría',
            n: a.nombre + (a.condicion ? ' · ' + a.condicion : ''),
            og: a.precio_original ? Number(a.precio_original).toLocaleString('es-UY') : '',
            c: a.condicion ? condMap[a.condicion] || 3 : 3,
            desc: a.descripcion || '',
            r: a.rating_promedio || 0,
            rv: a.rating_count || 0,
            q: '',
            vids: (a.videos || []).map((v: any) => typeof v === 'string' ? v : v?.url).filter(Boolean),
            publishedDate: a.published_at ? new Date(a.published_at).toLocaleDateString('es-UY') : undefined,
          };
        };

        // Cargar también desde tablas legacy (mientras existan)
        const [marketResult, secondhandResult] = await Promise.allSettled([
          fetchProductosMarket({ estado: 'activo', limit: 100 }),
          fetchProductosSecondHand({ estado: 'activo', limit: 100 }),
        ]);
        const market = marketResult.status === 'fulfilled' ? marketResult.value : [];
        const secondhand = secondhandResult.status === 'fulfilled' ? secondhandResult.value : [];

        // Combinar: articulos primero (tienen ranking), luego legacy
        setProductosMarket([...artMarket.map(toMkt), ...market.map(p => transformMarketProduct(p, colors))]);
        setProductosSecondHand([...artSecondHand.map(toSh), ...secondhand.map(p => transformSecondHandProduct(p, colors))]);

      } catch (err) {
        console.error('Error cargando productos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        // Mantener arrays vacíos en caso de error
        setProductosMarket([]);
        setProductosSecondHand([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return {
    productosMarket,
    productosSecondHand,
    departamentos,
    deptColors,
    loading,
    error,
  };
}







