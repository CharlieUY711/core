"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type AgentStatus = "checking" | "offline" | "idle" | "active";

interface HostProps {
  sessionCode: string;
  onExit: () => void;
}

export function Host({ sessionCode, onExit }: HostProps) {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("checking");
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`control:${sessionCode}`, {
      config: { presence: { key: "host-ui" } }
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const keys = Object.keys(state);
      if (keys.includes("agent-active")) setAgentStatus("active");
      else if (keys.includes("agent")) setAgentStatus("idle");
      else setAgentStatus("offline");
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ role: "host-ui", joined_at: new Date().toISOString() });
        // Si en 2s no hay agent, marcar offline
        setTimeout(() => {
          setAgentStatus(prev => prev === "checking" ? "offline" : prev);
        }, 2000);
      }
    });

    return () => { supabase.removeChannel(ch); };
  }, [sessionCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePermitControl = async () => {
    if (agentStatus === "offline") return;

    if (agentStatus === "idle") {
      await channelRef.current?.send({
        type: "broadcast",
        event: "agent:command",
        payload: { command: "start", session_code: sessionCode },
      });
      return;
    }

    if (agentStatus === "active") {
      await channelRef.current?.send({
        type: "broadcast",
        event: "agent:command",
        payload: { command: "stop", session_code: sessionCode },
      });
    }
  };

  const agentConfig: Record<AgentStatus, { label: string; className: string; dot: string; hint?: string }> = {
    checking: {
      label: "Verificando...",
      className: "btn-ghost opacity-50 cursor-wait",
      dot: "bg-yellow-500 animate-pulse",
    },
    offline: {
      label: "Permitir Control",
      className: "btn-ghost border-red-500/40 text-red-400 cursor-not-allowed opacity-60",
      dot: "bg-red-500",
      hint: "Core Agent no está corriendo en este equipo.",
    },
    idle: {
      label: "Permitir Control",
      className: "btn-primary",
      dot: "bg-green-500",
      hint: "Agent listo. Podés permitir el control remoto.",
    },
    active: {
      label: "Revocar Control",
      className: "btn-ghost border-core-accent/60 text-core-accent",
      dot: "bg-core-accent animate-pulse",
      hint: "Control remoto activo — el viewer puede controlar este equipo.",
    },
  };

  const cfg = agentConfig[agentStatus];

  return (
    <div className="card">
      <div className="flex flex-col gap-1 mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-core-text-muted">
          Tu código de sesión
        </p>
        <p className="session-code">{sessionCode.split("").join(" ")}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleCopy} className="btn-ghost flex items-center gap-2">
          {copied ? (
            <><span className="h-2 w-2 rounded-full bg-green-500" />Copiado</>
          ) : "Copiar código"}
        </button>

        <button
          onClick={handlePermitControl}
          disabled={agentStatus === "offline" || agentStatus === "checking"}
          className={`flex items-center gap-2 ${cfg.className}`}
        >
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </button>

        <button onClick={onExit} className="btn-ghost ml-auto">Salir</button>
      </div>

      {cfg.hint && (
        <p className={`mt-3 text-xs ${agentStatus === "offline" ? "text-red-400/80" : agentStatus === "active" ? "text-core-accent/80" : "text-core-text-muted"}`}>
          {cfg.hint}
        </p>
      )}
    </div>
  );
}
