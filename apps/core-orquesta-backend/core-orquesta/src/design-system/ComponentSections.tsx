import { useState } from "react";
import {
  Loader2, Plus, Settings, Trash2, Download, Send,
  CheckCircle2, XCircle, AlertTriangle, Info, X,
  ChevronDown, Search, Eye, EyeOff, Plug, Building2,
  Calendar, User, Mail, Hash, Zap,
} from "lucide-react";
import { DSSection, DSSectionHeader, PreviewCard, DSGrid, ComponentItem, SpecRow } from "./DSHelpers";

// ════════════════════════════════════════════════════════════════════
//  BUTTONS
// ════════════════════════════════════════════════════════════════════
export function ButtonSection() {
  const [loading, setLoading] = useState(false);
  const sim = () => { setLoading(true); setTimeout(() => setLoading(false), 1800); };

  return (
    <DSSection id="buttons">
      <DSSectionHeader
        title="Botones"
        subtitle="Sistema de botones de 4 variantes × 3 tamaños × 5 estados. Altura estándar: 36px."
      />
      <PreviewCard title="Variantes principales">
        <div className="flex flex-wrap gap-3 items-center">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-sm shadow-blue-600/25">
            <Plus className="w-4 h-4" /> Primario
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
            <Settings className="w-4 h-4" /> Secundario
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors">
            <Download className="w-4 h-4" /> Fantasma
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition-colors shadow-sm shadow-red-600/20">
            <Trash2 className="w-4 h-4" /> Peligro
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-600/20">
            <CheckCircle2 className="w-4 h-4" /> Éxito
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-md"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)" }}>
            <Zap className="w-4 h-4" /> Gradiente
          </button>
        </div>
      </PreviewCard>

      <DSGrid cols={2} gap={4}>
        <PreviewCard title="Tamaños">
          <div className="flex flex-wrap gap-3 items-center">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors">
              <Plus className="w-3 h-3" /> Extra Small
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Small
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors">
              <Plus className="w-4 h-4" /> Medium (Base)
            </button>
            <button className="flex items-center gap-2.5 px-5 py-3 bg-blue-600 text-white rounded-2xl text-base font-semibold hover:bg-blue-500 transition-colors">
              <Plus className="w-5 h-5" /> Large
            </button>
          </div>
        </PreviewCard>

        <PreviewCard title="Estados">
          <div className="flex flex-wrap gap-3 items-center">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors">
              Normal
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold ring-2 ring-blue-400 ring-offset-1">
              Hover
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold scale-95">
              Pressed
            </button>
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold opacity-40 cursor-not-allowed">
              Disabled
            </button>
            <button onClick={sim}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors min-w-[110px] justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando</> : "Simular carga"}
            </button>
          </div>
        </PreviewCard>
      </DSGrid>

      <PreviewCard title="Icon Buttons">
        <div className="flex flex-wrap gap-3 items-center">
          {[
            { icon: Plus,     bg: "bg-blue-600",    text: "text-white",   shadow: "shadow-blue-600/25" },
            { icon: Settings, bg: "bg-white",       text: "text-slate-600", shadow: "" },
            { icon: Trash2,   bg: "bg-red-100",     text: "text-red-600",  shadow: "" },
            { icon: Send,     bg: "bg-emerald-600", text: "text-white",    shadow: "shadow-emerald-600/25" },
            { icon: Download, bg: "bg-slate-100",   text: "text-slate-600",shadow: "" },
          ].map(({ icon: Icon, bg, text, shadow }, i) => (
            <button key={i}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border border-transparent hover:border-slate-200 ${bg} ${text} ${shadow} shadow-sm transition-all hover:scale-105 active:scale-95`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-8 bg-slate-200 mx-1" />
          {/* Rounded */}
          {[
            { icon: Plus,     bg: "bg-blue-600", text: "text-white" },
            { icon: X,        bg: "bg-slate-100",text: "text-slate-600" },
            { icon: CheckCircle2, bg: "bg-emerald-100", text: "text-emerald-600" },
          ].map(({ icon: Icon, bg, text }, i) => (
            <button key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${bg} ${text} transition-all hover:scale-105`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </PreviewCard>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  INPUTS
// ════════════════════════════════════════════════════════════════════
export function InputSection() {
  const [text, setText] = useState("");
  const [password, setPassword] = useState("secreto");
  const [showPw, setShowPw] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({
    a: true, b: false, c: false,
  });
  const [toggleOn, setToggleOn] = useState(true);
  const [tags, setTags] = useState(["TechCorp", "Serie B"]);
  const [tagInput, setTagInput] = useState("");
  const [dropdown, setDropdown] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <DSSection id="inputs">
      <DSSectionHeader
        title="Inputs & Formularios"
        subtitle="Todos los controles de entrada con sus variantes y estados. Altura base de input: 38px."
      />
      <DSGrid cols={2} gap={4}>
        {/* Text inputs */}
        <PreviewCard title="Text Input — variantes">
          <div className="space-y-3">
            {/* Default */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Normal</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Buscar empresa…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400" />
              </div>
            </div>
            {/* Focused (simulated) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Focused</label>
              <input type="text" defaultValue="TechCorp Uruguay"
                className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-xl bg-white outline-none ring-2 ring-blue-100 transition-all" />
            </div>
            {/* Error */}
            <div>
              <label className="block text-xs font-semibold text-red-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Error
              </label>
              <input type="text" defaultValue="valor inválido"
                className="w-full px-3 py-2 text-sm border-2 border-red-400 rounded-xl bg-red-50 outline-none text-red-700" />
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Este campo es requerido.
              </p>
            </div>
            {/* Disabled */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Disabled</label>
              <input type="text" disabled defaultValue="Campo bloqueado"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed" />
            </div>
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </PreviewCard>

        {/* Select & Textarea */}
        <PreviewCard title="Select, Textarea, Number">
          <div className="space-y-3">
            {/* Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Dropdown / Select</label>
              <div className="relative">
                <select value={dropdown} onChange={(e) => setDropdown(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer pr-8 text-slate-700">
                  <option value="">Seleccionar intervalo…</option>
                  <option value="5">5 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Number Input</label>
              <input type="number" defaultValue={15} min={1} max={1440}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Search Input</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="search" placeholder="Buscar en señales…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400" />
              </div>
            </div>
            {/* Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Textarea</label>
              <textarea rows={3} placeholder="Escribir descripción del contexto…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all placeholder:text-slate-400" />
            </div>
          </div>
        </PreviewCard>
      </DSGrid>

      <DSGrid cols={3} gap={4}>
        {/* Checkboxes */}
        <PreviewCard title="Checkboxes">
          <div className="space-y-3">
            {[
              { key: "a", label: "Monitor de noticias", sub: "Activado por defecto" },
              { key: "b", label: "Web Scraper Pro",     sub: "Sin credenciales" },
              { key: "c", label: "Analizador IA",       sub: "Premium" },
            ].map(({ key, label, sub }) => (
              <label key={key} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all
                ${checked[key] ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="checkbox" checked={checked[key]}
                  onChange={() => setChecked({ ...checked, [key]: !checked[key] })}
                  className="w-4 h-4 rounded accent-blue-600 mt-0.5 cursor-pointer" />
                <div>
                  <p className="text-sm text-slate-700 font-medium">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              </label>
            ))}
          </div>
        </PreviewCard>

        {/* Toggles */}
        <PreviewCard title="Toggles">
          <div className="space-y-4">
            {[
              { on: toggleOn, label: toggleOn ? "Motor Activo" : "Motor Inactivo", desc: toggleOn ? "El motor está ejecutándose" : "Haz clic para activar" },
              { on: true,  label: "Notificaciones",  desc: "Alertas por señales" },
              { on: false, label: "Modo verbose",    desc: "Logs adicionales" },
            ].map(({ on, label, desc }, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-700 font-medium">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <button
                  onClick={() => i === 0 && setToggleOn(!toggleOn)}
                  className={`relative w-11 h-6 rounded-full border-2 transition-all duration-200
                    ${on ? "bg-blue-600 border-blue-600" : "bg-slate-200 border-slate-200"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200
                    ${on ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </PreviewCard>

        {/* Tags/Chips */}
        <PreviewCard title="Tags / Chips">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:text-blue-900 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && <p className="text-xs text-slate-400 italic">Sin tags</p>}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Agregar tag…" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addTag} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Static examples */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Variantes de color</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { t: "Activo",  c: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                  { t: "Error",   c: "bg-red-100 text-red-700 border-red-200" },
                  { t: "Alerta",  c: "bg-amber-100 text-amber-700 border-amber-200" },
                  { t: "Info",    c: "bg-blue-100 text-blue-700 border-blue-200" },
                  { t: "Neutral", c: "bg-slate-100 text-slate-600 border-slate-200" },
                ].map(({ t, c }) => (
                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${c}`}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  CARDS
// ════════════════════════════════════════════════════════════════════
export function CardSection() {
  return (
    <DSSection id="cards">
      <DSSectionHeader title="Cards" subtitle="Contenedores modulares para agrupar información relacionada." />
      <DSGrid cols={3} gap={4}>
        {/* Card base */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card base</p>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500 leading-relaxed">
              Contenedor base con padding interno de 20px, borde sutil y radio de 16px.
              Hover eleva la sombra levemente.
            </p>
          </div>
        </div>
        {/* Card with header */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card con header</p>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Título del panel</p>
              <span className="text-[10px] text-slate-400">Acción</span>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 leading-relaxed">Contenido del cuerpo con padding consistente.</p>
            </div>
          </div>
        </div>
        {/* Card with icon */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card con ícono</p>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center shrink-0">
                <Plug className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Monitor de noticias</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Estado: activo · v2.1.0</p>
              </div>
            </div>
          </div>
        </div>
        {/* Metric card */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card métrica</p>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg shadow-blue-600/25 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">Señales hoy</p>
            <p className="text-4xl font-bold mt-1.5">47</p>
            <p className="text-xs opacity-70 mt-1.5 flex items-center gap-1">
              <span className="text-emerald-300">↑ 23%</span> vs ayer
            </p>
          </div>
        </div>
        {/* Dark card */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card oscura</p>
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl p-5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Motor</p>
            <p className="text-white font-semibold text-sm">Web Scraper Pro</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400">Ejecutándose</span>
            </div>
          </div>
        </div>
        {/* Selectable card */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Card seleccionable</p>
          <div className="bg-white border-2 border-blue-500 rounded-2xl p-5 shadow-sm shadow-blue-500/20 ring-2 ring-blue-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plug className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Motor seleccionado</p>
              </div>
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════════════
export function ModalSection() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <DSSection id="modals">
      <DSSectionHeader title="Modales" subtitle="Diálogos de diferentes tipos: formulario, confirmación, información." />
      <DSGrid cols={2} gap={4}>
        {/* Modal base preview */}
        <PreviewCard title="Modal base — estructura">
          <div className="relative bg-slate-100 rounded-xl p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden scale-90 origin-top">
              <div className="bg-[#0B1120] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                    <Settings className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Módulo</p>
                    <p className="text-white font-semibold text-xs">Configurar Motor</p>
                  </div>
                </div>
                <div className="w-6 h-6 flex items-center justify-center text-slate-500 bg-white/10 rounded-lg">
                  <X className="w-3 h-3" />
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Intervalo de ejecución</p>
                  <div className="h-6 bg-slate-100 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Empresas</p>
                  <div className="h-6 bg-slate-100 rounded-lg border border-slate-200" />
                </div>
              </div>
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex gap-2">
                <div className="flex-1 h-7 bg-slate-200 rounded-xl" />
                <div className="flex-1 h-7 bg-blue-600 rounded-xl" />
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-3">Drawer lateral (520px de ancho)</p>
          </div>
        </PreviewCard>

        {/* Confirmation modal */}
        <PreviewCard title="Modal de confirmación">
          <button onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border-2 border-dashed border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-100 transition-colors">
            <Trash2 className="w-4 h-4" /> Abrir confirmación destructiva →
          </button>
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 anim-scale-in">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-slate-900 font-bold text-base text-center">¿Eliminar motor?</h3>
                <p className="text-slate-500 text-sm text-center mt-2 leading-relaxed">
                  Esta acción eliminará el motor permanentemente. No se puede deshacer.
                </p>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold">
                    Cancelar
                  </button>
                  <button onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors font-semibold">
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2">
            <SpecRow property="Max width — confirmación" value="400px" />
            <SpecRow property="Max width — formulario" value="520px" />
            <SpecRow property="Max width — fullscreen" value="90vw" />
            <SpecRow property="Backdrop" value="slate-900/60 blur-sm" />
            <SpecRow property="Entrada" value="scale(0) → scale(1)" />
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TABS
// ════════════════════════════════════════════════════════════════════
export function TabSection() {
  const [hTab, setHTab] = useState(0);
  const [vTab, setVTab] = useState(0);
  const htabs = ["Perfil", "Señales", "Eventos", "Documentos", "Relaciones"];
  const vtabs = ["General", "Credenciales", "Previsiones", "Logs"];
  const icons = [User, Zap, Calendar, Building2, Zap];

  return (
    <DSSection id="tabs">
      <DSSectionHeader title="Tabs" subtitle="Navegación entre vistas mediante pestañas horizontales o verticales." />
      <PreviewCard title="Horizontal tabs — con íconos y badges">
        <div className="flex items-center gap-0.5 flex-wrap">
          {htabs.map((t, i) => (
            <button key={t} onClick={() => setHTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${hTab === i ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
              {(() => { const Icon = icons[i]; return <Icon className="w-3.5 h-3.5" />; })()}
              {t}
              {i === 1 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${hTab === 1 ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>3</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500 min-h-[80px]">
          Contenido de: <strong className="text-slate-800">{htabs[hTab]}</strong>
          <p className="text-xs mt-1 text-slate-400">Cada pestaña mantiene su estado. Animación: fade + translateY(6px).</p>
        </div>
      </PreviewCard>

      <DSGrid cols={2} gap={4}>
        {/* Vertical tabs */}
        <PreviewCard title="Vertical tabs — formulario">
          <div className="flex gap-3">
            <div className="flex flex-col gap-0.5 w-[140px] shrink-0">
              {vtabs.map((t, i) => (
                <button key={t} onClick={() => setVTab(i)}
                  className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${vTab === i ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 min-h-[100px]">
              Vista: <strong className="text-slate-700">{vtabs[vTab]}</strong>
            </div>
          </div>
        </PreviewCard>

        {/* Pill tabs */}
        <PreviewCard title="Pill tabs — filtros">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              {["Todos", "Activos", "Errores"].map((t, i) => (
                <button key={t}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${i === 0 ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
              {["Perfil", "Señales", "Eventos"].map((t, i) => (
                <button key={t}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-all
                    ${i === 0 ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TABLES
// ════════════════════════════════════════════════════════════════════
export function TableSection() {
  const rows = [
    { company: "TechCorp Uruguay",  signal: "Serie B · $12M",      status: "nueva",     priority: "alta",  date: "24/02 17:30", motor: "Monitor" },
    { company: "RetailCo",          signal: "Expansión LATAM",      status: "procesada", priority: "media", date: "24/02 12:00", motor: "Scraper" },
    { company: "InnovaGroup",       signal: "Contratación +40",     status: "procesada", priority: "alta",  date: "24/02 09:15", motor: "Monitor" },
    { company: "FinTech SA",        signal: "Fallo servicio 4h",    status: "ignorada",  priority: "baja",  date: "23/02 22:10", motor: "Alertas" },
  ];

  const statusCfg: Record<string, string> = {
    nueva:     "bg-blue-100 text-blue-700 border-blue-200",
    procesada: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ignorada:  "bg-slate-100 text-slate-500 border-slate-200",
  };
  const priorityCfg: Record<string, string> = {
    alta:  "text-red-600",
    media: "text-amber-600",
    baja:  "text-slate-400",
  };

  return (
    <DSSection id="tables">
      <DSSectionHeader title="Tablas" subtitle="Grillas de datos con soporte para acciones, badges y ordenamiento." />
      <PreviewCard title="Tabla de señales con acciones" noPad>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Empresa</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Señal</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prioridad</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motor</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-800 text-xs">{r.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{r.signal}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${statusCfg[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${priorityCfg[r.priority]}`}>
                      {r.priority === "alta" ? "● Alta" : r.priority === "media" ? "● Media" : "● Baja"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.motor}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">{rows.length} señales · filtrado: todos los estados</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((p) => (
                <button key={p} className={`w-7 h-7 text-xs rounded-lg ${p === 1 ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-200"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </PreviewCard>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TIMELINE
// ════════════════════════════════════════════════════════════════════
export function TimelineSection() {
  const items = [
    { icon: CheckCircle2, color: "emerald", title: "Serie B cerrada · $12M",       desc: "TechCorp confirmó ronda de inversión con fondos de Buenos Aires.", time: "24/02 17:30", date: "hoy" },
    { icon: Zap,          color: "blue",    title: "Expansión LATAM detectada",     desc: "Señal de alta prioridad procesada por Monitor de Noticias.", time: "24/02 12:00", date: "hoy" },
    { icon: AlertTriangle,color: "amber",   title: "Contratación masiva · +40",     desc: "Se detectaron 40 nuevas publicaciones de empleo en LinkedIn.", time: "23/02 09:15", date: "ayer" },
    { icon: XCircle,      color: "red",     title: "Fallo de servicio · 4h",        desc: "RetailCo reportó interrupción en plataforma de pagos.", time: "22/02 22:10", date: "ayer" },
    { icon: Info,         color: "slate",   title: "Partnership Alliance Group",    desc: "Nuevo acuerdo estratégico anunciado en comunicado oficial.", time: "20/02 11:00", date: "mar 20" },
  ];

  const colorCfg: Record<string, { bg: string; border: string; icon: string; line: string }> = {
    emerald: { bg: "bg-emerald-100",  border: "border-emerald-200", icon: "text-emerald-600", line: "bg-emerald-200" },
    blue:    { bg: "bg-blue-100",     border: "border-blue-200",    icon: "text-blue-600",    line: "bg-blue-200" },
    amber:   { bg: "bg-amber-100",    border: "border-amber-200",   icon: "text-amber-600",   line: "bg-amber-200" },
    red:     { bg: "bg-red-100",      border: "border-red-200",     icon: "text-red-600",     line: "bg-red-200" },
    slate:   { bg: "bg-slate-100",    border: "border-slate-200",   icon: "text-slate-500",   line: "bg-slate-200" },
  };

  return (
    <DSSection id="timeline">
      <DSSectionHeader title="Timeline" subtitle="Secuencias de eventos ordenados cronológicamente con íconos y metadata." />
      <PreviewCard title="Timeline de eventos">
        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-200" />
          <div className="space-y-0">
            {items.map((item, i) => {
              const Icon = item.icon;
              const c = colorCfg[item.color];
              return (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className={`relative z-10 w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                  <div className="flex-1 pt-1 pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <h5 className="text-sm font-semibold text-slate-800">{item.title}</h5>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono text-slate-400">{item.time}</p>
                        <p className="text-[10px] text-slate-300">{item.date}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PreviewCard>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  ALERTS
// ════════════════════════════════════════════════════════════════════
export function AlertSection() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const ALERTS = [
    {
      id: "info",
      type: "Info",
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
      descColor: "text-blue-700",
      icon: Info,
      title: "Información del sistema",
      desc: "El motor ha sido actualizado a la versión 2.4.1. Los cambios entran en vigor en el próximo ciclo.",
    },
    {
      id: "success",
      type: "Éxito",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100 border-emerald-200",
      iconColor: "text-emerald-600",
      titleColor: "text-emerald-900",
      descColor: "text-emerald-700",
      icon: CheckCircle2,
      title: "Configuración guardada",
      desc: "Los cambios en Monitor de Noticias se aplicaron correctamente. Próxima ejecución en 15 minutos.",
    },
    {
      id: "warning",
      type: "Advertencia",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100 border-amber-200",
      iconColor: "text-amber-600",
      titleColor: "text-amber-900",
      descColor: "text-amber-700",
      icon: AlertTriangle,
      title: "Credenciales faltantes",
      desc: "El motor Web Scraper tiene 2 credenciales sin configurar. Puede no funcionar correctamente.",
    },
    {
      id: "error",
      type: "Error",
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100 border-red-200",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      descColor: "text-red-700",
      icon: XCircle,
      title: "Error de conexión",
      desc: "No se pudo conectar a la fuente RSS. Verifique la URL y las credenciales de acceso.",
    },
  ];

  return (
    <DSSection id="alerts">
      <DSSectionHeader title="Alertas" subtitle="Mensajes contextuales de 4 tipos con soporte para cierre y acciones." />
      <div className="space-y-3">
        {ALERTS.filter((a) => !dismissed.has(a.id)).map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.id} className={`flex items-start gap-3.5 p-4 rounded-2xl border ${a.bg} ${a.border}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${a.iconBg}`}>
                <Icon className={`w-4.5 h-4.5 ${a.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${a.titleColor}`}>{a.title}</p>
                <p className={`text-xs ${a.descColor} mt-0.5 leading-relaxed`}>{a.desc}</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <button className={`text-xs font-semibold ${a.iconColor} hover:underline`}>Ver detalles</button>
                  <button className={`text-xs font-semibold ${a.iconColor} hover:underline`}>Acción</button>
                </div>
              </div>
              <button onClick={() => setDismissed(new Set([...dismissed, a.id]))}
                className={`w-6 h-6 flex items-center justify-center shrink-0 ${a.iconColor} opacity-50 hover:opacity-100 transition-opacity mt-0.5`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {dismissed.size > 0 && (
          <button onClick={() => setDismissed(new Set())}
            className="text-xs text-blue-600 hover:underline">
            ↺ Mostrar alertas de nuevo
          </button>
        )}
      </div>
    </DSSection>
  );
}

// ════════════════════════════════════════════════════════════════════
//  CONSOLE / LOGS
// ════════════════════════════════════════════════════════════════════
export function ConsoleSection() {
  const logs = [
    { level: "SYS",  color: "text-slate-400",   time: "17:42:00", text: "Orquestador v2.4.1 iniciado. Motores: 4 activos, 0 errores." },
    { level: "INFO", color: "text-blue-400",     time: "17:42:01", text: "→ Monitor de Noticias: conectando a 12 fuentes RSS…" },
    { level: "OK",   color: "text-emerald-400",  time: "17:42:03", text: "✓ 11/12 fuentes conectadas. Fuente no disponible: feed.example.com" },
    { level: "WARN", color: "text-amber-400",    time: "17:42:05", text: "⚠ Web Scraper: credencial RSS_API_KEY no encontrada, saltando fuente." },
    { level: "INFO", color: "text-blue-400",     time: "17:42:07", text: "→ Procesando 47 artículos nuevos para TechCorp…" },
    { level: "OK",   color: "text-emerald-400",  time: "17:42:09", text: "✓ Señal detectada: TechCorp — Serie B $12M (confianza: 94%)" },
    { level: "INFO", color: "text-blue-400",     time: "17:42:10", text: "→ Señal guardada en base de datos. ID: sig_7f3a9c" },
    { level: "OK",   color: "text-emerald-400",  time: "17:42:11", text: "✓ Notificación enviada a 2 usuarios suscritos." },
    { level: "ERR",  color: "text-red-400",      time: "17:42:15", text: "✗ Analizador IA: timeout en API call (>30s). Reintentando en 60s." },
    { level: "INFO", color: "text-blue-400",     time: "17:42:30", text: "→ Ciclo completado. Próxima ejecución: 17:57:30" },
    { level: "DEBUG",color: "text-slate-500",    time: "17:42:30", text: "  Duración del ciclo: 29.4s · Señales: 3 · Documentos: 1" },
  ];

  return (
    <DSSection id="console">
      <DSSectionHeader title="Consola / Logs" subtitle="Terminal de sistema con niveles de log diferenciados por color. Fuente monospace." />
      <PreviewCard title="Consola del motor" dark label="monospace · Fira Code / JetBrains Mono">
        <div className="p-4 max-h-[320px] overflow-y-auto space-y-0.5">
          <p className="text-[10px] text-slate-600 font-mono mb-3 pb-2 border-b border-slate-800">
            ═══════════ Orquestador System Log — {new Date().toLocaleDateString("es-UY")} ═══════════
          </p>
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 group py-0.5">
              <span className="text-[10px] font-mono text-slate-600 shrink-0">[{log.time}]</span>
              <span className={`text-[10px] font-mono font-bold shrink-0 w-[38px] ${log.color}`}>{log.level}</span>
              <span className={`text-[11px] font-mono leading-relaxed ${log.color}`}>{log.text}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-800">
            <span className="text-emerald-400 font-mono text-[10px]">orquestador@core:~$</span>
            <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </PreviewCard>

      <DSGrid cols={2} gap={4}>
        <PreviewCard title="Niveles de log">
          <div className="space-y-2">
            {[
              { level: "SYS",   color: "text-slate-400",   bg: "bg-slate-900",  desc: "Sistema, inicio/fin de ciclo" },
              { level: "DEBUG", color: "text-slate-500",   bg: "bg-slate-900",  desc: "Información de depuración" },
              { level: "INFO",  color: "text-blue-400",    bg: "bg-blue-950",   desc: "Operaciones en curso" },
              { level: "OK",    color: "text-emerald-400", bg: "bg-emerald-950",desc: "Completado con éxito" },
              { level: "WARN",  color: "text-amber-400",   bg: "bg-amber-950",  desc: "Advertencia no crítica" },
              { level: "ERR",   color: "text-red-400",     bg: "bg-red-950",    desc: "Error que requiere atención" },
            ].map(({ level, color, bg, desc }) => (
              <div key={level} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${bg}`}>
                <span className={`text-[10px] font-mono font-bold w-[40px] ${color}`}>{level}</span>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Especificaciones">
          <div className="space-y-1.5">
            <SpecRow property="Fuente" value="JetBrains Mono / Fira Code" />
            <SpecRow property="Tamaño" value="11–12px" />
            <SpecRow property="Peso" value="400 (regular)" />
            <SpecRow property="Interlineado" value="1.7" />
            <SpecRow property="Fondo" value="#0D1117" />
            <SpecRow property="Color base" value="#94A3B8 (slate-400)" />
            <SpecRow property="Timestamp" value="#475569 (slate-600)" />
            <SpecRow property="Truncado" value="max 120 caracteres" />
          </div>
        </PreviewCard>
      </DSGrid>
    </DSSection>
  );
}
