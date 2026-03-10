import { useMemo } from "react";
import { AUTH_USER_STORAGE_KEY } from "@/config/auth";

export interface AuthUser {
  role?: string;
  [key: string]: unknown;
}

export function useAuthUser(): AuthUser | null {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }, []);
}
