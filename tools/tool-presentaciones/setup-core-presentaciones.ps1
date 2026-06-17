# ================================================================
# CORE Executive Experience — Setup completo
# Ejecutar desde: C:\CORE\apps\core-presentaciones
# PowerShell: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# ================================================================

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "CORE Executive Experience — Setup" -ForegroundColor Cyan
Write-Host "Destino: $base"

foreach ($d in @("app","components\experience\sections","components\experience\visuals","components\experience\ui","lib\experience","public")) {
  New-Item -ItemType Directory -Force -Path "$base\$d" | Out-Null
}
Write-Host "OK  Carpetas creadas" -ForegroundColor Green

# --- app/globals.css ---
$path = "$base\app\globals.css"
$content = @'
@import "tailwindcss";

:root {
  --void: #0A0A0A;
  --deep: #141414;
  --surface: #1E1E1E;
  --raised: #2A2A2A;
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.15);
  --white: #FFFFFF;
  --muted: #9B9B9B;
  --subtle: #5A5A5A;
  --signal: #4A90E8;
  --signal-dim: rgba(74,144,232,0.15);
  --danger: #D14520;
  --danger-dim: rgba(209,69,32,0.12);
  --confirm: #2E7D32;
  --confirm-dim: rgba(46,125,50,0.12);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--void);
  color: var(--white);
  font-family: var(--font-geist-sans), 'Inter', system-ui, sans-serif;
  font-weight: 300;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--void); }
::-webkit-scrollbar-thumb { background: var(--raised); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--subtle); }

