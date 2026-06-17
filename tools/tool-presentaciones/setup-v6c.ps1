# CORE V6c — español completo + espacios reducidos + difference fix
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "CORE V6c" -ForegroundColor Cyan

$path = "$base\components\experience\sections\DifferenceSection.tsx"
$content = @'
"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function DifferenceSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  return (
    <section id="difference" ref={ref} style={{
      position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
      background: "#0A1F3D", borderTop: "1px solid #1e3354"
    }}>
      <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "80px 24px" }}>

        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
            letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "64px" }}>
          {t.difference.label}
        </motion.p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", marginBottom: "80px" }}>

          {/* Before */}
          <div>
            <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              style={{ fontFamily: "monospace", fontSize: "11px", color: "#4a6080",
                letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "32px" }}>
              {t.difference.before_label}
            </motion.p>
            {t.difference.before.map((item, i) => (
              <motion.p key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 0.55 - i * 0.1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.15, duration: 1 }}
                style={{
                  fontWeight: 700, fontSize: "clamp(22px, 2.8vw, 36px)",
                  color: "#4a6080", lineHeight: 1.25, marginBottom: "14px",
                  textDecoration: "line-through",
                  textDecorationColor: `rgba(74,96,128,${0.4 - i * 0.06})`,
                }}>
                {item}
              </motion.p>
            ))}
          </div>

          {/* After — texto puro, sin gradiente WebkitTextFillColor */}
          <div>
            <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
                letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "32px" }}>
              {t.difference.after_label}
            </motion.p>
            {t.difference.after.map((item, i) => (
              <motion.p key={item}
                initial={{ opacity: 0, x: 30 }}
                animate={inView ? { opacity: 0.7 + i * 0.1, x: 0 } : {}}
                transition={{ delay: 0.8 + i * 0.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontWeight: 700,
                  fontSize: `clamp(${22 + i * 2}px, ${2.8 + i * 0.15}vw, ${36 + i * 3}px)`,
                  color: "#ffffff",
                  lineHeight: 1.25, marginBottom: "14px",
                }}>
                {item}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Claim */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.6 }}
          style={{ paddingTop: "40px", borderTop: "1px solid #1e3354" }}>
          <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.8 }}
            style={{ color: "#4a6080", fontSize: "clamp(14px,1.5vw,20px)", marginBottom: "8px",
              textDecoration: "line-through", textDecorationColor: "rgba(74,96,128,0.3)" }}>
            {t.claim.before}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 2, duration: 0.8 }}
            style={{ fontWeight: 700, fontSize: "clamp(22px,3vw,44px)", color: "#7db8f7" }}>
            {t.claim.after}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/DifferenceSection.tsx" -ForegroundColor Green

$path = "$base\components\experience\sections\GlobalSection.tsx"
$content = @'
"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/experience/i18n-context";

const CoreGlobe = dynamic(
  () => import("@/components/experience/visuals/CoreGlobe").then(m => m.CoreGlobe),
  { ssr: false, loading: () => <div style={{ aspectRatio: "16/9", background: "#0A1F3D" }} /> }
);

const GLOBAL_TEXT = {
  es: {
    label: "Alcance global",
    title: "Nacido en LATAM,\ncon proyección global.",
    sub: "No es un software. Es infraestructura para operar desde un único lugar.",
    regions: ["Europa", "Asia", "Norte América"],
  },
  pt: {
    label: "Alcance global",
    title: "Nascido na LATAM,\ncom projeção global.",
    sub: "Não é software. É infraestrutura para operar a partir de um único lugar.",
    regions: ["Europa", "Ásia", "América do Norte"],
  },
  en: {
    label: "Global reach",
    title: "Born in LATAM,\nbuilt for the world.",
    sub: "Not software. Infrastructure to operate from a single place.",
    regions: ["Europe", "Asia", "North America"],
  },
};

export function GlobalSection() {
  const { locale } = useI18n();
  const txt = GLOBAL_TEXT[locale];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <section id="global" ref={ref} style={{ position: "relative", background: "#0A1F3D", borderTop: "1px solid #1e3354" }}>

      {/* Header — espacio reducido */}
      <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "56px 24px 16px" }}>
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
            letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
          {txt.label}
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          style={{ fontWeight: 700, fontSize: "clamp(28px,4vw,52px)", lineHeight: 1.15,
            marginBottom: "12px", whiteSpace: "pre-line", color: "#ffffff" }}>
          {txt.title}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          style={{ color: "#8fa3bf", fontSize: "clamp(14px,1.4vw,17px)", maxWidth: "540px",
            lineHeight: 1.6, fontWeight: 300 }}>
          {txt.sub}
        </motion.p>
      </div>

      {/* Globo — sin margen superior extra */}
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
        style={{ position: "relative", width: "100%" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "80px",
          zIndex: 10, pointerEvents: "none",
          background: "linear-gradient(to bottom, #0A1F3D 0%, transparent 100%)" }} />
        <CoreGlobe activeLayer="all" autoRotate={false} className="w-full" />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px",
          zIndex: 10, pointerEvents: "none",
          background: "linear-gradient(to top, #0A1F3D 0%, transparent 100%)" }} />
      </motion.div>

      {/* Regiones */}
      <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "8px 24px 56px" }}>
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {txt.regions.map((r, i) => (
            <span key={r} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
                letterSpacing: "0.1em", textTransform: "uppercase" }}>{r}</span>
              {i < txt.regions.length - 1 && <span style={{ color: "#1e3354" }}>→</span>}
            </span>
          ))}
          <span style={{ color: "#1e3354" }}>→</span>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#ffffff",
            letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>CORE</span>
          <span style={{ color: "#1e3354" }}>→</span>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
            letterSpacing: "0.1em", textTransform: "uppercase" }}>LATAM</span>
        </motion.div>
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/GlobalSection.tsx" -ForegroundColor Green

