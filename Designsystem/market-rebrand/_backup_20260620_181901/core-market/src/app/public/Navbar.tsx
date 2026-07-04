// ═══════════════════════════════════════════════════════════
// CORE Market — Navbar.tsx
// Navbar limpio, dinámico, sin hardcodeo
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { fetchDepartamentos, type Departamento } from '../services/departamentosApi';

// ── Tokens ────────────────────────────────────────────────
const T = {
  navMarket:   '#0D2B55',
  navSH:       '#1D9E75',
  btnMarket:   '#1A4F9C',
  btnSH:       '#4ECBA0',
  btnMode:     '#1D9E75',   // botón SECOND en modo Market
  btnModeSH:   '#1A4F9C',   // botón MARKET en modo Second Hand
  separator:   '#1D9E75',   // línea en Market
  separatorSH: '#1A4F9C',   // línea en Second Hand
  white:       '#ffffff',
  whiteAlpha:  'rgba(255,255,255,.5)',
  searchBg:    'rgba(255,255,255,.15)',
  searchFocus: 'rgba(255,255,255,.22)',
  font:        "Calibri, 'Segoe UI', system-ui, sans-serif",
  size:        34,          // altura uniforme de todos los elementos
  container:   '1400px',
  paddingX:    '32px',
} as const;

// ── Tipos ──────────────────────────────────────────────────
interface NavbarProps {
  isSH:          boolean;
  toggleMode:    () => void;
  currentUser:   any;
  cartCount:     number;
  onCartClick:   () => void;
  onLoginClick:  () => void;
  searchValue:   string;
  onSearchChange:(v: string) => void;
}

