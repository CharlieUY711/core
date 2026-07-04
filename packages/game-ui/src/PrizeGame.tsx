import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, ShoppingCart, Gift, Sparkles, ChevronRight, Clock, Check,
  ShieldCheck, Lock, Mail, ArrowRight, Apple, RotateCcw, Ticket,
} from "lucide-react";
import { SEGMENTS, segmentByKey, type Segment } from "./segments.js";
import type { GameClient, GameSession, UiPrize } from "./types.js";

/* ------------------------------------------------------------------ *
 *  <PrizeGame /> — el panel del juego, reutilizable.
 *
 *  Dos contenedores, una misma UI:
 *   - mode="standalone": pantalla completa + barra superior (PWA).
 *   - mode="embedded":   se adapta a un panel del dashboard, sin barra.
 *
 *  El backend (`client`) y el login (`session`/`onLogin`) se INYECTAN, así el
 *  standalone usa su propio login y el dashboard reutiliza el suyo.
 * ------------------------------------------------------------------ */
export interface PrizeGameProps {
  /** Cómo habla con el backend (createHttpClient o createMockClient). */
  client: GameClient;
  mode?: "standalone" | "embedded";
  /** Sesión ya iniciada (en dashboard suele venir del host). */
  session?: GameSession | null;
  /** Login provisto por el host. Si falta, el panel simula una sesión (demo). */
  onLogin?: (provider: "google" | "apple" | "email") => Promise<GameSession | null>;
  /** Mostrar barra superior. Default: solo en standalone. */
  showNav?: boolean;
  /** Alto del contenedor (útil embebido, ej. 640 o "100%"). */
  height?: number | string;
  /** Segmentos de la ruleta. Default: catálogo SEGMENTS. */
  segments?: Segment[];
  /** Controles de demo (vencer premio). Solo tiene sentido con el cliente mock. */
  demoControls?: boolean;
}

const C = {
  bg: "#150E2E", bg2: "#1C1142", surface: "#251757", surfaceHi: "#2F2068",
  line: "rgba(180,160,255,0.14)", text: "#F4EFFF", muted: "#B3A6DD",
  gold1: "#FCD96A", gold2: "#E2A52B", goldDeep: "#7A5410",
  magenta: "#FF4D8D", violet: "#9A6BFF", mint: "#34E1A2",
};

const SPIN_MS = 4600;

