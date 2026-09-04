/* =====================================================
   CORE Storefront — CoreStorefront.tsx
   CORE Marketplace Builder v1.5
   Frontstore principal: Market + Segunda Mano
   ===================================================== */
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '../../utils/supabase/client';
import { useProductos } from '../hooks/useProductos';
import { Navbar } from './Navbar';
import { Dots, Stars, FlipCard } from './ProductCard';
import { SlideCard } from './SHCard';
import { CrossSellBar } from './CrossSellBar';
import { LoginModal } from './LoginModal';
import { agregarAlCarrito } from '../services/carritoApi';
import '../../styles/core-storefront.css';


// ── Types ─────────────────────────────────────────────────────────────────────
interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b: string | null; bt: string;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
  sellerName?: string; // Nombre del vendedor
}
interface ShProduct {
  id: number; img: string; d: string; n: string;
  p: string; og: string; c: number;
  desc: string; r: number; rv: number; q: string; vids?: string[]; // Array de videos (máximo 5)
  publishedDate?: string;
}
interface CartItem { id: number; img: string; n: string; p: string; pNum: number; m: 'mkt' | 'sh'; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const parsePrice = (p: string) => parseInt(p.replace(/[\$\.]/g, ''), 10);
const fmtNum = (n: number) => '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const separatePrice = (price: string) => {
  if (!price) return price;
  // Eliminar puntos de los miles
  let cleanedPrice = price.replace(/\./g, '');
  // Si el precio contiene $, separarlo del valor con un espacio
  const dollarIndex = cleanedPrice.indexOf('$');
  if (dollarIndex !== -1) {
    const before = cleanedPrice.substring(0, dollarIndex).trim();
    const after = cleanedPrice.substring(dollarIndex + 1).trim();
    return <>{before ? before + ' ' : ''}$ {after}</>;
  }
  return cleanedPrice;
};

// ── Department Colors (Pastel) ──────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  'Electro': '#DDA0DD',      // Lila pastel
  'Moda': '#FFB6C1',         // Rosa pastel
  'Hogar': '#FFDAB9',        // Melocotón
  'Almacén': '#FFF8DC',      // Amarillo pastel
  'Mascotas': '#FA8072',     // Salmón
  'Motos': '#AFEEEE',        // Turquesa
  'Limpieza': '#FFE4E1',     // Melocotón claro
  'Salud': '#B0E0E6',        // Azul claro
  'Deporte': '#D8BFD8',      // Morado pastel
  'Celulares': '#F5DEB3',    // Beige
  'Ferretería': '#F0FFF0',   // Menta
  'Librería': '#FFFDD0',     // Crema
  'Bebés': '#E0B0FF',        // Malva
  'Gaming': '#E6E6FA',       // Lavanda
  'Jardín': '#FF7F50',       // Coral
  'Autos': '#DDA0DD',        // Lila pastel (repetido si necesario)
  'Belleza': '#FFB6C1',      // Rosa pastel (repetido si necesario)
  'Delivery': '#FFDAB9',     // Melocotón (repetido si necesario)
};


