export const BRAND = {
  name:           "Market",
  nameShort:      "Charlie",
  secondHand:     "Second Hand",
  secondHandFull: "Second Hand by Charlie Market",
  slogan:         "Tu marketplace de confianza",
  primary:        "#C9A84C",   // --color-accent de theme.css
  secondary:      "#0D2B55",   // --color-bg-sidebar de theme.css
  accent:         "#1DC878",
};

export function BrandLogo({ size = "md" }: { size?: "sm"|"md"|"lg" }) {
  const sizes = { sm:"1rem", md:"1.2rem", lg:"1.6rem" };
  return (
    <span style={{ fontWeight:800, fontSize:sizes[size], letterSpacing:"-.3px", lineHeight:1 }}>
      <span style={{ color:"#FF7A00" }}>Charlie</span>
      <span style={{ color:"#0F3460" }}> Market</span>
    </span>
  );
}

export function SecondHandBadge({ full = false }: { full?: boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      padding:"2px 9px", borderRadius:999,
      background:"rgba(29,200,120,.1)", color:"#16a061",
      fontSize:11, fontWeight:700, lineHeight:1.6,
    }}>
      ♻ {full ? "Second Hand by Charlie Market" : "Second Hand"}
    </span>
  );
}

export function PriceBadge({ precio, precioOriginal, moneda = "UYU" }:
  { precio:number; precioOriginal?:number; moneda?:string }) {
  const desc = precioOriginal && precioOriginal > precio
    ? Math.round((1 - precio / precioOriginal) * 100)
    : null;
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
      {precioOriginal && precioOriginal > precio && (
        <span style={{ color:"#9CA3AF", textDecoration:"line-through", fontSize:".85em" }}>
          {moneda} {precioOriginal.toLocaleString("es-UY")}
        </span>
      )}
      <span style={{ color:"#FF7A00", fontWeight:800, fontSize:"1.1em" }}>
        {moneda} {precio.toLocaleString("es-UY")}
      </span>
      {desc && (
        <span style={{ background:"#FF7A00", color:"#fff",
          padding:"1px 7px", borderRadius:999, fontSize:11, fontWeight:700 }}>
          -{desc}% OFF
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status:string }) {
  const map: Record<string, { label:string; bg:string; color:string }> = {
    active:   { label:"Activo",   bg:"#dcfce7", color:"#166534" },
    draft:    { label:"Borrador", bg:"#F3F4F6", color:"#6B7280" },
    paused:   { label:"Pausado",  bg:"#fef9c3", color:"#854d0e" },
    inactive: { label:"Inactivo", bg:"#fee2e2", color:"#991b1b" },
  };
  const cfg = map[status] || { label:status, bg:"#F3F4F6", color:"#6B7280" };
  return (
    <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:999,
      background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700 }}>
      {cfg.label}
    </span>
  );
}

export function Toast({ text, type = "ok" }:
  { text:string; type?:"ok"|"error"|"warn"|"info" }) {
  const cfg = {
    ok:    { bg:"#f0fdf4", color:"#166534", border:"#6BB87A", icon:"✓" },
    error: { bg:"#fef2f2", color:"#dc2626", border:"#ef4444", icon:"✗" },
    warn:  { bg:"#fffbeb", color:"#92400e", border:"#fde68a", icon:"⚠" },
    info:  { bg:"#eff6ff", color:"#1e40af", border:"#93c5fd", icon:"ℹ" },
  }[type];
  return (
    <div style={{
      position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
      padding:".75rem 1.25rem", borderRadius:10,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
      fontWeight:700, fontSize:".875rem", boxShadow:"0 4px 16px rgba(0,0,0,.1)",
      display:"flex", alignItems:"center", gap:8, maxWidth:340,
    }}>
      <span>{cfg.icon}</span> {text}
    </div>
  );
}

