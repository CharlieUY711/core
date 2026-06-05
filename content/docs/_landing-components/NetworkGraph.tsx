"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

interface Edge {
  from: string;
  to: string;
  broken: boolean;
}

interface NetworkGraphProps {
  chaos: number; // 0 = ordered, 1 = full chaos
  labels: string[];
  animated?: boolean;
}

const BASE_POSITIONS = [
  { x: 50, y: 50 },
  { x: 75, y: 20 },
  { x: 90, y: 55 },
  { x: 70, y: 80 },
  { x: 40, y: 85 },
  { x: 15, y: 65 },
  { x: 10, y: 30 },
  { x: 35, y: 10 },
  { x: 60, y: 45 },
];

const CHAOS_POSITIONS = [
  { x: 20, y: 15 },
  { x: 85, y: 10 },
  { x: 95, y: 70 },
  { x: 60, y: 90 },
  { x: 10, y: 85 },
  { x: 5, y: 40 },
  { x: 40, y: 5 },
  { x: 75, y: 50 },
  { x: 50, y: 60 },
];

const COLORS = [
  "#4A90E8", "#7B68EE", "#E8904A", "#4AE89A",
  "#E84A6B", "#E8D44A", "#4AE8D4", "#A04AE8", "#E84A4A",
];

const EDGES: Edge[] = [
  { from: "0", to: "1", broken: false },
  { from: "1", to: "2", broken: true },
  { from: "2", to: "3", broken: false },
  { from: "3", to: "4", broken: true },
  { from: "4", to: "5", broken: false },
  { from: "5", to: "6", broken: true },
  { from: "6", to: "7", broken: false },
  { from: "7", to: "8", broken: true },
  { from: "0", to: "4", broken: true },
  { from: "2", to: "6", broken: true },
  { from: "1", to: "5", broken: false },
  { from: "3", to: "7", broken: true },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function NetworkGraph({ chaos, labels, animated = true }: NetworkGraphProps) {
  const nodes: Node[] = BASE_POSITIONS.slice(0, labels.length).map((bp, i) => {
    const cp = CHAOS_POSITIONS[i];
    return {
      id: String(i),
      x: lerp(bp.x, cp.x, chaos),
      y: lerp(bp.y, cp.y, chaos),
      label: labels[i],
      color: COLORS[i % COLORS.length],
    };
  });

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Edges */}
      {EDGES.slice(0, labels.length - 1).map((edge, i) => {
        const a = nodeMap[edge.from];
        const b = nodeMap[edge.to];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - chaos * 8;

        return (
          <motion.path
            key={i}
            d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
            fill="none"
            stroke={edge.broken ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.25)"}
            strokeWidth={edge.broken ? "0.3" : "0.5"}
            strokeDasharray={edge.broken ? "1.5 1.5" : undefined}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 + 0.5, duration: 0.6 }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
        >
          {/* Glow */}
          <circle
            cx={node.x}
            cy={node.y}
            r={chaos > 0.3 ? 3 + chaos * 2 : 2}
            fill={node.color}
            opacity={0.08 + chaos * 0.12}
          />
          {/* Node */}
          <circle
            cx={node.x}
            cy={node.y}
            r={1.8}
            fill={node.color}
            opacity={0.9}
          />
          {/* Label */}
          <text
            x={node.x}
            y={node.y - 3.5}
            textAnchor="middle"
            fontSize="3.5"
            fill="rgba(255,255,255,0.7)"
            fontFamily="system-ui, sans-serif"
            fontWeight="500"
          >
            {node.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
