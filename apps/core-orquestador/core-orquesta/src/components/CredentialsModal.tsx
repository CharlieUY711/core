import { useState } from "react";
import { X, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

interface Credential { id: string; name: string; motor: string; loaded: boolean; }

const INITIAL: Credential[] = [
  { id: "c1", name: "NEWS_API_KEY", motor: "Monitor de Noticias", loaded: true },
  { id: "c2", name: "RSS_AUTH_TOKEN", motor: "Monitor de Noticias", loaded: true },
  { id: "c3", name: "SCRAPER_AUTH_TOKEN", motor: "Web Scraper", loaded: true },
  { id: "c4", name: "PROXY_KEY", motor: "Web Scraper", loaded: false },
  { id: "c5", name: "AI_MODEL_KEY", motor: "Analizador", loaded: true },
  { id: "c6", name: "VECTOR_DB_URL", motor: "Analizador", loaded: true },
  { id: "c7", name: "DB_CONNECTION_STR", motor: "Conector BD", loaded: false },
  { id: "c8", name: "DB_PASSWORD", motor: "Conector BD", loaded: false },
  { id: "c9", name: "SMTP_API_KEY", motor: "Notificador Email", loaded: false },
];

interface CredentialsModalProps { onClose: () => void; }

export function CredentialsModal({ onClose }: CredentialsModalProps) {
  const [creds, setCreds] = useState(INITIAL);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showVal, setShowVal] = useState(false);

  const loaded = creds.filter((c) => c.loaded).length;
  const missing = creds.filter((c) => !c.loaded).length;

  const handleSave = (id: string) => {
    if (editVal.trim()) {
      setCreds((prev) => prev.map((c) => c.id === id ? { ...c, loaded: true } : c));
    }
    setEditing(null);
    setEditVal("");
  };

  // Group by motor
  const grouped = creds.reduce<Record<string, Credential[]>>((acc, c) => {
    if (!acc[c.motor]) acc[c.motor] = [];
    acc[c.motor].push(c);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0B1120] px-5 py-4 flex items-center justify-between border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/20 border border-amber-400/30 rounded-xl flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Seguridad</p>
              <h3 className="text-white font-semibold text-sm">Gestión de Credenciales</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-700 font-semibold">{loaded} cargadas</span>
          </div>
          {missing > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600 font-semibold">{missing} faltantes</span>
            </div>
          )}
          <div className="ml-auto">
            <div className="h-1.5 w-32 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.round((loaded / creds.length) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Grouped credential list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(grouped).map(([motor, motorCreds]) => (
            <div key={motor}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
                {motor}
              </p>
              <div className="space-y-1.5">
                {motorCreds.map((cred) => (
                  <div key={cred.id}
                    className={`p-3.5 rounded-xl border transition-all ${cred.loaded ? "bg-white border-slate-200" : "bg-red-50/50 border-red-200"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {cred.loaded
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        }
                        <code className="text-xs font-mono font-bold text-slate-700">{cred.name}</code>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border
                        ${cred.loaded
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                        {cred.loaded ? "Cargada" : "Falta"}
                      </span>
                    </div>

                    {editing === cred.id ? (
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1 relative">
                          <input type={showVal ? "text" : "password"} placeholder="Ingresa el valor..."
                            value={editVal} onChange={(e) => setEditVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave(cred.id)}
                            autoFocus
                            className="w-full pr-8 text-xs border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => setShowVal(!showVal)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showVal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button onClick={() => handleSave(cred.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 font-medium">
                          OK
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="px-2 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-mono text-slate-400">
                          {cred.loaded ? "••••••••••••••••" : "— sin valor —"}
                        </span>
                        <button onClick={() => setEditing(cred.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium">
                          {cred.loaded ? "Actualizar" : "Cargar"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-5 pb-4 pt-3 border-t border-slate-200 bg-slate-50">
          <p className="text-[11px] text-slate-400 text-center">
            Las credenciales se almacenan de forma cifrada y nunca se exponen en logs ni interfaces.
          </p>
        </div>
      </div>
    </div>
  );
}