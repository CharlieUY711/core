# CORE Presentaciones — Setup V6
# WhatIf canvas animado + Difference Many/One + Globo compacto
# cd C:\CORE\apps\core-presentaciones
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\setup-v6.ps1

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "CORE Presentaciones V6" -ForegroundColor Cyan

foreach ($d in @("app","components\experience\sections","components\experience\visuals","components\experience\ui","lib\experience","public")) {
  New-Item -ItemType Directory -Force -Path "$base\$d" | Out-Null
}

$path = "$base\app\page.tsx"
$content = @'
"use client";

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
      <div style={{ background: "#0A1F3D", minHeight: "100vh", width: "100%" }}>
        <ExperienceNav />
        <main style={{ width: "100%", paddingTop: "90px" }}>
          <HeroSection />
          <FragmentationSection />
          <WhatIfSection />
          <DifferenceSection />
          <GlobalSection />
          <VisionSection />
        </main>
      </div>
    </I18nProvider>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  app/page.tsx" -ForegroundColor Green

$path = "$base\app\globals.css"
$content = @'
@import "tailwindcss";

:root {
  --bg:      #0A1F3D;
  --surface: #1e2d42;
  --raised:  #1e3354;
  --border:  #1e3354;
  --white:   #FFFFFF;
  --muted:   #8fa3bf;
  --subtle:  #4a6080;
  --signal:  #3B82F6;
  --gold:    #C9993A;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: #0A1F3D;
  color: #FFFFFF;
  font-family: var(--font-geist-sans), 'Inter', system-ui, sans-serif;
  font-weight: 400;
  line-height: 1.6;
  overflow-x: hidden;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0A1F3D; }
