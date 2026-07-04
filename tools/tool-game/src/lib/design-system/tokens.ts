export const PRIZES = [
  { id: "free_shipping",  label: "Envío Gratis",      emoji: "🚚", color: "#00E5FF" },
  { id: "discount_15",    label: "15% OFF",           emoji: "🏷️", color: "#A855F7" },
  { id: "whisky_premium", label: "Whisky Premium",    emoji: "🥃", color: "#F5B942" },
  { id: "gift_card",      label: "Gift Card",         emoji: "🎁", color: "#22C55E" },
  { id: "surprise",       label: "Producto Sorpresa", emoji: "✨", color: "#7C3AED" },
  { id: "free_delivery",  label: "Delivery Gratis",   emoji: "⚡", color: "#00E5FF" },
  { id: "discount_10",    label: "10% OFF",           emoji: "💜", color: "#A855F7" },
  { id: "cashback",       label: "Cashback 5%",       emoji: "💰", color: "#F5B942" },
] as const;

export type PrizeId = typeof PRIZES[number]["id"];
export type Prize   = typeof PRIZES[number];
