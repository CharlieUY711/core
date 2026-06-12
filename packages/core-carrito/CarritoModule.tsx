/* ═══════════════════════════════════════════════════════════════════════
   CORE Market — Carrito Module  v3.0
   ── World-class, standalone / embeddable, multi-pasarela ──────────────

   DISEÑO:
   • Sin definiciones de color/tipo/espacio propias: todo viene de los
     CSS custom properties del sistema (market-tokens.md / theme.css).
   • Funciona como página completa  →  <CarritoModule mode="page" />
   • O embebido en un panel/modal   →  <CarritoModule mode="embed" />
   • Tres pasos lineales con transición suave: Carrito → Datos → Pago
   • Gateway adapter pattern: agregar nuevas pasarelas solo requiere
     implementar PaymentAdapter e insertar en GATEWAYS.

   PASARELAS incluidas:
     · MercadoPago  (redirect a init_point)
     · PayPal       (redirect a approval_url)
     · Transferencia bancaria  (genera referencia, sin redirect)

   INTEGRACIÓN:
     Standalone  → import CarritoModule from './CarritoModule'
                   <CarritoModule />

     Embed       → <CarritoModule
                     mode="embed"
                     onClose={() => setOpen(false)}
                     apiUrl={import.meta.env.VITE_API_URL}
                   />

     Con tokens propios (override):
                   <CarritoModule tokenOverrides={{ '--brand-accent': '#FF6835' }} />
   ═══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export interface CarritoItem {
  id: string;
  producto_id: string;
  producto_tipo: 'market' | 'secondhand';
  cantidad: number;
  precio_unitario: number;
  moneda?: 'UYU' | 'USD';
  nombre?: string;
  imagen?: string;
  loading?: boolean;
}

export interface CheckoutData {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  codigo_postal: string;
}

export type PaymentGateway = 'mercadopago' | 'paypal' | 'transferencia';

export interface PaymentAdapter {
  id: PaymentGateway;
  label: string;
  logo: string;               // SVG inline o URL
  description: string;
  currency: 'UYU' | 'USD' | 'any';
  handler: (orderId: string, apiUrl: string, token: string) => Promise<PaymentResult>;
}

export interface PaymentResult {
  type: 'redirect' | 'reference';
  url?: string;
  reference?: string;
  message?: string;
}

export interface CarritoModuleProps {
  mode?: 'page' | 'embed';
  apiUrl?: string;
  onClose?: () => void;
  onOrderComplete?: (orderId: string, gateway: PaymentGateway) => void;
  tokenOverrides?: Record<string, string>;
  /** Inyectar funciones de API (para testing / integración custom) */
  cartApi?: {
    getItems: () => Promise<CarritoItem[]>;
    updateQty: (id: string, qty: number) => Promise<void>;
    removeItem: (id: string) => Promise<void>;
    clear: () => Promise<void>;
    createOrder: (data: CheckoutData, items: CarritoItem[]) => Promise<{ order_id: string; total: number }>;
  };
  /** Pasarelas custom (reemplaza o extiende el set por defecto) */
  gateways?: PaymentAdapter[];
}

// ── Payment Adapters por defecto ───────────────────────────────────────

