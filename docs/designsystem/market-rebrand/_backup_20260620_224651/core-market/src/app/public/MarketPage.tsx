// ═══════════════════════════════════════════════════════════
// CORE Market — MarketPage.tsx
// Página principal del marketplace
// ═══════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { useProductos } from '../hooks/useProductos';
import { agregarAlCarrito } from '../services/carritoApi'; // re-export → app/services/carritoApi
import { Navbar } from './Navbar';
import { FiltersSidebar } from './FiltersSidebar';
import { FlipCard } from './ProductCard';
import { SlideCard } from './SHCard';
import { LoginModal } from './LoginModal';
import CarritoModule from '@core/commerce';
import '../../styles/core-storefront.css';

// ── Types ─────────────────────────────────────────────────
export interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b: string | null; bt: string;
  desc: string; r: number; rv: number; q: string;
  vids?: string[];
  publishedDate?: string;
  sellerName?: string;
}
export interface ShProduct {
  id: number; img: string; d: string; n: string;
  p: string; og: string; c: number;
  desc: string; r: number; rv: number; q: string;
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

  // Plataforma: Market / Second / Gourmet
  const [mode, setMode] = useState<'mkt' | 'sh' | 'gourmet'>('mkt');
  const isSH = mode === 'sh';
  const isGourmet = mode === 'gourmet';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await agregarAlCarrito(String(p.id), m === 'sh' ? 'secondhand' : 'market', 1, pNum);
    } catch (err) {
      console.error('Error al agregar al carrito:', err);
    }
  }, []);

  // Flash de modo
  const [flash, setFlash] = useState(false);
  const [flashText, setFlashText] = useState('MARKET');
  const [flashKey, setFlashKey] = useState(0);

  const setPlatform = useCallback((p: 'mkt' | 'sh' | 'gourmet', silent = false) => {
    if (!silent) { setFlash(true); setFlashKey(k => k + 1); }
    setTimeout(() => {
      setMode(p);
      setFlashText(p === 'sh' ? 'SECOND' : p === 'gourmet' ? 'GOURMET' : 'MARKET');
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
  const filteredMP = searchValue
    ? MP.filter(p => p.n.toLowerCase().includes(searchValue.toLowerCase()) || p.d.toLowerCase().includes(searchValue.toLowerCase()))
    : MP;
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

        {/* Breadcrumb + título + ordenar (listado) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: '#8A8678', fontWeight: 500, marginBottom: 8 }}>Inicio <span style={{ color: '#C4C0B2' }}>›</span> {isGourmet ? 'Gourmet' : isSH ? 'Second' : 'Market'}</div>
            <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 30, color: '#1C1B19' }}>{searchValue ? `Resultados para “${searchValue}”` : isGourmet ? 'Gourmet' : isSH ? 'Second' : 'Market'}</h1>
            <div style={{ fontSize: 14, color: '#8A8678', marginTop: 6 }}>{(isSH ? filteredSH.length : filteredMP.length)} resultados</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#8A8678' }}>Ordenar por</span>
            <div style={{ height: 42, background: '#fff', border: '1px solid #E4E1D8', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#1C1B19', cursor: 'pointer' }}>Más relevantes <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8678" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></div>
          </div>
        </div>

        {/* Layout: filtros + contenido */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <FiltersSidebar />
          <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── MARKET ────────────────────────────────── */}
        {!isSH && (
          <>
            {/* Destacados */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: '#0D2B55', textTransform: 'uppercase' }}>
                Destacados
              </span>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1D9E75', cursor: 'pointer' }}>
                Ver más →
              </span>
            </div>
            <div className="core-grid">
              {productosLoading ? (
                <div style={{ padding: 40, color: '#7A7A7A', fontFamily: "Calibri, 'Segoe UI', sans-serif" }}>Cargando...</div>
              ) : (
                filteredMP.map(p => (
                  <div key={p.id} className="core-card-slot">
                    <FlipCard
                      p={p}
                      onAdd={() => addToCart(p, 'mkt')}
                      deptColors={DEPT_COLORS_FINAL}
                      cartItems={cartItems}
                      isInCart={isInCartFn(p.id, 'mkt')}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Publicaciones */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 12px' }}>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: '#0D2B55', textTransform: 'uppercase' }}>
                Publicaciones
              </span>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A4F9C', cursor: 'pointer' }}>
                Ver todas →
              </span>
            </div>
            <div className="core-grid">
              {filteredMP.map(p => (
                <div key={p.id} className="core-card-slot">
                  <FlipCard
                    p={p}
                    onAdd={() => addToCart(p, 'mkt')}
                    deptColors={DEPT_COLORS_FINAL}
                    cartItems={cartItems}
                    isInCart={isInCartFn(p.id, 'mkt')}
                  />
                </div>
              ))}
            </div>

          </>
        )}

       {/* ── SECOND HAND ───────────────────────────── */}
        {isSH && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: '#0D2B55', textTransform: 'uppercase' }}>
                Segunda Mano
              </span>
              <span style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1D9E75', cursor: 'pointer' }}>
                Ver todas →
              </span>
            </div>
            <div className="core-grid">
              {productosLoading ? (
                <div style={{ padding: 40, color: '#7A7A7A', fontFamily: "Calibri, 'Segoe UI', sans-serif" }}>Cargando...</div>
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

          </>
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

