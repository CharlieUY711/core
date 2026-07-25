// src/hooks/useSignals.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  signalRowToDomain,
  type Signal,
  type SignalRow,
  type SignalStatus,
} from "../types/orquesta.types";

interface UseSignalsOptions {
  companyId?: string;
  motorNamesById?: Record<string, { name: string; icon: string }>;
}

interface UseSignalsResult {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: SignalStatus) => Promise<void>;
}

/**
 * Trae señales (opcionalmente filtradas por empresa) y se suscribe a
 * cambios en tiempo real vía Supabase Realtime (tabla habilitada en
 * la migración 0001_orquesta_tables.sql).
 */
export function useSignals(options: UseSignalsOptions = {}): UseSignalsResult {
  const { companyId, motorNamesById = {} } = options;
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orquesta_signals")
      .select("*")
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as SignalRow[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchSignals();

    const channel = supabase
      .channel(`orquesta_signals_changes_${companyId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orquesta_signals",
          ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
        },
        () => {
          fetchSignals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchSignals]);

  const updateStatus = useCallback(
    async (id: string, status: SignalStatus) => {
      const { error: updateError } = await supabase
        .from("orquesta_signals")
        .update({ status })
        .eq("id", id);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await fetchSignals();
    },
    [fetchSignals]
  );

  return {
    signals: rows.map((row) => {
      const motorInfo = row.motor_id ? motorNamesById[row.motor_id] : undefined;
      return signalRowToDomain(row, motorInfo?.name, motorInfo?.icon);
    }),
    loading,
    error,
    refetch: fetchSignals,
    updateStatus,
  };
}