/* Selection */
::selection {
  background: var(--signal-dim);
  color: var(--white);
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  app/globals.css" -ForegroundColor Green

# --- app/layout.tsx ---
$path = "$base\app\layout.tsx"
$content = @'
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "CORE — The Operating System for Commerce",
  description:
    "Others integrate software. CORE integrates operations. Connecting Brands, Operations and Markets.",
  openGraph: {
    title: "CORE — The Operating System for Commerce",
    description: "Others integrate software. CORE integrates operations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  app/layout.tsx" -ForegroundColor Green

# --- app/page.tsx ---
$path = "$base\app\page.tsx"
$content = @'
import { I18nProvider } from "@/lib/experience/i18n-context";
import { ExperienceNav } from "@/components/experience/ExperienceNav";
import { HeroSection } from "@/components/experience/sections/HeroSection";
import { FragmentationSection } from "@/components/experience/sections/FragmentationSection";
import { WhatIfSection } from "@/components/experience/sections/WhatIfSection";
import { DifferenceSection } from "@/components/experience/sections/DifferenceSection";
import { GlobalSection } from "@/components/experience/sections/GlobalSection";
import { VisionSection } from "@/components/experience/sections/VisionSection";

export default function Home() {
  return (
    <I18nProvider>
      <main style={{ background: "var(--void)" }}>
        <ExperienceNav />
        <HeroSection />
        <FragmentationSection />
        <WhatIfSection />
        <DifferenceSection />
        <GlobalSection />
        <VisionSection />
      </main>
    </I18nProvider>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  app/page.tsx" -ForegroundColor Green

# --- lib/experience/i18n.ts ---
$path = "$base\lib\experience\i18n.ts"
$content = @'
export type Locale = "es" | "pt" | "en";

export const translations = {
  es: {
    nav: {
      cta: "Solicitar acceso",
    },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Connecting Brands, Operations and Markets.",
      scroll: "Explorar",
    },
    fragmentation: {
      opening: "Ya tenés el software.",
      problem_a: "El problema no es el software.",
      problem_b: "El problema es la fragmentación.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logística", "Aduana", "BI", "Pagos", "Documentos"],
    },
    cost: {
      title: "El costo de operar fragmentado",
      items: [
        "Clientes duplicados",
        "Inventario duplicado",
        "Procesos duplicados",
        "Trabajo manual constante",
        "Decisiones sin visibilidad",
        "Múltiples versiones de la verdad",
      ],
      quote: "Las empresas pasan años integrando herramientas que nunca fueron diseñadas para trabajar juntas.",
    },
    whatif: {
      question: "¿Y si todo empezara conectado?",
      sub: "Una única fuente de verdad. No otra integración. Un punto de partida diferente.",
      primitives: ["Entidad", "Producto", "Operación", "Relación", "Documento", "Evento"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "El núcleo operacional",
      sub: "No es una base de datos. Es la verdad operacional.",
      nodes: ["Entidades", "Marcas", "Productos", "Clientes", "Documentos", "Operaciones", "Inventario", "Eventos"],
    },
    ecosystem: {
      label: "El ecosistema CORE",
      title: "Capacidades, no módulos.",
      sub: "Todo comparte la misma fundación operacional.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Tu fuerza comercial conectada a cada producto, precio y cliente en tiempo real." },
        { id: "logistics", name: "CORE Logistics", desc: "Red territorial de movimiento. Rutas, warehouses y nodos operacionales." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Comercio directo. Origen a destino con fricción mínima." },
        { id: "market", name: "CORE Market", desc: "Red comercial. Acceso a mercados, canales y relaciones de negocio." },
        { id: "finance", name: "CORE Finance", desc: "Flujos de capital. Liquidez y financiamiento operacional." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Patrones e insights que emergen de tu operación completa." },
      ],
    },
    paraguay: {
      label: "Caso real · Paraguay → Uruguay",
      title: "Operá en un nuevo país sin construir una nueva operación.",
      before_label: "Sin CORE",
      after_label: "Con CORE",
      before: ["Estructura legal", "Buscar logística", "Buscar warehouse", "Integrar software", "Gestionar aduana", "Gestionar inventario", "Gestionar entregas"],
      after: ["Productos ingresan", "Zona Franca", "Inventario", "Distribución", "Market", "Última Milla", "Cliente ✓"],
    },
    cardisan: {
      label: "Caso real · Cardisan · LATAM",
      title: "Expandí tu mercado, no tu complejidad.",
      desc: "Carnes premium, chacinados y productos gourmet. Un ecosistema operacional para toda América Latina.",
    },
    difference: {
      label: "Por qué CORE es diferente",
      before_label: "Modelo tradicional",
      after_label: "Modelo CORE",
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
    },
    global: {
      label: "Alcance global",
      title: "Nacido en Sudamérica.\nNo limitado a Sudamérica.",
      sub: "CORE se convierte en el gateway operacional entre marcas globales y mercados regionales.",
      regions: ["Europa", "Asia", "Norte América"],
    },
    vision: {
      label: "Visión 2035",
      title: "Infraestructura, no software.",
      stats: [
        { value: 50000, suffix: "", label: "empresas" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "países" },
        { value: 500, suffix: "M", label: "eventos / año" },
      ],
      cta: "Solicitar acceso",
    },
    claim: {
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
  },
  pt: {
    nav: { cta: "Solicitar acesso" },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Conectando Marcas, Operações e Mercados.",
      scroll: "Explorar",
    },
    fragmentation: {
      opening: "Você já tem o software.",
      problem_a: "O problema não é o software.",
      problem_b: "O problema é a fragmentação.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logística", "Alfândega", "BI", "Pagamentos", "Documentos"],
    },
    cost: {
      title: "O custo de operar fragmentado",
      items: ["Clientes duplicados", "Estoque duplicado", "Processos duplicados", "Trabalho manual constante", "Decisões sem visibilidade", "Múltiplas versões da verdade"],
      quote: "As empresas passam anos integrando ferramentas que nunca foram projetadas para trabalhar juntas.",
    },
    whatif: {
      question: "E se tudo começasse conectado?",
      sub: "Uma única fonte de verdade. Não mais uma integração. Um ponto de partida diferente.",
      primitives: ["Entidade", "Produto", "Operação", "Relacionamento", "Documento", "Evento"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "O núcleo operacional",
      sub: "Não é um banco de dados. É a verdade operacional.",
      nodes: ["Entidades", "Marcas", "Produtos", "Clientes", "Documentos", "Operações", "Estoque", "Eventos"],
    },
    ecosystem: {
      label: "O ecossistema CORE",
      title: "Capacidades, não módulos.",
      sub: "Tudo compartilha a mesma fundação operacional.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Sua força comercial conectada a cada produto, preço e cliente em tempo real." },
        { id: "logistics", name: "CORE Logistics", desc: "Rede territorial de movimento. Rotas, warehouses e nós operacionais." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Comércio direto. Origem ao destino com fricção mínima." },
        { id: "market", name: "CORE Market", desc: "Rede comercial. Acesso a mercados, canais e relações de negócio." },
        { id: "finance", name: "CORE Finance", desc: "Fluxos de capital. Liquidez e financiamento operacional." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Padrões e insights que emergem da sua operação completa." },
      ],
    },
    paraguay: {
      label: "Caso real · Paraguai → Uruguai",
      title: "Opere em um novo país sem construir uma nova operação.",
      before_label: "Sem CORE",
      after_label: "Com CORE",
      before: ["Estrutura legal", "Buscar logística", "Buscar warehouse", "Integrar software", "Gerenciar alfândega", "Gerenciar estoque", "Gerenciar entregas"],
      after: ["Produtos entram", "Zona Franca", "Estoque", "Distribuição", "Market", "Última Milha", "Cliente ✓"],
    },
    cardisan: {
      label: "Caso real · Cardisan · LATAM",
      title: "Expanda seu mercado, não sua complexidade.",
      desc: "Carnes premium, embutidos e produtos gourmet. Um ecossistema operacional para toda a América Latina.",
    },
    difference: {
      label: "Por que CORE é diferente",
      before_label: "Modelo tradicional",
      after_label: "Modelo CORE",
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
    },
    global: {
      label: "Alcance global",
      title: "Nascido na América do Sul.\nNão limitado à América do Sul.",
      sub: "CORE se torna o gateway operacional entre marcas globais e mercados regionais.",
      regions: ["Europa", "Ásia", "América do Norte"],
    },
    vision: {
      label: "Visão 2035",
      title: "Infraestrutura, não software.",
      stats: [
        { value: 50000, suffix: "", label: "empresas" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "países" },
        { value: 500, suffix: "M", label: "eventos / ano" },
      ],
      cta: "Solicitar acesso",
    },
    claim: {
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
  },
  en: {
    nav: { cta: "Request access" },
    hero: {
      tagline: "The Operating System for Commerce",
      sub: "Connecting Brands, Operations and Markets.",
      scroll: "Explore",
    },
    fragmentation: {
      opening: "You already have the software.",
      problem_a: "The problem is not the software.",
      problem_b: "The problem is fragmentation.",
      systems: ["CRM", "ERP", "Marketplace", "Warehouse", "Logistics", "Customs", "BI", "Payments", "Documents"],
    },
    cost: {
      title: "The cost of fragmented operations",
      items: ["Duplicate customers", "Duplicate inventory", "Duplicate processes", "Constant manual work", "Decisions without visibility", "Multiple versions of the truth"],
      quote: "Companies spend years integrating tools that were never designed to work together.",
    },
    whatif: {
      question: "What if everything started connected?",
      sub: "A single source of truth. Not another integration. A different starting point.",
      primitives: ["Entity", "Product", "Operation", "Relationship", "Document", "Event"],
    },
    foundation: {
      label: "CORE Foundation",
      title: "The operational nucleus",
      sub: "This is not a database. This is operational truth.",
      nodes: ["Entities", "Brands", "Products", "Customers", "Documents", "Operations", "Inventory", "Events"],
    },
    ecosystem: {
      label: "The CORE ecosystem",
      title: "Capabilities, not modules.",
      sub: "Everything shares the same operational foundation.",
      capabilities: [
        { id: "rep", name: "CORE Rep", desc: "Your commercial force connected to every product, price and customer in real time." },
        { id: "logistics", name: "CORE Logistics", desc: "Territorial movement network. Routes, warehouses and operational nodes." },
        { id: "directshipment", name: "CORE DirectShipment", desc: "Direct commerce. Origin to destination with minimal friction." },
        { id: "market", name: "CORE Market", desc: "Commercial network. Access to markets, channels and business relationships." },
        { id: "finance", name: "CORE Finance", desc: "Capital flows. Liquidity and operational financing." },
        { id: "intelligence", name: "CORE Intelligence", desc: "Patterns and insights that emerge from your complete operation." },
      ],
    },
    paraguay: {
      label: "Real case · Paraguay → Uruguay",
      title: "Operate in a new country without building a new operation.",
      before_label: "Without CORE",
      after_label: "With CORE",
      before: ["Legal structure", "Find logistics", "Find warehouse", "Integrate software", "Manage customs", "Manage inventory", "Manage delivery"],
      after: ["Products enter", "Free Zone", "Inventory", "Distribution", "Market", "Last Mile", "Customer ✓"],
    },
    cardisan: {
      label: "Real case · Cardisan · LATAM",
      title: "Expand your market, not your complexity.",
      desc: "Premium meats, cured products and gourmet goods. One operational ecosystem for all of Latin America.",
    },
    difference: {
      label: "Why CORE is different",
      before_label: "Traditional model",
      after_label: "CORE model",
      before: ["Many systems", "Many providers", "Many integrations", "Many truths"],
      after: ["One entity", "One product", "One operation", "One truth"],
    },
    global: {
      label: "Global reach",
      title: "Born in South America.\nNot limited to South America.",
      sub: "CORE becomes the operational gateway between global brands and regional markets.",
      regions: ["Europe", "Asia", "North America"],
    },
    vision: {
      label: "Vision 2035",
      title: "Infrastructure, not software.",
      stats: [
        { value: 50000, suffix: "", label: "companies" },
        { value: 2, suffix: "M", label: "SKUs" },
        { value: 10, suffix: "", label: "countries" },
        { value: 500, suffix: "M", label: "events / year" },
      ],
      cta: "Request access",
    },
    claim: {
      before: "Others integrate software.",
      after: "CORE integrates operations.",
    },
  },
} as const;

export type Translations = typeof translations.es;

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  lib/experience/i18n.ts" -ForegroundColor Green

# --- lib/experience/i18n-context.tsx ---
$path = "$base\lib\experience\i18n-context.tsx"
$content = @'
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translations, Locale, Translations } from "@/lib/experience/i18n";

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "es",
  t: translations.es,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  lib/experience/i18n-context.tsx" -ForegroundColor Green

# --- components/experience/ExperienceNav.tsx ---
$path = "$base\components\experience\ExperienceNav.tsx"
$content = @'
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/experience/ui/LanguageSwitcher";
import { useI18n } from "@/lib/experience/i18n-context";

export function ExperienceNav() {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
          style={{
            background: "linear-gradient(to bottom, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.8) 100%)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span className="text-white font-medium tracking-[0.2em] text-sm uppercase">
            CORE
          </span>

          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <a
              href="#vision"
              className="text-xs font-medium tracking-widest uppercase px-4 py-2 border border-[var(--border-strong)] text-white hover:border-white transition-colors"
            >
              {t.nav.cta}
            </a>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/ExperienceNav.tsx" -ForegroundColor Green

# --- components/experience/ui/LanguageSwitcher.tsx ---
$path = "$base\components\experience\ui\LanguageSwitcher.tsx"
$content = @'
"use client";

import { useI18n } from "@/lib/experience/i18n-context";
import { Locale } from "@/lib/experience/i18n";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((l, i) => (
        <span key={l.value} className="flex items-center gap-1">
          <button
            onClick={() => setLocale(l.value)}
            className={`text-xs font-medium tracking-widest uppercase transition-colors px-1 py-0.5 ${
              locale === l.value
                ? "text-white"
                : "text-[var(--subtle)] hover:text-[var(--muted)]"
            }`}
          >
            {l.label}
          </button>
          {i < LOCALES.length - 1 && (
            <span className="text-[var(--subtle)] text-xs">·</span>
          )}
        </span>
      ))}
    </div>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/ui/LanguageSwitcher.tsx" -ForegroundColor Green

# --- components/experience/visuals/NetworkGraph.tsx ---
$path = "$base\components\experience\visuals\NetworkGraph.tsx"
$content = @'
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

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/visuals/NetworkGraph.tsx" -ForegroundColor Green

# --- components/experience/sections/HeroSection.tsx ---
$path = "$base\components\experience\sections\HeroSection.tsx"
$content = @'
"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";
import { NetworkGraph } from "@/components/experience/visuals/NetworkGraph";

export function HeroSection() {
  const { t } = useI18n();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--void)" }}
    >
      {/* Background network */}
      <div className="absolute inset-0 opacity-20">
        <NetworkGraph chaos={0.15} labels={["", "", "", "", "", "", "", "", ""]} animated />
      </div>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, var(--void) 75%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="text-white mb-8 leading-none"
            style={{
              fontSize: "clamp(64px, 12vw, 144px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
            }}
          >
            CORE
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="mb-4"
            style={{
              fontSize: "clamp(14px, 2vw, 20px)",
              fontWeight: 300,
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            {t.hero.tagline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <p
            style={{
              fontSize: "clamp(12px, 1.5vw, 14px)",
              color: "var(--subtle)",
              letterSpacing: "0.08em",
            }}
          >
            {t.hero.sub}
          </p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span style={{ fontSize: "10px", letterSpacing: "0.15em", color: "var(--subtle)", textTransform: "uppercase" }}>
          {t.hero.scroll}
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8"
          style={{ background: "linear-gradient(to bottom, var(--subtle), transparent)" }}
        />
      </motion.div>
    </section>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/HeroSection.tsx" -ForegroundColor Green

# --- components/experience/sections/FragmentationSection.tsx ---
$path = "$base\components\experience\sections\FragmentationSection.tsx"
$content = @'
"use client";

import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { NetworkGraph } from "@/components/experience/visuals/NetworkGraph";
import { useI18n } from "@/lib/experience/i18n-context";

export function FragmentationSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-20% 0px" });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const chaos = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const [chaosValue, setChaosValue] = useState(0);

  chaos.on("change", (v) => setChaosValue(v));

  return (
    <section
      id="fragmentation"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-32">

        {/* Left: text */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(28px, 4vw, 52px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.2,
              marginBottom: "3rem",
            }}
          >
            {t.fragmentation.opening}
          </motion.p>

          {/* System list */}
          <div className="flex flex-wrap gap-3 mb-16">
            {t.fragmentation.systems.map((sys, i) => (
              <motion.span
                key={sys}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                className="px-3 py-1.5 text-xs font-medium tracking-wider uppercase"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  letterSpacing: "0.1em",
                }}
              >
                {sys}
              </motion.span>
            ))}
          </div>

          {/* Problem statement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <p
              style={{
                fontSize: "clamp(20px, 2.5vw, 32px)",
                fontWeight: 300,
                color: "var(--muted)",
                lineHeight: 1.4,
                marginBottom: "0.75rem",
              }}
            >
              {t.fragmentation.problem_a}
            </p>
            <p
              style={{
                fontSize: "clamp(20px, 2.5vw, 32px)",
                fontWeight: 400,
                color: "var(--white)",
                lineHeight: 1.4,
              }}
            >
              {t.fragmentation.problem_b}
            </p>
          </motion.div>
        </div>

        {/* Right: network visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative aspect-square w-full max-w-lg mx-auto"
        >
          <NetworkGraph
            chaos={chaosValue}
            labels={t.fragmentation.systems}
            animated
          />
        </motion.div>

      </div>
    </section>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/FragmentationSection.tsx" -ForegroundColor Green

# --- components/experience/sections/WhatIfSection.tsx ---
$path = "$base\components\experience\sections\WhatIfSection.tsx"
$content = @'
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

const PRIMITIVE_POSITIONS = [
  { x: 50, y: 50 },   // center
  { x: 50, y: 18 },   // top
  { x: 80, y: 33 },   // top right
  { x: 80, y: 67 },   // bottom right
  { x: 50, y: 82 },   // bottom
  { x: 20, y: 67 },   // bottom left
  { x: 20, y: 33 },   // top left
];

const CHAOS_FROM = [
  { x: 50, y: 50 },
  { x: 10, y: 5 },
  { x: 95, y: 15 },
  { x: 90, y: 85 },
  { x: 50, y: 98 },
  { x: 5, y: 80 },
  { x: 8, y: 20 },
];

export function WhatIfSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <section
      id="whatif"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      {/* Subtle separator line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-32">

        {/* Left: convergence visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="relative aspect-square w-full max-w-lg mx-auto order-2 lg:order-1"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Connection lines to center */}
            {PRIMITIVE_POSITIONS.slice(1).map((pos, i) => (
              <motion.line
                key={i}
                x1={pos.x}
                y1={pos.y}
                x2={50}
                y2={50}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.3"
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              />
            ))}

            {/* Outer nodes */}
            {t.whatif.primitives.map((label, i) => {
              const from = CHAOS_FROM[i + 1];
              const to = PRIMITIVE_POSITIONS[i + 1];
              return (
                <motion.g
                  key={label}
                  initial={{ x: from.x - to.x, y: from.y - to.y, opacity: 0 }}
                  animate={inView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{
                    delay: 0.2 + i * 0.08,
                    duration: 0.9,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <circle
                    cx={to.x}
                    cy={to.y}
                    r={4}
                    fill="var(--surface)"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.4"
                  />
                  <text
                    x={to.x}
                    y={to.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3.2"
                    fill="rgba(255,255,255,0.7)"
                    fontFamily="system-ui, sans-serif"
                    fontWeight="400"
                  >
                    {label}
                  </text>
                </motion.g>
              );
            })}

            {/* Center nucleus */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Glow rings */}
              <circle cx={50} cy={50} r={10} fill="rgba(255,255,255,0.03)" />
              <circle cx={50} cy={50} r={7} fill="rgba(255,255,255,0.05)" />
              {/* Core */}
              <circle cx={50} cy={50} r={4.5} fill="white" opacity={0.92} />
              <text
                x={50}
                y={50.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.8"
                fill="black"
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                CORE
              </text>
            </motion.g>
          </svg>
        </motion.div>

        {/* Right: text */}
        <div className="order-1 lg:order-2">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(28px, 4vw, 56px)",
              fontWeight: 300,
              color: "var(--white)",
              lineHeight: 1.15,
              marginBottom: "2rem",
            }}
          >
            {t.whatif.question}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontSize: "clamp(16px, 1.8vw, 20px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.7,
              marginBottom: "3rem",
            }}
          >
            {t.whatif.sub}
          </motion.p>

          {/* Primitives list */}
          <div className="flex flex-col gap-2">
            {t.whatif.primitives.map((p, i) => (
              <motion.div
                key={p}
                initial={{ opacity: 0, x: -16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.7 + i * 0.07, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--muted)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p}
                </span>
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

# --- components/experience/sections/DifferenceSection.tsx ---
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
    <section
      id="difference"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 py-32">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "5rem",
          }}
        >
          {t.difference.label}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">

          {/* Before — Traditional */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--subtle)",
                marginBottom: "2.5rem",
              }}
            >
              {t.difference.before_label}
            </motion.p>

            <div className="flex flex-col gap-4">
              {t.difference.before.map((item, i) => (
                <motion.p
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 48px)",
                    fontWeight: 300,
                    color: "var(--subtle)",
                    lineHeight: 1.1,
                    textDecoration: inView ? "line-through" : "none",
                    textDecorationColor: "rgba(255,255,255,0.15)",
                    transition: "text-decoration 0.3s",
                  }}
                >
                  {item}
                </motion.p>
              ))}
            </div>
          </div>

          {/* After — CORE */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--subtle)",
                marginBottom: "2.5rem",
              }}
            >
              {t.difference.after_label}
            </motion.p>

            <div className="flex flex-col gap-4">
              {t.difference.after.map((item, i) => (
                <motion.p
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 48px)",
                    fontWeight: 400,
                    color: "var(--white)",
                    lineHeight: 1.1,
                  }}
                >
                  {item}
                </motion.p>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom claim */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-24 pt-12"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            style={{
              fontSize: "clamp(14px, 1.5vw, 18px)",
              color: "var(--subtle)",
              textDecoration: "line-through",
              textDecorationColor: "rgba(255,255,255,0.2)",
              marginBottom: "0.75rem",
            }}
          >
            {t.claim.before}
          </p>
          <p
            style={{
              fontSize: "clamp(20px, 2.5vw, 32px)",
              fontWeight: 400,
              color: "var(--white)",
            }}
          >
            {t.claim.after}
          </p>
        </motion.div>

      </div>
    </section>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/DifferenceSection.tsx" -ForegroundColor Green

