import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getCompanyActiveScreenRoutes } from "@/pages/superadmin/companies.service";

export function useCompanyScreens() {
  const user = useAuthUser();
  const companyId = typeof user?.company_id === "string" ? user.company_id : undefined;

  return useQuery<string[]>({
    queryKey: ["company-active-screen-routes", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return getCompanyActiveScreenRoutes(companyId);
    },
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