const COND = ['','Regular','Buen estado','Buen estado','Muy bueno','Excelente'];
const DEPTS = [
  'Electro','Moda','Hogar','Almacén','Mascotas','Motos',
  'Limpieza','Salud','Deporte','Celulares','Ferretería','Librería',
  'Bebés','Gaming','Jardín','Autos','Belleza','Delivery',
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconHome   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconGrid   = () => <svg className="core-nico" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconShield = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconSearch = () => <svg className="core-nico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconUser   = () => <svg className="core-nico" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconBag    = () => <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IconSrchSm = () => <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCart   = ({ size = 11 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartFilled = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconCartWithNumber = ({ count }: { count: number }) => {
  const fontSize = Math.min(10 + count * 0.5, 14); // Tamaño de fuente que aumenta con la cantidad, máximo 14px
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'relative' }}>
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      {count > 0 && (
        <text 
          x="12" 
          y="13.5" 
          fontSize={fontSize} 
          fill="currentColor" 
          fontWeight="normal"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ 
            fontFamily: 'Arial, sans-serif', 
            fontWeight: 'normal', 
            fontStyle: 'normal',
            pointerEvents: 'none'
          }}
        >
          {count}
        </text>
      )}
    </svg>
  );
};
const IconBell   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconPlay   = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" fill="#222" stroke="none">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
// Iconos para controles de video - aceptan color como prop
const IconPlayTriangle = ({ filled = false, color = "#fff" }: { filled?: boolean; color?: string }) => (
  <svg viewBox="0 0 12 12" width="9.6" height="9.6" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? "0" : "1.5"} strokeLinejoin="round">
    <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
  </svg>
);
const IconVolume = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconRewind = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 19 2 12 11 5 11 19"/>
    <polygon points="22 19 13 12 22 5 22 19"/>
  </svg>
);
const IconPause = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={color} stroke="none">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);
const IconForward = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 19 22 12 13 5 13 19"/>
    <polygon points="2 19 11 12 2 5 2 19"/>
  </svg>
);
const IconBack = ({ color = "#fff" }: { color?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);


async function trackEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_API_URL}/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ event_type: eventType, metadata }),

        {loading ? 'Procesando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
      </button>
    </div>
  );
}
export default function CoreStorefront() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Cargar productos desde la API
  const { productosMarket: apiMP, productosSecondHand: apiSH, deptColors: apiDeptColors, departamentos, loading: productosLoading } = useProductos();
  
  // Usar datos de API
  const MP = apiMP;
  const SH = apiSH;
  const DEPT_COLORS_FINAL = Object.keys(apiDeptColors).length > 0 ? apiDeptColors : DEPT_COLORS;
  
  const [mode,       setMode]       = useState<'mkt' | 'sh'>('mkt');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      setShowLoginModal(true);
    }
  }, [searchParams]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const [activeDept, setActiveDept] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [flash,      setFlash]      = useState(false);
  const [flashText,  setFlashText]  = useState('MARKET');
  const [flashKey,   setFlashKey]   = useState(0);
  const [showCart,   setShowCart]   = useState(false);
  const [isHeroCompact, setIsHeroCompact] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prevExpandedId, setPrevExpandedId] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(isMobile ? 100 : 110);

  // Pre-populated cart: vacío inicialmente
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [marketFontSize, setMarketFontSize] = useState(21);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{menu: string, category: string} | null>(null);

  const isSH = mode === 'sh';

  // Mapeo de opciones del menú a categorías relacionadas