::-webkit-scrollbar-thumb { background: #1e3354; border-radius: 2px; }
::selection { background: rgba(59,130,246,0.3); color: #fff; }

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  app/globals.css" -ForegroundColor Green

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

$path = "$base\components\experience\ExperienceNav.tsx"
$content = @'
"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/experience/i18n-context";
import type { Locale } from "@/lib/experience/i18n";

const T = {
  bg:         "#0D2B55",
  separator:  "#1A4F9C",
  white:      "#ffffff",
  whiteAlpha: "rgba(255,255,255,0.5)",
  btnBg:      "#1A4F9C",
  btnHover:   "#3b82f6",
  font:       "Geist, Inter, system-ui, sans-serif",
  container:  "1280px",
  paddingX:   "24px",
} as const;

const SECTIONS = [
  { id: "fragmentation", es: "El Problema",    pt: "O Problema",    en: "The Problem"   },
  { id: "whatif",        es: "La Solución",    pt: "A Solução",     en: "The Solution"  },
  { id: "difference",   es: "Por qué CORE",   pt: "Por que CORE",  en: "Why CORE"      },
  { id: "global",       es: "Alcance Global", pt: "Alcance Global",en: "Global Reach"  },
  { id: "vision",       es: "Visión 2035",    pt: "Visão 2035",    en: "Vision 2035"   },
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

const containerStyle: React.CSSProperties = {
  maxWidth:  T.container,
  margin:    "0 auto",
  padding:   `0 ${T.paddingX}`,
  boxSizing: "border-box",
  width:     "100%",
};

export function ExperienceNav() {
  const { locale, setLocale, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
      background: T.bg,
      backdropFilter: scrolled ? "blur(12px)" : "none",
      transition: "all 0.4s ease",
    }}>

      {/* TOP ROW */}
      <div style={{ ...containerStyle, display: "flex", alignItems: "center", gap: 12, padding: `8px ${T.paddingX}` }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34,
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1rem", color: T.white, fontFamily: T.font,
          }}>C</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ color: T.white, fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.08em", fontFamily: T.font, textTransform: "uppercase" }}>CORE</span>
            <span style={{ color: T.whiteAlpha, fontWeight: 400, fontSize: "0.6rem", letterSpacing: "0.12em", fontFamily: T.font, textTransform: "uppercase" }}>Presentación</span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Language switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {LOCALES.map((l, i) => (
            <span key={l.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setLocale(l.value)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  fontFamily: T.font, fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: locale === l.value ? T.white : T.whiteAlpha,
                  padding: "4px 4px",
                  transition: "color 200ms",
                }}
              >{l.label}</button>
              {i < LOCALES.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>·</span>
              )}
            </span>
          ))}
        </div>

        {/* CTA */}
        <a href="#vision" style={{
          height: 34, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px", borderRadius: 4,
          background: T.btnBg, color: T.white, textDecoration: "none",
          fontFamily: T.font, fontSize: "12px", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          transition: "background 200ms",
          flexShrink: 0,
        }}
          onMouseEnter={e => (e.currentTarget.style.background = T.btnHover)}
          onMouseLeave={e => (e.currentTarget.style.background = T.btnBg)}
        >
          {t.nav.cta}
        </a>
      </div>

      {/* SEPARATOR */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ height: 2, background: T.separator, transition: "background 0.4s ease" }} />
      </div>

      {/* MENU SECTIONS */}
      <div style={{ ...containerStyle, padding: `0 ${T.paddingX}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, height: 36, justifyContent: "center" }}>
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                padding: "0 14px", height: 36, display: "flex", alignItems: "center",
                color: "rgba(255,255,255,0.75)", fontFamily: T.font, fontSize: "0.82rem",
                fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                textDecoration: "none", transition: "color 150ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = T.white)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
            >
              {s[locale]}
            </a>
          ))}
        </div>
      </div>

    </header>
  );
}

'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/ExperienceNav.tsx" -ForegroundColor Green

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
  { id:"uy", name:"Uruguay",          role:"Hub principal · CORE",  lat:-33,   lng:56,    r:7, color:"#FFFFFF", layer:"cono",     primary:true },
  { id:"ar", name:"Buenos Aires",     role:"Distribución Cono Sur", lat:-34.6, lng:58.4,  r:4, color:"#4A90E8", layer:"cono"      },
  { id:"br", name:"São Paulo",        role:"Distribución Cono Sur", lat:-23.5, lng:46.6,  r:4, color:"#4A90E8", layer:"cono"      },
  { id:"cl", name:"Santiago",         role:"Distribución Cono Sur", lat:-33.4, lng:70.7,  r:4, color:"#4A90E8", layer:"cono"      },
  { id:"py", name:"Asunción",         role:"Distribución Cono Sur", lat:-25.3, lng:57.6,  r:3, color:"#4A90E8", layer:"cono"      },
  { id:"cn", name:"Shanghai",         role:"Origen · China",        lat:31.2,  lng:-121.5,r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"sg", name:"Singapur",         role:"Origen · Asia SE",      lat:1.3,   lng:-103.8,r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"in", name:"Mumbai",           role:"Origen · India",        lat:19.1,  lng:-72.9, r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"tr", name:"Turquía",          role:"Origen especial",       lat:39.9,  lng:-32.9, r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"nl", name:"Rotterdam",        role:"Origen · Europa",       lat:51.9,  lng:-4.5,  r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"es", name:"Barcelona",        role:"Origen · España",       lat:41.4,  lng:-2.2,  r:3, color:"#9B9B9B", layer:"origins"   },
  { id:"us", name:"Nueva York",       role:"Origen · EE.UU.",       lat:40.7,  lng:74,    r:4, color:"#9B9B9B", layer:"origins"   },
  { id:"mx", name:"Ciudad de México", role:"Expansión 2029",        lat:19.4,  lng:99.1,  r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"pe", name:"Lima",             role:"Expansión 2027",        lat:-12,   lng:77,    r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"co", name:"Bogotá",           role:"Expansión 2028",        lat:4.7,   lng:74.1,  r:3, color:"#5A5A5A", layer:"expansion" },
  { id:"bo", name:"Santa Cruz",       role:"Expansión 2027",        lat:-17.8, lng:63.2,  r:3, color:"#5A5A5A", layer:"expansion" },
];

export const DEFAULT_ROUTES: Route[] = [
  // Asia → Uruguay  (amber cálido)
  { from:"cn", to:"uy", color:"#E8B84B", width:1.6, speed:0.003,  layer:"origins", glow:true  },
  { from:"sg", to:"uy", color:"#E8B84B", width:1.2, speed:0.0028, layer:"origins", glow:false },
  { from:"in", to:"uy", color:"#E8B84B", width:1.0, speed:0.0025, layer:"origins", glow:false },

  // Europa → Uruguay  (blanco frío)
  { from:"nl", to:"uy", color:"#FFFFFF", width:1.6, speed:0.003,  layer:"origins", glow:true  },
  { from:"es", to:"uy", color:"#FFFFFF", width:1.2, speed:0.0028, layer:"origins", glow:false },
  { from:"tr", to:"uy", color:"#FFFFFF", width:1.0, speed:0.0025, layer:"origins", glow:false },

  // EEUU → Uruguay  (signal blue)
  { from:"us", to:"uy", color:"#4A90E8", width:1.6, speed:0.0035, layer:"origins", glow:true  },

  // Uruguay → región LATAM  (teal)
  { from:"uy", to:"ar", color:"#2DD4BF", width:1.4, speed:0.006,  layer:"cono"               },
  { from:"uy", to:"br", color:"#2DD4BF", width:1.4, speed:0.0055, layer:"cono"               },
  { from:"uy", to:"cl", color:"#2DD4BF", width:1.2, speed:0.006,  layer:"cono"               },
  { from:"uy", to:"py", color:"#2DD4BF", width:1.0, speed:0.007,  layer:"cono"               },

  // Direct routes  (amber brillante)
  { from:"cn", to:"br", color:"#E8B84B", width:1.6, speed:0.004,  layer:"direct", glow:true  },
  { from:"us", to:"ar", color:"#4A90E8", width:1.4, speed:0.0045, layer:"direct", glow:true  },
  { from:"nl", to:"cl", color:"#FFFFFF", width:1.4, speed:0.004,  layer:"direct", glow:true  },

  // Expansión  (gris dashed)
  { from:"uy", to:"pe", color:"#5A5A5A", width:1.0, speed:0.004, layer:"expansion", dashed:true },
  { from:"uy", to:"co", color:"#5A5A5A", width:1.0, speed:0.004, layer:"expansion", dashed:true },
  { from:"uy", to:"mx", color:"#5A5A5A", width:1.0, speed:0.003, layer:"expansion", dashed:true },
  { from:"uy", to:"bo", color:"#5A5A5A", width:0.8, speed:0.005, layer:"expansion", dashed:true },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────
const toRad = (d: number) => (d * Math.PI) / 180;

interface Pt { sx: number; sy: number; z: number; vis: boolean; }

function project(lat: number, lng: number, rX: number, rY: number, cx: number, cy: number, R: number): Pt {
  const phi = toRad(lat), theta = toRad(-lng);
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
    Math.cos(toRad(la)) * Math.cos(toRad(-lo)),
    Math.sin(toRad(la)),
    Math.cos(toRad(la)) * Math.sin(toRad(-lo)),
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
  onHubClick, autoRotate = false, className = "",
}: CoreGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const rotRef    = useRef({ x: -0.3, y: -0.978, vx: 0, vy: 0.00035 });
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
      rotRef.current.y = lng * Math.PI / 180;
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
      W = rect.width; H = Math.round(W * 0.55);
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      wrap.style.height  = H + "px";
      ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
      R = Math.min(W, H) * 0.26; cx = W / 2; cy = H / 2;
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
        const lx = p.sx - r - 8;
        const ly = p.sy - r - 10;
        ctx.font = `500 12px -apple-system,sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = 0.95;
        ctx.textAlign = "right";
        ctx.fillText(hub.name, lx, ly);
        if (hub.primary) {
          ctx.font = "400 9px -apple-system,sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText("HUB · CORE", lx, ly + 13);
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
        rot.y += rot.vy; rot.x += rot.vx * 0.1;
        rot.vy *= 0.92; rot.vx *= 0.85;
        // Snap vertical suave hacia LATAM (-0.3)
        rot.x += (-0.3 - rot.x) * 0.02;
        if (autoRotate && Math.abs(rot.vy) < 0.0001) rot.vy = 0.00035;
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
    const R = Math.min(W,H)*0.26, cx = W/2, cy = H/2;
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
      rotRef.current.vy=dx*0.002; rotRef.current.vx=dy*0.002;
      rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx;
      dragRef.current.lastX=e.clientX; dragRef.current.lastY=e.clientY;
    }
    const hub = getHubAt(e.clientX,e.clientY);
    hoverRef.current = hub;
    if (hub) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const R=Math.min(rect.width,rect.height)*0.26;
      const p=project(hub.lat,hub.lng,rotRef.current.x,rotRef.current.y,rect.width/2,rect.height/2,R);
      setTooltip({hub,x:p.sx+hub.r+8,y:p.sy-14});
    } else setTooltip(null);
  }, [getHubAt]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; dragRef.current={active:true,lastX:t.clientX,lastY:t.clientY}; rotRef.current.vx=0; rotRef.current.vy=0; }, []);
  const onTouchEnd   = useCallback(() => { dragRef.current.active=false; }, []);
  const onTouchMove  = useCallback((e: React.TouchEvent) => { const t=e.touches[0]; const dx=t.clientX-dragRef.current.lastX,dy=t.clientY-dragRef.current.lastY; rotRef.current.vy=dx*0.002; rotRef.current.vx=dy*0.002; rotRef.current.y+=rotRef.current.vy; rotRef.current.x+=rotRef.current.vx; dragRef.current.lastX=t.clientX; dragRef.current.lastY=t.clientY; }, []);

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
Write-Host "OK  components/experience/visuals/CoreGlobe.tsx" -ForegroundColor Green

