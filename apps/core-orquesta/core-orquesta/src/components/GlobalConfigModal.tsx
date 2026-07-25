import { useState } from "react";
import { X, Save, Settings, Bell, Database, Globe, RefreshCw, Shield } from "lucide-react";

interface GlobalConfigModalProps { onClose: () => void; }

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${value ? "bg-blue-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
        ${value ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export function GlobalConfigModal({ onClose }: GlobalConfigModalProps) {
  const [notif, setNotif] = useState(true);
  const [retry, setRetry] = useState(true);
  const [audit, setAudit] = useState(false);
  const [logLevel, setLogLevel] = useState("info");
  const [timezone, setTimezone] = useState("America/Montevideo");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B1120] px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Sistema</p>
              <h3 className="text-white font-semibold text-sm">Configuración Global</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {[
            { icon: Bell, color: "bg-blue-100 text-blue-600", label: "Notificaciones", sub: "Alertas por email y sistema", value: notif, toggle: () => setNotif(!notif) },
            { icon: RefreshCw, color: "bg-emerald-100 text-emerald-600", label: "Auto-reintentar", sub: "En caso de fallo de motor", value: retry, toggle: () => setRetry(!retry) },
            { icon: Shield, color: "bg-violet-100 text-violet-600", label: "Auditoría de cambios", sub: "Registrar todas las acciones", value: audit, toggle: () => setAudit(!audit) },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/50 ${item.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                </div>
                <Toggle value={item.value} onChange={item.toggle} />
              </div>
            );
          })}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Nivel de log del sistema
            </label>
            <select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["debug", "info", "warn", "error"].map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Zona horaria
            </label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="America/Montevideo">America/Montevideo (UTC-3)</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
              <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
              <option value="UTC">UTC (UTC+0)</option>
            </select>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm">
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
