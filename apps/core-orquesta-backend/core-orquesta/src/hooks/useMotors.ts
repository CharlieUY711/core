// src/hooks/useMotors.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  motorRowToDomain,
  type Motor,
  type MotorRow,
  type MotorStatus,
} from "../types/orquesta.types";

interface UseMotorsResult {
  motors: Motor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleMotor: (id: string) => Promise<void>;
  saveMotorConfig: (id: string, updates: Partial<Motor>) => Promise<void>;
  installMotor: (motor: Partial<Motor>) => Promise<void>;
  removeMotor: (id: string) => Promise<void>;
}

export function useMotors(): UseMotorsResult {
  const [rows, setRows] = useState<MotorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMotors = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("orquesta_motors")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as MotorRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMotors();
  }, [fetchMotors]);

  const toggleMotor = useCallback(
    async (id: string) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;

      const nextStatus: MotorStatus =
        current.status === "active" ? "inactive" : "active";
      const logLine = {
        time: new Date().toTimeString().slice(0, 5),
        text:
          nextStatus === "active"
            ? "✓ Motor activado exitosamente"
            : "— Motor desactivado manualmente",
      };

      const { error: updateError } = await supabase
        .from("orquesta_motors")
        .update({
          status: nextStatus,
          logs: [logLine, ...(current.logs ?? []).slice(0, 2)],
        })
        .eq("id", id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await fetchMotors();
    },
    [rows, fetchMotors]
  );

  const saveMotorConfig = useCallback(
    async (id: string, updates: Partial<Motor>) => {
      const { error: updateError } = await supabase
        .from("orquesta_motors")
        .update({
          name: updates.name,
          description: updates.description,
          icon: updates.icon,
          interval_min: updates.interval,
          sources: updates.sources,
          detail_level: updates.detailLevel,
          fallback: updates.fallback,
          companies: updates.companies,
        })
        .eq("id", id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await fetchMotors();
    },
    [fetchMotors]
  );

  const installMotor = useCallback(
    async (motor: Partial<Motor>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("No hay usuario autenticado");
        return;
      }

      const { error: insertError } = await supabase.from("orquesta_motors").insert({
        user_id: user.id,
        name: motor.name ?? "Nuevo motor",
        description: motor.description ?? "",
        icon: motor.icon ?? "globe",
        status: "inactive",
        version: motor.version ?? "1.0.0",
        interval_min: motor.interval ?? 30,
        sources: motor.sources ?? [],
        detail_level: motor.detailLevel ?? "Estándar",
        fallback: motor.fallback ?? "Si falla la fuente → reintentar",
        companies: motor.companies ?? [],
        logs: motor.logs ?? [
          { time: "—", text: "— Motor instalado, pendiente de activación" },
        ],
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }
      await fetchMotors();
    },
    [fetchMotors]
  );

  const removeMotor = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("orquesta_motors")
        .delete()
        .eq("id", id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await fetchMotors();
    },
    [fetchMotors]
  );

  return {
    motors: rows.map(motorRowToDomain),
    loading,
    error,
    refetch: fetchMotors,
    toggleMotor,
    saveMotorConfig,
    installMotor,
    removeMotor,
  };
}