$path = "$base\components\experience\sections\HeroSection.tsx"
$content = @'
"use client";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

export function HeroSection() {
  const { t } = useI18n();
  return (
    <section id="hero" style={{
      position:"relative", minHeight:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center", overflow:"hidden",
      background:"radial-gradient(ellipse 80% 60% at 50% -10%, rgba(27,90,196,0.35) 0%, transparent 70%), #0A1F3D"
    }}>
      <div style={{position:"absolute",inset:0,opacity:0.3,
        backgroundImage:"radial-gradient(circle, rgba(59,130,246,0.15) 1px, transparent 1px)",
        backgroundSize:"28px 28px"}} />
      <div style={{position:"relative",zIndex:10,textAlign:"center",
        width:"100%",maxWidth:"900px",margin:"0 auto",padding:"0 24px"}}>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.8,delay:0.3}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"32px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#c9993a"}} />
            <span style={{color:"#8fa3bf",fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase"}}>
              The Operating System for Commerce
            </span>
          </div>
          <h1 style={{fontWeight:700,lineHeight:1.05,marginBottom:"24px",letterSpacing:"-0.02em",
            fontSize:"clamp(56px,10vw,120px)",
            background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            CORE
          </h1>
        </motion.div>
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.7}}>
          <p style={{color:"#8fa3bf",fontSize:"clamp(16px,2vw,22px)",marginBottom:"12px",letterSpacing:"0.02em"}}>
            {t.hero.tagline}
          </p>
          <p style={{color:"#4a6080",fontSize:"13px",letterSpacing:"0.08em"}}>{t.hero.sub}</p>
        </motion.div>
      </div>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5}}
        style={{position:"absolute",bottom:"40px",left:"50%",transform:"translateX(-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
        <span style={{color:"#4a6080",fontSize:"10px",letterSpacing:"0.15em",textTransform:"uppercase"}}>{t.hero.scroll}</span>
        <motion.div animate={{y:[0,6,0]}} transition={{duration:1.5,repeat:Infinity}}
          style={{width:"1px",height:"32px",background:"linear-gradient(to bottom,#4a6080,transparent)"}} />
      </motion.div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/HeroSection.tsx" -ForegroundColor Green

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
  const inView = useInView(ref, { once:false, margin:"-20% 0px" });
  const { scrollYProgress } = useScroll({ target:ref, offset:["start end","end start"] });
  const chaos = useTransform(scrollYProgress, [0.1,0.7], [0,1]);
  const [chaosValue, setChaosValue] = useState(0);
  chaos.on("change", v => setChaosValue(v));

  return (
    <section id="fragmentation" ref={ref} style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",background:"#0A1F3D"}}>
      <div style={{width:"100%",maxWidth:"1280px",margin:"0 auto",padding:"128px 24px",
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:"64px",alignItems:"center"}}>
        <div>
          <motion.p initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}}
            style={{fontWeight:700,fontSize:"clamp(28px,4vw,52px)",color:"#8fa3bf",lineHeight:1.2,marginBottom:"40px"}}>
            {t.fragmentation.opening}
          </motion.p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"48px"}}>
            {t.fragmentation.systems.map((sys,i) => (
              <motion.span key={sys} initial={{opacity:0,scale:0.8}} animate={inView?{opacity:1,scale:1}:{}}
                transition={{delay:0.1+i*0.07}}
                style={{padding:"6px 12px",fontSize:"11px",fontFamily:"monospace",borderRadius:"8px",
                  border:"1px solid #1e3354",color:"#8fa3bf",background:"rgba(15,56,117,0.12)",
                  letterSpacing:"0.1em",textTransform:"uppercase"}}>
                {sys}
              </motion.span>
            ))}
          </div>
          <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.9}}>
            <p style={{fontWeight:700,fontSize:"clamp(20px,2.5vw,32px)",color:"#8fa3bf",marginBottom:"8px"}}>{t.fragmentation.problem_a}</p>
            <p style={{fontWeight:700,fontSize:"clamp(20px,2.5vw,32px)",
              background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {t.fragmentation.problem_b}
            </p>
          </motion.div>
        </div>
        <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.3}}
          style={{aspectRatio:"1",width:"100%",maxWidth:"500px",margin:"0 auto"}}>
          <NetworkGraph chaos={chaosValue} labels={t.fragmentation.systems} animated />
        </motion.div>
      </div>
    </section>
  );
}
'@
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "OK  components/experience/sections/FragmentationSection.tsx" -ForegroundColor Green