;

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.core-menu-item')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdown]);

  // Ajustar el tamaño de "Market" para que tenga el mismo ancho que "CORE Market"
  useEffect(() => {
    const coreEl = document.getElementById('core-text');
    const marketEl = document.getElementById('market-text');
    if (coreEl && marketEl) {
      const oddyWidth = coreEl.offsetWidth;
      const currentMarketSize = parseFloat(window.getComputedStyle(marketEl).fontSize);
      const currentMarketWidth = marketEl.offsetWidth;
      if (currentMarketWidth > 0) {
        const newSize = (currentMarketSize * oddyWidth) / currentMarketWidth;
        setMarketFontSize(newSize);
      }
    }
  }, [isSH]);

  const addToCart = useCallback(async (p: MktProduct | ShProduct, m: 'mkt' | 'sh') => {
    try {
      // Obtener el precio numérico
      const precioNum = parsePrice(p.p);
      
      // Agregar al carrito en la API
      // Nota: Los IDs en el storefront son números, pero en la API son UUIDs
      // Por ahora mantenemos el estado local para compatibilidad
      void trackEvent('add_to_cart', { product_id: String(p.id), product_name: p.n, tipo: m });
      await agregarAlCarrito(
        String(p.id), // Convertir a string
        m === 'mkt' ? 'market' : 'secondhand',
        1,
        precioNum
      );
      
      // Actualizar estado local
      setCartItems(prev => {
        if (prev.find(i => i.id === p.id && i.m === m)) return prev;
        return [...prev, { id:p.id, img:p.img, n:p.n, p:p.p, pNum:precioNum, m }];
      });
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      // Fallback: agregar solo al estado local si falla la API
      setCartItems(prev => {
        if (prev.find(i => i.id === p.id && i.m === m)) return prev;
        return [...prev, { id:p.id, img:p.img, n:p.n, p:p.p, pNum:parsePrice(p.p), m }];
      });
    }
  }, []);

  const toggleMode = useCallback((silent = false) => {
    if (!silent) { setFlash(true); setFlashKey(k => k + 1); }
    setTimeout(() => {
      setMode(prev => {
        const next = prev === 'mkt' ? 'sh' : 'mkt';
        setFlashText(next === 'sh' ? 'SEGUNDA MANO' : 'CORE Market');
        return next;
      });
      if (!silent) setTimeout(() => setFlash(false), 500);
    }, silent ? 0 : 200);
  }, []);

  const handleExpandWrapper = (id: number) => {
    setExpandedId(prev => {
      const wasOpen = prev === id;
      const newId = wasOpen ? null : id;
      return newId;
    });
  };

  // Función para obtener categorías con más publicaciones
  const getTopCategories = (): string[] => {
    const allProducts = [...MP, ...SH];
    const categoryCounts: Record<string, number> = {};
    
    allProducts.forEach(p => {
      const dept = p.d;
      categoryCounts[dept] = (categoryCounts[dept] || 0) + 1;
    });
    
    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  };

  // Función para determinar dirección del panel (móvil: 2 columnas, desktop: 5 columnas)
  const panelDir = (idx: number): 'right' | 'left' => {
    // En móvil: columna izquierda (índices pares) → derecha, columna derecha (índices impares) → izquierda
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return idx % 2 === 0 ? 'right' : 'left';
    }
    // Desktop: comportamiento original
    return idx % 5 < 3 ? 'right' : 'left';
  };

  const cartTotal = cartItems.reduce((s, i) => s + i.pNum, 0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const greenBarRef = useRef<HTMLDivElement>(null);

  // Animación del carrusel infinito
  useEffect(() => {
    if (!carouselRef.current) return;
    
    const carousel = carouselRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // píxeles por frame
    
    // Calcular el ancho de un conjunto completo de artículos
    const itemsPerSet = isSH ? MP.length : SH.length;
    const itemWidth = 70; // ancho de cada miniatura
    const gap = 8; // gap entre items
    const setWidth = itemsPerSet * (itemWidth + gap);
    
    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Cuando llegamos al final de un conjunto, reiniciamos suavemente
      if (scrollPosition >= setWidth) {
        scrollPosition = 0;
      }
      
      carousel.scrollLeft = scrollPosition;
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isSH]);

  // Efecto de scroll para compactar el hero
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      // Compactar cuando el scroll supera los 50px
      setIsHeroCompact(scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Efecto para detectar tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular altura de la barra superior dinámicamente
  useEffect(() => {
    const calculateHeaderHeight = () => {
      const header = document.querySelector('.core-tb');
      if (header) {
        const rect = header.getBoundingClientRect();
        setHeaderHeight(rect.height);
      } else {
        setHeaderHeight(isMobile ? 100 : 110);
      }
    };
    calculateHeaderHeight();
    window.addEventListener('resize', calculateHeaderHeight);
    return () => window.removeEventListener('resize', calculateHeaderHeight);
  }, [isMobile]);

  return (
    <div data-sh={isSH ? 'true' : 'false'}>
      {/* FLASH */}
      <div className={`core-flash${flash ? ' show' : ''}`}>
        <div key={flashKey} className="core-fw">{flashText}</div>
      </div>

      {/* ── TOPBAR ── */}
      <header className="core-tb">
        
        
        {/* ── HEADER PRINCIPAL RESPONSIVE (DESKTOP) ── */}
        <div className="core-header" style={{ paddingTop: "10px" }}>
          <div className="core-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: '#fff', fontFamily: "Calibri, 'Segoe UI', sans-serif", flexShrink: 0 }}>m</div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', fontFamily: "Calibri, 'Segoe UI', sans-serif", textTransform: 'uppercase' }}>MARKET</span>
                <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 400, fontSize: '0.6rem', letterSpacing: '0.12em', fontFamily: "Calibri, 'Segoe UI', sans-serif", textTransform: 'uppercase' }}>by CORE</span>
              </div>
            </div>
            <button className="core-mode-btn" onClick={() => toggleMode()} style={{ padding: '5px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontFamily: "Calibri, 'Segoe UI', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 200ms ease', background: isSH ? '#1A4F9C' : '#1D9E75', color: '#fff', flexShrink: 0, minWidth: '80px' }}>
              {isSH ? 'MARKET' : 'SECOND'}
            </button>
          </div>
          <div className="core-search">
            <input type="text" placeholder="encontra lo que buscas" />
          </div>

          <div className="core-header-right">
            {currentUser ? (
              <Link to="/dashboard/ordenes" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px 7px 10px', borderRadius: '6px', border: 'none', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', fontFamily: "Calibri, 'Segoe UI', sans-serif", background: isSH ? '#4ECBA0' : '#1A4F9C', transition: 'background 200ms ease' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {(() => { const n = currentUser.user_metadata?.nombre || currentUser.email?.split("@")[0] || ""; const parts = n.trim().split(" "); if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1].charAt(0).toUpperCase() + "."; return parts[0].charAt(0).toUpperCase() + parts[0].slice(1); })()}
              </Link>
            ) : (
              <button className="core-login-btn" onClick={() => setShowLoginModal(true)}>Ingreso / Registro</button>
            )}
            
              <div className="core-cart" onClick={() => setShowCart(!showCart)} style={{ cursor: 'pointer', position: 'relative' }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M5 1l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 1L1 1" strokeLinecap="round"/>
              </svg>
              {cartItems.length > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '10px', color: isSH ? '#1D9E75' : '#C9A84C', fontFamily: "'Arial', sans-serif", fontWeight: 'normal', lineHeight: 1, zIndex: 10 }}>{cartItems.length}</span>}
            </div>
              
          {currentUser && (
                <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", padding: "4px" }} title="Cerrar sesión">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              )}
              </div>
        </div>

        {/* ── BARRA INFERIOR MÓVIL ── */}
        <div className="core-mobile-bottom-bar">
          <div className="core-mobile-logo-small">
            <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
              <g fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 5)">
                <path d="M 100 10 L 130 25 L 130 55 L 100 70 L 70 55 L 70 25 Z" />
                <path d="M 70 55 L 100 70 L 100 100 L 70 115 L 40 100 L 40 70 Z" />
                <path d="M 130 55 L 160 70 L 160 100 L 130 115 L 100 100 L 100 70 Z" />
              </g>
            </svg>
          </div>
          <button 
            className="core-market-btn core-mobile-market-btn" 
            onClick={() => setMode(isSH ? 'mkt' : 'sh')}
          >
            {isSH ? 'Market' : 'Second Hand'}
          </button>
          <button 
            className="core-login-btn core-mobile-login-btn-bottom" 
            onClick={() => setShowLoginModal(true)}
          >
            Ingreso / Registro
          </button>
          <div className="core-cart core-mobile-cart">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M5 1l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 1L1 1" strokeLinecap="round"/>
              <text 
                x="14" 
                y="11.5" 
                fontSize="9" 
                fill={isSH ? "#6BB87A" : "#FF6835"}
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ 
                  fontFamily: 'Times New Roman, serif', 
                  fontWeight: 'normal',
                  pointerEvents: 'none'
                }}
              >
                {cartTotal}
              </text>
            </svg>
          </div>
        </div>
        <div className="core-tbr" style={{ marginLeft: 'auto', display: 'none' }}>
          <div className="core-mpill" onClick={() => toggleMode()}>
            <div className="core-mdot" />
            <span>{isSH ? '2DA MANO' : 'MARKET'}</span>
          </div>

          {/* ── Botón Ritual ── */}
          <Link
            to="/ritual"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '20px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(184,155,85,0.35)',
              color: '#B89B55',
              fontSize: '0.68rem',
              fontWeight: '700',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'opacity 0.15s, transform 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.opacity = '0.75';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            ◆ Privilegio
          </Link>

          {/* ── Botón Admin ── */}
          <button
            onClick={() => {
              setShowLoginModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '20px',
              backgroundColor: '#FF6835',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'opacity 0.15s, transform 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.opacity = '0.85';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            Admin
          </button>

        </div>
        {/* Menú de categorías */}
        <div className="core-categories-menu">
          {(departamentos || []).map((depto) => {
            const menuItem = depto.nombre;
            const deptoCats = (depto.categorias || []).map((cat) => cat.nombre);
            const isOpen = openDropdown === menuItem;
            return (
              <div
                key={menuItem}
                className="core-menu-item"
                onMouseEnter={() => setOpenDropdown(menuItem)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <span>{menuItem}</span>

                {isOpen && deptoCats.length > 0 && (
                  <div className="core-dropdown">
                    {deptoCats.map((category) => (
                      <div
                        key={category}
                        className="core-dropdown-item"
                        onClick={() => {
                          setSelectedCategory(null);
                          setOpenDropdown(null);
                        }}
                      >
                        {category}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </header>
      {/* Barra de modo eliminada v2.0 */}
      {/* DEPT STRIP */}
      <div className="core-dstrip" style={{ display: 'none' }}>
      </div>

      {/* MAIN */}
      <main className="core-main" style={isHeroCompact ? { paddingTop: '180px' } : {}}>
        {/* ── MARKET ── */}
        {!isSH && (
          <>
            <div className="core-shdr">
              <div className="core-stitle">DESTACADOS</div>
              <span className="core-slink">Ver más →</span>
            </div>
            <div className="core-grid">
              {MP.map(p => {
                const isInCart = cartItems.some(item => item.id === p.id && item.m === 'mkt');
                return (
                  <div key={p.id} className="core-card-slot">
                    <FlipCard
                      p={p}
                      onAdd={() => addToCart(p, 'mkt')}
                      deptColors={DEPT_COLORS_FINAL}
                      cartItems={cartItems}
                      isInCart={isInCart}
                    />
                  </div>
                );
              })}
            </div>

          </>
        )}

        {/* ── SEGUNDA MANO ── */}
        {isSH && (
          <>
            <div className="core-shdr">
              <div className="core-stitle">PUBLICACIONES</div>
              <span className="core-slink">Ver todas →</span>
            </div>
            <div className="core-grid">
              {SH.map((p, idx) => {
                const isInCart = cartItems.some(item => item.id === p.id && item.m === 'sh');
                return (
                  <SlideCard
                    key={p.id}
                    p={p}
                    isOpen={expandedId === p.id}
                    dir={panelDir(idx)}
                    onToggle={() => handleExpandWrapper(p.id)}
                    onAdd={() => addToCart(p, 'sh')}
                    deptColors={DEPT_COLORS_FINAL}
                    cartItems={cartItems}
                    isInCart={isInCart}
                  />
                );
              })}
            </div>
            <div className="core-sp" />
          </>
        )}
      </main>
      
      {/* ── FOOTER MÓVIL ── */}
      <footer className="core-mobile-footer">
        <div className="core-mobile-footer-logo">
          <svg viewBox="0 0 200 120" width="67" height="40" style={{ display: 'block' }}>
            <g fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 5)">
              <path d="M 100 10 L 130 25 L 130 55 L 100 70 L 70 55 L 70 25 Z" />
              <path d="M 70 55 L 100 70 L 100 100 L 70 115 L 40 100 L 40 70 Z" />
              <path d="M 130 55 L 160 70 L 160 100 L 130 115 L 100 100 L 100 70 Z" />
            </g>
          </svg>
        </div>
        <div className="core-mobile-footer-cart" onClick={() => setShowCart(!showCart)}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M5 1l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 1L1 1" strokeLinecap="round"/>
            {cartTotal > 0 && (
              <text 
                x="14" 
                y="11.5" 
                fontSize="10" 
                fill={isSH ? "#6BB87A" : "#FF6835"}
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ 
                  fontFamily: 'Times New Roman, serif', 
                  fontWeight: 'normal',
                  pointerEvents: 'none'
                }}
              >
                {cartTotal}
              </text>
            )}
          </svg>
        </div>
      </footer>
      
      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      
      {/* Cart Modal */}
      {showCart && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            height: '100vh',
            backgroundColor: '#fff',
            zIndex: 1000,
            boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Tu carrito</h2>
            <button
              onClick={() => setShowCart(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {cartItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                Tu carrito está vacío
              </p>
            ) : (
              <div>
                {cartItems.map((item) => (
                  <div
                    key={`${item.id}-${item.m}`}
                    style={{
                      display: 'flex',
                      gap: '15px',
                      padding: '15px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <img
                      src={item.img}
                      alt={item.n}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'normal' }}>
                        {item.n}
                      </h3>
                      <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', color: '#FF6835' }}>
                        {'$ ' + item.p}
                      </p>
                      <button
                        onClick={() => setCartItems(prev => prev.filter(i => !(i.id === item.id && i.m === item.m)))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '0'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e0e0e0',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '15px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                <span>Total:</span>
                <span style={{ color: '#FF6835' }}>
                  ${cartTotal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowCart(false);
                  void trackEvent('checkout_started', { items_count: cartItems.length });
        navigate('/checkout');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FF6835',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Ir al checkout
              </button>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
}