# --- components/experience/sections/GlobalSection.tsx ---
$path = "$base\components\experience\sections\GlobalSection.tsx"
$content = @'
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/experience/i18n-context";

// CoreGlobe solo en cliente - sin SSR
const CoreGlobe = dynamic(
  () => import("@/components/experience/visuals/CoreGlobe").then(m => m.CoreGlobe),
  { ssr: false, loading: () => <div style={{ aspectRatio: "16/7", background: "#0A0A0A" }} /> }
);

export function GlobalSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <section
      id="global"
      ref={ref}
      className="relative"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      {/* Text header — encima del globo */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-10">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "1.5rem",
          }}
        >
          {t.global.label}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: "clamp(28px, 4vw, 56px)",
            fontWeight: 300,
            color: "var(--white)",
            lineHeight: 1.15,
            whiteSpace: "pre-line",
            marginBottom: "1.25rem",
          }}
        >
          {t.global.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.45 }}
          style={{
            fontSize: "clamp(14px, 1.5vw, 18px)",
            fontWeight: 300,
            color: "var(--muted)",
            maxWidth: "560px",
            lineHeight: 1.7,
          }}
        >
          {t.global.sub}
        </motion.p>
      </div>

      {/* Globo — ancho completo, sin bordes, sin card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative w-full"
        style={{ marginTop: "-2rem" }}
      >
        {/* Fade top — fusiona el texto con el globo */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: "120px",
            background: "linear-gradient(to bottom, var(--void) 0%, transparent 100%)",
          }}
        />

        <CoreGlobe
          activeLayer="all"
          autoRotate
          className="w-full"
          style={{ aspectRatio: "16/7" }}
        />

        {/* Fade bottom — fusiona el globo con la sección siguiente */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: "120px",
            background: "linear-gradient(to top, var(--void) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* Regiones — debajo del globo */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pb-24 pt-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center gap-8"
        >
          {t.global.regions.map((region, i) => (
            <span key={region} className="flex items-center gap-8">
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--subtle)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {region}
              </span>
              {i < t.global.regions.length - 1 && (
                <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
              )}
            </span>
          ))}
          <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--white)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            CORE
          </span>
          <span style={{ color: "var(--subtle)", fontSize: "10px" }}>→</span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            LATAM
          </span>
        </motion.div>
      </div>
    </section>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/GlobalSection.tsx" -ForegroundColor Green

