import { useMemo } from "react";

import type { AuthUser as AuthUserType } from "./schemas";
import { AUTH_USER_STORAGE_KEY } from "@/config/auth";

export function useAuthUser(): (AuthUserType & { isSuperAdmin: boolean }) | null {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUserType;
      // Normalizar: si solo viene `role`, convertirlo a `roles`
      if (!parsed.roles && parsed.role) {
        parsed.roles = [parsed.role];
      }
      // Derivar isSuperAdmin
      const isSuperAdmin =
        Array.isArray(parsed.roles) &&
        (parsed.roles.includes("super_admin") || parsed.roles.includes("superadmin"));
      return { ...parsed, isSuperAdmin };
    } catch {
      return null;
    }
  }, []);
}

