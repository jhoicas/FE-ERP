import { useMemo } from "react";
import { AUTH_USER_STORAGE_KEY } from "@/config/auth";

export interface AuthUser {
  roles?: string[];
  // Para compatibilidad con backend viejo que enviaba `role: string`
  role?: string;
  [key: string]: unknown;
}

export function useAuthUser(): AuthUser | null {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser;
      // Normalizar: si solo viene `role`, convertirlo a `roles`
      if (!parsed.roles && parsed.role) {
        parsed.roles = [parsed.role];
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);
}

