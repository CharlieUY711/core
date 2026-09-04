// ═══════════════════════════════════════════════════════════
// MARKET — FilterBar.tsx  (barra horizontal de filtros)
// Una sola línea: Filtros · Market / Second / Gourmet · Ordenar por
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';

type PlatKey = 'market' | 'second' | 'gourmet';

const PLATS: { key: PlatKey; label: string; color: string }[] = [
  { key: 'market',  label: 'Market',  color: '#3D5689' },
  { key: 'second',  label: 'Second',  color: '#2E7D57' },
  { key: 'gourmet', label: 'Gourmet', color: '#9B3326' },
];

function Check({ checked, color }: { checked: boolean; color: string }) {
  return checked ? (
    <span style={{ width: 18, height: 18, borderRadius: 5, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </span>
  ) : (
    <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #C4C0B2', flex: 'none' }} />
  );
}

export function FilterBar({ onChange }: { onChange?: (sel: Record<PlatKey, boolean>) => void }) {
  const [sel, setSel] = useState<Record<PlatKey, boolean>>({ market: true, second: true, gourmet: true });
  const toggle = (k: PlatKey) => {
    const next = { ...sel, [k]: !sel[k] };
    setSel(next);
    onChange?.(next);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 22,
      background: '#fff', border: '1px solid #E4E1D8', borderRadius: 14,
      padding: '9px 22px', flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: '#1C1B19' }}>Filtros</span>

      {PLATS.map(p => (
        <label key={p.key} onClick={() => toggle(p.key)} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: '#34322C', cursor: 'pointer' }}>
          <Check checked={sel[p.key]} color={p.color} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flex: 'none' }} />
          {p.label}
        </label>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        <span style={{ fontSize: 14, color: '#8A8678' }}>Ordenar por</span>
        <div style={{ height: 38, background: '#F6F4EF', border: '1px solid #E4E1D8', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', fontSize: 14, fontWeight: 600, color: '#1C1B19', cursor: 'pointer' }}>
          Más relevantes
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8678" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>
    </div>
  );
}
