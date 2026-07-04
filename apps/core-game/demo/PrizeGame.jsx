import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, ShoppingCart, Gift, Sparkles, ChevronRight, Clock, Check,
  ShieldCheck, Lock, Mail, ArrowRight, Apple, RotateCcw, Ticket,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Market — La Tirada
 *  Demo end-to-end: explorar sin login → registro obligatorio →
 *  tirada decidida en el "servidor" → premio asociado a la cuenta con
 *  código único → carrito automático con vigencia → Mis Premios.
 *  Toda la lógica de premios refleja @core/rewards.
 * ------------------------------------------------------------------ */

const C = {
  bg: "#150E2E",
  bg2: "#1C1142",
  surface: "#251757",
  surfaceHi: "#2F2068",
  line: "rgba(180,160,255,0.14)",
  text: "#F4EFFF",
  muted: "#B3A6DD",
  gold1: "#FCD96A",
  gold2: "#E2A52B",
  goldDeep: "#7A5410",
  magenta: "#FF4D8D",
  violet: "#9A6BFF",
  mint: "#34E1A2",
};

const SEGMENTS = [
  { key: "p15", short: "15%", name: "15% de descuento", benefit: "15% OFF en tu compra", color: "#FF4D8D", deep: "#7A1E3F", weight: 26 },
  { key: "ship", short: "Envío", name: "Envío gratis", benefit: "Envío gratis", color: "#9A6BFF", deep: "#3A2570", weight: 24 },
  { key: "2x1", short: "2x1", name: "Beneficio 2x1", benefit: "2x1 en categoría seleccionada", color: C.gold2, deep: C.goldDeep, weight: 8, jackpot: true },
  { key: "p10", short: "10%", name: "10% de descuento", benefit: "10% OFF en tu compra", color: "#34E1A2", deep: "#0F5E43", weight: 22 },
  { key: "gift", short: "$500", name: "Gift Card $500", benefit: "$500 de saldo Market", color: C.gold1, deep: C.goldDeep, weight: 6, jackpot: true },
  { key: "pts", short: "+Pts", name: "Puntos x2", benefit: "Puntos Market duplicados", color: "#5BC6FF", deep: "#0E4A73", weight: 14 },
];

const VALIDITY_MS = 72 * 60 * 60 * 1000; // 72 h
const SEG = 360 / SEGMENTS.length;
const SPIN_MS = 4600;

/* tirada ponderada — el servidor decide ANTES de animar */
function drawIndex() {
  const total = SEGMENTS.reduce((s, x) => s + x.weight, 0);
  let t = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    t -= SEGMENTS[i].weight;
    if (t < 0) return i;
  }
  return SEGMENTS.length - 1;
}

function makeCode() {
  const h = () =>
    Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `${h()}-${h()}-${h()}`;
}

