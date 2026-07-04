// ═══════════════════════════════════════════════════════════
// MARKET — Navbar.tsx  (switch de 3 plataformas · Junio 2026)
// La plataforma ACTIVA es el logo grande (+ BY CORE); las otras
// dos quedan como pills. Tocar una pill la activa y la app
// muestra su página. Market · Second · Gourmet.
// Conserva: buscador, login/usuario, carrito, logout, deptos.
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { fetchDepartamentos, type Departamento } from '../services/departamentosApi';

type Plat = 'mkt' | 'sh' | 'gourmet';

// ── Meta por plataforma ────────────────────────────────────
const PLAT: Record<Plat, { name: string; color: string; bar: string; field: string }> = {
  mkt:     { name: 'MARKET',  color: '#3D5689', bar: '#0D2B55', field: '#314B6E' },
  sh:      { name: 'SECOND',  color: '#2E7D57', bar: '#1C5E42', field: '#247253' },
  gourmet: { name: 'GOURMET', color: '#9B3326', bar: '#7A271D', field: '#9B3326' },
};
const ORDER: Plat[] = ['mkt', 'sh', 'gourmet'];

const T = {
  white: '#ffffff',
  sub:   'rgba(255,255,255,.62)',
  font:  "'Archivo', system-ui, -apple-system, sans-serif",
  black: "'Archivo Black', sans-serif",
  size:  40,
  container: '1400px',
  paddingX:  '32px',
} as const;

// Punto de color por vertical
const DOT: Record<string, string> = {
  tech: '#1C6E86', home: '#A85636', vestimenta: '#7E3A70',
  entretenimiento: '#C2611F', entret: '#C2611F', servicios: '#50617F',
};
const dotColor = (n: string) => {
  const k = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return DOT[k] ?? '#3D5689';
};

interface NavbarProps {
  platform:      Plat;
  onPlatform:    (p: Plat) => void;
  currentUser:   any;
  cartCount:     number;
  onCartClick:   () => void;
  onLoginClick:  () => void;
  searchValue:   string;
  onSearchChange:(v: string) => void;
}

