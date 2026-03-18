import Cookies from "js-cookie";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { getRbacMenu, type RbacMenuDTO } from "./services";

export const RBAC_MENU_QUERY_KEY = ["rbac-menu"] as const;

export function useRbacMenu() {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);

  return useQuery<RbacMenuDTO>({
    queryKey: RBAC_MENU_QUERY_KEY,
    queryFn: getRbacMenu,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function prefetchRbacMenu(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: RBAC_MENU_QUERY_KEY,
    queryFn: getRbacMenu,
    staleTime: 5 * 60 * 1000,
  });
}
