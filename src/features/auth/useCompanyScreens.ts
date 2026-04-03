import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { RbacScreenDTO } from "./services";

export function useCompanyScreens(companyId?: string) {
  return useQuery<RbacScreenDTO[]>({
    queryKey: ["company-screens", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await axios.get(`/api/companies/${companyId}/screens`);
      return data.screens || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
