import Cookies from "js-cookie";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { getCompanyModules, type CompanyModulesDTO } from "./services";

export const COMPANY_MODULES_QUERY_KEY = ["company-modules"] as const;

export function useCompanyModules(companyId?: string) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);

  return useQuery<CompanyModulesDTO>({
    queryKey: [...COMPANY_MODULES_QUERY_KEY, companyId],
    queryFn: () => getCompanyModules(companyId!),
    enabled: Boolean(token && companyId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function prefetchCompanyModules(queryClient: QueryClient, companyId: string) {
  return queryClient.prefetchQuery({
    queryKey: [...COMPANY_MODULES_QUERY_KEY, companyId],
    queryFn: () => getCompanyModules(companyId),
    staleTime: 5 * 60 * 1000,
  });
}

