// ═══════════════════════════════════════════════════════════
// MARKET — MarketCard.tsx  (ficha nueva · spec Ficha de producto)
// Tarjeta con giro: frente vende, dorso amplía.
// Una estructura, tres skins de contexto: Market / Second / Gourmet.
// Self-contained (sin video/audio). La vieja queda en ProductCard.tsx.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';

type Ctx = 'market' | 'second' | 'gourmet';

interface MktProduct {
  id: number; img: string; d: string; n: string;
  p: string; o: string | null; b?: string | null; bt?: string;
  desc: string; r: number; rv: number; q?: any;
  sellerName?: string; stock?: number;
}

const SKIN: Record<Ctx, { color: string; hover: string; tint: string; badge: string; g1: string; g2: string }> = {
  market:  { color: '#3D5689', hover: '#46639B', tint: '#EBEFF6', badge: 'OFICIAL', g1: '#F1EFEA', g2: '#EAE7E0' },
  second:  { color: '#2E7D57', hover: '#2A7350', tint: '#EAF3EE', badge: 'USADO',   g1: '#EDF4EF', g2: '#E4EFE8' },
  gourmet: { color: '#9B3326', hover: '#8A2C21', tint: '#F5EAE7', badge: 'GOURMET', g1: '#F5ECEA', g2: '#EFE2DF' },
};

function Stars({ r, color }: { r: number; color: string }) {
  const full = Math.round(r || 0);
  return <span style={{ color, fontSize: 14, letterSpacing: 1 }}>{'★★★★★'.slice(0, full)}<span style={{ color: '#D9D6CC' }}>{'★★★★★'.slice(full)}</span></span>;
}

export function MarketCard({ p, context = 'market', onAdd, isInCart = false }: {
  p: MktProduct; context?: Ctx; onAdd?: () => void; isInCart?: boolean;
}) {
  const s = SKIN[context];
  const [flipped, setFlipped] = useState(false);
  const [qty, setQty] = useState(1);

  const catLabel = `${(p.d || 'Tienda').toUpperCase()}${context === 'second' ? ' · USADO' : context === 'gourmet' ? ' · GOURMET' : ''}`;
  const face: React.CSSProperties = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
    background: '#fff', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,.09)', display: 'flex', flexDirection: 'column',
  };

  return (
    <div style={{ perspective: 1400, width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', minHeight: 430, transformStyle: 'preserve-3d', transition: 'transform .55s ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

        {/* ───── FRENTE ───── */}
        <div style={{ ...face, position: 'relative' }}>
          <div style={{ height: 4, background: s.color }} />
          <div style={{ position: 'relative', padding: '14px 14px 0' }}>
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', backgroundImage: p.img ? undefined : `repeating-linear-gradient(45deg, ${s.g1}, ${s.g1} 10px, ${s.g2} 10px, ${s.g2} 20px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.img && <img src={p.img} alt={p.n} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <span style={{ position: 'absolute', top: 24, left: 24, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#fff', background: s.color, borderRadius: 100, padding: '5px 11px' }}>{s.badge}</span>
            <button onClick={() => setFlipped(true)} title="Ver detalle" style={{ position: 'absolute', top: 24, right: 24, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.94)', boxShadow: '0 2px 8px rgba(0,0,0,.14)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="8" r="0.7" fill={s.color} /></svg>
            </button>
          </div>
          <div style={{ padding: '13px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 10, letterSpacing: '.06em', fontWeight: 700, color: s.color, background: s.tint, borderRadius: 100, padding: '3px 9px' }}>{catLabel}</span>
            <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3, marginTop: 9, color: '#1C1B19' }}>{p.n}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 23, color: s.color }}>$ {p.p}</span>
              {p.o && <span style={{ fontSize: 12, color: '#A8A293', textDecoration: 'line-through' }}>$ {p.o}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#8A8678', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Stars r={p.r} color={s.color} /> {p.r?.toFixed(1)} {p.sellerName ? `· ${p.sellerName}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 14, height: 44, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E4E1D8', borderRadius: 9, overflow: 'hidden' }}>
                <span onClick={() => setQty(q => Math.max(1, q - 1))} style={{ padding: '0 11px', fontSize: 18, color: '#8A8678', cursor: 'pointer' }}>−</span>
                <span style={{ padding: '0 4px', fontSize: 14, fontWeight: 600, minWidth: 14, textAlign: 'center' }}>{qty}</span>
                <span onClick={() => setQty(q => q + 1)} style={{ padding: '0 11px', fontSize: 18, color: '#8A8678', cursor: 'pointer' }}>+</span>
              </div>
              <button onClick={onAdd} disabled={p.stock === 0} style={{ flex: 1, background: p.stock === 0 ? '#C8C4BE' : s.color, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 9, cursor: p.stock === 0 ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (p.stock !== 0) e.currentTarget.style.background = s.hover; }}
                onMouseLeave={e => { if (p.stock !== 0) e.currentTarget.style.background = s.color; }}>
                {p.stock === 0 ? 'Sin stock' : isInCart ? 'En carrito ✓' : 'Comprar'}
              </button>
            </div>
          </div>
        </div>

        {/* ───── DORSO ───── */}
        <div style={{ ...face, transform: 'rotateY(180deg)' }}>
          <div style={{ background: s.color, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'rgba(255,255,255,.75)', fontWeight: 700 }}>{catLabel}</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", color: '#fff', fontSize: 17, marginTop: 4, lineHeight: 1.15 }}>{p.n}</div>
            </div>
            <span onClick={() => setFlipped(false)} style={{ color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>↩</span>
          </div>
          <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#34322C' }}>{p.desc || 'Sin descripción.'}</p>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
              <Row k="Categoría" v={p.d || '—'} />
              {p.sellerName && <Row k="Vendedor" v={p.sellerName} />}
              <Row k="Valoración" v={`${p.r?.toFixed(1) ?? '—'} (${p.rv ?? 0})`} last />
            </div>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={onAdd} style={{ width: '100%', height: 44, background: s.color, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 9, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = s.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = s.color)}>
              Comprar · $ {p.p}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: last ? 'none' : '1px solid #ECEAE2', fontSize: 13.5 }}>
      <span style={{ color: '#8A8678' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}