export function Navbar({
  platform, onPlatform, currentUser, cartCount,
  onCartClick, onLoginClick, searchValue, onSearchChange,
}: NavbarProps) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [openMenu, setOpenMenu]           = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDepartamentos(true)
      .then(data => setDepartamentos(data.filter(d => d.activo)))
      .catch(console.error);
  }, []);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.nav-menu-item')) setOpenMenu(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const formatUser = (user: any) => {
    const n = user?.user_metadata?.nombre || user?.email?.split('@')[0] || '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} ${parts[1].charAt(0).toUpperCase()}.`;
    return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}`;
  };

  const active = PLAT[platform];
  const others = ORDER.filter(p => p !== platform);

  const containerStyle: React.CSSProperties = {
    maxWidth: T.container, margin: '0 auto', padding: `0 ${T.paddingX}`,
    boxSizing: 'border-box', width: '100%',
  };
  const elStyle: React.CSSProperties = {
    height: T.size, minHeight: T.size, maxHeight: T.size,
    boxSizing: 'border-box', display: 'flex', alignItems: 'center',
  };

  // Pill de una plataforma (las no activas)
  const Pill = ({ p }: { p: Plat }) => {
    const m = PLAT[p];
    return (
      <button
        onClick={() => onPlatform(p)}
        title={m.name}
        style={{
          width: T.size, height: T.size, background: m.color, borderRadius: '22%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingTop: 3, flexShrink: 0, border: 'none', cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,.25)',
        }}
      >
        <span style={{ fontFamily: T.black, color: T.white, fontSize: 18, lineHeight: 0.8 }}>M</span>
        <span style={{ fontFamily: T.font, fontWeight: 600, color: T.white, fontSize: 6, letterSpacing: '.06em', marginTop: 1 }}>{m.name}</span>
      </button>
    );
  };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, background: active.bar, transition: 'background 0.4s ease' }}>

      {/* ── TOP ROW ───────────────────────────────────── */}
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', gap: 14, padding: `10px ${T.paddingX}` }}>

        {/* Logo plataforma ACTIVA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
          <div style={{
            width: T.size, height: T.size, background: T.white, borderRadius: '22%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: 'inset 0 3px 7px rgba(0,0,0,.18)',
          }}>
            <span style={{ fontFamily: T.black, color: active.color, fontSize: 26, lineHeight: 1 }}>M</span>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: T.black, color: T.white, fontSize: 19, letterSpacing: '.02em' }}>{active.name}</div>
            <div style={{ fontSize: 9, letterSpacing: '.30em', color: T.sub, fontWeight: 600, marginTop: 3 }}>BY CORE</div>
          </div>
        </div>

        {/* Pills de las otras plataformas */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {others.map(p => <Pill key={p} p={p} />)}
        </div>

        {/* Buscador */}
        <div style={{
          ...elStyle, flex: 1, minWidth: 0,
          background: active.field, borderRadius: 9,
          outline: searchFocused ? '2px solid rgba(255,255,255,.25)' : 'none',
          transition: 'background 200ms ease', padding: '0 16px', gap: 12,
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
              color: T.white, fontFamily: T.font, fontSize: '0.95rem', outline: 'none',
            }}
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </div>

        {/* Login / usuario (acento de la plataforma activa) */}
        {currentUser ? (
          <Link
            to="/dashboard/ordenes"
            style={{
              ...elStyle, justifyContent: 'center', gap: 6, background: active.color, borderRadius: 9, border: 'none',
              color: T.white, textDecoration: 'none', fontFamily: T.font, fontSize: '0.9rem', fontWeight: 700,
              flexShrink: 0, padding: '0 22px',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {formatUser(currentUser)}
          </Link>
        ) : (
          <button
            onClick={onLoginClick}
            style={{
              ...elStyle, justifyContent: 'center', background: active.color, borderRadius: 9, border: 'none',
              color: T.white, cursor: 'pointer', fontFamily: T.font, fontSize: '0.95rem', fontWeight: 700,
              flexShrink: 0, padding: '0 34px',
            }}
          >
            Ingresar
          </button>
        )}

        {/* Carrito */}
        <div onClick={onCartClick} style={{ ...elStyle, cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={T.white} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
            <path d="M2 3h3l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
          </svg>
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -6, fontSize: 11, background: active.color, color: T.white, fontWeight: 700, lineHeight: 1, zIndex: 10, borderRadius: 999, padding: '1px 5px' }}>
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── DIVISOR ───────────────────────────────────── */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,.16)' }} />
      </div>

      {/* ── MENÚ DE DEPARTAMENTOS ─────────────────────── */}
      <div style={{ ...containerStyle, position: 'relative', display: 'flex', alignItems: 'center' }}>

        {canScrollLeft && (
          <button onClick={() => scrollMenu('left')} style={{ position: 'absolute', left: 32, zIndex: 2, background: 'rgba(0,0,0,.2)', border: 'none', color: T.white, cursor: 'pointer', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>‹</button>
        )}

        <div
          ref={menuRef}
          style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', height: 40, justifyContent: 'center', padding: `0 ${T.paddingX}`, width: '100%' }}
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
                  padding: '0 14px', height: 40, display: 'flex', alignItems: 'center', gap: 8,
                  color: 'rgba(255,255,255,.85)', fontFamily: T.font, fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor(dept.nombre), flexShrink: 0 }} />
                  {dept.nombre}
                </span>

                {isOpen && cats.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 40, left: 0, minWidth: 180,
                    background: active.bar, border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 9, zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,.2)', overflow: 'hidden',
                  }}>
                    {cats.map(cat => (
                      <div
                        key={cat.id}
                        style={{
                          padding: '8px 16px', color: 'rgba(255,255,255,.8)',
                          fontFamily: T.font, fontSize: '0.85rem', cursor: 'pointer',
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

        {canScrollRight && (
          <button onClick={() => scrollMenu('right')} style={{ position: 'absolute', right: 32, zIndex: 2, background: 'rgba(0,0,0,.2)', border: 'none', color: T.white, cursor: 'pointer', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>›</button>
        )}
      </div>

    </header>
  );
}
