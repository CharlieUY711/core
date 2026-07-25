// src/hooks/useCompanies.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  companyRowToDomain,
  type Company,
  type CompanyRow,
} from "../types/orquesta.types";

interface UseCompaniesResult {
  companies: Company[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addCompany: (company: Partial<Company>) => Promise<void>;
}

export function useCompanies(): UseCompaniesResult {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("orquesta_companies")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as CompanyRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const addCompany = useCallback(
    async (company: Partial<Company>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("No hay usuario autenticado");
        return;
      }

      const { error: insertError } = await supabase
        .from("orquesta_companies")
        .insert({
          user_id: user.id,
          name: company.name ?? "Nueva empresa",
          industry: company.industry ?? "",
          location: company.location ?? "",
          size: company.size ?? "",
          activity: company.activity ?? "low",
          summary: company.summary ?? "",
          verticals: company.verticals ?? [],
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }
      await fetchCompanies();
    },
    [fetchCompanies]
  );

  return {
    companies: rows.map(companyRowToDomain),
    loading,
    error,
    refetch: fetchCompanies,
    addCompany,
  };
}
