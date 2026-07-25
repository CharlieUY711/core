// src/hooks/useEvents.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  eventRowToDomain,
  type EventRow,
  type OrchestratorEvent,
} from "../types/orquesta.types";

interface UseEventsOptions {
  companyId?: string;
  motorNamesById?: Record<string, { name: string; icon: string }>;
}

interface UseEventsResult {
  events: OrchestratorEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const { companyId, motorNamesById = {} } = options;
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orquesta_events")
      .select("*")
      .order("date", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as EventRow[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel(`orquesta_events_changes_${companyId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orquesta_events",
          ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchEvents]);

  return {
    events: rows.map((row) => {
      const motorInfo = row.motor_id ? motorNamesById[row.motor_id] : undefined;
      return eventRowToDomain(row, motorInfo?.name, motorInfo?.icon);
    }),
    loading,
    error,
    refetch: fetchEvents,
  };
}