function polar(r, thetaDeg, cx = 170, cy = 170) {
  const a = ((thetaDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function slicePath(i, R = 150) {
  const t0 = i * SEG, t1 = (i + 1) * SEG;
  const p0 = polar(R, t0), p1 = polar(R, t1);
  return `M170 170 L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}

function fmtRemaining(ms) {
  if (ms <= 0) return "Expirado";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PrizeGame() {
  const [view, setView] = useState("home"); // home | cart | prizes
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [prizes, setPrizes] = useState([]);
  const [activePrizeId, setActivePrizeId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [demoOpen, setDemoOpen] = useState(false);
  const intentRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // recalcula estado efectivo: vencidos salen del carrito
  useEffect(() => {
    setPrizes((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.status === "AVAILABLE" && p.expiresAt <= now) {
          changed = true;
          return { ...p, status: "EXPIRED" };
        }
        return p;
      });
      if (changed) {
        const stillActive = next.find((p) => p.id === activePrizeId && p.status === "AVAILABLE");
        if (!stillActive) setActivePrizeId(null);
      }
      return changed ? next : prev;
    });
  }, [now, activePrizeId]);

  const cartItem = useMemo(() => {
    const p = prizes.find((x) => x.id === activePrizeId);
    return p && p.status === "AVAILABLE" ? p : null;
  }, [prizes, activePrizeId]);

  const availableCount = prizes.filter((p) => p.status === "AVAILABLE").length;

  function requestSpin() {
    if (spinning) return;
    if (!user) {
      intentRef.current = true;
      setShowAuth(true);
      return;
    }
    startSpin();
  }

  function onAuth(provider) {
    setUser({
      name: provider === "google" ? "Lucía Fernández" : provider === "apple" ? "Lucía F." : "Lucía Fernández",
      email: "lucia@example.com",
      provider,
    });
    setShowAuth(false);
    if (intentRef.current) {
      intentRef.current = false;
      setTimeout(() => startSpin(), 350);
    }
  }

  function startSpin() {
    const idx = drawIndex(); // decisión del servidor
    setSpinning(true);
    // landing: mid de la rebanada idx al tope (puntero)
    const targetOffset = (360 - (idx * SEG + SEG / 2)) % 360;
    setRotation((r) => {
      const base = 360 * 6;
      const delta = ((targetOffset - (r % 360)) + 360) % 360;
      return r + base + delta;
    });
    setTimeout(() => finishSpin(idx), SPIN_MS + 120);
  }

  function finishSpin(idx) {
    const seg = SEGMENTS[idx];
    const t = Date.now();
    const prize = {
      id: `pr_${t}_${Math.random().toString(36).slice(2, 7)}`,
      code: makeCode(),
      segKey: seg.key,
      name: seg.name,
      benefit: seg.benefit,
      color: seg.color,
      deep: seg.deep,
      jackpot: !!seg.jackpot,
      status: "AVAILABLE",
      createdAt: t,
      expiresAt: t + VALIDITY_MS,
      usedAt: null,
    };
    setPrizes((p) => [prize, ...p]);
    setActivePrizeId(prize.id); // carrito automático + beneficio aplicado
    setSpinning(false);
    setReveal(prize);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2800);
  }

  function usePrizeNow(id) {
    setActivePrizeId(id);
    setReveal(null);
    setView("cart");
  }

  function checkout() {
    if (!cartItem) return;
    const id = cartItem.id;
    setPrizes((p) => p.map((x) => (x.id === id ? { ...x, status: "USED", usedAt: Date.now() } : x)));
    setActivePrizeId(null);
  }

  function demoExpire(id) {
    setPrizes((p) => p.map((x) => (x.id === id ? { ...x, status: "EXPIRED", expiresAt: Date.now() - 1000 } : x)));
    if (id === activePrizeId) setActivePrizeId(null);
  }

  return (
    <div style={{ ...styles.root }}>
      <style>{css}</style>

      {/* NAV */}
      <header style={styles.nav}>
        <button onClick={() => setView("home")} style={styles.brandBtn}>
          <span style={styles.brandMark}>◆</span>
          <span style={styles.brandWord}>Market</span>
        </button>
        <nav style={styles.navRight}>
          <button
            onClick={() => setView("prizes")}
            style={{ ...styles.navLink, color: view === "prizes" ? C.text : C.muted }}
          >
            <Gift size={16} /> Mis Premios
            {availableCount > 0 && <span style={styles.dot}>{availableCount}</span>}
          </button>
          <button onClick={() => setView("cart")} style={styles.cartBtn} aria-label="Carrito">
            <ShoppingCart size={18} />
            {cartItem && <span style={styles.cartCount}>1</span>}
          </button>
          {user ? (
            <span style={styles.avatar}>{user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
          ) : (
            <button onClick={() => setShowAuth(true)} style={styles.loginPill}>Ingresar</button>
          )}
        </nav>
      </header>

      <main style={styles.main}>
        {view === "home" && (
          <HomeView
            rotation={rotation}
            spinning={spinning}
            onSpin={requestSpin}
            user={user}
          />
        )}
        {view === "cart" && (
          <CartView cartItem={cartItem} now={now} onCheckout={checkout} onGoHome={() => setView("home")} onGoPrizes={() => setView("prizes")} />
        )}
        {view === "prizes" && (
          <PrizesView
            prizes={prizes}
            now={now}
            onUse={usePrizeNow}
            onPlay={() => setView("home")}
            demoOpen={demoOpen}
            setDemoOpen={setDemoOpen}
            onDemoExpire={demoExpire}
          />
        )}
      </main>

      {/* AUTH GATE */}
      {showAuth && <AuthGate onClose={() => { setShowAuth(false); intentRef.current = false; }} onAuth={onAuth} />}

      {/* REVEAL */}
      {reveal && (
        <RevealOverlay
          prize={reveal}
          onCart={() => { setReveal(null); setView("cart"); }}
          onClose={() => setReveal(null)}
        />
      )}

      {confetti && <Confetti />}
    </div>
  );
}

/* ----------------------------- HOME ----------------------------- */
function HomeView({ rotation, spinning, onSpin, user }) {
  return (
    <div style={styles.home}>
      <div style={styles.heroCopy}>
        <span style={styles.eyebrow}><Sparkles size={13} /> Una tirada, un premio real</span>
        <h1 style={styles.h1}>
          Girá y ganá un<br />
          <span style={styles.h1Gold}>beneficio para tu próxima compra</span>
        </h1>
        <p style={styles.lede}>
          Explorá los premios sin compromiso. Para girar, creás tu cuenta gratuita
          en Market: el premio queda asociado a tu perfil y lo usás cuando quieras,
          mientras esté vigente.
        </p>
      </div>

      <div style={styles.wheelWrap}>
        <div style={styles.wheelGlow} aria-hidden />
        <div style={styles.pointer} aria-hidden />
        <svg viewBox="0 0 340 340" style={styles.wheelSvg} role="img" aria-label="Ruleta de premios">
          <defs>
            <radialGradient id="hub" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor={C.gold1} />
              <stop offset="100%" stopColor={C.gold2} />
            </radialGradient>
          </defs>
          <circle cx="170" cy="170" r="162" fill="none" stroke={C.gold2} strokeWidth="3" opacity="0.5" />
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "170px 170px",
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.16,1,0.28,1)` : "none",
            }}
          >
            {SEGMENTS.map((s, i) => {
              const mid = i * SEG + SEG / 2;
              const lp = polar(98, mid);
              return (
                <g key={s.key}>
                  <path d={slicePath(i)} fill={s.color} stroke={C.bg} strokeWidth="2.5" />
                  {s.jackpot && <path d={slicePath(i)} fill="none" stroke={C.gold1} strokeWidth="2" opacity="0.9" />}
                  <text
                    x={lp.x}
                    y={lp.y}
                    fill={s.deep}
                    fontSize="17"
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
                  >
                    {s.short}
                  </text>
                </g>
              );
            })}
            <circle cx="170" cy="170" r="34" fill="url(#hub)" stroke={C.bg} strokeWidth="4" />
            <text x="170" y="170" fill={C.goldDeep} fontSize="20" fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "Bricolage Grotesque" }}>◆</text>
          </g>
        </svg>

        <button onClick={onSpin} disabled={spinning} style={{ ...styles.spinBtn, opacity: spinning ? 0.6 : 1, cursor: spinning ? "default" : "pointer" }}>
          {spinning ? "Girando…" : user ? "Girar la ruleta" : "Girar — crear cuenta"}
          {!spinning && <ChevronRight size={18} />}
        </button>
        <p style={styles.transp}><Lock size={12} /> Sin tarjeta. El registro es parte del juego, nunca una sorpresa.</p>
      </div>

      <div style={styles.exploreRow}>
        <span style={styles.exploreLabel}>Premios posibles</span>
        <div style={styles.chips}>
          {SEGMENTS.map((s) => (
            <span key={s.key} style={{ ...styles.chip, borderColor: s.color + "66" }}>
              <span style={{ ...styles.chipDot, background: s.color }} />
              {s.name}{s.jackpot && <Sparkles size={12} color={C.gold1} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- AUTH ----------------------------- */
function AuthGate({ onClose, onAuth }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.authCard} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeX} onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div style={styles.authBadge}><Gift size={18} color={C.goldDeep} /></div>
        <h2 style={styles.authTitle}>Creá tu cuenta para jugar</h2>
        <p style={styles.authMsg}>
          Para participar y conservar tu premio, necesitás una cuenta gratuita en
          Market. Tu premio queda asociado a tu perfil y podés usarlo durante su
          período de vigencia.
        </p>
        <div style={styles.authBtns}>
          <button style={{ ...styles.oauth, ...styles.oauthGoogle }} onClick={() => onAuth("google")}>
            <GoogleG /> Continuar con Google
          </button>
          <button style={{ ...styles.oauth, ...styles.oauthApple }} onClick={() => onAuth("apple")}>
            <Apple size={18} /> Continuar con Apple
          </button>
          <div style={styles.authDivider}><span>o</span></div>
          <button style={styles.primary} onClick={() => onAuth("email")}>
            <Mail size={16} /> Crear cuenta con email
          </button>
          <button style={styles.ghost} onClick={() => onAuth("email")}>Ya tengo cuenta · Iniciar sesión</button>
        </div>
        <p style={styles.authFoot}><ShieldCheck size={12} /> El premio se vincula a tu cuenta, no a este dispositivo.</p>
      </div>
    </div>
  );
}

/* ----------------------------- REVEAL ----------------------------- */
function RevealOverlay({ prize, onCart, onClose }) {
  const [stamped, setStamped] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStamped(true), 650); return () => clearTimeout(t); }, []);
  return (
    <div style={styles.overlay}>
      <div style={styles.revealCard}>
        <button style={styles.closeX} onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <span style={styles.revealEyebrow}>{prize.jackpot ? "¡Premio mayor!" : "¡Ganaste!"}</span>
        <div style={{ ...styles.revealIcon, background: prize.color + "22", borderColor: prize.color }}>
          <Gift size={34} color={prize.color} />
        </div>
        <h2 style={styles.revealName}>{prize.name}</h2>
        <p style={styles.revealBenefit}>{prize.benefit}</p>

        <div style={{ ...styles.codeStamp, opacity: stamped ? 1 : 0, transform: stamped ? "scale(1) rotate(-3deg)" : "scale(1.4) rotate(-3deg)" }}>
          <Ticket size={13} /> {prize.code}
        </div>

        <div style={styles.ownerLine}>
          <ShieldCheck size={14} color={C.mint} />
          Quedó asociado a tu cuenta de forma permanente
        </div>

        <button style={styles.primaryGold} onClick={onCart}>
          Ir al carrito con el beneficio aplicado <ArrowRight size={17} />
        </button>
        <p style={styles.revealFoot}>Reservado por 72 h. Lo encontrás también en “Mis Premios”.</p>
      </div>
    </div>
  );
}

