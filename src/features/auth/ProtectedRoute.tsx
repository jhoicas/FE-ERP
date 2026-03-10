import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

import { AUTH_TOKEN_COOKIE_KEY, AUTH_USER_STORAGE_KEY } from "@/config/auth";
import { hasAccess } from "@/features/auth/permissions";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let roles: string[] = [];
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { roles?: string[]; role?: string };
      if (Array.isArray(parsed.roles)) {
        roles = parsed.roles;
      } else if (typeof parsed.role === "string") {
        roles = [parsed.role];
      }
    }
  } catch {
    roles = [];
  }

  if (!hasAccess(roles, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}