$path = "$base\components\experience\sections\VisionSection.tsx"
$content = @'
"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

function Counter({ target, suffix, label, delay, inView }: { target:number; suffix:string; label:string; delay:number; inView:boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now() + delay*1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 0) return;
      const p = Math.min(elapsed/1500, 1);
      const eased = p===1 ? 1 : 1-Math.pow(2,-10*p);
      setValue(Math.round(eased*target));
      if (p===1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, delay]);
  return (
    <motion.div initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay}}
      style={{padding:"24px",borderRadius:"16px",border:"1px solid #1e3354",
        background:"rgba(15,56,117,0.12)"}}>
      <p style={{fontWeight:700,lineHeight:1,marginBottom:"8px",
        fontSize:"clamp(36px,4vw,56px)",
        background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
        {target>=1000?value.toLocaleString():value}{suffix}
      </p>
      <p style={{color:"#8fa3bf",fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</p>
    </motion.div>
  );
}

export function VisionSection() {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-20% 0px" });
  return (
    <section id="vision" ref={ref} style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",background:"#0A1F3D",borderTop:"1px solid #1e3354"}}>
      <div style={{width:"100%",maxWidth:"1280px",margin:"0 auto",padding:"128px 24px"}}>
        <motion.p initial={{opacity:0}} animate={inView?{opacity:1}:{}}
          style={{fontFamily:"monospace",fontSize:"11px",color:"#8fa3bf",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"24px"}}>
          {t.vision.label}
        </motion.p>
        <motion.h2 initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:0.2}}
          style={{fontWeight:700,fontSize:"clamp(28px,3.5vw,48px)",marginBottom:"64px",
            background:"linear-gradient(135deg,#fff 30%,#7db8f7 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          {t.vision.title}
        </motion.h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px",marginBottom:"80px"}}>
          {t.vision.stats.map((s,i) => (
            <Counter key={s.label} target={s.value} suffix={s.suffix} label={s.label} delay={0.2+i*0.15} inView={inView} />
          ))}
        </div>
        <motion.div initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:1}} style={{marginBottom:"64px"}}>
          <p style={{fontWeight:700,color:"#8fa3bf",fontSize:"clamp(20px,3vw,40px)",marginBottom:"8px"}}>
            {locale === "pt" ? "Isso não é um produto de software." : locale === "en" ? "This is not a software product." : "Esto no es un producto de software."}
          </p>
          <p style={{fontWeight:700,fontSize:"clamp(20px,3vw,40px)",
            background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {t.vision.title}
          </p>
        </motion.div>
        <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:1.4}}
          style={{paddingTop:"48px",borderTop:"1px solid #1e3354",marginBottom:"48px"}}>
          <p style={{color:"#4a6080",fontSize:"clamp(14px,1.5vw,20px)",marginBottom:"8px",
            textDecoration:"line-through",textDecorationColor:"rgba(74,96,128,0.3)"}}>
            {t.claim.before}
          </p>
          <p style={{fontWeight:700,fontSize:"clamp(20px,2.5vw,36px)",
            background:"linear-gradient(135deg,#7db8f7 0%,#fff 60%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {t.claim.after}
          </p>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:1.8}}>
          <a href="mailto:hello@core.com"
            style={{display:"inline-block",padding:"14px 32px",borderRadius:"12px",
              background:"#1b5ac4",color:"white",fontWeight:500,fontSize:"14px",
              textDecoration:"none",transition:"background 0.2s"}}
            onMouseEnter={e=>(e.currentTarget.style.background="#3b82f6")}
            onMouseLeave={e=>(e.currentTarget.style.background="#1b5ac4")}>
            {t.vision.cta} →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/VisionSection.tsx" -ForegroundColor Green

$path = "$base\components\experience\sections\WhatIfSection.tsx"
$content = @'
"use client";
import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

const POS = [
  { x: 50, y: 50 },
  { x: 50, y: 12 },
  { x: 83, y: 31 },
  { x: 83, y: 69 },
  { x: 50, y: 88 },
  { x: 17, y: 69 },
  { x: 17, y: 31 },
];

const FROM = [
  { x: 50, y: 50 },
  { x: 50, y: -8 },
  { x: 108, y: 22 },
  { x: 108, y: 78 },
  { x: 50, y: 108 },
  { x: -8, y: 78 },
  { x: -8, y: 22 },
];

const COLORS = ["#4A90E8", "#c9993a", "#1D9E75", "#e84a6b", "#7B68EE", "#E8904A"];

export function WhatIfSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = 500; const H = 500;
    canvas.width = W; canvas.height = H;

    const pts = POS.map(p => ({ x: p.x / 100 * W, y: p.y / 100 * H }));
    const center = pts[0];

    const balls = COLORS.map((color, i) => ({
      color, t: i / COLORS.length,
      speed: 0.004 + i * 0.0003,
      nodeIdx: 1 + i,
      toCenter: true,
    }));

    let ringRadius = 0;
    const maxRing = 60;
    let ts0 = 0;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function drawEllipse(cx: number, cy: number, rx: number, ry: number) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }

    function draw(ts: number) {
      if (!ts0) ts0 = ts;
      ctx.clearRect(0, 0, W, H);

      // Líneas de conexión
      for (let i = 1; i < pts.length; i++) {
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = "rgba(74,144,232,0.18)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Círculos concéntricos — transparencia plena, solo borde visible
      if (ringRadius < maxRing) ringRadius += 0.06;
      const rp = Math.min(ringRadius / maxRing, 1);
      // Interpolar amarillo → verde
      const rc = Math.round(lerp(201, 29, rp));
      const gc = Math.round(lerp(153, 158, rp));
      const bc = Math.round(lerp(58, 117, rp));

      for (let ring = 1; ring <= 4; ring++) {
        const rr = ringRadius * ring * 0.55;
        const alpha = Math.max(0, (0.35 - ring * 0.07) * rp);
        ctx.beginPath();
        ctx.arc(center.x, center.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = `rgba(${rc},${gc},${bc},${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Elipses de nodos externos — tamaño suficiente para el texto
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        const label = ["", "Entidad", "Producto", "Operación", "Relación", "Documento", "Evento"][i];
        const textW = ctx.measureText(label).width;
        const rx = Math.max(textW / 2 + 12, 30);
        const ry = 14;

        // Fondo elipse
        ctx.fillStyle = "rgba(13,43,85,0.85)";
        ctx.strokeStyle = "rgba(30,51,84,0.8)";
        ctx.lineWidth = 1;
        drawEllipse(p.x, p.y, rx, ry);
        ctx.fill();
        ctx.stroke();

        // Texto
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "500 11px 'Inter', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, p.x, p.y);
      }

      // Bolitas animadas
      balls.forEach(ball => {
        ball.t += ball.speed;
        if (ball.t >= 1) { ball.t = 0; ball.toCenter = !ball.toCenter; }
        const from = ball.toCenter ? pts[ball.nodeIdx] : center;
        const to   = ball.toCenter ? center : pts[ball.nodeIdx];
        const e = ball.t < 0.5 ? 2 * ball.t * ball.t : 1 - Math.pow(-2 * ball.t + 2, 2) / 2;
        const bx = lerp(from.x, to.x, e);
        const by = lerp(from.y, to.y, e);

        // Glow
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 7);
        bg.addColorStop(0, ball.color + "99");
        bg.addColorStop(1, ball.color + "00");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
        // Bolita
        ctx.fillStyle = ball.color;
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      });

      // Nodo central CORE — elipse
      const grd = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 28);
      grd.addColorStop(0, "rgba(27,90,196,0.5)");
      grd.addColorStop(1, "rgba(27,90,196,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(center.x, center.y, 28, 0, Math.PI * 2); ctx.fill();

      drawEllipse(center.x, center.y, 32, 18);
      ctx.fillStyle = "#1A4F9C"; ctx.fill();
      ctx.strokeStyle = "rgba(74,144,232,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("CORE", center.x, center.y);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView]);

  return (
    <section id="whatif" ref={ref} style={{
      position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
      background: "#0A1F3D", borderTop: "1px solid #1e3354"
    }}>
      <div style={{
        width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "80px 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "center"
      }}>
        {/* Canvas */}
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          style={{ position: "relative", width: "100%", maxWidth: "500px", margin: "0 auto" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
        </motion.div>

        {/* Texto */}
        <div>
          <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
              letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.whatif.question}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ fontWeight: 700, fontSize: "clamp(28px,4vw,56px)", lineHeight: 1.1,
              marginBottom: "24px", color: "#ffffff" }}>
            {t.whatif.question}
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
            style={{ color: "#8fa3bf", fontSize: "clamp(14px,1.5vw,18px)",
              lineHeight: 1.7, marginBottom: "32px", fontWeight: 300 }}>
            {t.whatif.sub}
          </motion.p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {t.whatif.primitives.map((p, i) => (
              <motion.div key={p}
                initial={{ opacity: 0, x: -16 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.7 + i * 0.07 }}
                style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#c9993a", fontSize: "14px" }}>◆</span>
                <span style={{ color: "#8fa3bf", fontSize: "14px" }}>{p}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/WhatIfSection.tsx" -ForegroundColor Green

Write-Host "V6c listo — pnpm dev" -ForegroundColor Yellow