/* ----------------------------- CART ----------------------------- */
function CartView({ cartItem, now, onCheckout, onGoHome, onGoPrizes }) {
  const [done, setDone] = useState(false);
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>Tu carrito</h2>
      {done ? (
        <div style={styles.emptyCard}>
          <div style={{ ...styles.emptyIcon, background: "rgba(52,225,162,0.15)" }}><Check size={26} color={C.mint} /></div>
          <p style={styles.emptyTitle}>¡Compra finalizada!</p>
          <p style={styles.emptySub}>El beneficio se aplicó y el premio quedó marcado como utilizado.</p>
          <button style={styles.primary} onClick={onGoHome}>Volver a jugar</button>
        </div>
      ) : cartItem ? (
        <>
          <div style={styles.lineItem}>
            <div style={styles.liThumb}>🛍️</div>
            <div style={{ flex: 1 }}>
              <p style={styles.liName}>Compra de ejemplo</p>
              <p style={styles.liSub}>2 productos · subtotal $3.200</p>
            </div>
            <span style={styles.liPrice}>$3.200</span>
          </div>

          <div style={{ ...styles.benefitRow, borderColor: cartItem.color + "55" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.benefitIcon, background: cartItem.color + "22" }}>
                <Gift size={18} color={cartItem.color} />
              </div>
              <div>
                <p style={styles.benefitName}>{cartItem.benefit}</p>
                <p style={styles.benefitCode}><Ticket size={11} /> {cartItem.code}</p>
              </div>
            </div>
            <div style={styles.countdownPill}>
              <Clock size={13} /> {fmtRemaining(cartItem.expiresAt - now)}
            </div>
          </div>

          <div style={styles.totals}>
            <span style={styles.totalLabel}>Total con beneficio</span>
            <span style={styles.totalValue}>$2.720</span>
          </div>

          <button style={styles.primaryGold} onClick={() => { onCheckout(); setDone(true); }}>
            Finalizar compra <ArrowRight size={17} />
          </button>
          <p style={styles.cartNote}><ShieldCheck size={12} /> El premio se valida en el servidor al confirmar. Si venció, no se aplica.</p>
        </>
      ) : (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}><ShoppingCart size={24} color={C.muted} /></div>
          <p style={styles.emptyTitle}>No tenés un beneficio activo</p>
          <p style={styles.emptySub}>Girá la ruleta para ganar un premio y aplicarlo acá.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={styles.primary} onClick={onGoHome}>Jugar</button>
            <button style={styles.ghost} onClick={onGoPrizes}>Ver Mis Premios</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- PRIZES ----------------------------- */
function PrizesView({ prizes, now, onUse, onPlay, demoOpen, setDemoOpen, onDemoExpire }) {
  const ordered = [...prizes].sort((a, b) => rank(a) - rank(b) || a.expiresAt - b.expiresAt);
  function rank(p) { return { AVAILABLE: 0, USED: 1, EXPIRED: 2 }[effective(p)]; }
  function effective(p) {
    if (p.status === "USED") return "USED";
    if (p.status === "EXPIRED" || p.expiresAt <= now) return "EXPIRED";
    return "AVAILABLE";
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>Mis Premios</h2>
      {prizes.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}><Gift size={24} color={C.muted} /></div>
          <p style={styles.emptyTitle}>Todavía no ganaste premios</p>
          <p style={styles.emptySub}>Tu primera tirada te espera.</p>
          <button style={styles.primary} onClick={onPlay}>Girar la ruleta</button>
        </div>
      ) : (
        <div style={styles.prizeGrid}>
          {ordered.map((p) => {
            const st = effective(p);
            const badge = { AVAILABLE: ["Disponible", C.mint], USED: ["Utilizado", C.muted], EXPIRED: ["Expirado", C.magenta] }[st];
            return (
              <div key={p.id} style={{ ...styles.prizeCard, opacity: st === "AVAILABLE" ? 1 : 0.66 }}>
                <div style={styles.prizeTop}>
                  <div style={{ ...styles.prizeIcon, background: p.color + "22" }}><Gift size={20} color={p.color} /></div>
                  <span style={{ ...styles.badge, color: badge[1], borderColor: badge[1] + "66" }}>{badge[0]}</span>
                </div>
                <p style={styles.prizeName}>{p.name}</p>
                <p style={styles.prizeBenefit}>{p.benefit}</p>
                <div style={styles.prizeMeta}>
                  <span style={styles.metaCode}><Ticket size={11} /> {p.code}</span>
                </div>
                <div style={styles.prizeDates}>
                  <span>Obtenido {new Date(p.createdAt).toLocaleDateString("es-UY")}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: st === "AVAILABLE" ? C.text : C.muted }}>
                    <Clock size={12} /> {st === "AVAILABLE" ? fmtRemaining(p.expiresAt - now) : st === "USED" ? "Usado" : "Vencido"}
                  </span>
                </div>
                {st === "AVAILABLE" ? (
                  <button style={styles.useNow} onClick={() => onUse(p.id)}>Usar ahora <ArrowRight size={15} /></button>
                ) : (
                  <button style={styles.useDisabled} disabled>{st === "USED" ? "Ya utilizado" : "Ya no disponible"}</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {prizes.some((p) => p.status === "AVAILABLE" && p.expiresAt > now) && (
        <div style={styles.demoBox}>
          <button style={styles.demoToggle} onClick={() => setDemoOpen(!demoOpen)}>
            <RotateCcw size={12} /> Modo demo · simular vencimiento
          </button>
          {demoOpen && (
            <div style={styles.demoInner}>
              <p style={styles.demoHint}>Forzá el vencimiento para ver cómo el premio sale del carrito y pasa a “Expirado”.</p>
              {prizes.filter((p) => p.status === "AVAILABLE" && p.expiresAt > now).map((p) => (
                <button key={p.id} style={styles.demoBtn} onClick={() => onDemoExpire(p.id)}>Vencer “{p.name}”</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- bits ----------------------------- */
function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.8 + Math.random() * 1.4,
      color: [C.gold1, C.magenta, C.mint, C.violet, "#5BC6FF"][i % 5],
      size: 6 + Math.random() * 7,
      rot: Math.random() * 360,
    })),
    []
  );
  return (
    <div style={styles.confettiLayer} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute", top: "-6%", left: `${p.left}%`,
            width: p.size, height: p.size * 0.5, background: p.color,
            borderRadius: 1, transform: `rotate(${p.rot}deg)`,
            animation: `fall ${p.dur}s ${p.delay}s cubic-bezier(0.3,0.6,0.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 16 3 9.1 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7.1l-6.5 5C9 41.4 15.9 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.5l6.3 5.3C40.9 36.9 45 31 45 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/* ----------------------------- styles ----------------------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&display=swap');
@keyframes fall { to { transform: translateY(640px) rotate(540deg); opacity: 0; } }
@keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
* { box-sizing: border-box; }
button { font-family: inherit; }
::selection { background: ${C.gold2}; color: #1a1a1a; }
`;

const styles = {
  root: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: `radial-gradient(1200px 600px at 50% -10%, ${C.bg2}, ${C.bg})`,
    color: C.text, minHeight: 720, borderRadius: 16, overflow: "hidden",
    position: "relative", border: `1px solid ${C.line}`,
  },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 22px", borderBottom: `1px solid ${C.line}`,
    position: "relative", zIndex: 5,
  },
  brandBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 },
  brandMark: { color: C.gold1, fontSize: 18 },
  brandWord: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 21, color: C.text, letterSpacing: "-0.5px" },
  navRight: { display: "flex", alignItems: "center", gap: 14 },
  navLink: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, position: "relative" },
  dot: { background: C.mint, color: C.bg, fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "1px 6px", marginLeft: 2 },
  cartBtn: { position: "relative", background: C.surface, border: `1px solid ${C.line}`, color: C.text, width: 38, height: 38, borderRadius: 11, cursor: "pointer", display: "grid", placeItems: "center" },
  cartCount: { position: "absolute", top: -5, right: -5, background: C.magenta, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "1px 5px" },
  avatar: { width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold1}, ${C.gold2})`, color: C.goldDeep, fontWeight: 700, fontSize: 13, display: "grid", placeItems: "center" },
  loginPill: { background: "none", border: `1px solid ${C.line}`, color: C.text, borderRadius: 11, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },

  main: { position: "relative", zIndex: 1 },

  home: { padding: "26px 22px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  heroCopy: { maxWidth: 560 },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 6, color: C.gold1, fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 },
  h1: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 38, lineHeight: 1.04, letterSpacing: "-1px", margin: "0 0 14px" },
  h1Gold: { background: `linear-gradient(100deg, ${C.gold1}, ${C.gold2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  lede: { color: C.muted, fontSize: 15, lineHeight: 1.6, margin: "0 auto 8px", maxWidth: 500 },

  wheelWrap: { position: "relative", marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center" },
  wheelGlow: { position: "absolute", width: 360, height: 360, top: 6, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold2}33, transparent 65%)`, filter: "blur(8px)" },
  wheelSvg: { width: 320, height: 320, position: "relative", zIndex: 2, animation: "floaty 6s ease-in-out infinite" },
  pointer: { position: "absolute", top: -4, zIndex: 3, width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: `22px solid ${C.gold1}`, filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.4))` },
  spinBtn: { marginTop: 22, display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg, ${C.gold1}, ${C.gold2})`, color: "#3a2705", border: "none", borderRadius: 14, padding: "15px 30px", fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 17, boxShadow: `0 10px 30px -8px ${C.gold2}99`, zIndex: 4 },
  transp: { display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 12, marginTop: 14 },

  exploreRow: { marginTop: 32, width: "100%", maxWidth: 640 },
  exploreLabel: { fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 },
  chips: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginTop: 12 },
  chip: { display: "inline-flex", alignItems: "center", gap: 7, background: C.surface, border: "1px solid", borderRadius: 100, padding: "8px 14px", fontSize: 13, color: C.text, fontWeight: 500 },
  chipDot: { width: 8, height: 8, borderRadius: "50%" },

  overlay: { position: "absolute", inset: 0, background: "rgba(10,6,24,0.74)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 50, padding: 18 },
  authCard: { position: "relative", width: "100%", maxWidth: 400, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 20, padding: "28px 26px", textAlign: "center" },
  closeX: { position: "absolute", top: 14, right: 14, background: C.surface, border: "none", color: C.muted, borderRadius: 9, width: 30, height: 30, cursor: "pointer", display: "grid", placeItems: "center" },
  authBadge: { width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.gold1}, ${C.gold2})`, display: "grid", placeItems: "center", margin: "0 auto 14px" },
  authTitle: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 22, margin: "0 0 8px" },
  authMsg: { color: C.muted, fontSize: 13.5, lineHeight: 1.55, margin: "0 0 20px" },
  authBtns: { display: "flex", flexDirection: "column", gap: 10 },
  oauth: { display: "flex", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" },
  oauthGoogle: { background: "#fff", color: "#222" },
  oauthApple: { background: "#000", color: "#fff" },
  authDivider: { display: "flex", alignItems: "center", color: C.muted, fontSize: 12, margin: "2px 0" },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: C.violet, color: "#fff", border: "none", borderRadius: 12, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  primaryGold: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${C.gold1}, ${C.gold2})`, color: "#3a2705", border: "none", borderRadius: 13, padding: "14px 20px", fontSize: 15, fontWeight: 800, fontFamily: "Bricolage Grotesque", cursor: "pointer", width: "100%", boxShadow: `0 8px 24px -8px ${C.gold2}aa` },
  ghost: { background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: 6 },
  authFoot: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: C.muted, fontSize: 11.5, marginTop: 16 },

  revealCard: { position: "relative", width: "100%", maxWidth: 380, background: C.bg2, border: `1px solid ${C.gold2}55`, borderRadius: 22, padding: "30px 26px", textAlign: "center", boxShadow: `0 20px 60px -20px ${C.gold2}55` },
  revealEyebrow: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 14, color: C.gold1, textTransform: "uppercase", letterSpacing: "0.08em" },
  revealIcon: { width: 78, height: 78, borderRadius: "50%", border: "2px solid", display: "grid", placeItems: "center", margin: "14px auto 4px" },
  revealName: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 27, margin: "8px 0 2px", letterSpacing: "-0.5px" },
  revealBenefit: { color: C.muted, fontSize: 14.5, margin: "0 0 16px" },
  codeStamp: { display: "inline-flex", alignItems: "center", gap: 6, border: `1.5px dashed ${C.gold1}`, color: C.gold1, fontFamily: "Inter", fontWeight: 700, letterSpacing: "0.12em", fontSize: 14, padding: "7px 14px", borderRadius: 8, transition: "all 0.45s cubic-bezier(0.2,1.4,0.4,1)" },
  ownerLine: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: C.text, fontSize: 12.5, margin: "16px 0 18px", fontWeight: 500 },
  revealFoot: { color: C.muted, fontSize: 11.5, marginTop: 12 },

  page: { padding: "26px 22px 40px", maxWidth: 640, margin: "0 auto" },
  pageTitle: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 26, margin: "0 0 18px", letterSpacing: "-0.5px" },

  lineItem: { display: "flex", alignItems: "center", gap: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px" },
  liThumb: { width: 46, height: 46, borderRadius: 11, background: C.surfaceHi, display: "grid", placeItems: "center", fontSize: 22 },
  liName: { margin: 0, fontWeight: 600, fontSize: 15 },
  liSub: { margin: "2px 0 0", color: C.muted, fontSize: 13 },
  liPrice: { fontWeight: 600, fontSize: 15 },
  benefitRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: C.surface, border: "1px solid", borderRadius: 14, padding: "14px 16px", marginTop: 12, flexWrap: "wrap" },
  benefitIcon: { width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center" },
  benefitName: { margin: 0, fontWeight: 600, fontSize: 14.5 },
  benefitCode: { margin: "3px 0 0", color: C.muted, fontSize: 12, display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.08em" },
  countdownPill: { display: "inline-flex", alignItems: "center", gap: 6, background: C.bg, border: `1px solid ${C.line}`, color: C.gold1, fontSize: 13, fontWeight: 600, borderRadius: 100, padding: "7px 13px", fontVariantNumeric: "tabular-nums" },
  totals: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` },
  totalLabel: { color: C.muted, fontSize: 14 },
  totalValue: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 28 },
  cartNote: { display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 11.5, marginTop: 12, justifyContent: "center" },

  emptyCard: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, background: C.surfaceHi, display: "grid", placeItems: "center", marginBottom: 6 },
  emptyTitle: { margin: 0, fontWeight: 600, fontSize: 17, fontFamily: "Bricolage Grotesque" },
  emptySub: { margin: "0 0 10px", color: C.muted, fontSize: 13.5, maxWidth: 320 },

  prizeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 },
  prizeCard: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 16px 14px", display: "flex", flexDirection: "column" },
  prizeTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  prizeIcon: { width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center" },
  badge: { fontSize: 11.5, fontWeight: 600, border: "1px solid", borderRadius: 100, padding: "3px 10px" },
  prizeName: { margin: 0, fontWeight: 700, fontSize: 16, fontFamily: "Bricolage Grotesque" },
  prizeBenefit: { margin: "3px 0 10px", color: C.muted, fontSize: 13 },
  prizeMeta: { marginBottom: 8 },
  metaCode: { display: "inline-flex", alignItems: "center", gap: 5, color: C.muted, fontSize: 11.5, letterSpacing: "0.08em", background: C.bg, padding: "4px 9px", borderRadius: 7 },
  prizeDates: { display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: "auto", fontVariantNumeric: "tabular-nums" },
  useNow: { marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: C.mint, color: "#06311f", border: "none", borderRadius: 11, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  useDisabled: { marginTop: 12, background: C.surfaceHi, color: C.muted, border: "none", borderRadius: 11, padding: "11px", fontSize: 13.5, fontWeight: 500, cursor: "not-allowed" },

  demoBox: { marginTop: 22, borderTop: `1px dashed ${C.line}`, paddingTop: 16 },
  demoToggle: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.line}`, color: C.muted, fontSize: 12, borderRadius: 9, padding: "7px 12px", cursor: "pointer" },
  demoInner: { marginTop: 12 },
  demoHint: { color: C.muted, fontSize: 12.5, margin: "0 0 10px" },
  demoBtn: { display: "inline-flex", margin: "0 8px 8px 0", background: C.surface, border: `1px solid ${C.magenta}55`, color: C.magenta, fontSize: 12.5, borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontWeight: 500 },

  confettiLayer: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 60 },
};