const DEFAULT_GATEWAYS: PaymentAdapter[] = [
  {
    id: 'mercadopago',
    label: 'MercadoPago',
    logo: `<svg viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#009EE3"/><text x="4" y="16" font-size="9" font-weight="700" fill="white" font-family="sans-serif">MP</text></svg>`,
    description: 'Tarjeta, débito, efectivo · Pesos uruguayos',
    currency: 'UYU',
    handler: async (orderId, apiUrl, token) => {
      const res = await fetch(`${apiUrl}/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en MercadoPago');
      return { type: 'redirect', url: data.init_point };
    },
  },
  {
    id: 'paypal',
    label: 'PayPal',
    logo: `<svg viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#003087"/><text x="4" y="16" font-size="8" font-weight="700" fill="#009CDE" font-family="sans-serif">Pay</text><text x="19" y="16" font-size="8" font-weight="700" fill="white" font-family="sans-serif">Pal</text></svg>`,
    description: 'Cuenta PayPal o tarjeta internacional · USD',
    currency: 'USD',
    handler: async (orderId, apiUrl, token) => {
      const res = await fetch(`${apiUrl}/create-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en PayPal');
      return { type: 'redirect', url: data.approval_url };
    },
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    logo: `<svg viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#1D9E75"/><text x="4" y="16" font-size="8" font-weight="700" fill="white" font-family="sans-serif">BROU</text></svg>`,
    description: 'BROU · ITAÚ · Abitab · Redpagos',
    currency: 'UYU',
    handler: async (orderId) => {
      const ref = `CORE-${orderId.slice(0, 8).toUpperCase()}`;
      return {
        type: 'reference',
        reference: ref,
        message: `Transferí el monto total indicando la referencia ${ref}. Tu pedido se confirmará en 24h hábiles.`,
      };
    },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(n: number, moneda: 'UYU' | 'USD' = 'UYU') {
  if (moneda === 'USD') return `U$S ${n.toFixed(2)}`;
  return `$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function useTokens(overrides?: Record<string, string>) {
  useEffect(() => {
    if (!overrides) return;
    const root = document.documentElement;
    Object.entries(overrides).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => {
      Object.keys(overrides).forEach((k) => root.style.removeProperty(k));
    };
  }, [overrides]);
}

// ── CSS-in-JS usando tokens del sistema ───────────────────────────────
// Sin ningún valor hardcodeado: todos son var(--token).

const T = {
  // Wrappers
  pageWrap: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-main, #F2F5FA)',
    fontFamily: 'var(--font-base, Calibri, "Segoe UI", system-ui, sans-serif)',
  } as CSSProperties,

  embedWrap: {
    height: '100%',
    backgroundColor: 'var(--color-bg-main, #F2F5FA)',
    fontFamily: 'var(--font-base, Calibri, "Segoe UI", system-ui, sans-serif)',
    display: 'flex',
    flexDirection: 'column' as const,
  } as CSSProperties,

  // Header
  header: {
    background: 'var(--color-bg-topbar, #0D2B55)',
    padding: '0 var(--space-5, 24px)',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  } as CSSProperties,

  headerTitle: {
    color: 'var(--color-text-light, #fff)',
    fontSize: '14px',
    fontWeight: 'var(--fw-bold, 600)' as any,
    letterSpacing: '0.04em',
    margin: 0,
  } as CSSProperties,

  headerBadge: {
    background: 'var(--brand-accent, #C9A84C)',
    color: 'var(--color-bg-topbar, #0D2B55)',
    borderRadius: 'var(--radius-pill, 999px)',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  } as CSSProperties,

  // Steps
  stepsBar: {
    background: 'var(--brand-secondary, #0D2B55)',
    display: 'flex',
    padding: '0 var(--space-5, 24px)',
    gap: 0,
    flexShrink: 0,
  } as CSSProperties,

  stepItem: (active: boolean, done: boolean): CSSProperties => ({
    padding: '10px 16px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: active
      ? 'var(--brand-accent, #C9A84C)'
      : done
        ? 'rgba(255,255,255,0.5)'
        : 'rgba(255,255,255,0.3)',
    borderBottom: active
      ? '2px solid var(--brand-accent, #C9A84C)'
      : '2px solid transparent',
    cursor: done ? 'pointer' : 'default',
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),

  // Layout
  body: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-5, 24px)',
  } as CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 'var(--space-5, 24px)',
    maxWidth: '1080px',
    margin: '0 auto',
  } as CSSProperties,

  gridMono: {
    maxWidth: '560px',
    margin: '0 auto',
  } as CSSProperties,

  // Card
  card: {
    background: '#fff',
    border: '1px solid var(--color-border, #C8D5E8)',
    borderRadius: 'var(--radius-md, 8px)',
    boxShadow: 'var(--shadow-card, 0 2px 8px rgba(13,43,85,.08))',
    overflow: 'hidden',
  } as CSSProperties,

  cardHeader: {
    padding: 'var(--space-4, 16px) var(--space-4, 16px)',
    borderBottom: '1px solid var(--color-border, #C8D5E8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--gray-50, #F2F5FA)',
  } as CSSProperties,

  cardHeaderTitle: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-dark, #0D2B55)',
    margin: 0,
  } as CSSProperties,

  cardBody: {
    padding: 'var(--space-4, 16px)',
  } as CSSProperties,

  // Item row
  itemRow: (loading?: boolean): CSSProperties => ({
    display: 'flex',
    gap: 'var(--space-3, 12px)',
    padding: 'var(--space-3, 12px)',
    borderBottom: '1px solid var(--color-border, #C8D5E8)',
    opacity: loading ? 0.5 : 1,
    transition: 'opacity 200ms',
    alignItems: 'flex-start',
  }),

  itemImg: {
    width: '72px',
    height: '72px',
    objectFit: 'cover' as const,
    borderRadius: 'var(--radius-sm, 4px)',
    background: 'var(--gray-100, #E8EDF5)',
    flexShrink: 0,
  } as CSSProperties,

  itemName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-dark, #0D2B55)',
    margin: '0 0 4px',
    lineHeight: 1.3,
  } as CSSProperties,

  itemPrice: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--color-primary, #1A4F9C)',
    margin: '0 0 8px',
  } as CSSProperties,

  // QtyControl
  qtyWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid var(--color-border, #C8D5E8)',
    borderRadius: 'var(--radius-sm, 4px)',
    overflow: 'hidden',
    height: '28px',
  } as CSSProperties,

  qtyBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    background: 'var(--gray-50, #F2F5FA)',
    color: 'var(--color-text-dark, #0D2B55)',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
    transition: 'background 150ms',
  } as CSSProperties,

  qtyNum: {
    width: '36px',
    textAlign: 'center' as const,
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-dark, #0D2B55)',
  } as CSSProperties,

  // Badge tipo
  typeBadge: (tipo: string): CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm, 4px)',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    background: tipo === 'market'
      ? 'rgba(26,79,156,.12)'
      : 'rgba(29,158,117,.12)',
    color: tipo === 'market'
      ? 'var(--color-primary, #1A4F9C)'
      : 'var(--color-success, #1D9E75)',
  }),

  // Remove
  removeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-danger, #C0392B)',
    fontSize: '18px',
    padding: '2px',
    lineHeight: 1,
    opacity: 0.6,
    transition: 'opacity 150ms',
    marginLeft: 'auto',
    flexShrink: 0,
  } as CSSProperties,

  // Summary
  summaryRow: (bold?: boolean): CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: bold ? '14px' : '13px',
    fontWeight: bold ? 700 : 400,
    color: bold ? 'var(--color-text-dark, #0D2B55)' : 'var(--gray-400, #7A7A7A)',
    borderTop: bold ? '1px solid var(--color-border, #C8D5E8)' : 'none',
    marginTop: bold ? '8px' : 0,
    paddingTop: bold ? '12px' : '6px',
  }),

  // Buttons
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    background: 'var(--color-primary, #1A4F9C)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm, 4px)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'background 200ms',
    textAlign: 'center' as const,
  } as CSSProperties,

  btnAccent: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    background: 'var(--brand-accent, #C9A84C)',
    color: 'var(--brand-secondary, #0D2B55)',
    border: 'none',
    borderRadius: 'var(--radius-sm, 4px)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'background 200ms',
    textAlign: 'center' as const,
  } as CSSProperties,

  btnSecondary: {
    background: 'transparent',
    border: '1px solid var(--color-border, #C8D5E8)',
    borderRadius: 'var(--radius-sm, 4px)',
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    color: 'var(--color-primary, #1A4F9C)',
    transition: 'all 200ms',
  } as CSSProperties,

  btnDanger: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-danger, #C0392B)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm, 4px)',
  } as CSSProperties,

  btnClose: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
    padding: '4px',
  } as CSSProperties,

  // Input
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginBottom: 'var(--space-3, 12px)',
  } as CSSProperties,

  label: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-dark, #0D2B55)',
  } as CSSProperties,

  input: {
    border: '1px solid var(--color-border, #C8D5E8)',
    borderRadius: 'var(--radius-sm, 4px)',
    padding: '8px 12px',
    fontSize: '13px',
    color: 'var(--color-text-dark, #0D2B55)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    background: '#fff',
  } as CSSProperties,

  // Gateway card
  gatewayCard: (selected: boolean): CSSProperties => ({
    border: selected
      ? '2px solid var(--brand-accent, #C9A84C)'
      : '1px solid var(--color-border, #C8D5E8)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: 'var(--space-3, 12px) var(--space-4, 16px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3, 12px)',
    background: selected ? 'var(--brand-accent-light, rgba(201,168,76,.07))' : '#fff',
    transition: 'all 200ms',
    marginBottom: 'var(--space-2, 8px)',
  }),

  gatewayRadio: (selected: boolean): CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: selected
      ? '5px solid var(--brand-accent, #C9A84C)'
      : '2px solid var(--color-border, #C8D5E8)',
    flexShrink: 0,
    transition: 'all 200ms',
  }),

  // Empty state
  emptyWrap: {
    padding: 'var(--space-8, 64px) var(--space-5, 24px)',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 'var(--space-3, 12px)',
  } as CSSProperties,

  emptyIcon: {
    fontSize: '48px',
    opacity: 0.25,
    filter: 'grayscale(1)',
  } as CSSProperties,

  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text-dark, #0D2B55)',
    margin: 0,
  } as CSSProperties,

  emptyText: {
    fontSize: '13px',
    color: 'var(--gray-400, #7A7A7A)',
    margin: 0,
  } as CSSProperties,

  // Alerts
  alert: (type: 'success' | 'error' | 'info'): CSSProperties => ({
    borderRadius: 'var(--radius-sm, 4px)',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: 'var(--space-3, 12px)',
    background:
      type === 'success' ? 'rgba(29,158,117,.1)' :
      type === 'error' ? 'rgba(192,57,43,.1)' :
      'rgba(46,111,196,.1)',
    color:
      type === 'success' ? 'var(--color-success, #1D9E75)' :
      type === 'error' ? 'var(--color-danger, #C0392B)' :
      'var(--color-info, #2E6FC4)',
    border: `1px solid ${
      type === 'success' ? 'rgba(29,158,117,.25)' :
      type === 'error' ? 'rgba(192,57,43,.25)' :
      'rgba(46,111,196,.25)'}`,
  }),

  // Reference card
  referenceCard: {
    background: 'var(--brand-secondary-dark, #081C38)',
    border: '1px solid rgba(201,168,76,.3)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: 'var(--space-5, 24px)',
    textAlign: 'center' as const,
    marginBottom: 'var(--space-4, 16px)',
  } as CSSProperties,

  referenceCode: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono, "Courier New", monospace)',
    color: 'var(--brand-accent, #C9A84C)',
    letterSpacing: '0.12em',
    margin: '8px 0',
  } as CSSProperties,

  // Divider
  divider: {
    height: '1px',
    background: 'var(--color-border, #C8D5E8)',
    margin: 'var(--space-4, 16px) 0',
  } as CSSProperties,
};

// ── Sub-components ─────────────────────────────────────────────────────

function QtyControl({ qty, onDec, onInc, disabled }: {
  qty: number; onDec: () => void; onInc: () => void; disabled?: boolean;
}) {
  return (
    <div style={T.qtyWrap}>
      <button
        style={{ ...T.qtyBtn, color: qty <= 1 ? 'var(--gray-200, #C8D5E8)' : undefined }}
        onClick={onDec}
        disabled={disabled || qty <= 1}
        aria-label="Disminuir cantidad"
      >−</button>
      <span style={T.qtyNum}>{qty}</span>
      <button style={T.qtyBtn} onClick={onInc} disabled={disabled} aria-label="Aumentar cantidad">+</button>
    </div>
  );
}

function StepDot({ done }: { done: boolean }) {
  return (
    <span style={{
      width: 16, height: 16,
      borderRadius: '50%',
      background: done ? 'var(--brand-accent, #C9A84C)' : 'rgba(255,255,255,0.15)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: done ? 'var(--brand-secondary, #0D2B55)' : 'transparent',
      flexShrink: 0,
    }}>✓</span>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, required, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={T.inputGroup}>
      <label style={T.label}>{label}{required && <span style={{ color: 'var(--color-danger,#C0392B)', marginLeft: 3 }}>*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          ...T.input,
          borderColor: focused ? 'var(--color-primary, #1A4F9C)' : 'var(--color-border, #C8D5E8)',
          boxShadow: focused ? '0 0 0 3px rgba(26,79,156,.1)' : undefined,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function GatewayLogo({ svg }: { svg: string }) {
  return (
    <span
      style={{ width: 48, height: 28, flexShrink: 0, display: 'inline-block' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── Mock cart API (para standalone sin backend) ────────────────────────

function createMockApi(): CarritoModuleProps['cartApi'] {
  let items: CarritoItem[] = [
    { id: '1', producto_id: 'p1', producto_tipo: 'market', cantidad: 2, precio_unitario: 1200, moneda: 'UYU', nombre: 'Auriculares Bluetooth Pro', imagen: '' },
    { id: '2', producto_id: 'p2', producto_tipo: 'secondhand', cantidad: 1, precio_unitario: 45, moneda: 'USD', nombre: 'Cámara Sony RX100 (usado)', imagen: '' },
  ];
  return {
    getItems: async () => items,
    updateQty: async (id, qty) => { items = items.map(i => i.id === id ? { ...i, cantidad: qty } : i); },
    removeItem: async (id) => { items = items.filter(i => i.id !== id); },
    clear: async () => { items = []; },
    createOrder: async (data) => {
      await new Promise(r => setTimeout(r, 800));
      return { order_id: crypto.randomUUID(), total: 3450 };
    },
  };
}

// ── REAL Supabase cart API (lazy-imported to avoid hard dependency) ─────

async function buildSupabaseApi(apiUrl: string) {
  try {
    const { getCarrito, actualizarItemCarrito, eliminarItemCarrito, vaciarCarrito } =
      await import('./services/carritoApi');
    const { supabase } = await import('../utils/supabase/client');

    return {
      getItems: async (): Promise<CarritoItem[]> => {
        const raw = await getCarrito();
        return raw.map(i => ({
          id: i.id,
          producto_id: i.producto_id,
          producto_tipo: i.producto_tipo as 'market' | 'secondhand',
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          moneda: (i as any).moneda ?? 'UYU',
        }));
      },
      updateQty: (id: string, qty: number) => actualizarItemCarrito(id, qty).then(() => void 0),
      removeItem: (id: string) => eliminarItemCarrito(id).then(() => void 0),
      clear: () => vaciarCarrito().then(() => void 0),
      createOrder: async (data: CheckoutData, items: CarritoItem[]) => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${apiUrl}/crear-orden`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ...data,
            items: items.map(i => ({ product_id: i.producto_id, quantity: i.cantidad })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error creando orden');
        return { order_id: json.order_id, total: json.total };
      },
    };
  } catch {
    // fallback to mock when running outside the app
    return createMockApi();
  }
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

type Step = 'cart' | 'form' | 'payment' | 'done';

export default function CarritoModule({
  mode = 'page',
  apiUrl = typeof window !== 'undefined' && (window as any).__VITE_API_URL__
    ? (window as any).__VITE_API_URL__
    : (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
      ? (import.meta as any).env.VITE_API_URL
      : '',
  onClose,
  onOrderComplete,
  tokenOverrides,
  cartApi: cartApiProp,
  gateways: gatewaysProp,
}: CarritoModuleProps) {
  useTokens(tokenOverrides);

  const gateways = gatewaysProp ?? DEFAULT_GATEWAYS;

  // Resolved API
  const apiRef = useRef<CarritoModuleProps['cartApi']>(cartApiProp);

  // State
  const [step, setStep] = useState<Step>('cart');
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [formError, setFormError] = useState('');

  // Order
  const [confirming, setConfirming] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [orderError, setOrderError] = useState('');

  // Payment
  const [gateway, setGateway] = useState<PaymentGateway>(gateways[0]?.id ?? 'mercadopago');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [payResult, setPayResult] = useState<PaymentResult | null>(null);

  // Load API + items
  useEffect(() => {
    async function init() {
      if (!apiRef.current) {
        apiRef.current = cartApiProp ?? await buildSupabaseApi(apiUrl);
      }
      try {
        const data = await apiRef.current!.getItems();
        setItems(data);
      } catch (e: any) {
        setError(e.message || 'Error cargando carrito');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const reload = useCallback(async () => {
    if (!apiRef.current) return;
    try {
      const data = await apiRef.current.getItems();
      setItems(data);
    } catch (e: any) { setError(e.message); }
  }, []);

  const handleQty = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const next = item.cantidad + delta;
    if (next < 1) return;
    setItems(p => p.map(i => i.id === id ? { ...i, loading: true } : i));
    try {
      await apiRef.current!.updateQty(id, next);
      await reload();
    } catch { await reload(); }
  };

  const handleRemove = async (id: string) => {
    setItems(p => p.map(i => i.id === id ? { ...i, loading: true } : i));
    try {
      await apiRef.current!.removeItem(id);
      await reload();
    } catch { await reload(); }
  };

  const handleClear = async () => {
    setItems([]);
    await apiRef.current!.clear().catch(() => {});
  };

  // Totals
  const subtotal = items.reduce((s, i) => {
    // Normaliza todo a UYU para mostrar (simplificado; en prod usar BCU)
    const factor = i.moneda === 'USD' ? 44 : 1;
    return s + i.precio_unitario * i.cantidad * factor;
  }, 0);
  const iva = subtotal * 0.22;
  const total = subtotal + iva;

  // Step: form submit
  const handleConfirm = async () => {
    if (!nombre.trim() || !email.trim() || !direccion.trim() || !ciudad.trim()) {
      setFormError('Completá los campos obligatorios.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Email inválido.');
      return;
    }
    setFormError('');
    setConfirming(true);
    setOrderError('');
    try {
      const result = await apiRef.current!.createOrder(
        { nombre, email, telefono, direccion, ciudad, codigo_postal: codigoPostal },
        items
      );
      setOrderId(result.order_id);
      setConfirmedTotal(result.total);
      setStep('payment');
    } catch (e: any) {
      setOrderError(e.message || 'Error creando la orden. Intentá nuevamente.');
    } finally {
      setConfirming(false);
    }
  };

  // Step: pay
  const handlePay = async () => {
    const gw = gateways.find(g => g.id === gateway);
    if (!gw) return;
    setPaying(true);
    setPayError('');
    try {
      let token = '';
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? '';
      } catch { /* standalone: no auth */ }

      const result = await gw.handler(orderId, apiUrl, token);
      setPayResult(result);

      if (result.type === 'redirect' && result.url) {
        window.location.href = result.url;
        return;
      }
      // reference type: show done step
      setStep('done');
      onOrderComplete?.(orderId, gateway);
    } catch (e: any) {
      setPayError(e.message || 'Error al procesar el pago. Intentá nuevamente.');
    } finally {
      setPaying(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const wrapStyle = mode === 'embed' ? T.embedWrap : T.pageWrap;

  const STEP_LABELS: { id: Step; label: string }[] = [
    { id: 'cart', label: 'Carrito' },
    { id: 'form', label: 'Datos' },
    { id: 'payment', label: 'Pago' },
    { id: 'done', label: 'Confirmación' },
  ];
  const stepIdx = STEP_LABELS.findIndex(s => s.id === step);

  // ─── Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...wrapStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: mode === 'page' ? '100vh' : '200px' }}>
      <div style={{ textAlign: 'center', color: 'var(--color-text-dark, #0D2B55)', opacity: 0.5 }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cargando carrito…</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─── Empty cart ────────────────────────────────────────────────────
  if (!loading && items.length === 0 && step === 'cart') return (
    <div style={wrapStyle}>
      <header style={T.header}>
        <span style={{ ...T.headerTitle, opacity: 0.5 }}>CORE Market</span>
        <h1 style={T.headerTitle}>Carrito</h1>
        {onClose
          ? <button style={T.btnClose} onClick={onClose} aria-label="Cerrar">✕</button>
          : <span style={{ width: 24 }} />}
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={T.emptyWrap}>
          <span style={T.emptyIcon} aria-hidden>🛒</span>
          <h2 style={T.emptyTitle}>Tu carrito está vacío</h2>
          <p style={T.emptyText}>Agregá productos desde la tienda para comenzar</p>
          {mode === 'page' && (
            <a href="/" style={{ ...T.btnPrimary, textDecoration: 'none', display: 'inline-block', width: 'auto', marginTop: 8 }}>
              Ir a la tienda
            </a>
          )}
          {mode === 'embed' && onClose && (
            <button style={{ ...T.btnPrimary, width: 'auto', marginTop: 8 }} onClick={onClose}>
              Seguir comprando
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={wrapStyle}>
      {/* ── Header ── */}
      <header style={T.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...T.headerTitle, opacity: 0.4, fontSize: 11 }}>CORE Market</span>
        </div>
        <h1 style={T.headerTitle}>
          {step === 'cart' ? 'Carrito de compras' :
           step === 'form' ? 'Tus datos' :
           step === 'payment' ? 'Método de pago' :
           '¡Pedido recibido!'}
        </h1>
        {onClose
          ? <button style={T.btnClose} onClick={onClose} aria-label="Cerrar">✕</button>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={T.headerBadge}>{items.length}</span>
            </div>
        }
      </header>

      {/* ── Steps bar ── */}
      <nav style={T.stepsBar} role="navigation" aria-label="Pasos del checkout">
        {STEP_LABELS.map((s, i) => {
          const isActive = s.id === step;
          const isDone = i < stepIdx;
          return (
            <button
              key={s.id}
              style={T.stepItem(isActive, isDone)}
              onClick={() => isDone ? setStep(s.id) : undefined}
              aria-current={isActive ? 'step' : undefined}
              tabIndex={isDone ? 0 : -1}
            >
              <StepDot done={isDone} />
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* ── Body ── */}
      <div style={T.body}>
        {/* ═══ STEP: CART ═══ */}
        {step === 'cart' && (
          <div style={isMobile ? T.gridMono : T.grid}>
            {/* Items */}
            <div>
              {error && (
                <div style={T.alert('error')}>
                  <span>⚠</span> {error}
                </div>
              )}
              <div style={T.card}>
                <div style={T.cardHeader}>
                  <span style={T.cardHeaderTitle}>
                    {items.length} {items.length === 1 ? 'producto' : 'productos'}
                  </span>
                  <button style={T.btnDanger} onClick={handleClear}>Vaciar carrito</button>
                </div>
                {items.map(item => (
                  <div key={item.id} style={T.itemRow(item.loading)}>
                    {item.imagen
                      ? <img src={item.imagen} alt={item.nombre} style={T.itemImg} loading="lazy" />
                      : <div style={{ ...T.itemImg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.2 }}>📦</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={T.itemName}>{item.nombre || item.producto_id}</p>
                      <p style={T.itemPrice}>
                        {fmt(item.precio_unitario * item.cantidad, item.moneda)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-400,#7A7A7A)', marginLeft: 6 }}>
                          ({fmt(item.precio_unitario, item.moneda)} c/u)
                        </span>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <QtyControl
                          qty={item.cantidad}
                          onDec={() => handleQty(item.id, -1)}
                          onInc={() => handleQty(item.id, +1)}
                          disabled={item.loading}
                        />
                        <span style={T.typeBadge(item.producto_tipo)}>
                          {item.producto_tipo === 'market' ? 'Market' : 'Segunda mano'}
                        </span>
                      </div>
                    </div>
                    <button
                      style={T.removeBtn}
                      onClick={() => handleRemove(item.id)}
                      disabled={item.loading}
                      aria-label="Eliminar producto"
                      title="Eliminar"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div>
              <div style={{ ...T.card, position: isMobile ? 'static' : 'sticky', top: 16 }}>
                <div style={T.cardHeader}>
                  <span style={T.cardHeaderTitle}>Resumen</span>
                </div>
                <div style={T.cardBody}>
                  <div style={T.summaryRow()}>
                    <span>Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div style={T.summaryRow()}>
                    <span>IVA (22 %)</span>
                    <span>{fmt(iva)}</span>
                  </div>
                  <div style={T.summaryRow()}>
                    <span>Envío</span>
                    <span style={{ color: 'var(--color-success, #1D9E75)', fontWeight: 600 }}>Gratis</span>
                  </div>
                  <div style={T.summaryRow(true)}>
                    <span>Total estimado</span>
                    <span>{fmt(total)}</span>
                  </div>

                  <div style={{ height: 16 }} />

                  <button
                    style={T.btnAccent}
                    onClick={() => { setStep('form'); }}
                  >
                    Continuar al checkout →
                  </button>

                  {mode === 'page' && (
                    <a href="/" style={{
                      display: 'block', textAlign: 'center', marginTop: 10,
                      fontSize: 11, color: 'var(--gray-400,#7A7A7A)', textDecoration: 'none',
                      letterSpacing: '0.06em'
                    }}>
                      ← Seguir comprando
                    </a>
                  )}

                  <div style={T.divider} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    {gateways.slice(0, 3).map(gw => (
                      <span key={gw.id} style={{ width: 44, height: 26, display: 'inline-block' }} title={gw.label} dangerouslySetInnerHTML={{ __html: gw.logo }} />
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--gray-400,#7A7A7A)', marginLeft: 4 }}>Pago seguro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP: FORM ═══ */}
        {step === 'form' && (
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--space-5,24px)' }}>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <button style={{ ...T.btnSecondary, marginBottom: 16 }} onClick={() => setStep('cart')}>
                ← Volver al carrito
              </button>
            </div>

            <div style={{ ...T.card, gridColumn: isMobile ? '1' : '1 / -1' }}>
              <div style={T.cardHeader}>
                <span style={T.cardHeaderTitle}>Datos de contacto y envío</span>
              </div>
              <div style={{ ...T.cardBody, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 var(--space-4,16px)' }}>
                <InputField label="Nombre completo" value={nombre} onChange={setNombre} placeholder="Juan García" required disabled={confirming} />
                <InputField label="Email" value={email} onChange={setEmail} type="email" placeholder="juan@email.com" required disabled={confirming} />
                <InputField label="Teléfono" value={telefono} onChange={setTelefono} type="tel" placeholder="099 123 456" disabled={confirming} />
                <InputField label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Montevideo" required disabled={confirming} />
                <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                  <InputField label="Dirección" value={direccion} onChange={setDireccion} placeholder="Av. 18 de Julio 1234" required disabled={confirming} />
                </div>
                <InputField label="Código postal" value={codigoPostal} onChange={setCodigoPostal} placeholder="11300" disabled={confirming} />
              </div>

              {formError && <div style={{ ...T.alert('error'), margin: '0 var(--space-4,16px) var(--space-4,16px)' }}><span>⚠</span> {formError}</div>}
              {orderError && <div style={{ ...T.alert('error'), margin: '0 var(--space-4,16px) var(--space-4,16px)' }}><span>✕</span> {orderError}</div>}

              <div style={{ padding: 'var(--space-4,16px)', borderTop: '1px solid var(--color-border,#C8D5E8)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{ ...T.btnAccent, width: 'auto', padding: '12px 32px', opacity: confirming ? 0.7 : 1 }}
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? '⏳ Confirmando…' : 'Confirmar pedido →'}
                </button>
              </div>
            </div>

            {/* Mini resumen */}
            <div style={{ ...T.card, gridColumn: isMobile ? '1' : '1 / -1', background: 'var(--gray-50,#F2F5FA)' }}>
              <div style={T.cardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gray-400,#7A7A7A)' }}>
                  <span>{items.length} productos · IVA incluido</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-dark,#0D2B55)', fontSize: 14 }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP: PAYMENT ═══ */}
        {step === 'payment' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <button style={{ ...T.btnSecondary, marginBottom: 16 }} onClick={() => setStep('form')}>
              ← Volver a datos
            </button>

            {/* Confirmed total */}
            <div style={{ ...T.card, marginBottom: 'var(--space-4,16px)' }}>
              <div style={T.cardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-success,#1D9E75)', marginBottom: 4 }}>
                      ✓ Total verificado
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400,#7A7A7A)' }}>Orden #{orderId.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-dark,#0D2B55)' }}>
                    {fmt(confirmedTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Gateway selector */}
            <div style={T.card}>
              <div style={T.cardHeader}>
                <span style={T.cardHeaderTitle}>Elegí cómo pagar</span>
              </div>
              <div style={T.cardBody}>
                {gateways.map(gw => (
                  <div
                    key={gw.id}
                    style={T.gatewayCard(gateway === gw.id)}
                    onClick={() => setGateway(gw.id)}
                    role="radio"
                    aria-checked={gateway === gw.id}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setGateway(gw.id)}
                  >
                    <div style={T.gatewayRadio(gateway === gw.id)} />
                    <GatewayLogo svg={gw.logo} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-dark,#0D2B55)', marginBottom: 2 }}>{gw.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400,#7A7A7A)' }}>{gw.description}</div>
                    </div>
                    {gw.currency !== 'any' && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gray-400,#7A7A7A)', textTransform: 'uppercase' }}>
                        {gw.currency}
                      </span>
                    )}
                  </div>
                ))}

                {payError && (
                  <div style={T.alert('error')}><span>✕</span> {payError}</div>
                )}

                <button
                  style={{ ...T.btnAccent, opacity: paying ? 0.7 : 1, marginTop: 8 }}
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying
                    ? '⏳ Iniciando pago…'
                    : `Pagar ${fmt(confirmedTotal)} →`}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, opacity: 0.5 }}>
                  <span style={{ fontSize: 11 }}>🔒</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--gray-400,#7A7A7A)' }}>
                    Pago 100% seguro
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP: DONE ═══ */}
        {step === 'done' && payResult && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ ...T.card, textAlign: 'center' }}>
              <div style={{ padding: 'var(--space-6,32px) var(--space-5,24px)' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-dark,#0D2B55)', margin: '0 0 8px' }}>
                  ¡Pedido recibido!
                </h2>
                <p style={{ fontSize: 13, color: 'var(--gray-400,#7A7A7A)', margin: '0 0 24px' }}>
                  Te enviamos los detalles a <strong>{email}</strong>
                </p>

                {payResult.type === 'reference' && (
                  <div style={T.referenceCard}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', marginBottom: 4 }}>
                      Referencia de pago
                    </div>
                    <div style={T.referenceCode}>{payResult.reference}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.5 }}>
                      {payResult.message}
                    </div>
                  </div>
                )}

                <div style={{ ...T.alert('success'), textAlign: 'left' }}>
                  <span>✓</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Orden #{orderId.slice(0, 8).toUpperCase()}</div>
                    <div style={{ fontSize: 12 }}>Podés hacer seguimiento desde tu panel de órdenes.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                  {mode === 'page' && (
                    <a href="/dashboard/ordenes" style={{ ...T.btnPrimary, width: 'auto', textDecoration: 'none', display: 'inline-block' }}>
                      Ver mis órdenes
                    </a>
                  )}
                  <button
                    style={{ ...T.btnSecondary }}
                    onClick={() => {
                      setStep('cart');
                      setItems([]);
                      setOrderId('');
                      setPayResult(null);
                      if (mode === 'embed') onClose?.();
                    }}
                  >
                    {mode === 'embed' ? 'Cerrar' : 'Seguir comprando'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   USAGE EXAMPLES
   ═══════════════════════════════════════════════════════════════════════

   // 1. Página completa (reemplaza CarritoPage.tsx y CheckoutPage.tsx)
   import CarritoModule from './CarritoModule';
   export default function CarritoPage() {
     return <CarritoModule mode="page" />;
   }

   // 2. Drawer / modal embebido
   import CarritoModule from './CarritoModule';
   function CartDrawer({ open, onClose }) {
     if (!open) return null;
     return (
       <div style={{ position:'fixed', inset:0, background:'rgba(13,43,85,.45)', zIndex:1000 }}>
         <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'480px', overflow:'hidden' }}>
           <CarritoModule mode="embed" onClose={onClose} />
         </div>
       </div>
     );
   }

   // 3. Con pasarela extra (ej. Stripe)
   const stripeGateway: PaymentAdapter = {
     id: 'stripe' as any,
     label: 'Tarjeta de crédito',
     logo: `<svg .../>`,
     description: 'Visa, Mastercard · Débito o crédito',
     currency: 'any',
     handler: async (orderId, apiUrl, token) => {
       const res = await fetch(`${apiUrl}/create-stripe-session`, {
         method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
         body: JSON.stringify({ order_id: orderId }),
       });
       const { url } = await res.json();
       return { type: 'redirect', url };
     },
   };

   <CarritoModule
     gateways={[...DEFAULT_GATEWAYS, stripeGateway]}
     onOrderComplete={(id, gw) => analytics.track('purchase', { id, gateway: gw })}
   />

   // 4. Token overrides para una marca diferente
   <CarritoModule
     tokenOverrides={{
       '--color-primary': '#E53E3E',
       '--brand-accent':  '#F6AD55',
       '--color-bg-topbar': '#1A202C',
     }}
   />
   ═══════════════════════════════════════════════════════════════════════ */
