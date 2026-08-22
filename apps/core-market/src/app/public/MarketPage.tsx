// ═══════════════════════════════════════════════════════════
// CORE Market — MarketPage.tsx
// Página principal del marketplace
// ═══════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { useProductos } from '../hooks/useProductos';
import { agregarAlCarrito, getCarrito } from '../services/carritoApi'; // re-export → app/services/carritoApi
import { Navbar } from './Navbar';
import { FilterBar } from './FilterBar';
import { MarketCard } from './MarketCard';
import { SlideCard } from './SHCard';
import { LoginModal } from './LoginModal';
import CarritoModule from '@core/commerce';
import '../../styles/core-storefront.css';

// ── Types ─────────────────────────────────────────────────
export interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b: string | null; bt: string;
  desc: string; r: number; rv: number; q: string;
  uid?: string; gourmet?: boolean;
  vids?: string[];
  publishedDate?: string;
  sellerName?: string;
}
export interface ShProduct {
  id: number; img: string; d: string; n: string;
  p: string; og: string; c: number;
  desc: string; r: number; rv: number; q: string;
  uid?: string;
  vids?: string[];
  publishedDate?: string;
}
export interface CartItem {
  id: number; img: string; n: string; p: string; pNum: number; m: 'mkt' | 'sh';
}

// ── Helpers ───────────────────────────────────────────────
const parsePrice = (p: string) => parseInt(p.replace(/[\$\.]/g, ''), 10);
const fmtNum = (n: number) => '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ── Tokens de layout ──────────────────────────────────────
const NAVBAR_HEIGHT = 104; // px — altura total del navbar (topbar 60 + separador 2 + menu 40)

