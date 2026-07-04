"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

const PRIZES_DATA = [
  { id: "free_shipping",  label: "Envío Gratis",      emoji: "🚚", color: "#00E5FF" },
  { id: "discount_15",    label: "15% OFF",           emoji: "🏷️", color: "#A855F7" },
  { id: "whisky_premium", label: "Whisky Premium",    emoji: "🥃", color: "#F5B942" },
  { id: "gift_card",      label: "Gift Card",         emoji: "🎁", color: "#22C55E" },
  { id: "surprise",       label: "Producto Sorpresa", emoji: "✨", color: "#7C3AED" },
  { id: "free_delivery",  label: "Delivery Gratis",   emoji: "⚡", color: "#00E5FF" },
  { id: "discount_10",    label: "10% OFF",           emoji: "💜", color: "#A855F7" },
  { id: "cashback",       label: "Cashback 5%",       emoji: "💰", color: "#F5B942" },
];

// Triplicamos para efecto infinito
const ITEMS = [...PRIZES_DATA, ...PRIZES_DATA, ...PRIZES_DATA];

const ITEM_H  = 80;
const VISIBLE = 7;
const CENTER  = Math.floor(VISIBLE / 2);

interface Prize {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface Props {
  isSpinning:     boolean;
  onResult:       (prize: Prize) => void;
  onSpinComplete: () => void;
}

export function InfinitePrizeRibbon({ isSpinning, onResult, onSpinComplete }: Props) {
  const controls  = useAnimation();
  const spinning  = useRef(false);

  useEffect(() => {
    if (!isSpinning || spinning.current) return;
    spinning.current = true;

    const winnerIdx = Math.floor(Math.random() * PRIZES_DATA.length);
    // Arrancamos desde el segundo bloque para tener recorrido visible
    const startOffset = PRIZES_DATA.length * ITEM_H;
    const target = -(startOffset + winnerIdx * ITEM_H + PRIZES_DATA.length * ITEM_H);

    controls.set({ y: 0 });

    controls.start({
      y: target,
      transition: {
        duration: 4,
        ease: [0.22, 1, 0.36, 1],
      },
    }).then(() => {
      onResult(PRIZES_DATA[winnerIdx]);
      onSpinComplete();
      spinning.current = false;
    });
  }, [isSpinning]);

  const windowH = ITEM_H * VISIBLE;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, userSelect: "none" }}>

      {/* Flecha izquierda */}
      <motion.span
        style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", minWidth: 24, textAlign: "center" }}
        animate={{ x: [-3, 0, -3] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
      >◀</motion.span>

      {/* Ventana */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          width: 260,
          height: windowH,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Fade top */}
        <div style={{
          position: "absolute", inset: "0 0 auto 0", zIndex: 10, pointerEvents: "none",
          height: ITEM_H * 2.5,
          background: "linear-gradient(to bottom, #080808 20%, transparent)",
        }} />

        {/* Selector central */}
        <div style={{
          position: "absolute", left: 8, right: 8, zIndex: 20, pointerEvents: "none",
          top: CENTER * ITEM_H,
          height: ITEM_H,
          border: "2px solid var(--accent)",
          borderRadius: 12,
          boxShadow: "0 0 20px rgba(0,229,255,0.4)",
          background: "rgba(0,229,255,0.05)",
        }} />

        {/* Fade bottom */}
        <div style={{
          position: "absolute", inset: "auto 0 0 0", zIndex: 10, pointerEvents: "none",
          height: ITEM_H * 2.5,
          background: "linear-gradient(to top, #080808 20%, transparent)",
        }} />

        {/* Cinta */}
        <motion.div animate={controls} style={{ willChange: "transform" }}>
          {ITEMS.map((prize, i) => (
            <div
              key={`${prize.id}-${i}`}
              style={{
                height: ITEM_H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{prize.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1 }}>{prize.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Flecha derecha */}
      <motion.span
        style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", minWidth: 24, textAlign: "center" }}
        animate={{ x: [3, 0, 3] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
      >▶</motion.span>

    </div>
  );
}
