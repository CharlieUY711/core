// src/hooks/useDocuments.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  documentRowToDomain,
  type DocumentRow,
  type OrchestratorDocument,
} from "../types/orquesta.types";

interface UseDocumentsOptions {
  companyId?: string;
}

interface UseDocumentsResult {
  documents: OrchestratorDocument[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsResult {
  const { companyId } = options;
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orquesta_documents")
      .select("*")
      .order("generated_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRows((data ?? []) as DocumentRow[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents: rows.map(documentRowToDomain),
    loading,
    error,
    refetch: fetchDocuments,
  };
}
