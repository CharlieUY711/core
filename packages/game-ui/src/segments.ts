// Catálogo visual de la ruleta. Las `key` coinciden por convención con los
// Reward.id del catálogo del servidor (seed), para mapear premio -> color.
export interface Segment {
  key: string;
  short: string;
  name: string;
  benefitText: string;
  color: string;
  deep: string;
  weight: number;
  jackpot?: boolean;
}

export const SEGMENTS: Segment[] = [
  { key: "disc15", short: "15%", name: "15% de descuento", benefitText: "15% OFF en tu compra", color: "#FF4D8D", deep: "#7A1E3F", weight: 26 },
  { key: "ship", short: "Envío", name: "Envío gratis", benefitText: "Envío gratis", color: "#9A6BFF", deep: "#3A2570", weight: 24 },
  { key: "b2x1", short: "2x1", name: "Beneficio 2x1", benefitText: "2x1 en categoría seleccionada", color: "#E2A52B", deep: "#7A5410", weight: 8, jackpot: true },
  { key: "disc10", short: "10%", name: "10% de descuento", benefitText: "10% OFF en tu compra", color: "#34E1A2", deep: "#0F5E43", weight: 22 },
  { key: "gift500", short: "$500", name: "Gift Card $500", benefitText: "$500 de saldo Market", color: "#FCD96A", deep: "#7A5410", weight: 6, jackpot: true },
  { key: "pts2x", short: "+Pts", name: "Puntos x2", benefitText: "Puntos Market duplicados", color: "#5BC6FF", deep: "#0E4A73", weight: 14 },
];

export function segmentByKey(key: string, segments: Segment[] = SEGMENTS): Segment {
  return segments.find((s) => s.key === key) ?? segments[0];
}
