// ═══════════════════════════════════════════════════════════
// MARKET — FiltersSidebar.tsx  (panel de filtros · spec Listado)
// Presentacional. Acepta callbacks opcionales para conectar
// después (condición, curaduría, precio, envío).
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';

interface FiltersSidebarProps {
  onChange?: (f: {
    nuevo: boolean; usado: boolean; gourmet: boolean;
    envioGratis: boolean; llegaManana: boolean;
    min: string; max: string;
  }) => void;
}

const LABEL: React.CSSProperties = {
  fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase',
  color: '#8A8678', fontWeight: 600, marginBottom: 12,
};
const DIVIDER: React.CSSProperties = { height: 1, background: '#ECEAE2', margin: '0 -4px 20px' };

function Check({ checked, color = '#3D5689' }: { checked: boolean; color?: string }) {
  return checked ? (
    <span style={{ width: 18, height: 18, borderRadius: 5, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </span>
  ) : (
    <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #C4C0B2', flex: 'none' }} />
  );
}

export function FiltersSidebar({ onChange }: FiltersSidebarProps) {
  const [f, setF] = useState({
    nuevo: true, usado: false, gourmet: false,
    envioGratis: false, llegaManana: false, min: '', max: '',
  });
  const upd = (patch: Partial<typeof f>) => {
    const next = { ...f, ...patch };
    setF(next);
    onChange?.(next);
  };

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#34322C', cursor: 'pointer' };

  return (
    <aside style={{ width: 248, flex: 'none', background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)', padding: 24 }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 18 }}>Filtros</div>

      <div style={LABEL}>Condición</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        <label style={row} onClick={() => upd({ nuevo: !f.nuevo })}><Check checked={f.nuevo} />Nuevo</label>
        <label style={row} onClick={() => upd({ usado: !f.usado })}><Check checked={f.usado} color="#2E7D57" />Usado <span style={{ fontSize: 12, color: '#2E7D57', fontWeight: 600 }}>· Second</span></label>
      </div>

      <div style={DIVIDER} />

      <div style={LABEL}>Curaduría</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        <label style={row} onClick={() => upd({ gourmet: !f.gourmet })}><Check checked={f.gourmet} color="#9B3326" />Gourmet <span style={{ fontSize: 12, color: '#9B3326', fontWeight: 600 }}>premium</span></label>
      </div>

      <div style={DIVIDER} />

      <div style={LABEL}>Precio</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <input value={f.min} onChange={e => upd({ min: e.target.value })} placeholder="Mín" style={{ flex: 1, width: '100%', height: 40, border: '1px solid #E4E1D8', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#34322C', fontFamily: 'inherit', outline: 'none' }} />
        <input value={f.max} onChange={e => upd({ max: e.target.value })} placeholder="Máx" style={{ flex: 1, width: '100%', height: 40, border: '1px solid #E4E1D8', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#34322C', fontFamily: 'inherit', outline: 'none' }} />
      </div>

      <div style={DIVIDER} />

      <div style={LABEL}>Envío</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={row} onClick={() => upd({ envioGratis: !f.envioGratis })}><Check checked={f.envioGratis} />Envío gratis</label>
        <label style={row} onClick={() => upd({ llegaManana: !f.llegaManana })}><Check checked={f.llegaManana} />Llega mañana</label>
      </div>
    </aside>
  );
}
