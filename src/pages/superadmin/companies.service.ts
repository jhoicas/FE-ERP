import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export interface Company {
  id: string;
  name: string;
  nit: string;
  email: string;
  status: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const { data } = await axios.get("/api/admin/companies");
    setCompanies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    refresh: fetchCompanies,
  };
}

export async function createCompany(payload: { name: string; nit: string; email: string }) {
  await axios.post("/api/admin/companies", payload);
}
