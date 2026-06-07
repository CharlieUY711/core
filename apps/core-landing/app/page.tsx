"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { CoreGlobeStatic } from "../components/CoreGlobe";

const CoreGlobe = dynamic(
  () => import("../components/CoreGlobe").then((m) => m.CoreGlobe),
  { ssr: false, loading: () => <CoreGlobeStatic className="w-full" /> }
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODULES = [
  { id:"connect", name:"CORE Connect", tag:"Global Sourcing",    icon:"⬡", desc:"Acceso seguro a proveedores globales verificados. Sourcing, due diligence, documentación y trazabilidad completa.", pills:["Sourcing seguro","Verificación","Trazabilidad","Documentación"], accent:"#3B82F6" },
  { id:"move",    name:"CORE Move",    tag:"Logística",          icon:"◈", desc:"Logística inteligente local, regional e internacional. Depósitos, zonas francas, aduanas y distribución en el Cono Sur.", pills:["Envíos internacionales","Última milla","Zonas francas","Aduanas"], accent:"#0D7377" },
  { id:"grow",    name:"CORE Grow",    tag:"Expansión comercial",icon:"◉", desc:"Representación comercial y desarrollo de mercados. Canales retail, horeca y gourmet, gestión de distribuidores.", pills:["Desarrollo de canales","Distribuidores","Trade marketing","Expansión"], accent:"#C9993A" },
  { id:"market",  name:"CORE Market",  tag:"Marketplace B2B",    icon:"◇", desc:"Marketplace B2B regional que conecta compradores y vendedores en toda Latinoamérica.", pills:["Listings","Transacciones","Pagos","Catálogo regional"], accent:"#7DB8F7" },
];

const STATS = [
  { value:"5",    label:"Países activos",        sub:"Cono Sur operativo" },
  { value:"+4",   label:"Mercados en expansión", sub:"2026 – 2030" },
  { value:"100M", label:"Envíos / año",          sub:"Capacidad 2035" },
  { value:"50K",  label:"Empresas target",       sub:"Multi-tenant" },
];

const MAP_LAYERS = [
  { icon:"⊕", title:"Orígenes principales",   desc:"Asia, Europa y Norteamérica conectados con Uruguay.", color:"#3B82F6" },
  { icon:"⊗", title:"Distribución Cono Sur",   desc:"Uruguay · Argentina · Brasil · Paraguay · Chile.", color:"#0D7377" },
  { icon:"⊘", title:"Mercados de expansión",   desc:"Perú · Colombia · México · Bolivia — 2026–2030.", color:"#C9993A" },
  { icon:"⊙", title:"Direct Shipments",        desc:"Rutas directas optimizadas con trazabilidad end-to-end.", color:"#7DB8F7" },
];

const INTELLIGENCE = [
  { icon:"▲", label:"Demanda",      desc:"Análisis histórico y proyectado por categoría y país." },
  { icon:"◆", label:"Performance",  desc:"KPIs por canal, distribuidor y producto en tiempo real." },
  { icon:"●", label:"Predicciones", desc:"Forecasting para anticipar necesidades operativas." },
  { icon:"◉", label:"Insights",     desc:"Recomendaciones accionables generadas automáticamente." },
];

const FOOTER_COLS = [
  { title:"Sobre CORE",  links:["Quiénes somos","Misión y visión","Equipo","Inversores","Prensa"] },
  { title:"Soluciones",  links:["CORE Connect","CORE Move","CORE Grow","CORE Market","CORE Intelligence"] },
  { title:"Países",      links:["Uruguay","Argentina","Brasil","Paraguay","Chile","Expansión →"] },
  { title:"Contacto",    links:["Hablar con un especialista","Formulario","Soporte","Prensa"] },
  { title:"Legal",       links:["Términos","Privacidad","Cookies","Compliance"] },
];

const LANGS = ["ES","PT","EN"];
const COUNTRIES = ["Uruguay","Argentina","Brasil","Paraguay","Chile"];
const CURRENCIES = ["USD","EUR","UYU","BRL"];
const SPARK = [30,45,35,55,42,68,52,72,61,85,74,90];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3 bg-[#0a1f3d]/90 backdrop-blur border-b border-[#1e3354]" : "py-5 bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#1b5ac4] to-[#0f3875] flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="font-bold text-white tracking-tight text-lg">CORE</span>
          <span className="hidden sm:block text-[#8fa3bf] text-xs font-mono border border-[#1e3354] rounded px-1.5 py-0.5">v1.0</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#8fa3bf]">
          {["Connect","Move","Grow","Market","Intelligence"].map(i => (
            <a key={i} href={`#${i.toLowerCase()}`} className="hover:text-white transition-colors">{i}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="#contact" className="hidden sm:block text-sm text-[#8fa3bf] hover:text-white transition-colors">Contacto</a>
          <a href="#solutions" className="px-4 py-2 rounded-lg bg-[#1b5ac4] hover:bg-[#3b82f6] text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25">Explorar →</a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-24 pb-16">
      <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 80% 60% at 50% -10%, rgba(27,90,196,0.35) 0%, transparent 70%), #0A1F3D"}} />
      <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle, rgba(59,130,246,0.15) 1px, transparent 1px)",backgroundSize:"28px 28px"}} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9993a] animate-pulse" />
            <span className="text-[#8fa3bf] font-mono text-xs tracking-[0.15em] uppercase">Global Supply Chain Platform</span>
          </div>
          <h1 className="font-bold leading-[1.04] tracking-tight mb-6">
            <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Global Supply.</span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{background:"linear-gradient(135deg,#7db8f7 0%,#fff 60%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Regional Growth.</span>
          </h1>
          <p className="text-[#8fa3bf] text-lg md:text-xl leading-relaxed max-w-xl mb-10 font-light">
            CORE conecta cadenas de suministro globales con oportunidades regionales. Una plataforma integrada para operar en toda <span className="text-white">Latinoamérica</span>.
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <a href="#solutions" className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#1b5ac4] hover:bg-[#3b82f6] text-white font-medium text-sm transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
              Explorar soluciones <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a href="#contact" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#1e3354] hover:border-blue-500/40 text-[#8fa3bf] hover:text-white text-sm font-medium transition-all hover:bg-[rgba(15,56,117,0.18)] hover:-translate-y-0.5">
              Hablar con un especialista
            </a>
          </div>
          <div className="flex flex-wrap gap-6">
            {[{n:"5",l:"países activos"},{n:"100M",l:"envíos / año"},{n:"50K",l:"empresas target"}].map(({n,l}) => (
              <div key={l} className="flex items-baseline gap-2">
                <span className="font-bold text-xl text-white">{n}</span>
                <span className="text-[#8fa3bf] text-xs font-mono">{l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Globe */}
        <div className="relative flex items-center justify-center">
          <CoreGlobe className="w-full max-w-[520px]" autoRotate={false} highlightCountry="uy" />
        </div>
      </div>
    </section>
  );
}

// ─── Personalization Bar ──────────────────────────────────────────────────────
function PersonalizationBar() {
  const [country,setCountry]   = useState("Uruguay");
  const [currency,setCurrency] = useState("USD");
  const [lang,setLang]         = useState("ES");
  const [time,setTime]         = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-UY",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Montevideo"}));
    tick(); const id = setInterval(tick,1000); return () => clearInterval(id);
  },[]);
  return (
    <div className="relative border-y border-[#1e3354] bg-[#1e2d42]/60 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-6 md:gap-10">
        <div className="flex items-center gap-2">
          <span className="text-xs">📍</span>
          <span className="text-[#8fa3bf] font-mono text-xs">Estás en:</span>
          <select value={country} onChange={e=>setCountry(e.target.value)} className="bg-transparent text-white font-mono text-xs border-b border-blue-500/30 focus:outline-none cursor-pointer">
            {COUNTRIES.map(c=><option key={c} value={c} className="bg-[#0a1f3d] text-white">{c}</option>)}
          </select>
        </div>
        <div className="h-4 w-px bg-[#1e3354] hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs">🕐</span>
          <span className="text-[#8fa3bf] font-mono text-xs">Hora local:</span>
          <span className="text-white font-mono text-xs tabular-nums">{time}</span>
        </div>
        <div className="h-4 w-px bg-[#1e3354] hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs">🌐</span>
          <span className="text-[#8fa3bf] font-mono text-xs">Idioma:</span>
          <div className="flex gap-1">
            {LANGS.map(l=>(
              <button key={l} onClick={()=>setLang(l)} className={`font-mono text-xs px-1.5 py-0.5 rounded transition-all ${lang===l?"bg-[#1b5ac4] text-white":"text-[#8fa3bf] hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="h-4 w-px bg-[#1e3354] hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs">💱</span>
          <span className="text-[#8fa3bf] font-mono text-xs">Moneda:</span>
          <div className="flex gap-1">
            {CURRENCIES.map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} className={`font-mono text-xs px-1.5 py-0.5 rounded transition-all ${currency===c?"bg-[#1b5ac4] text-white":"text-[#8fa3bf] hover:text-white"}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Value ────────────────────────────────────────────────────────────────────
function ValueSection() {
  return (
    <section id="value" className="relative py-28 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-mono text-xs text-[#8fa3bf] tracking-[0.15em] uppercase mb-4">Propuesta de valor</p>
            <h2 className="font-bold text-3xl md:text-5xl text-white leading-tight mb-6">
              Uruguay como <span style={{background:"linear-gradient(135deg,#7db8f7 0%,#fff 60%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>plataforma de acceso</span> al Cono Sur.
            </h2>
            <p className="text-[#8fa3bf] text-lg leading-relaxed max-w-lg font-light">
              Integramos logística, representación comercial y mercados digitales para que tu negocio llegue <span className="text-white">más lejos, más rápido</span> y con más eficiencia.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {["Un solo ecosistema para toda la operación regional","Multi-país, multi-moneda, multi-idioma por diseño","Infraestructura en zonas francas del Cono Sur"].map(t=>(
                <div key={t} className="flex items-center gap-3">
                  <span className="text-[#c9993a] text-lg w-5 shrink-0">◆</span>
                  <span className="text-[#8fa3bf] text-sm">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map(s=>(
              <div key={s.label} className="rounded-2xl p-6 flex flex-col gap-2 border border-[#1e3354] bg-[rgba(15,56,117,0.12)] hover:bg-[rgba(27,90,196,0.22)] hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300">
                <span className="font-bold text-5xl md:text-6xl leading-none" style={{background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{s.value}</span>
                <p className="text-white font-medium text-sm mt-1">{s.label}</p>
                <p className="text-[#8fa3bf] font-mono text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────────
function ModulesSection() {
  const [active,setActive] = useState<string|null>(null);
  return (
    <section id="solutions" className="relative py-24 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-16">
          <p className="font-mono text-xs text-[#8fa3bf] tracking-[0.15em] uppercase mb-3">Módulos</p>
          <h2 className="font-bold text-3xl md:text-5xl text-white leading-tight max-w-2xl">
            Un ecosistema. <span style={{background:"linear-gradient(135deg,#fff 30%,#f5c870 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Cuatro verticales.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {MODULES.map(mod=>(
            <div key={mod.id} id={mod.id}
              className={`group relative rounded-2xl p-7 cursor-pointer transition-all duration-300 overflow-hidden border ${active===mod.id?"border-blue-500/40 bg-[#1e2d42]":"border-[#1e3354] bg-[rgba(15,56,117,0.12)] hover:bg-[rgba(27,90,196,0.22)] hover:border-blue-500/20 hover:-translate-y-1"}`}
              onMouseEnter={()=>setActive(mod.id)} onMouseLeave={()=>setActive(null)}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block text-xs font-mono tracking-widest uppercase mb-2" style={{color:mod.accent}}>{mod.tag}</span>
                  <h3 className="font-bold text-xl text-white">{mod.name}</h3>
                </div>
                <span className="text-3xl opacity-30 group-hover:opacity-60 transition-opacity" style={{color:mod.accent}}>{mod.icon}</span>
              </div>
              <p className="text-[#8fa3bf] text-sm leading-relaxed mb-5 font-light">{mod.desc}</p>
              <div className="flex flex-wrap gap-2">
                {mod.pills.map(p=>(
                  <span key={p} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono border" style={{borderColor:`${mod.accent}40`,color:mod.accent,background:`${mod.accent}10`}}>{p}</span>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-mono" style={{color:mod.accent}}>
                <span>Ver más</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function MapSection() {
  const [activeLayer,setActiveLayer] = useState(0);
  const layerMap = ["all","origins","cono","direct","expansion"] as const;
  return (
    <section id="map" className="relative py-28 overflow-hidden">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent mb-28" />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-16">
          <p className="font-mono text-xs text-[#8fa3bf] tracking-[0.15em] uppercase mb-3">Red operativa</p>
          <h2 className="font-bold text-3xl md:text-5xl text-white leading-tight">
            Global Map <span style={{background:"linear-gradient(135deg,#7db8f7 0%,#fff 60%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Experience</span>
          </h2>
        </div>
        <div className="grid lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-2 flex flex-col gap-3">
            {MAP_LAYERS.map((layer,i)=>(
              <button key={layer.title} onClick={()=>setActiveLayer(i)}
                className={`text-left rounded-xl p-4 border transition-all duration-300 ${activeLayer===i?"border-blue-500/40 bg-[#1e2d42]":"border-[#1e3354] bg-[rgba(15,56,117,0.12)] hover:border-blue-500/20"}`}>
                <div className="flex items-center gap-3 mb-1">
                  <span style={{color:layer.color}} className="text-lg">{layer.icon}</span>
                  <span className="text-white font-medium text-sm">{layer.title}</span>
                </div>
                <p className="text-[#8fa3bf] text-xs leading-relaxed pl-8">{layer.desc}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3">
            <CoreGlobe
              className="w-full rounded-2xl"
              activeLayer={layerMap[activeLayer]}
              autoRotate
              highlightCountry="uy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Intelligence ─────────────────────────────────────────────────────────────
function IntelligenceSection() {
  const max = Math.max(...SPARK);
  return (
    <section id="intelligence" className="relative py-28 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-mono text-xs text-[#8fa3bf] tracking-[0.15em] uppercase mb-3">CORE Intelligence</p>
            <h2 className="font-bold text-3xl md:text-5xl text-white leading-tight mb-6">
              Datos para <span style={{background:"linear-gradient(135deg,#7db8f7 0%,#fff 60%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>decidir mejor.</span>
            </h2>
            <p className="text-[#8fa3bf] text-lg leading-relaxed mb-10 font-light max-w-lg">
              CORE Intelligence convierte operaciones en inteligencia competitiva. Demanda, performance, predicciones e insights accionables para cada mercado.
            </p>
            <div className="flex flex-col gap-5">
              {INTELLIGENCE.map(({icon,label,desc})=>(
                <div key={label} className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5" style={{background:"rgba(27,90,196,0.2)",color:"#7db8f7"}}>{icon}</div>
                  <div>
                    <p className="text-white font-medium text-sm">{label}</p>
                    <p className="text-[#8fa3bf] text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-6 border border-[#1e3354] bg-[rgba(15,56,117,0.12)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-white font-medium text-sm">Performance regional</p>
                <p className="text-[#8fa3bf] font-mono text-xs mt-0.5">Últimos 12 meses</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-mono text-xs">Live</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-24 mb-5">
              {SPARK.map((v,i)=>(
                <div key={i} className="flex-1 rounded-sm" style={{height:`${(v/max)*100}%`,background:i===SPARK.length-1?"linear-gradient(to top,#c9993a,#f5c870)":"linear-gradient(to top,#1b5ac4,#3b82f6)",opacity:0.5+(i/SPARK.length)*0.5}} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{label:"Envíos",value:"12.4K",delta:"+18%"},{label:"Transacciones",value:"4.8K",delta:"+22%"},{label:"Inventario",value:"98%",delta:"+3%"}].map(({label,value,delta})=>(
                <div key={label} className="rounded-xl p-3 bg-[#0a1f3d]/60 border border-[#1e3354]">
                  <p className="text-[#8fa3bf] font-mono text-xs mb-1">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                  <p className="text-green-400 font-mono text-xs">{delta}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl p-3 border border-[#c9993a]/20 bg-[#c9993a]/5">
              <div className="flex items-center gap-2">
                <span className="text-[#c9993a] text-xs">◆</span>
                <p className="text-[#c9993a] text-xs font-mono">Insight: demanda en Brasil +24% próximo trimestre</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Social ───────────────────────────────────────────────────────────────────
function SocialSection() {
  const tags = ["Supply Chain","Logística Regional","B2B Marketplace","Zonas Francas","LATAM Expansion","CORE Intelligence","Trade Marketing","Cross-border","Cono Sur","Uruguay workspace","Distribución","Sourcing Global"];
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent mb-24" />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-14">
          <p className="font-mono text-xs text-[#8fa3bf] tracking-[0.15em] uppercase mb-3">Comunidad</p>
          <h2 className="font-bold text-3xl md:text-4xl text-white">Seguinos en redes</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 max-w-xl mx-auto mb-16">
          {[{net:"LinkedIn",handle:"linkedin.com/company/core-latam",icon:"in",color:"#0A66C2",desc:"Noticias, expansión y casos de uso.",freq:"3–4 posts / semana"},{net:"Instagram",handle:"@core_latam",icon:"◉",color:"#C13584",desc:"Visual storytelling e infografías.",freq:"4–5 posts / semana"}].map(({net,handle,icon,color,desc,freq})=>(
            <a key={net} href="#" className="rounded-2xl p-6 flex flex-col gap-3 border border-[#1e3354] bg-[rgba(15,56,117,0.12)] hover:bg-[rgba(27,90,196,0.22)] hover:border-blue-500/20 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{background:color}}>{icon}</div>
                <div>
                  <p className="text-white font-medium text-sm">{net}</p>
                  <p className="text-[#8fa3bf] font-mono text-xs">{handle}</p>
                </div>
              </div>
              <p className="text-[#8fa3bf] text-xs leading-relaxed">{desc}</p>
              <p className="text-xs font-mono mt-auto" style={{color}}>{freq}</p>
            </a>
          ))}
        </div>
        <div className="overflow-hidden relative">
          <div className="flex gap-4 whitespace-nowrap" style={{animation:"marquee 28s linear infinite"}}>
            {[...tags,...tags].map((tag,i)=>(
              <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e3354] text-[#8fa3bf] font-mono text-xs shrink-0">
                <span className="text-[#c9993a] text-xs">◆</span>{tag}
              </span>
            ))}
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a1f3d] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a1f3d] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative border-t border-[#1e3354] bg-[#1e2d42]/40 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-6 gap-10 mb-14">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#1b5ac4] to-[#0f3875] flex items-center justify-center">
                <span className="text-white text-xs font-bold">C</span>
              </div>
              <span className="font-bold text-white tracking-tight">CORE</span>
            </div>
            <p className="text-[#8fa3bf] text-xs leading-relaxed font-light max-w-[160px]">Growth & Operations Platform for Latin America.</p>
            <p className="text-[#4a6080] font-mono text-xs mt-4">v1.0 — Mayo 2026</p>
          </div>
          {FOOTER_COLS.map(col=>(
            <div key={col.title} className="md:col-span-1">
              <p className="text-white font-medium text-sm mb-4">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link=>(
                  <li key={link}><a href="#" className="text-[#8fa3bf] hover:text-white text-xs transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent mb-8" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[#8fa3bf] font-mono text-xs">© 2026 CORE. Todos los derechos reservados.</p>
            <span className="text-[#1e3354] hidden sm:block">|</span>
            <p className="text-[#8fa3bf] font-mono text-xs italic">Global Supply. Regional Growth.</p>
          </div>
          <div className="flex items-center gap-3">
            {LANGS.map(l=><button key={l} className="text-[#8fa3bf] hover:text-white font-mono text-xs transition-colors">{l}</button>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CoreLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A1F3D]">
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <Nav />
      <main>
        <Hero />
        <PersonalizationBar />
        <ValueSection />
        <ModulesSection />
        <MapSection />
        <IntelligenceSection />
        <SocialSection />
      </main>
      <Footer />
    </div>
  );
}

