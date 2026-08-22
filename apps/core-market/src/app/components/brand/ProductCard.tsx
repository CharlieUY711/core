import { SecondHandBadge, PriceBadge, StatusBadge } from "./Brand";

export interface ProductCardData {
  id:               string;
  nombre:           string;
  tipo:             "market" | "secondhand";
  precio:           number;
  precio_original?: number;
  moneda?:          string;
  imagen_principal?: string;
  condicion?:       string;
  status?:          string;
  rating_promedio?: number;
  rating_count?:    number;
  envio_gratis?:    boolean;
}

interface Props {
  producto:   ProductCardData;
  onClick?:   () => void;
  compact?:   boolean;
}

export default function ProductCard({ producto: p, onClick, compact = false }: Props) {
  const desc = p.precio_original && p.precio_original > p.precio
    ? Math.round((1 - p.precio / p.precio_original) * 100)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background:"#fff",
        border:"1px solid var(--border)",
        borderRadius:14,
        overflow:"hidden",
        cursor: onClick ? "pointer" : "default",
        transition:"all .15s",
        boxShadow:"0 1px 3px rgba(0,0,0,.06)",
        display:"flex",
        flexDirection:"column",
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,.1)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.06)")}
    >
      {/* Imagen */}
      <div style={{ position:"relative", background:"var(--gray-50)",
        paddingBottom: compact ? "75%" : "100%", overflow:"hidden" }}>
        {p.imagen_principal ? (
          <img src={p.imagen_principal} alt={p.nombre}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", transition:"transform .2s" }}
            onMouseEnter={e => onClick && ((e.target as HTMLImageElement).style.transform = "scale(1.04)")}
            onMouseLeave={e => ((e.target as HTMLImageElement).style.transform = "scale(1)")}
          />
        ) : (
          <div style={{ position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center", fontSize:"2.5rem", color:"#D1D5DB" }}>
            🛍
          </div>
        )}

        {/* Badges flotantes */}
        <div style={{ position:"absolute", top:8, left:8,
          display:"flex", flexDirection:"column", gap:4 }}>
          {p.tipo === "secondhand" && <SecondHandBadge />}
          {desc && (
            <span style={{ background:"var(--brand-madre)", color:"#fff",
              padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>
              -{desc}% OFF
            </span>
          )}
        </div>

        {p.envio_gratis && (
          <div style={{ position:"absolute", bottom:8, left:8,
            background:"color-mix(in srgb, var(--color-success) 90%, transparent)", color:"#fff",
            padding:"2px 7px", borderRadius:999, fontSize:10, fontWeight:700 }}>
            Envío gratis
          </div>
        )}

        {p.status && p.status !== "active" && (
          <div style={{ position:"absolute", inset:0,
            background:"rgba(0,0,0,.4)", display:"flex",
            alignItems:"center", justifyContent:"center" }}>
            <StatusBadge status={p.status} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: compact ? ".75rem" : "1rem",
        display:"flex", flexDirection:"column", gap:6, flex:1 }}>

        {/* Condición para secondhand */}
        {p.tipo === "secondhand" && p.condicion && (
          <span style={{ fontSize:11, color:"var(--mute)",
            background:"#F3F4F6", padding:"1px 7px",
            borderRadius:999, alignSelf:"flex-start" }}>
            {p.condicion}
          </span>
        )}

        {/* Nombre */}
        <div style={{ fontSize: compact ? ".85rem" : ".9rem",
          fontWeight:600, color:"#111",
          overflow:"hidden", textOverflow:"ellipsis",
          display:"-webkit-box", WebkitLineClamp:2,
          WebkitBoxOrient:"vertical" as any, lineHeight:1.4 }}>
          {p.nombre}
        </div>

        {/* Precio */}
        <div style={{ marginTop:"auto", paddingTop:4 }}>
          <PriceBadge precio={p.precio} precioOriginal={p.precio_original}
            moneda={p.moneda || "UYU"} />
        </div>

        {/* Rating */}
        {p.rating_promedio && p.rating_promedio > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:4,
            fontSize:11, color:"var(--mute)" }}>
            <span style={{ color:"var(--brand-madre)" }}>{"★".repeat(Math.round(p.rating_promedio))}</span>
            <span>{p.rating_promedio.toFixed(1)}</span>
            {p.rating_count && <span>({p.rating_count})</span>}
          </div>
        )}
      </div>
    </div>
  );
}

