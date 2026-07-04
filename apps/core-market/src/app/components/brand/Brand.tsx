export const BRAND = {
  name:           "Market",
  nameShort:      "Market",
  secondHand:     "Second",
  secondHandFull: "Second by Market",
  slogan:         "Tu marketplace multirrubro",
  primary:        "#3D5689",   // azul madre
  secondary:      "#0D2B55",   // navy
  accent:         "#2E7D57",   // Second (transversal)
  gourmet:        "#9B3326",
};

/* Símbolo oficial. Usa el asset real de /public/logos (PNG); si no carga,
   cae a la M-squircle dibujada por CSS. `vertical` elige plataforma/skin. */
const LOGO_FILE: Record<string, string> = {
  market: "Market", tech: "Market-Tech", home: "Market-Home",
  vestimenta: "Market-Vestimenta", entret: "Market-Entretenimiento",
  servicios: "Market-Servicios", second: "Market-Second", gourmet: "Market-Gourmet",
};
const LOGO_BG: Record<string, string> = {
  tech: "#1C6E86", home: "#A85636", vestimenta: "#7E3A70",
  entret: "#C2611F", servicios: "#50617F", second: "#2E7D57", gourmet: "#9B3326",
};

export function BrandLogo({
  size = "md",
  vertical,
  showWordmark,
}: {
  size?: "sm" | "md" | "lg";
  vertical?: "tech" | "home" | "vestimenta" | "entret" | "servicios" | "second" | "gourmet";
  showWordmark?: boolean;
}) {
  const px = { sm: 28, md: 40, lg: 64 }[size];
  const bg = vertical ? LOGO_BG[vertical] : "#3D5689";
  const src = `/logos/${LOGO_FILE[vertical ?? "market"]}.png`;
  const wm = showWordmark ?? size !== "sm";
  return (
    <span style={{
      position: "relative", display: "inline-flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      width: px, height: px, background: bg, borderRadius: "22%", flex: "none", overflow: "hidden",
    }}>
      {/* Fallback dibujado (debajo) */}
      <span style={{ fontFamily: "'Archivo Black', sans-serif", color: "#fff", fontSize: px * 0.56, lineHeight: 0.72 }}>M</span>
      {wm && <span style={{ fontFamily: "'Archivo Black', sans-serif", color: "#fff", fontSize: px * 0.18, letterSpacing: ".05em", marginTop: 1 }}>MARKET</span>}
      {/* Asset real (encima); si falla, se oculta y queda el fallback */}
      <img
        src={src}
        alt="Market"
        width={px}
        height={px}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        style={{ position: "absolute", inset: 0, width: px, height: px, borderRadius: "22%", objectFit: "cover" }}
      />
    </span>
  );
}

export function SecondHandBadge({ full = false }: { full?: boolean }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      padding:"2px 9px", borderRadius:999,
      background:"#EAF3EE", color:"#2A6B4B",
      fontSize:11, fontWeight:700, lineHeight:1.6,
    }}>
      ♻ {full ? "Second by Market" : "Second"}
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
        <span style={{ color:"#8A8678", textDecoration:"line-through", fontSize:".85em" }}>
          {moneda} {precioOriginal.toLocaleString("es-UY")}
        </span>
      )}
      <span style={{ fontFamily:"'Archivo Black', sans-serif", color:"#3D5689", fontSize:"1.1em" }}>
        {moneda} {precio.toLocaleString("es-UY")}
      </span>
      {desc && (
        <span style={{ background:"#2E7D57", color:"#fff",
          padding:"1px 7px", borderRadius:999, fontSize:11, fontWeight:700 }}>
          -{desc}% OFF
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status:string }) {
  const map: Record<string, { label:string; bg:string; color:string }> = {
    active:   { label:"Activo",   bg:"#EAF3EE", color:"#2A6B4B" },
    draft:    { label:"Borrador", bg:"#F0EFEA", color:"#56544C" },
    paused:   { label:"Pausado",  bg:"#F8EEE4", color:"#9A4B16" },
    inactive: { label:"Inactivo", bg:"#F7E9E7", color:"#9B3326" },
  };
  const cfg = map[status] || { label:status, bg:"#F0EFEA", color:"#56544C" };
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
    ok:    { bg:"#EAF3EE", color:"#2A6B4B", border:"#6BB87A", icon:"✓" },
    error: { bg:"#F7E9E7", color:"#9B3326", border:"#D98A80", icon:"✗" },
    warn:  { bg:"#F8EEE4", color:"#9A4B16", border:"#E0B48A", icon:"⚠" },
    info:  { bg:"#EBEFF6", color:"#2E4372", border:"#9DB0D0", icon:"ℹ" },
  }[type];
  return (
    <div style={{
      position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
      padding:".75rem 1.25rem", borderRadius:10,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
      fontWeight:700, fontSize:".875rem", boxShadow:"0 8px 24px rgba(0,0,0,.08)",
      display:"flex", alignItems:"center", gap:8, maxWidth:340,
    }}>
      <span>{cfg.icon}</span> {text}
    </div>
  );
}
