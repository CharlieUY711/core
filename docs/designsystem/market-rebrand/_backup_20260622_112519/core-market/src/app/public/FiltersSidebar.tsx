// ═══════════════════════════════════════════════════════════
// MARKET — FiltersSidebar.tsx  (panel de filtros)
// Título "Filtros" + tres checks de plataforma: Market / Second / Gourmet.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';

type PlatKey = 'market' | 'second' | 'gourmet';

interface FiltersSidebarProps {
  onChange?: (sel: Record<PlatKey, boolean>) => void;
}

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

export function FiltersSidebar({ onChange }: FiltersSidebarProps) {
  const [sel, setSel] = useState<Record<PlatKey, boolean>>({ market: true, second: true, gourmet: true });
  const toggle = (k: PlatKey) => {
    const next = { ...sel, [k]: !sel[k] };
    setSel(next);
    onChange?.(next);
  };

  return (
    <aside style={{ width: 248, flex: 'none', background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)', padding: 24 }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 18 }}>Filtros</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLATS.map(p => (
          <label
            key={p.key}
            onClick={() => toggle(p.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#34322C', cursor: 'pointer' }}
          >
            <Check checked={sel[p.key]} color={p.color} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flex: 'none' }} />
            {p.label}
          </label>
        ))}
      </div>
    </aside>
  );
}
