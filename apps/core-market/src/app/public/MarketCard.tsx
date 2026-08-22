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
  const [gallery, setGallery] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const thumbs: (string | null)[] = [p.img, null, null, null, null];
  const bigImg = thumbs[imgIndex];

  const catLabel = `${(p.d || 'Tienda').toUpperCase()}${context === 'second' ? ' · USADO' : context === 'gourmet' ? ' · GOURMET' : ''}`;
  const platformName = context === 'second' ? 'Second' : context === 'gourmet' ? 'Gourmet' : 'Market';

  // Pie de compra idéntico en frente y dorso (color alternable)
  const Footer = ({ color }: { color: string }) => (
    <div style={{ display: 'flex', gap: 10, height: 38, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E4E1D8', borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
        <span onClick={() => setQty(q => Math.max(1, q - 1))} style={{ padding: '0 11px', fontSize: 18, color: '#8A8678', cursor: 'pointer' }}>−</span>
        <span style={{ padding: '0 4px', fontSize: 14, fontWeight: 600, minWidth: 14, textAlign: 'center' }}>{qty}</span>
        <span onClick={() => setQty(q => q + 1)} style={{ padding: '0 11px', fontSize: 18, color: '#8A8678', cursor: 'pointer' }}>+</span>
      </div>
      <button onClick={onAdd} disabled={p.stock === 0} style={{ flex: 1, background: p.stock === 0 ? '#C8C4BE' : color, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 9, cursor: p.stock === 0 ? 'not-allowed' : 'pointer' }}>
        {p.stock === 0 ? 'Sin stock' : isInCart ? 'En carrito ✓' : 'Comprar'}
      </button>
    </div>
  );
  const ThumbStrip = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
      {thumbs.map((t, i) => (
        <button key={i} onClick={() => { setImgIndex(i); setGallery(true); }}
          style={{ aspectRatio: '1 / 1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0,
            border: imgIndex === i ? `2px solid ${gallery ? s.color : '#fff'}` : `1px solid ${gallery ? '#E4E1D8' : 'rgba(255,255,255,.4)'}`,
            background: t ? '#fff' : `repeating-linear-gradient(45deg, ${s.g1}, ${s.g1} 5px, ${s.g2} 5px, ${s.g2} 10px)` }}>
          {t && <img src={t} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </button>
      ))}
    </div>
  );

  const face: React.CSSProperties = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
    background: '#fff', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,.09)', display: 'flex', flexDirection: 'column',
  };

  return (
    // core-card-slot es el mismo contenedor que usa SlideCard: asi Market y
    // Second Hand miden exactamente igual, en vez de que una use aspect-ratio
    // y la otra un minHeight fijo.
    <div className="core-card-slot" style={{ perspective: 1400 }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transition: 'transform .55s ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

        {/* ───── FRENTE ───── */}
        <div style={face}>
          <div style={{ height: 4, background: s.color }} />
          <div style={{ position: 'relative', padding: '14px 14px 0' }}>
            <div onClick={() => setFlipped(true)} title="Ver detalle" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', backgroundImage: p.img ? undefined : `repeating-linear-gradient(45deg, ${s.g1}, ${s.g1} 10px, ${s.g2} 10px, ${s.g2} 20px)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.img && <img src={p.img} alt={p.n} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          </div>
          <div style={{ padding: '13px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: s.color }}>{platformName}</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', color: '#8A8678', textTransform: 'uppercase' }}>{p.d || 'Sin categoría'}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginTop: 9, color: '#1C1B19' }}>{p.n}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 23, color: s.color }}>$ {p.p}</span>
              {p.o && <span style={{ fontSize: 12, color: '#A8A293', textDecoration: 'line-through' }}>$ {p.o}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#8A8678', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Stars r={p.r} color={s.color} /> {p.r?.toFixed(1)} {p.sellerName ? `· ${p.sellerName}` : ''}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 14 }}>
              <Footer color={s.color} />
            </div>
          </div>
        </div>

        {/* ───── DORSO ───── */}
        <div style={{ ...face, transform: 'rotateY(180deg)' }}>

          {!gallery ? (
            <>
              <div style={{ background: s.color, padding: '14px 16px 16px' }}>
                <ThumbStrip />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'rgba(255,255,255,.75)', fontWeight: 700 }}>{catLabel}</div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", color: '#fff', fontSize: 14, marginTop: 4, lineHeight: 1.15 }}>{p.n}</div>
                  </div>
                  <span onClick={() => { setFlipped(false); setGallery(false); }} style={{ color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>↩</span>
                </div>
              </div>
              <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: '#34322C' }}>{p.desc || 'Sin descripción.'}</p>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
                  <Row k="Categoría" v={p.d || '—'} />
                  {p.sellerName && <Row k="Vendedor" v={p.sellerName} />}
                  <Row k="Valoración" v={`${p.r?.toFixed(1) ?? '—'} (${p.rv ?? 0})`} last />
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setImgIndex(i => (i + thumbs.length - 1) % thumbs.length)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E4E1D8', background: '#fff', cursor: 'pointer', color: s.color, fontSize: 16, flexShrink: 0 }}>‹</button>
                <div style={{ flex: 1 }}><ThumbStrip /></div>
                <button onClick={() => setImgIndex(i => (i + 1) % thumbs.length)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E4E1D8', background: '#fff', cursor: 'pointer', color: s.color, fontSize: 16, flexShrink: 0 }}>›</button>
              </div>
              <div onClick={() => setGallery(false)} title="Volver al detalle" style={{ width: '100%', aspectRatio: '1 / 1', marginTop: 12, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: bigImg ? undefined : `repeating-linear-gradient(45deg, ${s.g1}, ${s.g1} 10px, ${s.g2} 10px, ${s.g2} 20px)` }}>
                {bigImg && <img src={bigImg} alt={p.n} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            </div>
          )}

          <div style={{ padding: '0 20px 20px' }}>
            <Footer color={s.color} />
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: last ? 'none' : '1px solid #ECEAE2', fontSize: 12 }}>
      <span style={{ color: '#8A8678' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}