// ── Componente principal ──────────────────────────────────
export default function MarketPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Plataforma: Market / Second
  const [mode, setMode] = useState<'mkt' | 'sh'>('mkt');
  const isSH = mode === 'sh';
  const platColor = isSH ? '#2E7D57' : '#3D5689';
  const platColorHover = isSH ? '#2A7350' : '#46639B';

  // Usuario
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  useEffect(() => {
    if (searchParams.get('login') === 'true') setShowLoginModal(true);
  }, [searchParams]);

  // Carrito
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const isInCartFn = (id: number, m: 'mkt' | 'sh') =>
    cartItems.some(item => item.id === id && item.m === m);

  const addToCart = useCallback(async (p: MktProduct | ShProduct, m: 'mkt' | 'sh') => {
    try {
      const pNum = parsePrice((p as any).p);
      const item: CartItem = { id: p.id, img: p.img, n: p.n, p: (p as any).p, pNum, m };
      setCartItems(prev => {
        const exists = prev.find(i => i.id === p.id && i.m === m);
        return exists ? prev : [...prev, item];
      });
      // Se persiste siempre, con o sin sesion: carritoApi identifica al
      // comprador por la cookie `core_cart_session`, que existe justamente
      // para carritos anonimos. Antes esto estaba detras de un
      // `if (session?.user)` y el carrito de un visitante solo vivia en
      // estado local, asi que se perdia al recargar.
      await agregarAlCarrito(
        (p as any).uid ?? String(p.id),
        m === 'sh' ? 'secondhand' : 'market',
        1,
        pNum,
      );
    } catch (err) {
      console.error('Error al agregar al carrito:', err);
    }
  }, []);

  // Flash de modo
  const [flash, setFlash] = useState(false);
  const [flashText, setFlashText] = useState('MARKET');
  const [flashKey, setFlashKey] = useState(0);

  const setPlatform = useCallback((p: 'mkt' | 'sh', silent = false) => {
    if (!silent) { setFlash(true); setFlashKey(k => k + 1); }
    setTimeout(() => {
      setMode(p);
      setFlashText(p === 'sh' ? 'SECOND' : 'MARKET');
      if (!silent) setTimeout(() => setFlash(false), 500);
    }, silent ? 0 : 200);
  }, []);

  // Búsqueda
  const [searchValue, setSearchValue] = useState('');

  // Productos
  const {
    productosMarket: apiMP,
    productosSecondHand: apiSH,
    deptColors: apiDeptColors,
    loading: productosLoading,
  } = useProductos();

  const MP = (apiMP || []) as unknown as MktProduct[];
  const SH = (apiSH || []) as unknown as ShProduct[];
  const DEPT_COLORS_FINAL = apiDeptColors || {};

  // Filtrar por búsqueda
  // Hidratar desde la base al montar. Sin esto el contador arranca en cero
  // aunque el carrito tenga items, y la pagina /carrito muestra cosas que el
  // navbar dice que no existen. Se espera a que los productos esten cargados
  // porque CartItem se identifica por el id numerico del storefront, no por
  // el uuid que guarda la base.
  useEffect(() => {
    if (productosLoading) return;
    let cancelado = false;
    (async () => {
      try {
        const filas = await getCarrito();
        if (cancelado || filas.length === 0) return;
        const porUid = new Map<string, { p: MktProduct | ShProduct; m: 'mkt' | 'sh' }>();
        MP.forEach(x => porUid.set(String((x as any).uid), { p: x, m: 'mkt' }));
        SH.forEach(x => porUid.set(String((x as any).uid), { p: x, m: 'sh' }));
        const items: CartItem[] = [];
        for (const f of filas) {
          const hit = porUid.get(String(f.producto_id));
          if (!hit) continue;
          items.push({
            id: hit.p.id,
            img: hit.p.img,
            n: hit.p.n,
            p: (hit.p as any).p ?? '',
            pNum: Number(f.precio_unitario) || 0,
            m: hit.m,
          });
        }
        if (!cancelado) setCartItems(items);
      } catch (err) {
        console.error('Error cargando el carrito:', err);
      }
    })();
    return () => { cancelado = true; };
  }, [productosLoading, MP, SH]);

  const baseMP = MP;
  const filteredMP = searchValue
    ? baseMP.filter(p => p.n.toLowerCase().includes(searchValue.toLowerCase()) || p.d.toLowerCase().includes(searchValue.toLowerCase()))
    : baseMP;
  const filteredSH = searchValue
    ? SH.filter(p => p.n.toLowerCase().includes(searchValue.toLowerCase()) || p.d.toLowerCase().includes(searchValue.toLowerCase()))
    : SH;

  // Second Hand expandido
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Render ──────────────────────────────────────────────
  return (
    <div data-sh={isSH ? 'true' : 'false'} style={{ minHeight: '100dvh', background: '#F0EFEA' }}>

      {/* Flash de modo */}
      <div className={`core-flash${flash ? ' show' : ''}`}>
        <div key={flashKey} className="core-fw">{flashText}</div>
      </div>

      {/* Navbar */}
      <Navbar
        platform={mode}
        onPlatform={setPlatform}
        currentUser={currentUser}
        cartCount={cartItems.length}
        onCartClick={() => setShowCart(!showCart)}
        onLoginClick={() => setShowLoginModal(true)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />

      {/* Contenido principal */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: `${NAVBAR_HEIGHT + 24}px 32px 70px`,
        boxSizing: 'border-box',
        width: '100%',
      }}>

        {/* espacio top bar ↔ filtros */}
        <div style={{ height: 20 }} />

        {/* Barra horizontal: filtros + ordenar (una línea) */}
        <FilterBar />

        {/* Grid a ancho completo: 5 fichas por fila, sin columnas laterales */}
        <div style={{ marginTop: 28 }}>
          <div style={{ minWidth: 0 }}>

            {!isSH && (
              <div className="core-grid">
                {productosLoading ? (
                  <div style={{ padding: 40, color: '#8A8678' }}>Cargando...</div>
                ) : (
                  filteredMP.map(p => (
                    <MarketCard
                      key={p.id}
                      p={p}
                      context={(p as any).gourmet ? 'gourmet' : 'market'}
                      onAdd={() => addToCart(p, 'mkt')}
                      isInCart={isInCartFn(p.id, 'mkt')}
                    />
                  ))
                )}
              </div>
            )}

            {isSH && (
              <div className="core-grid">
                {productosLoading ? (
                  <div style={{ padding: 40, color: '#8A8678' }}>Cargando...</div>
                ) : (
                  filteredSH.map((p, i) => {
                    const isOpen = expandedId === p.id;
                    const dir = i % 2 === 0 ? 'right' : 'left';
                    return (
                      <SlideCard
                        key={p.id}
                        p={p}
                        isOpen={isOpen}
                        dir={dir}
                        onToggle={() => setExpandedId(isOpen ? null : p.id)}
                        onAdd={() => addToCart(p, 'sh')}
                        deptColors={DEPT_COLORS_FINAL}
                        cartItems={cartItems}
                        isInCart={isInCartFn(p.id, 'sh')}
                      />
                    );
                  })
                )}
              </div>
            )}

            {/* Paginación */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40 }}>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: '#fff', border: '1px solid #E4E1D8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8678', cursor: 'pointer' }}>‹</span>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: '#3D5689', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: '#fff', border: '1px solid #E4E1D8', color: '#34322C', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>2</span>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: '#fff', border: '1px solid #E4E1D8', color: '#34322C', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>3</span>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: '#fff', border: '1px solid #E4E1D8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8678', cursor: 'pointer' }}>›</span>
            </div>

          </div>
        </div>

      </main>

      {/* Modal de login */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Carrito Modal */}
{showCart && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "flex-end",
    }}
  >
    {/* Overlay */}
    <div
      onClick={() => setShowCart(false)}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
      }}
    />

    {/* Panel */}
    <div
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 480,
        height: "100dvh",
        background: "#fff",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
        overflowY: "auto",
        animation: "slideInRight 0.25s ease",
        ["--c-primary" as any]: platColor,
        ["--c-primary-hover" as any]: platColorHover,
        ["--c-accent" as any]: platColor,
        ["--c-on-primary" as any]: "#ffffff",
        ["--brand-madre" as any]: platColor,
        ["--brand-primary" as any]: platColor,
        ["--accent" as any]: platColor,
      }}
    >
      <CarritoModule
        mode="embed"
        apiUrl={import.meta.env.VITE_API_URL}
        onClose={() => setShowCart(false)}
      />
    </div>
  </div>
)}   {/* ← CIERRE DEL showCart */}

    </div>  

  );  {/* ← CIERRE DEL RETURN */}
}

