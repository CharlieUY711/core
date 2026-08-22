// ═══════════════════════════════════════════════════════════
// MARKET — Navbar.tsx  (switch de plataforma · Junio 2026)
// La plataforma ACTIVA es el logo grande (nombre + by CORE);
// las otras dos quedan como pills. Tocar una pill cambia de
// plataforma (logo, skin y página) vía onPlatform.
// Contrato: { platform, onPlatform, currentUser, cartCount,
//             onCartClick, onLoginClick, searchValue, onSearchChange }
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { fetchDepartamentos, type Departamento } from '../services/departamentosApi';

type Plat = 'mkt' | 'sh';

// ── Skin por plataforma ────────────────────────────────────
const PLAT: Record<Plat, {
  name: string; color: string; bar: string; field: string; fieldFocus: string;
  divider: string; cta: string; ctaHover: string;
}> = {
  // NOTE: fieldFocus/divider/ctaHover for `sh` are hover/focus
  // shades with no equivalent design-system token (only the mkt platform's
  // hover state — --brand-madre-hover — is tokenized). Left as literal hex,
  // see .agent/AUDIT_TOKENS.md "Exceptions" for DEC-007.
  mkt:     { name: 'MARKET',  color: 'var(--brand-madre)', bar: 'var(--brand-navy)', field: 'var(--brand-navy-field)', fieldFocus: '#3A567C', divider: 'var(--second)', cta: 'var(--brand-madre)', ctaHover: 'var(--brand-madre-hover)' },
  sh:      { name: 'SECOND',  color: 'var(--second)', bar: 'var(--second)', field: 'var(--second-field)', fieldFocus: '#2C7350', divider: '#1F5C40', cta: 'var(--brand-navy)', ctaHover: '#143A6B' },
};
const ORDER: Plat[] = ['mkt', 'sh'];

const T = {
  white: 'var(--color-text-light)',
  // No token covers this muted header sub-label blue-grey; see DEC-007.
  sub: '#8FA0BC',
  placeholder: 'rgba(255,255,255,.62)',
  deptText: 'rgba(255,255,255,.85)',
  font: "'Archivo', system-ui, -apple-system, sans-serif",
  black: "'Archivo Black', sans-serif",
  size: 40,
  container: '1400px',
  paddingX: '32px',
} as const;

const DOT: Record<string, string> = {
  tech: 'var(--tech)', home: 'var(--home)', vestimenta: 'var(--vestimenta)',
  entretenimiento: 'var(--entret)', entret: 'var(--entret)', servicios: 'var(--servicios)',
};
const dotColor = (nombre: string) => {
  const k = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return DOT[k] ?? 'var(--brand-madre)';
};

interface NavbarProps {
  platform:       Plat;
  onPlatform:     (p: Plat, silent?: boolean) => void;
  currentUser:    any;
  cartCount:      number;
  onCartClick:    () => void;
  onLoginClick:   () => void;
  searchValue:    string;
  onSearchChange: (v: string) => void;
}