function makeIdemKey() {
  return `play_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function polar(r: number, thetaDeg: number, cx = 170, cy = 170) {
  const a = ((thetaDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function fmtRemaining(ms: number) {
  if (ms <= 0) return "Expirado";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function effStatus(p: UiPrize, now: number): UiPrize["status"] {
  if (p.status === "AVAILABLE" && p.expiresAt <= now) return "EXPIRED";
  return p.status;
}

export default function PrizeGame(props: PrizeGameProps) {
  const {
    client, mode = "standalone", onLogin, height,
    segments = SEGMENTS, demoControls = false,
  } = props;
  const embedded = mode === "embedded";
  const showNav = props.showNav ?? !embedded;
  const SEG = 360 / segments.length;

  const [session, setSession] = useState<GameSession | null>(props.session ?? null);
  const [view, setView] = useState<"home" | "cart" | "prizes">("home");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reveal, setReveal] = useState<UiPrize | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [prizes, setPrizes] = useState<UiPrize[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showAuth, setShowAuth] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const intentRef = useRef(false);

  useEffect(() => { setSession(props.session ?? null); }, [props.session]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Carga inicial de premios del usuario.
  useEffect(() => {
    let alive = true;
    if (session) client.listPrizes().then((p) => { if (alive) setPrizes(p); }).catch(() => {});
    return () => { alive = false; };
  }, [session, client]);

  // Premios vencidos salen del carrito.
  useEffect(() => {
    setPrizes((prev) => {
      let ch = false;
      const next = prev.map((p) => {
        if (p.status === "AVAILABLE" && p.expiresAt <= now) { ch = true; return { ...p, status: "EXPIRED" as const }; }
        return p;
      });
      if (ch && !next.find((p) => p.id === activeId && p.status === "AVAILABLE")) setActiveId(null);
      return ch ? next : prev;
    });
  }, [now, activeId]);

  const cartItem = useMemo(() => {
    const p = prizes.find((x) => x.id === activeId);
    return p && effStatus(p, now) === "AVAILABLE" ? p : null;
  }, [prizes, activeId, now]);
  const availableCount = prizes.filter((p) => effStatus(p, now) === "AVAILABLE").length;

  function upsert(prize: UiPrize) {
    setPrizes((prev) => [prize, ...prev.filter((p) => p.id !== prize.id)]);
  }

  function requestSpin() {
    if (spinning) return;
    if (!session) { intentRef.current = true; setShowAuth(true); return; }
    startSpin();
  }

  async function handleLogin(provider: "google" | "apple" | "email") {
    let s: GameSession | null;
    if (onLogin) s = await onLogin(provider);
    else s = { userId: "demo-user", name: "Lucía Fernández", email: "lucia@example.com" };
    if (!s) return;
    setSession(s);
    setShowAuth(false);
    if (intentRef.current) { intentRef.current = false; setTimeout(() => startSpin(s!), 320); }
  }

  async function startSpin(s: GameSession | null = session) {
    if (!s) return;
    setSpinning(true);
    let result: UiPrize;
    try {
      result = await client.play(makeIdemKey()); // el servidor decide
    } catch {
      setSpinning(false);
      return;
    }
    const idx = Math.max(0, segments.findIndex((g) => g.key === result.segKey));
    const targetOffset = (360 - (idx * SEG + SEG / 2)) % 360;
    setRotation((r) => r + 360 * 6 + (((targetOffset - (r % 360)) + 360) % 360));
    setTimeout(() => {
      upsert(result);
      setActiveId(result.id);
      setSpinning(false);
      setReveal(result);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2800);
    }, SPIN_MS + 120);
  }

  function usePrizeNow(id: string) { setActiveId(id); setReveal(null); setView("cart"); }

  async function checkout() {
    if (!cartItem) return;
    try {
      const used = await client.use(cartItem.id);
      upsert(used);
      setActiveId(null);
    } catch {/* vencido o ya usado */}
  }

  function demoExpire(id: string) {
    setPrizes((p) => p.map((x) => (x.id === id ? { ...x, status: "EXPIRED" as const, expiresAt: Date.now() - 1000 } : x)));
    if (id === activeId) setActiveId(null);
  }

  const rootStyle: React.CSSProperties = {
    ...styles.root,
    minHeight: embedded ? 0 : 720,
    height: height ?? (embedded ? "100%" : undefined),
    borderRadius: embedded ? 14 : 16,
  };

  return (
    <div style={rootStyle}>
      <style>{css}</style>

      {showNav && (
        <header style={styles.nav}>
          <button onClick={() => setView("home")} style={styles.brandBtn}>
            <span style={styles.brandMark}>◆</span><span style={styles.brandWord}>Market</span>
          </button>
          <nav style={styles.navRight}>
            <button onClick={() => setView("prizes")} style={{ ...styles.navLink, color: view === "prizes" ? C.text : C.muted }}>
              <Gift size={16} /> Mis Premios
              {availableCount > 0 && <span style={styles.dot}>{availableCount}</span>}
            </button>
            <button onClick={() => setView("cart")} style={styles.cartBtn} aria-label="Carrito">
              <ShoppingCart size={18} />
              {cartItem && <span style={styles.cartCount}>1</span>}
            </button>
            {session
              ? <span style={styles.avatar}>{(session.name ?? "U").split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              : <button onClick={() => setShowAuth(true)} style={styles.loginPill}>Ingresar</button>}
          </nav>
        </header>
      )}

      {/* Tabs mínimas en modo embebido (sin barra de marca) */}
      {!showNav && (
        <div style={styles.embedTabs}>
          <button onClick={() => setView("home")} style={tab(view === "home")}>Jugar</button>
          <button onClick={() => setView("prizes")} style={tab(view === "prizes")}>
            Mis Premios{availableCount > 0 ? ` (${availableCount})` : ""}
          </button>
          <button onClick={() => setView("cart")} style={tab(view === "cart")}>Carrito{cartItem ? " · 1" : ""}</button>
        </div>
      )}

      <main style={{ position: "relative", zIndex: 1 }}>
        {view === "home" && (
          <HomeView rotation={rotation} spinning={spinning} onSpin={requestSpin} session={session} segments={segments} SEG={SEG} embedded={embedded} />
        )}
        {view === "cart" && (
          <CartView cartItem={cartItem} now={now} onCheckout={checkout} onGoHome={() => setView("home")} onGoPrizes={() => setView("prizes")} segments={segments} />
        )}
        {view === "prizes" && (
          <PrizesView prizes={prizes} now={now} onUse={usePrizeNow} onPlay={() => setView("home")} segments={segments}
            demoControls={demoControls} demoOpen={demoOpen} setDemoOpen={setDemoOpen} onDemoExpire={demoExpire} />
        )}
      </main>

      {showAuth && <AuthGate onClose={() => { setShowAuth(false); intentRef.current = false; }} onLogin={handleLogin} />}
      {reveal && <RevealOverlay prize={reveal} segments={segments} onCart={() => { setReveal(null); setView("cart"); }} onClose={() => setReveal(null)} />}
      {confetti && <Confetti />}
    </div>
  );
}

/* ----------------------------- HOME ----------------------------- */
function HomeView({ rotation, spinning, onSpin, session, segments, SEG, embedded }: any) {
  return (
    <div style={{ ...styles.home, padding: embedded ? "18px 18px 26px" : "26px 22px 36px" }}>
      <div style={styles.heroCopy}>
        <span style={styles.eyebrow}><Sparkles size={13} /> Una tirada, un premio real</span>
        <h1 style={{ ...styles.h1, fontSize: embedded ? 28 : 38 }}>
          Girá y ganá un<br /><span style={styles.h1Gold}>beneficio para tu compra</span>
        </h1>
        {!embedded && (
          <p style={styles.lede}>
            Explorá los premios sin compromiso. Para girar, creás tu cuenta gratuita
            en Market: el premio queda asociado a tu perfil y lo usás cuando quieras.
          </p>
        )}
      </div>

      <div style={styles.wheelWrap}>
        <div style={styles.wheelGlow} aria-hidden />
        <div style={styles.pointer} aria-hidden />
        <svg viewBox="0 0 340 340" style={{ ...styles.wheelSvg, width: embedded ? 260 : 320, height: embedded ? 260 : 320 }} role="img" aria-label="Ruleta de premios">
          <defs>
            <radialGradient id="hub" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor={C.gold1} /><stop offset="100%" stopColor={C.gold2} />
            </radialGradient>
          </defs>
          <circle cx="170" cy="170" r="162" fill="none" stroke={C.gold2} strokeWidth="3" opacity="0.5" />
          <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "170px 170px", transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.16,1,0.28,1)` : "none" }}>
            {segments.map((s: Segment, i: number) => {
              const t0 = i * SEG, t1 = (i + 1) * SEG;
              const p0 = polar(150, t0), p1 = polar(150, t1);
              const path = `M170 170 L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A 150 150 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
              const lp = polar(98, i * SEG + SEG / 2);
              return (
                <g key={s.key}>
                  <path d={path} fill={s.color} stroke={C.bg} strokeWidth="2.5" />
                  {s.jackpot && <path d={path} fill="none" stroke={C.gold1} strokeWidth="2" opacity="0.9" />}
                  <text x={lp.x} y={lp.y} fill={s.deep} fontSize="17" fontWeight="800" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>{s.short}</text>
                </g>
              );
            })}
            <circle cx="170" cy="170" r="34" fill="url(#hub)" stroke={C.bg} strokeWidth="4" />
            <text x="170" y="170" fill={C.goldDeep} fontSize="20" fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "Bricolage Grotesque" }}>◆</text>
          </g>
        </svg>

        <button onClick={onSpin} disabled={spinning} style={{ ...styles.spinBtn, opacity: spinning ? 0.6 : 1, cursor: spinning ? "default" : "pointer" }}>
          {spinning ? "Girando…" : session ? "Girar la ruleta" : "Girar — crear cuenta"}
          {!spinning && <ChevronRight size={18} />}
        </button>
        <p style={styles.transp}><Lock size={12} /> Sin tarjeta. El registro es parte del juego.</p>
      </div>

      {!embedded && (
        <div style={styles.exploreRow}>
          <span style={styles.exploreLabel}>Premios posibles</span>
          <div style={styles.chips}>
            {segments.map((s: Segment) => (
              <span key={s.key} style={{ ...styles.chip, borderColor: s.color + "66" }}>
                <span style={{ ...styles.chipDot, background: s.color }} />{s.name}{s.jackpot && <Sparkles size={12} color={C.gold1} />}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- AUTH ----------------------------- */
function AuthGate({ onClose, onLogin }: any) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.authCard} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeX} onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div style={styles.authBadge}><Gift size={18} color={C.goldDeep} /></div>
        <h2 style={styles.authTitle}>Creá tu cuenta para jugar</h2>
        <p style={styles.authMsg}>
          Para participar y conservar tu premio, necesitás una cuenta gratuita en
          Market. Tu premio queda asociado a tu perfil y podés usarlo durante su vigencia.
        </p>
        <div style={styles.authBtns}>
          <button style={{ ...styles.oauth, ...styles.oauthGoogle }} onClick={() => onLogin("google")}><GoogleG /> Continuar con Google</button>
          <button style={{ ...styles.oauth, ...styles.oauthApple }} onClick={() => onLogin("apple")}><Apple size={18} /> Continuar con Apple</button>
          <div style={styles.authDivider}><span>o</span></div>
          <button style={styles.primary} onClick={() => onLogin("email")}><Mail size={16} /> Crear cuenta con email</button>
          <button style={styles.ghost} onClick={() => onLogin("email")}>Ya tengo cuenta · Iniciar sesión</button>
        </div>
        <p style={styles.authFoot}><ShieldCheck size={12} /> El premio se vincula a tu cuenta, no a este dispositivo.</p>
      </div>
    </div>
  );
}

/* ----------------------------- REVEAL ----------------------------- */
function RevealOverlay({ prize, segments, onCart, onClose }: any) {
  const seg = segmentByKey(prize.segKey, segments);
  const [stamped, setStamped] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStamped(true), 650); return () => clearTimeout(t); }, []);
  return (
    <div style={styles.overlay}>
      <div style={styles.revealCard}>
        <button style={styles.closeX} onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <span style={styles.revealEyebrow}>{seg.jackpot ? "¡Premio mayor!" : "¡Ganaste!"}</span>
        <div style={{ ...styles.revealIcon, background: seg.color + "22", borderColor: seg.color }}><Gift size={34} color={seg.color} /></div>
        <h2 style={styles.revealName}>{prize.name}</h2>
        <p style={styles.revealBenefit}>{prize.benefitText}</p>
        <div style={{ ...styles.codeStamp, opacity: stamped ? 1 : 0, transform: stamped ? "scale(1) rotate(-3deg)" : "scale(1.4) rotate(-3deg)" }}>
          <Ticket size={13} /> {prize.code}
        </div>
        <div style={styles.ownerLine}><ShieldCheck size={14} color={C.mint} /> Quedó asociado a tu cuenta de forma permanente</div>
        <button style={styles.primaryGold} onClick={onCart}>Ir al carrito con el beneficio <ArrowRight size={17} /></button>
        <p style={styles.revealFoot}>Reservado por 72 h. También en “Mis Premios”.</p>
      </div>
    </div>
  );
}

/* ----------------------------- CART ----------------------------- */
function CartView({ cartItem, now, onCheckout, onGoHome, onGoPrizes, segments }: any) {
  const [done, setDone] = useState(false);
  const seg = cartItem ? segmentByKey(cartItem.segKey, segments) : null;
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
            <div style={{ flex: 1 }}><p style={styles.liName}>Compra de ejemplo</p><p style={styles.liSub}>2 productos · subtotal $3.200</p></div>
            <span style={styles.liPrice}>$3.200</span>
          </div>
          <div style={{ ...styles.benefitRow, borderColor: seg.color + "55" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...styles.benefitIcon, background: seg.color + "22" }}><Gift size={18} color={seg.color} /></div>
              <div><p style={styles.benefitName}>{cartItem.benefitText}</p><p style={styles.benefitCode}><Ticket size={11} /> {cartItem.code}</p></div>
            </div>
            <div style={styles.countdownPill}><Clock size={13} /> {fmtRemaining(cartItem.expiresAt - now)}</div>
          </div>
          <div style={styles.totals}><span style={styles.totalLabel}>Total con beneficio</span><span style={styles.totalValue}>$2.720</span></div>
          <button style={styles.primaryGold} onClick={() => { onCheckout(); setDone(true); }}>Finalizar compra <ArrowRight size={17} /></button>
          <p style={styles.cartNote}><ShieldCheck size={12} /> El premio se valida en el servidor al confirmar. Si venció, no se aplica.</p>
        </>
      ) : (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}><ShoppingCart size={24} color={C.muted} /></div>
          <p style={styles.emptyTitle}>No tenés un beneficio activo</p>
          <p style={styles.emptySub}>Girá la ruleta para ganar un premio y aplicarlo acá.</p>
          <div style={{ display: "flex", gap: 10 }}><button style={styles.primary} onClick={onGoHome}>Jugar</button><button style={styles.ghost} onClick={onGoPrizes}>Ver Mis Premios</button></div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- PRIZES ----------------------------- */
function PrizesView({ prizes, now, onUse, onPlay, segments, demoControls, demoOpen, setDemoOpen, onDemoExpire }: any) {
  const eff = (p: UiPrize) => (p.status === "AVAILABLE" && p.expiresAt <= now ? "EXPIRED" : p.status);
  const rank = (p: UiPrize) => ({ AVAILABLE: 0, USED: 1, EXPIRED: 2 } as any)[eff(p)];
  const ordered = [...prizes].sort((a, b) => rank(a) - rank(b) || a.expiresAt - b.expiresAt);
  const anyAvail = prizes.some((p: UiPrize) => eff(p) === "AVAILABLE");

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
          {ordered.map((p: UiPrize) => {
            const st = eff(p);
            const seg = segmentByKey(p.segKey, segments);
            const badge = ({ AVAILABLE: ["Disponible", C.mint], USED: ["Utilizado", C.muted], EXPIRED: ["Expirado", C.magenta] } as any)[st];
            return (
              <div key={p.id} style={{ ...styles.prizeCard, opacity: st === "AVAILABLE" ? 1 : 0.66 }}>
                <div style={styles.prizeTop}>
                  <div style={{ ...styles.prizeIcon, background: seg.color + "22" }}><Gift size={20} color={seg.color} /></div>
                  <span style={{ ...styles.badge, color: badge[1], borderColor: badge[1] + "66" }}>{badge[0]}</span>
                </div>
                <p style={styles.prizeName}>{p.name}</p>
                <p style={styles.prizeBenefit}>{p.benefitText}</p>
                <div style={styles.prizeMeta}><span style={styles.metaCode}><Ticket size={11} /> {p.code}</span></div>
                <div style={styles.prizeDates}>
                  <span>Obtenido {new Date(p.createdAt).toLocaleDateString("es-UY")}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: st === "AVAILABLE" ? C.text : C.muted }}>
                    <Clock size={12} /> {st === "AVAILABLE" ? fmtRemaining(p.expiresAt - now) : st === "USED" ? "Usado" : "Vencido"}
                  </span>
                </div>
                {st === "AVAILABLE"
                  ? <button style={styles.useNow} onClick={() => onUse(p.id)}>Usar ahora <ArrowRight size={15} /></button>
                  : <button style={styles.useDisabled} disabled>{st === "USED" ? "Ya utilizado" : "Ya no disponible"}</button>}
              </div>
            );
          })}
        </div>
      )}

      {demoControls && anyAvail && (
        <div style={styles.demoBox}>
          <button style={styles.demoToggle} onClick={() => setDemoOpen(!demoOpen)}><RotateCcw size={12} /> Modo demo · simular vencimiento</button>
          {demoOpen && (
            <div style={styles.demoInner}>
              <p style={styles.demoHint}>Forzá el vencimiento para ver cómo el premio sale del carrito y pasa a “Expirado”.</p>
              {prizes.filter((p: UiPrize) => eff(p) === "AVAILABLE").map((p: UiPrize) => (
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
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.5, dur: 1.8 + Math.random() * 1.4,
    color: [C.gold1, C.magenta, C.mint, C.violet, "#5BC6FF"][i % 5], size: 6 + Math.random() * 7, rot: Math.random() * 360,
  })), []);
  return (
    <div style={styles.confettiLayer} aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} style={{ position: "absolute", top: "-6%", left: `${p.left}%`, width: p.size, height: p.size * 0.5, background: p.color, borderRadius: 1, transform: `rotate(${p.rot}deg)`, animation: `pgfall ${p.dur}s ${p.delay}s cubic-bezier(0.3,0.6,0.4,1) forwards` }} />
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

function tab(active: boolean): React.CSSProperties {
  return {
    flex: 1, background: active ? C.surfaceHi : "transparent", color: active ? C.text : C.muted,
    border: "none", borderRadius: 9, padding: "9px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}

/* ----------------------------- styles ----------------------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&display=swap');
@keyframes pgfall { to { transform: translateY(640px) rotate(540deg); opacity: 0; } }
@keyframes pgfloaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
`;
const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "Inter, system-ui, sans-serif", background: `radial-gradient(1200px 600px at 50% -10%, ${C.bg2}, ${C.bg})`, color: C.text, overflow: "hidden", position: "relative", border: `1px solid ${C.line}` },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${C.line}`, position: "relative", zIndex: 5 },
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
  embedTabs: { display: "flex", gap: 6, padding: "12px 14px 0", position: "relative", zIndex: 5 },
  home: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  heroCopy: { maxWidth: 560 },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 6, color: C.gold1, fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 },
  h1: { fontFamily: "Bricolage Grotesque", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-1px", margin: "0 0 14px" },
  h1Gold: { background: `linear-gradient(100deg, ${C.gold1}, ${C.gold2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  lede: { color: C.muted, fontSize: 15, lineHeight: 1.6, margin: "0 auto 8px", maxWidth: 500 },
  wheelWrap: { position: "relative", marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center" },
  wheelGlow: { position: "absolute", width: 360, height: 360, top: 6, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold2}33, transparent 65%)`, filter: "blur(8px)" },
  wheelSvg: { position: "relative", zIndex: 2, animation: "pgfloaty 6s ease-in-out infinite" },
  pointer: { position: "absolute", top: -4, zIndex: 3, width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: `22px solid ${C.gold1}`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" },
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
  authDivider: { display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12, margin: "2px 0" },
  primary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: C.violet, color: "#fff", border: "none", borderRadius: 12, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  primaryGold: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${C.gold1}, ${C.gold2})`, color: "#3a2705", border: "none", borderRadius: 13, padding: "14px 20px", fontSize: 15, fontWeight: 800, fontFamily: "Bricolage Grotesque", cursor: "pointer", width: "100%", boxShadow: `0 8px 24px -8px ${C.gold2}aa` },
  ghost: { background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: 6 },
  authFoot: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: C.muted, fontSize: 11.5, marginTop: 16 },
  revealCard: { position: "relative", width: "100%", maxWidth: 380, background: C.bg2, border: `1px solid ${C.gold2}55`, borderRadius: 22, padding: "30px 26px", textAlign: "center", boxShadow: `0 20px 60px -20px ${C.gold2}55` },
  revealEyebrow: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 14, color: C.gold1, textTransform: "uppercase", letterSpacing: "0.08em" },
  revealIcon: { width: 78, height: 78, borderRadius: "50%", border: "2px solid", display: "grid", placeItems: "center", margin: "14px auto 4px" },
  revealName: { fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: 27, margin: "8px 0 2px", letterSpacing: "-0.5px" },
  revealBenefit: { color: C.muted, fontSize: 14.5, margin: "0 0 16px" },
  codeStamp: { display: "inline-flex", alignItems: "center", gap: 6, border: `1.5px dashed ${C.gold1}`, color: C.gold1, fontWeight: 700, letterSpacing: "0.12em", fontSize: 14, padding: "7px 14px", borderRadius: 8, transition: "all 0.45s cubic-bezier(0.2,1.4,0.4,1)" },
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