# --- components/experience/sections/VisionSection.tsx ---
$path = "$base\components\experience\sections\VisionSection.tsx"
$content = @'
"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

function CounterStat({
  target,
  suffix,
  label,
  delay,
  inView,
}: {
  target: number;
  suffix: string;
  label: string;
  delay: number;
  inView: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = Date.now() + delay * 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      if (now < start) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      if (progress === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, delay]);

  const display = target >= 1000 ? value.toLocaleString() : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-2"
    >
      <p
        style={{
          fontSize: "clamp(40px, 5vw, 72px)",
          fontWeight: 300,
          color: "var(--white)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {display}
        {suffix && <span style={{ color: "var(--muted)" }}>{suffix}</span>}
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "var(--subtle)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </motion.div>
  );
}

export function VisionSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  return (
    <section
      id="vision"
      ref={ref}
      className="relative min-h-screen flex items-center"
      style={{ background: "var(--void)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }}
      />

      <div className="w-full max-w-7xl mx-auto px-8 py-32">

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          style={{
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--subtle)",
            marginBottom: "5rem",
          }}
        >
          {t.vision.label}
        </motion.p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          {t.vision.stats.map((stat, i) => (
            <CounterStat
              key={stat.label}
              target={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              delay={0.2 + i * 0.15}
              inView={inView}
            />
          ))}
        </div>

        {/* Infrastructure statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.8 }}
          className="mb-20"
        >
          <p
            style={{
              fontSize: "clamp(24px, 3.5vw, 52px)",
              fontWeight: 300,
              color: "var(--muted)",
              lineHeight: 1.2,
              marginBottom: "0.5rem",
            }}
          >
            This is not a software product.
          </p>
          <p
            style={{
              fontSize: "clamp(24px, 3.5vw, 52px)",
              fontWeight: 400,
              color: "var(--white)",
              lineHeight: 1.2,
            }}
          >
            {t.vision.title}
          </p>
        </motion.div>

        {/* Final claim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="pt-12 mb-16"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            style={{
              fontSize: "clamp(14px, 1.5vw, 18px)",
              color: "var(--subtle)",
              textDecoration: "line-through",
              textDecorationColor: "rgba(255,255,255,0.2)",
              marginBottom: "0.75rem",
            }}
          >
            {t.claim.before}
          </p>
          <p
            style={{
              fontSize: "clamp(20px, 2.5vw, 36px)",
              fontWeight: 400,
              color: "var(--white)",
            }}
          >
            {t.claim.after}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          <a
            href="mailto:hello@core.com"
            className="inline-block px-10 py-4 text-sm font-medium tracking-widest uppercase transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.4)",
              color: "var(--white)",
              letterSpacing: "0.12em",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "white";
              (e.target as HTMLElement).style.color = "black";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "transparent";
              (e.target as HTMLElement).style.color = "var(--white)";
            }}
          >
            {t.vision.cta}
          </a>
        </motion.div>

      </div>
    </section>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/VisionSection.tsx" -ForegroundColor Green

# --- components/experience/visuals/CoreGlobe.tsx ---
$path = "$base\components\experience\visuals\CoreGlobe.tsx"
$content = @'
"use client";

import React, {
  useRef, useEffect, useState, useCallback, useMemo,
} from "react";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { GeoJsonProperties, MultiPolygon, Polygon } from "geojson";

// ─── Types ────────────────────────────────────────────────────────────────────
export type LayerType = "all" | "origins" | "cono" | "direct" | "expansion";

export interface Hub {
  id: string; name: string; role: string;
  lat: number; lng: number; r: number;
  color: string; layer: string; primary?: boolean;
}

export interface Route {
  from: string; to: string; color: string;
  width: number; speed: number; layer: LayerType;
  glow?: boolean; dashed?: boolean;
}

export interface CoreGlobeProps {
  routes?: Route[]; hubs?: Hub[];
  highlightCountry?: string;
  activeLayer?: LayerType;
  onHubClick?: (hub: Hub) => void;
  autoRotate?: boolean;
  className?: string;
}

// ─── Default data ─────────────────────────────────────────────────────────────
export const DEFAULT_HUBS: Hub[] = [
  { id:"uy", name:"Uruguay",          role:"Hub principal · CORE",  lat:-33,   lng:-56,   r:7, color:"#FFFFFF", layer:"cono",     primary:true },
  { id:"ar", name:"Buenos Aires",     role:"Distribución Cono Sur", lat:-34.6, lng:-58.4, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"br", name:"São Paulo",        role:"Distribución Cono Sur", lat:-23.5, lng:-46.6, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"cl", name:"Santiago",         role:"Distribución Cono Sur", lat:-33.4, lng:-70.7, r:4, color:"#4A90E8", layer:"cono"      },
  { id:"py", name:"Asunción",         role:"Distribución Cono Sur", lat:-25.3, lng:-57.6, r:3, color:"#4A90E8", layer:"cono"      },
  { id:"cn", name:"Shanghai",         role:"Origen · China",        lat:31.2,  lng:121.5, r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"sg", name:"Singapur",         role:"Origen · Asia SE",      lat:1.3,   lng:103.8, r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"in", name:"Mumbai",           role:"Origen · India",        lat:19.1,  lng:72.9,  r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"tr", name:"Turquía",          role:"Origen especial",       lat:39.9,  lng:32.9,  r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"nl", name:"Rotterdam",        role:"Origen · Europa",       lat:51.9,  lng:4.5,   r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"es", name:"Barcelona",        role:"Origen · España",       lat:41.4,  lng:2.2,   r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"us", name:"Nueva York",       role:"Origen · EE.UU.",       lat:40.7,  lng:-74,   r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"mx", name:"Ciudad de México", role:"Expansión 2029",        lat:19.4,  lng:-99.1, r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"pe", name:"Lima",             role:"Expansión 2027",        lat:-12,   lng:-77,   r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"co", name:"Bogotá",           role:"Expansión 2028",        lat:4.7,   lng:-74.1, r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"bo", name:"Santa Cruz",       role:"Expansión 2027",        lat:-17.8, lng:-63.2, r:3, color:"#5A5A5A", layer:"expansion" },
];

export const DEFAULT_ROUTES: Route[] = [
  { from:"cn", to:"uy", color:"#FFFFFF", width:1.5, speed:0.004,  layer:"origins",   glow:true   },
  { from:"nl", to:"uy", color:"#FFFFFF", width:1.5, speed:0.0035, layer:"origins",   glow:true   },
  { from:"us", to:"uy", color:"#FFFFFF", width:1.5, speed:0.005,  layer:"origins",   glow:true   },
  { from:"es", to:"uy", color:"#FFFFFF", width:1.2, speed:0.0038, layer:"origins",   glow:true   },
  { from:"sg", to:"uy", color:"#9B9B9B", width:1.0, speed:0.003,  layer:"origins"               },
  { from:"in", to:"uy", color:"#9B9B9B", width:1.0, speed:0.003,  layer:"origins"               },
  { from:"tr", to:"uy", color:"#9B9B9B", width:0.9, speed:0.0033, layer:"origins"               },
  { from:"uy", to:"ar", color:"#4A90E8", width:1.4, speed:0.007,  layer:"cono"                  },
  { from:"uy", to:"br", color:"#4A90E8", width:1.4, speed:0.006,  layer:"cono"                  },
  { from:"uy", to:"cl", color:"#4A90E8", width:1.2, speed:0.007,  layer:"cono"                  },
  { from:"uy", to:"py", color:"#4A90E8", width:1.0, speed:0.008,  layer:"cono"                  },
  { from:"cn", to:"br", color:"#FFFFFF", width:1.8, speed:0.0045, layer:"direct",    glow:true   },
  { from:"us", to:"ar", color:"#FFFFFF", width:1.6, speed:0.005,  layer:"direct",    glow:true   },
  { from:"nl", to:"cl", color:"#FFFFFF", width:1.5, speed:0.0042, layer:"direct",    glow:true   },
  { from:"uy", to:"pe", color:"#5A5A5A", width:1.0, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"co", color:"#5A5A5A", width:1.0, speed:0.005,  layer:"expansion", dashed:true },
  { from:"uy", to:"mx", color:"#5A5A5A", width:1.0, speed:0.004,  layer:"expansion", dashed:true },
  { from:"uy", to:"bo", color:"#5A5A5A", width:0.8, speed:0.006,  layer:"expansion", dashed:true },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────
const toRad = (d: number) => (d * Math.PI) / 180;

interface Pt { sx: number; sy: number; z: number; vis: boolean; }

function project(lat: number, lng: number, rX: number, rY: number, cx: number, cy: number, R: number): Pt {
  const phi = toRad(lat), theta = toRad(lng);
  let x = Math.cos(phi) * Math.cos(theta);
  let y = Math.sin(phi);
  let z = Math.cos(phi) * Math.sin(theta);
  const cY = Math.cos(rY), sY = Math.sin(rY);
  const x2 = x * cY - z * sY, z2 = x * sY + z * cY;
  const cX = Math.cos(rX), sX = Math.sin(rX);
  const y2 = y * cX - z2 * sX, z3 = y * sX + z2 * cX;
  return { sx: cx + x2 * R, sy: cy - y2 * R, z: z3, vis: z3 > -0.15 };
}

function arcPoints(la1: number, lo1: number, la2: number, lo2: number, n = 56) {
  const xyz = (la: number, lo: number) => [
    Math.cos(toRad(la)) * Math.cos(toRad(lo)),
    Math.sin(toRad(la)),
    Math.cos(toRad(la)) * Math.sin(toRad(lo)),
  ];
  const p1 = xyz(la1, lo1), p2 = xyz(la2, lo2);
  const pts: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = p1.map((v1, j) => v1 * (1 - t) + p2[j] * t);
    const l = Math.hypot(...v);
    pts.push({ lat: (Math.asin(v[1] / l) * 180) / Math.PI, lng: (Math.atan2(v[2], v[0]) * 180) / Math.PI });
  }
  return pts;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CoreGlobe({
  routes: rProp, hubs: hProp,
  highlightCountry, activeLayer: alProp = "all",
  onHubClick, autoRotate = true, className = "",
}: CoreGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const rotRef    = useRef({ x: -0.5, y: 0.978, vx: 0, vy: 0.0012 });
  const dragRef   = useRef({ active: false, lastX: 0, lastY: 0 });
  const hoverRef  = useRef<Hub | null>(null);
  const layerRef  = useRef<LayerType>(alProp);
  const offRef    = useRef<Map<string, number>>(new Map());
  const geoRef    = useRef<Array<Array<Array<[number, number]>>>>([]);

  const hubs   = hProp  ?? DEFAULT_HUBS;
  const routes = rProp  ?? DEFAULT_ROUTES;

  useEffect(() => { layerRef.current = alProp; }, [alProp]);

  // Geolocation: center on user country on load
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      rotRef.current.y = -lng * Math.PI / 180;
      rotRef.current.x = lat * Math.PI / 180 * 0.4;
    });
  }, []);

  const hubMap = useMemo(() => new Map(hubs.map(h => [h.id, h])), [hubs]);

  const [tooltip, setTooltip] = useState<{ hub: Hub; x: number; y: number } | null>(null);

  // load world geo
  useEffect(() => {
    fetch("/world-110m.json")
      .then(r => r.json())
      .then((topo: Topology) => {
        const countries = topojson.feature(
          topo,
          topo.objects.countries as GeometryCollection<GeoJsonProperties>
        );
        const polys: Array<Array<Array<[number, number]>>> = [];
        for (const feat of (countries as any).features) {
          const g = feat.geometry;
          if (!g) continue;
          if (g.type === "Polygon") polys.push(g.coordinates);
          else if (g.type === "MultiPolygon") g.coordinates.forEach((c: any) => polys.push(c));
        }
        geoRef.current = polys;
      });
  }, []);

  // init routes offsets
  useEffect(() => {
    routes.forEach(r => {
      const k = `${r.from}-${r.to}`;
      if (!offRef.current.has(k)) offRef.current.set(k, Math.random());
    });
  }, [routes]);

  // main canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, R = 0, cx = 0, cy = 0;

    function resize() {
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      W = rect.width; H = Math.round(W * 0.62);
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      wrap.style.height  = H + "px";
      ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
      R = Math.min(W, H) * 0.38; cx = W / 2; cy = H / 2;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function drawLand() {
      const { x: rX, y: rY } = rotRef.current;
      ctx.fillStyle   = "#1C2333";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth   = 0.3;

      for (const poly of geoRef.current) {
        for (const ring of poly) {
          let started = false;
          ctx.beginPath();
          for (const [lng, lat] of ring) {
            const p = project(lat, lng, rX, rY, cx, cy, R);
            if (!p.vis) { started = false; continue; }
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    function drawGraticule() {
      const { x: rX, y: rY } = rotRef.current;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth   = 0.4;
      function drawSegs(pts: Pt[]) {
        if (pts.length < 2) return;
        ctx.beginPath(); ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 30) {
        const pts: Pt[] = []; let cur: Pt[] = [];
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = project(lat, lng, rX, rY, cx, cy, R);
          if (p.vis) cur.push(p); else if (cur.length) { drawSegs(cur); cur = []; }
        }
        if (cur.length) drawSegs(cur);
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        let cur: Pt[] = [];
        for (let lng2 = -180; lng2 <= 180; lng2 += 5) {
          const p = project(lat, lng2, rX, rY, cx, cy, R);
          if (p.vis) cur.push(p); else if (cur.length) { drawSegs(cur); cur = []; }
        }
        if (cur.length) drawSegs(cur);
      }
    }

    function drawRoute(route: Route) {
      const h1 = hubMap.get(route.from), h2 = hubMap.get(route.to);
      if (!h1 || !h2) return;
      const { x: rX, y: rY } = rotRef.current;
      const key = `${route.from}-${route.to}`;
      const off = offRef.current.get(key) ?? 0;
      const pts = arcPoints(h1.lat, h1.lng, h2.lat, h2.lng);
      const segs: Pt[][] = []; let cur: Pt[] = [];
      for (const pt of pts) {
        const p = project(pt.lat, pt.lng, rX, rY, cx, cy, R);
        if (p.vis) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; }
      }
      if (cur.length) segs.push(cur);
      segs.forEach(seg => {
        if (seg.length < 2) return;
        function stroke() {
          ctx.beginPath(); ctx.moveTo(seg[0].sx, seg[0].sy);
          for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].sx, seg[i].sy);
          ctx.stroke();
        }
        if (route.glow) {
          ctx.save(); ctx.shadowColor = route.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = route.color + "44"; ctx.lineWidth = route.width * 2.8;
          stroke(); ctx.restore();
        }
        ctx.save();
        ctx.strokeStyle = route.color; ctx.lineWidth = route.width; ctx.globalAlpha = 0.75;
        if (route.dashed) { ctx.setLineDash([6,5]); ctx.lineDashOffset = -off * 80; }
        else ctx.setLineDash([]);
        stroke(); ctx.restore();
        if (!route.dashed && seg.length > 4) {
          const dot = seg[Math.floor(off * seg.length) % seg.length];
          ctx.save(); ctx.shadowColor = route.color; ctx.shadowBlur = 14;
          ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.92;
          ctx.beginPath(); ctx.arc(dot.sx, dot.sy, 2.4, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      });
    }

    function drawHub(hub: Hub, t: number) {
      const { x: rX, y: rY } = rotRef.current;
      const p = project(hub.lat, hub.lng, rX, rY, cx, cy, R);
      if (!p.vis) return;
      const hovered     = hoverRef.current?.id === hub.id;
      const highlighted = highlightCountry === hub.id;
      const r = hub.r * (hovered || highlighted ? 1.4 : 1);
      if (hub.primary || highlighted) {
        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.8 + i * 0.33) % 1;
          ctx.save(); ctx.strokeStyle = hub.color; ctx.lineWidth = 0.8;
          ctx.globalAlpha = (1 - phase) * 0.5;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, (r+4)+phase*24, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.shadowColor = hub.primary ? "rgba(255,255,255,0.6)" : hub.color;
      ctx.shadowBlur = hovered ? 20 : 10;
      ctx.strokeStyle = hub.primary ? "rgba(255,255,255,0.4)" : hub.color;
      ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r+3, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = hub.primary ? "#FFFFFF" : hub.color;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI*2); ctx.fill();
      if (hub.primary) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r*0.45, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      if (hub.primary || hovered || highlighted) {
        ctx.save();
        ctx.font = `${hub.primary?400:300} ${hub.primary?11:10}px -apple-system,sans-serif`;
        ctx.fillStyle = hub.primary ? "#FFFFFF" : hub.color;
        ctx.globalAlpha = 0.9; ctx.textAlign = "left";
        ctx.fillText(hub.name, p.sx+r+6, p.sy+4);
        if (hub.primary) {
          ctx.font = "400 9px -apple-system,sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.letterSpacing = "0.08em";
          ctx.fillText("HUB · CORE", p.sx+r+6, p.sy+16);
        }
        ctx.restore();
      }
    }

    function frame(ts: number) {
      const t = ts / 1000;
      ctx.clearRect(0, 0, W, H);
      // background
      const bg = ctx.createRadialGradient(cx,cy,R*0.3,cx,cy,R*1.6);
      bg.addColorStop(0,"#0D1018"); bg.addColorStop(0.5,"#080B10"); bg.addColorStop(1,"#040508");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      // stars
      for (let i = 0; i < 140; i++) {
        const sx = ((Math.sin(i*137.5+1)*0.5+0.5)*W)|0;
        const sy = ((Math.cos(i*137.5+7)*0.5+0.5)*H)|0;
        const sr = Math.sin(i*0.7)*0.4+0.5;
        ctx.globalAlpha = 0.12+sr*0.35; ctx.fillStyle = "#FFF";
        ctx.beginPath(); ctx.arc(sx,sy,sr*0.85,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // globe glow ring
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
      ctx.restore();
      // clip
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
      // ocean
      const fill = ctx.createRadialGradient(cx-R*0.25,cy-R*0.2,0,cx,cy,R);
      fill.addColorStop(0,"#151B28"); fill.addColorStop(0.5,"#0E1320"); fill.addColorStop(1,"#080C14");
      ctx.fillStyle = fill; ctx.fillRect(cx-R,cy-R,R*2,R*2);
      // land
      drawLand();
      drawGraticule();
      // routes
      const active = layerRef.current;
      routes.forEach(r => {
        if (active !== "all" && active !== r.layer) return;
        const k = `${r.from}-${r.to}`;
        offRef.current.set(k, ((offRef.current.get(k)??0) + r.speed) % 1);
        drawRoute(r);
      });
      ctx.restore();
      // hubs
      hubs.forEach(h => {
        if (active !== "all" && active !== h.layer && !h.primary) return;
        drawHub(h, t);
      });
      // inertia
      const rot = rotRef.current;
      if (!dragRef.current.active) {
        rot.y += rot.vy; rot.x += rot.vx * 0.3;
        rot.vy *= 0.95; rot.vx *= 0.92;
        if (autoRotate && Math.abs(rot.vy) < 0.0003) rot.vy = 0.0012;
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHubAt = useCallback((clientX: number, clientY: number): Hub | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const R = Math.min(W,H)*0.38, cx = W/2, cy = H/2;
    const { x:rX, y:rY } = rotRef.current;
    for (const h of hubs) {
      const p = project(h.lat,h.lng,rX,rY,cx,cy,R);
      if (!p.vis) continue;
      if (Math.hypot(clientX-rect.left-p.sx, clientY-rect.top-p.sy) < h.r*2.5+5) return h;
    }
    return null;
  }, [hubs]);

  const onMouseDown  = useCallback((e: React.MouseEvent) => { dragRef.current = {active:true,lastX:e.clientX,lastY:e.clientY}; rotRef.current.vx=0; rotRef.current.vy=0; }, []);
  const onMouseUp    = useCallback((e: React.MouseEvent) => { dragRef.current.active=false; const hub=getHubAt(e.clientX,e.clientY); if(hub&&onHubClick) onHubClick(hub); }, [getHubAt,onHubClick]);
  const onMouseLeave = useCallback(() => { dragRef.current.active=false; hoverRef.current=null; setTooltip(null); }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.active) {
      const dx=e.clientX-dragRef.current.lastX, dy=e.clientY-dragRef.current.lastY;
      rotRef.current.vy=dx*0.008; rotRef.current.vx=dy*0.008;
      rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx;
      dragRef.current.lastX=e.clientX; dragRef.current.lastY=e.clientY;
    }
    const hub = getHubAt(e.clientX,e.clientY);
    hoverRef.current = hub;
    if (hub) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const R=Math.min(rect.width,rect.height)*0.38;
      const p=project(hub.lat,hub.lng,rotRef.current.x,rotRef.current.y,rect.width/2,rect.height/2,R);
      setTooltip({hub,x:p.sx+hub.r+8,y:p.sy-14});
    } else setTooltip(null);
  }, [getHubAt]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; dragRef.current={active:true,lastX:t.clientX,lastY:t.clientY}; rotRef.current.vx=0; rotRef.current.vy=0; }, []);
  const onTouchEnd   = useCallback(() => { dragRef.current.active=false; }, []);
  const onTouchMove  = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; const dx=t.clientX-dragRef.current.lastX,dy=t.clientY-dragRef.current.lastY; rotRef.current.vy=dx*0.008; rotRef.current.vx=dy*0.008; rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx; dragRef.current.lastX=t.clientX; dragRef.current.lastY=t.clientY; }, []);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden select-none ${className}`} style={{background:"#0A0A0A"}}>
      <canvas ref={canvasRef} style={{display:"block",width:"100%",cursor:"grab"}}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      />
      {tooltip && (
        <div className="pointer-events-none absolute z-10 px-3 py-2 text-xs"
          style={{left:tooltip.x,top:tooltip.y,background:"rgba(10,10,10,0.95)",border:"0.5px solid rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",maxWidth:180}}>
          <p className="mb-0.5 font-medium" style={{color:"#FFFFFF"}}>{tooltip.hub.name}</p>
          <p style={{color:"rgba(255,255,255,0.4)"}}>{tooltip.hub.role}</p>
        </div>
      )}
    </div>
  );
}

export function CoreGlobeStatic({ className="" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{background:"#07101F",aspectRatio:"1/0.62"}}>
      <svg viewBox="0 0 400 248" className="w-full h-full" aria-label="CORE Globe">
        <circle cx="200" cy="124" r="100" fill="#0D1B38"/>
        <circle cx="200" cy="124" r="100" fill="none" stroke="#00E5FF" strokeWidth="1.2" strokeOpacity="0.25"/>
        <path d="M130 50 Q160 80 185 120" fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6"/>
        <path d="M280 60 Q250 85 205 118" fill="none" stroke="#00E5FF" strokeWidth="1.4" strokeOpacity="0.6"/>
        <path d="M200 122 Q180 145 150 160" fill="none" stroke="#0EA5E9" strokeWidth="1.2" strokeOpacity="0.6"/>
        <circle cx="200" cy="122" r="18" fill="none" stroke="#F5C26B" strokeWidth="0.8" strokeOpacity="0.3"/>
        <circle cx="200" cy="122" r="5" fill="#FFF"/>
        <circle cx="200" cy="122" r="2.5" fill="#F5C26B"/>
        <text x="210" y="119" fontSize="9" fill="#F5C26B" fontFamily="sans-serif" fontWeight="500">Uruguay</text>
      </svg>
    </div>
  );
}

export default CoreGlobe;

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  CoreGlobe.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "Setup completo." -ForegroundColor Cyan
Write-Host "Ahora copiá world-110m.json a public\ y ejecutá: pnpm dev" -ForegroundColor Yellow