$path = "$base\components\experience\sections\WhatIfSection.tsx"
$content = @'
"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useI18n } from "@/lib/experience/i18n-context";

// Posiciones del hexágono — más grande para que entren los nombres
const POS = [
  { x: 50, y: 50 },   // centro CORE
  { x: 50, y: 10 },   // top
  { x: 85, y: 30 },   // top right
  { x: 85, y: 70 },   // bottom right
  { x: 50, y: 90 },   // bottom
  { x: 15, y: 70 },   // bottom left
  { x: 15, y: 30 },   // top left
];

const FROM = [
  { x: 50, y: 50 },
  { x: 50, y: -10 },
  { x: 110, y: 20 },
  { x: 110, y: 80 },
  { x: 50, y: 110 },
  { x: -10, y: 80 },
  { x: -10, y: 20 },
];

// Colores de las bolitas por nodo
const COLORS = ["#4A90E8", "#c9993a", "#1D9E75", "#e84a6b", "#7B68EE", "#E8904A"];

export function WhatIfSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Canvas animation — bolitas + círculo concéntrico creciente
  useEffect(() => {
    if (!inView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = 500;
    const H = canvas.height = 500;

    // Escalar posiciones al canvas
    const pts = POS.map(p => ({ x: p.x / 100 * W, y: p.y / 100 * H }));
    const center = pts[0];

    // Bolitas — una por cada línea (6 líneas)
    const balls = COLORS.map((color, i) => ({
      color,
      t: i / COLORS.length, // offset inicial
      speed: 0.004 + i * 0.0003,
      from: 1 + i, // índice del nodo exterior
      toCenter: true,
    }));

    // Radio del círculo concéntrico
    let ringRadius = 0;
    const maxRing = 38;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function draw(ts: number) {
      const dt = ts - timeRef.current;
      timeRef.current = ts;
      ctx.clearRect(0, 0, W, H);

      // Fondo transparente
      ctx.fillStyle = "rgba(10, 31, 61, 0)";
      ctx.fillRect(0, 0, W, H);

      // Líneas de conexión
      ctx.strokeStyle = "rgba(74, 144, 232, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i < pts.length; i++) {
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      // Círculo concéntrico creciente — amarillo → verde
      if (ringRadius < maxRing) ringRadius += 0.08;
      const ringProgress = ringRadius / maxRing;
      // Interpolar color: amarillo (#c9993a) → verde (#1D9E75)
      const r = Math.round(lerp(201, 29, ringProgress));
      const g = Math.round(lerp(153, 158, ringProgress));
      const b = Math.round(lerp(58, 117, ringProgress));

      for (let ring = 1; ring <= 3; ring++) {
        const rr = ringRadius * ring * 0.7;
        const alpha = Math.max(0, 0.4 - ring * 0.1) * ringProgress;
        ctx.beginPath();
        ctx.arc(center.x, center.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1.5 - ring * 0.3;
        ctx.stroke();
      }

      // Nodo central CORE
      // Glow
      const grd = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 30);
      grd.addColorStop(0, "rgba(27,90,196,0.4)");
      grd.addColorStop(1, "rgba(27,90,196,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 30, 0, Math.PI * 2);
      ctx.fill();
      // Círculo principal
      ctx.fillStyle = "#1A4F9C";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 20, 0, Math.PI * 2);
      ctx.fill();
      // Borde
      ctx.strokeStyle = "rgba(74,144,232,0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Texto CORE
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CORE", center.x, center.y);

      // Nodos externos
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        ctx.fillStyle = "rgba(15,56,117,0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1e3354";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Bolitas animadas
      balls.forEach(ball => {
        ball.t += ball.speed;
        if (ball.t > 1) { ball.t = 0; ball.toCenter = !ball.toCenter; }

        const from = ball.toCenter ? pts[ball.from] : center;
        const to   = ball.toCenter ? center : pts[ball.from];
        const eased = ball.t < 0.5 ? 2 * ball.t * ball.t : 1 - Math.pow(-2 * ball.t + 2, 2) / 2;
        const bx = lerp(from.x, to.x, eased);
        const by = lerp(from.y, to.y, eased);

        // Glow de la bolita
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
        bg.addColorStop(0, ball.color + "88");
        bg.addColorStop(1, ball.color + "00");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fill();
        // Bolita
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

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
        {/* Canvas visual */}
        <motion.div
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          style={{ position: "relative", width: "100%", maxWidth: "500px", margin: "0 auto" }}
        >
          <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
          
          {/* Labels de los nodos — posicionados sobre el canvas */}
          {t.whatif.primitives.map((label, i) => {
            const pos = POS[i + 1];
            return (
              <motion.span
                key={label}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`, top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "11px", fontWeight: 500,
                  fontFamily: "Geist, Inter, system-ui, sans-serif",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                }}
              >
                {label}
              </motion.span>
            );
          })}
        </motion.div>

        {/* Texto */}
        <div>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
              letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
            {t.whatif.question}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ fontWeight: 700, fontSize: "clamp(28px,4vw,56px)", lineHeight: 1.1,
              marginBottom: "24px", color: "#ffffff" }}>
            {t.whatif.question}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
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

          {/* Before — se desvanece progresivamente */}
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
                animate={inView ? {
                  opacity: [0, 0.7 - i * 0.12, 0.7 - i * 0.12, 0.3 - i * 0.05],
                  x: 0,
                } : {}}
                transition={{ delay: 0.3 + i * 0.15, duration: 1.2 }}
                style={{
                  fontWeight: 700, fontSize: "clamp(22px, 2.8vw, 38px)",
                  color: "#4a6080", lineHeight: 1.2, marginBottom: "16px",
                  textDecoration: "line-through",
                  textDecorationColor: `rgba(74,96,128,${0.5 - i * 0.08})`,
                }}>
                {item}
              </motion.p>
            ))}
          </div>

          {/* After — emerge con fuerza creciente */}
          <div>
            <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 }}
              style={{ fontFamily: "monospace", fontSize: "11px", color: "#8fa3bf",
                letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "32px" }}>
              {t.difference.after_label}
            </motion.p>
            {t.difference.after.map((item, i) => (
              <motion.p key={item}
                initial={{ opacity: 0, x: 30, scale: 0.9 }}
                animate={inView ? {
                  opacity: 0.6 + i * 0.12,
                  x: 0,
                  scale: 1 + i * 0.02,
                } : {}}
                transition={{ delay: 0.8 + i * 0.18, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontWeight: 700,
                  fontSize: `clamp(${22 + i * 2}px, ${2.8 + i * 0.2}vw, ${38 + i * 4}px)`,
                  lineHeight: 1.2, marginBottom: "16px",
                  background: `linear-gradient(135deg, #fff ${30 + i * 10}%, #f5c870 100%)`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                {item}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Claim final */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.6 }}
          style={{ paddingTop: "48px", borderTop: "1px solid #1e3354" }}>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.8 }}
            style={{ color: "#4a6080", fontSize: "clamp(14px,1.5vw,20px)", marginBottom: "8px",
              textDecoration: "line-through", textDecorationColor: "rgba(74,96,128,0.3)" }}>
            {t.claim.before}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontWeight: 700, fontSize: "clamp(22px,3vw,44px)",
              background: "linear-gradient(135deg,#7db8f7 0%,#fff 60%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
  { ssr:false, loading:() => <div style={{aspectRatio:"16/7",background:"#0A1F3D"}} /> }
);

export function GlobalSection() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once:true, margin:"-10% 0px" });
  return (
    <section id="global" ref={ref} style={{position:"relative",background:"#0A1F3D",borderTop:"1px solid #1e3354"}}>
      <div style={{width:"100%",maxWidth:"1280px",margin:"0 auto",padding:"96px 24px 32px"}}>
        <motion.p initial={{opacity:0}} animate={inView?{opacity:1}:{}}
          style={{fontFamily:"monospace",fontSize:"11px",color:"#8fa3bf",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"16px"}}>
          {t.global.label}
        </motion.p>
        <motion.h2 initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:0.2}}
          style={{fontWeight:700,fontSize:"clamp(28px,4vw,52px)",lineHeight:1.15,marginBottom:"16px",whiteSpace:"pre-line",
            background:"linear-gradient(135deg,#fff 30%,#7db8f7 100%)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          {t.global.title}
        </motion.h2>
        <motion.p initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.4}}
          style={{color:"#8fa3bf",fontSize:"clamp(14px,1.5vw,18px)",maxWidth:"560px",lineHeight:1.7,fontWeight:300}}>
          {t.global.sub}
        </motion.p>
      </div>
      <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{duration:1,delay:0.3}}
        style={{position:"relative",width:"100%",marginTop:"-32px"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"100px",zIndex:10,pointerEvents:"none",
          background:"linear-gradient(to bottom, #0A1F3D 0%, transparent 100%)"}} />
        <CoreGlobe activeLayer="all" autoRotate={false} className="w-full" />
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"100px",zIndex:10,pointerEvents:"none",
          background:"linear-gradient(to top, #0A1F3D 0%, transparent 100%)"}} />
      </motion.div>
      <div style={{width:"100%",maxWidth:"1280px",margin:"0 auto",padding:"16px 24px 80px"}}>
        <motion.div initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.8}}
          style={{display:"flex",alignItems:"center",gap:"24px",flexWrap:"wrap"}}>
          {t.global.regions.map((r,i) => (
            <span key={r} style={{display:"flex",alignItems:"center",gap:"24px"}}>
              <span style={{fontFamily:"monospace",fontSize:"11px",color:"#8fa3bf",letterSpacing:"0.1em",textTransform:"uppercase"}}>{r}</span>
              {i < t.global.regions.length-1 && <span style={{color:"#1e3354",fontSize:"12px"}}>→</span>}
            </span>
          ))}
          <span style={{color:"#1e3354",fontSize:"12px"}}>→</span>
          <span style={{fontFamily:"monospace",fontSize:"11px",color:"white",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700}}>CORE</span>
          <span style={{color:"#1e3354",fontSize:"12px"}}>→</span>
          <span style={{fontFamily:"monospace",fontSize:"11px",color:"#8fa3bf",letterSpacing:"0.1em",textTransform:"uppercase"}}>LATAM</span>
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
  const { t } = useI18n();
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
          <p style={{fontWeight:700,color:"#8fa3bf",fontSize:"clamp(20px,3vw,40px)",marginBottom:"8px"}}>This is not a software product.</p>
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

Write-Host ""
Write-Host "V6 listo — pnpm dev" -ForegroundColor Yellow