export function Navbar({
  platform, onPlatform, currentUser, cartCount,
  onCartClick, onLoginClick, searchValue, onSearchChange,
}: NavbarProps) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [openMenu, setOpenMenu]           = useState<string | null>(null);
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

  const skin = PLAT[platform];
  const others = ORDER.filter(p => p !== platform);

  const containerStyle: React.CSSProperties = {
    maxWidth: T.container, margin: '0 auto', padding: `0 ${T.paddingX}`,
    boxSizing: 'border-box', width: '100%',
  };
  const elStyle: React.CSSProperties = {
    height: T.size, minHeight: T.size, maxHeight: T.size,
    boxSizing: 'border-box', display: 'flex', alignItems: 'center',
  };

  // Pill de una plataforma inactiva → cambia de plataforma
  const Pill = ({ p }: { p: Plat }) => {
    const s = PLAT[p];
    return (
      <button
        onClick={() => onPlatform(p)}
        title={s.name}
        style={{
          width: T.size, height: T.size, background: s.color, borderRadius: '22%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingTop: 3, flexShrink: 0, border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: T.black, color: T.white, fontSize: 18, lineHeight: 0.8 }}>M</span>
        <span style={{ fontFamily: T.font, fontWeight: 600, color: T.white, fontSize: s.name.length > 6 ? 5.5 : 6.5, letterSpacing: '.07em', marginTop: 1 }}>{s.name}</span>
      </button>
    );
  };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, background: skin.bar, transition: 'background 0.35s ease' }}>
      <style>{`.mk-search::placeholder{ color: var(--mk-ph, var(--mute)); opacity: 1; }`}</style>

      {/* ── TOP ROW ───────────────────────────────────── */}
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', gap: 14, padding: `10px ${T.paddingX}` }}>

        {/* Logo de la plataforma activa */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0, textDecoration: 'none' }}>
          <div style={{
            width: T.size, height: T.size, background: T.white, borderRadius: '22%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: T.black, color: skin.color, fontSize: 26, lineHeight: 1 }}>M</span>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: T.black, color: T.white, fontSize: 19, letterSpacing: '.02em' }}>{skin.name}</div>
            <div style={{ fontSize: 9, letterSpacing: '.30em', color: T.sub, fontWeight: 600, marginTop: 3 }}>BY CORE</div>
          </div>
        </Link>

        {/* Las otras dos plataformas como pills */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {others.map(p => <Pill key={p} p={p} />)}
        </div>

        {/* Buscador */}
        <div style={{
          ...elStyle, flex: 1, minWidth: 0,
          background: 'var(--card)',
          borderRadius: 'var(--r-control)', padding: '0 16px', gap: 12,
        }}>
          <input
            type="text"
            className="mk-search"
            placeholder="encontrá lo que buscás"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%', border: 'none', background: 'transparent',
              color: 'var(--ink)', fontFamily: T.font, fontSize: '0.95rem', outline: 'none',
              ['--mk-ph' as any]: skin.color,
            }}
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={skin.color} strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </div>

        {/* Login / usuario */}
        {currentUser ? (
          <Link
            to="/dashboard/ordenes"
            style={{
              ...elStyle, justifyContent: 'center', gap: 6, background: skin.cta, borderRadius: 'var(--r-control)', border: 'none',
              color: T.white, textDecoration: 'none', fontFamily: T.font, fontSize: '0.9rem', fontWeight: 700,
              transition: 'background 200ms ease', flexShrink: 0, padding: '0 22px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = skin.ctaHover)}
            onMouseLeave={e => (e.currentTarget.style.background = skin.cta)}
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
              ...elStyle, justifyContent: 'center', background: skin.cta, borderRadius: 'var(--r-control)', border: 'none',
              color: T.white, cursor: 'pointer', fontFamily: T.font, fontSize: '0.95rem', fontWeight: 700,
              transition: 'background 200ms ease', flexShrink: 0, padding: '0 34px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = skin.ctaHover)}
            onMouseLeave={e => (e.currentTarget.style.background = skin.cta)}
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
            <span style={{ position: 'absolute', top: -4, right: -6, fontSize: 11, background: T.white, color: skin.bar, fontWeight: 700, lineHeight: 1, zIndex: 10, borderRadius: 'var(--radius-pill)', padding: '1px 5px' }}>
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

      {/* ── DIVISOR (acento de la plataforma) ─────────── */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ height: 2, background: skin.divider, transition: 'background 0.35s ease' }} />
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
                  color: T.deptText, fontFamily: T.font, fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  borderBottom: '2px solid transparent', transition: 'color 150ms ease',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor(dept.nombre), flexShrink: 0 }} />
                  {dept.nombre}
                </span>

                {isOpen && cats.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 40, left: 0, minWidth: 180,
                    background: skin.bar, border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 'var(--r-control)', zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,.2)', overflow: 'hidden',
                  }}>
                    {cats.map(cat => (
                      <div
                        key={cat.id}
                        style={{
                          padding: '8px 16px', color: 'rgba(255,255,255,.8)',
                          fontFamily: T.font, fontSize: '0.85rem', cursor: 'pointer',
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

        {canScrollRight && (
          <button onClick={() => scrollMenu('right')} style={{ position: 'absolute', right: 32, zIndex: 2, background: 'rgba(0,0,0,.2)', border: 'none', color: T.white, cursor: 'pointer', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>›</button>
        )}
      </div>

    </header>
  );
}