// ── Componente ─────────────────────────────────────────────
export function Navbar({
  isSH, toggleMode, currentUser, cartCount,
  onCartClick, onLoginClick, searchValue, onSearchChange,
}: NavbarProps) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [openMenu, setOpenMenu]           = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cargar departamentos activos
  useEffect(() => {
    fetchDepartamentos(true)
      .then(data => setDepartamentos(data.filter(d => d.activo)))
      .catch(console.error);
  }, []);

  // Scroll arrows para el menú
  const checkScroll = () => {
    const el = menuRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [departamentos]);

  const scrollMenu = (dir: 'left' | 'right') => {
    menuRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.nav-menu-item')) setOpenMenu(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Formatear nombre de usuario
  const formatUser = (user: any) => {
    const n = user?.user_metadata?.nombre || user?.email?.split('@')[0] || '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} ${parts[1].charAt(0).toUpperCase()}.`;
    return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}`;
  };

  const navBg   = isSH ? T.navSH   : T.navMarket;
  const btnBg   = isSH ? T.btnSH   : T.btnMarket;
  const modeBg  = isSH ? T.btnModeSH : T.btnMode;
  const sepColor = isSH ? T.separatorSH : T.separator;

  const containerStyle: React.CSSProperties = {
    maxWidth:   T.container,
    margin:     '0 auto',
    padding:    `0 ${T.paddingX}`,
    boxSizing:  'border-box',
    width:      '100%',
  };

  const elStyle: React.CSSProperties = {
    height:    T.size,
    minHeight: T.size,
    maxHeight: T.size,
    boxSizing: 'border-box',
    display:   'flex',
    alignItems:'center',
  };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, background: navBg, transition: 'background 0.4s ease' }}>

      {/* ── TOP ROW ───────────────────────────────────── */}
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', gap: 12, padding: `8px ${T.paddingX}` }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            ...elStyle,
            width: T.size, minWidth: T.size, maxWidth: T.size,
            background: 'rgba(255,255,255,.15)',
            border: '1.5px solid rgba(255,255,255,.3)',
            borderRadius: 6,
            justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', color: T.white,
            fontFamily: T.font,
          }}>m</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ color: T.white, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', fontFamily: T.font, textTransform: 'uppercase' }}>MARKET</span>
            <span style={{ color: T.whiteAlpha, fontWeight: 400, fontSize: '0.6rem', letterSpacing: '0.12em', fontFamily: T.font, textTransform: 'uppercase' }}>by CORE</span>
          </div>
        </div>

        {/* Botón toggle modo */}
        <button
          onClick={toggleMode}
          style={{
            ...elStyle,
            width: 144, minWidth: 144, maxWidth: 144, justifyContent: 'center', background: modeBg,
            border: 'none', borderRadius: 4, cursor: 'pointer',
            fontFamily: T.font, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: T.white, transition: 'background 200ms ease', flexShrink: 0,
          }}
        >
          {isSH ? 'MARKET' : 'SECOND'}
        </button>

        {/* Buscador */}
        <div style={{
          ...elStyle,
          flex: 1, minWidth: 0,
          background: searchFocused ? T.searchFocus : T.searchBg,
          borderRadius: 4, transition: 'background 200ms ease',
          padding: '0 12px',
        }}>
          <input
            type="text"
            placeholder="encontrá lo que buscás"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%', border: 'none', background: 'transparent',
              color: T.white, fontFamily: T.font, fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Botón usuario / login */}
        {currentUser ? (
          <Link
            to="/dashboard/ordenes"
            style={{
              ...elStyle,
              width: 144, minWidth: 144, maxWidth: 144, justifyContent: 'center', gap: 6, background: btnBg, borderRadius: 4, border: 'none',
              color: T.white, textDecoration: 'none',
              fontFamily: T.font, fontSize: '0.85rem', fontWeight: 700,
              transition: 'background 200ms ease', flexShrink: 0,
              padding: '0 10px',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {formatUser(currentUser)}
          </Link>
        ) : (
          <button
            onClick={onLoginClick}
            style={{
              ...elStyle,
              width: 144, minWidth: 144, maxWidth: 144, justifyContent: 'center', background: btnBg, borderRadius: 4, border: 'none',
              color: T.white, cursor: 'pointer',
              fontFamily: T.font, fontSize: '0.85rem', fontWeight: 700,
              transition: 'background 200ms ease', flexShrink: 0,
            }}
          >
            Ingresar
          </button>
        )}

        {/* Carrito */}
        <div onClick={onCartClick} style={{ ...elStyle, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={T.white} strokeWidth="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M5 1l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 1L1 1" strokeLinecap="round"/>
          </svg>
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 10, color: isSH ? T.btnModeSH : T.btnMode, fontWeight: 'normal', lineHeight: 1, zIndex: 10 }}>
              {cartCount}
            </span>
          )}
        </div>

        {/* Logout */}
        {currentUser && (
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            title="Cerrar sesión"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', padding: 4, flexShrink: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── LÍNEA SEPARADORA ──────────────────────────── */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ height: 2, background: sepColor, transition: 'background 0.4s ease' }} />
      </div>

      {/* ── MENÚ DE DEPARTAMENTOS ─────────────────────── */}
      <div style={{ ...containerStyle, position: 'relative', display: 'flex', alignItems: 'center' }}>
        
        {/* Flecha izquierda */}
        {canScrollLeft && (
          <button onClick={() => scrollMenu('left')} style={{ position: 'absolute', left: 32, zIndex: 2, background: 'rgba(0,0,0,.2)', border: 'none', color: T.white, cursor: 'pointer', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>‹</button>
        )}

        {/* Items del menú */}
        <div
          ref={menuRef}
          style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', height: 36, justifyContent: 'center', padding: `0 ${T.paddingX}`, width: '100%' }}
        >
          {departamentos.map(dept => {
            const cats = (dept.categorias || []).filter(c => (c as any).activo !== false);
            const isOpen = openMenu === dept.id;
            return (
              <div
                key={dept.id}
                className="nav-menu-item"
                style={{ position: 'relative', flexShrink: 0 }}
                onMouseEnter={() => setOpenMenu(dept.id)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <span style={{
                  padding: '0 14px', height: 36, display: 'flex', alignItems: 'center',
                  color: 'rgba(255,255,255,.85)', fontFamily: T.font, fontSize: '0.82rem',
                  fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 150ms ease',
                }}>
                  {dept.nombre}
                </span>

                {/* Dropdown */}
                {isOpen && cats.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 36, left: 0, minWidth: 180,
                    background: navBg, border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 4, zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
                  }}>
                    {cats.map(cat => (
                      <div
                        key={cat.id}
                        style={{
                          padding: '8px 16px', color: 'rgba(255,255,255,.8)',
                          fontFamily: T.font, fontSize: '0.82rem', cursor: 'pointer',
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {cat.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Flecha derecha */}
        {canScrollRight && (
          <button onClick={() => scrollMenu('right')} style={{ position: 'absolute', right: 32, zIndex: 2, background: 'rgba(0,0,0,.2)', border: 'none', color: T.white, cursor: 'pointer', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>›</button>
        )}
      </div>

    </header>
  );
}





