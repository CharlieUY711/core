import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

const CFG: Record<ToastType, {
  bg: string; border: string; icon: React.ElementType;
  iconColor: string; iconBg: string; titleColor: string;
}> = {
  success: {
    bg: "bg-white", border: "border-l-emerald-500",
    icon: CheckCircle2, iconColor: "text-emerald-600", iconBg: "bg-emerald-50",
    titleColor: "text-emerald-900",
  },
  error: {
    bg: "bg-white", border: "border-l-red-500",
    icon: XCircle, iconColor: "text-red-600", iconBg: "bg-red-50",
    titleColor: "text-red-900",
  },
  warning: {
    bg: "bg-white", border: "border-l-amber-500",
    icon: AlertTriangle, iconColor: "text-amber-600", iconBg: "bg-amber-50",
    titleColor: "text-amber-900",
  },
  info: {
    bg: "bg-white", border: "border-l-blue-500",
    icon: Info, iconColor: "text-blue-600", iconBg: "bg-blue-50",
    titleColor: "text-blue-900",
  },
};

interface ToastItemComponentProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

function ToastItemComponent({ toast, onRemove }: ToastItemComponentProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const cfg = CFG[toast.type];
  const Icon = cfg.icon;
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Start exit
    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); };
  }, [toast.id, duration, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      style={{
        transition: "all 0.3s cubic-bezier(0.34,1.1,0.64,1)",
        transform: visible && !exiting ? "translateX(0)" : "translateX(calc(100% + 24px))",
        opacity: visible && !exiting ? 1 : 0,
      }}
      className={`flex items-start gap-3 min-w-[300px] max-w-[360px] ${cfg.bg} border border-l-4 ${cfg.border} border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 p-3.5 pointer-events-auto`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
        <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.titleColor}`}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${toast.type === "success" ? "bg-emerald-400" : toast.type === "error" ? "bg-red-400" : toast.type === "warning" ? "bg-amber-400" : "bg-blue-400"}`}
            style={{ animation: `progressBar ${duration}ms linear forwards` }}
          />
        </div>
      </div>
      <button onClick={handleClose}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors shrink-0 mt-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToasterProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function Toaster({ toasts, onRemove }: ToasterProps) {
  return (
    <div className="fixed top-[60px] right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItemComponent key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (t: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
