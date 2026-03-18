import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { getDefaultRouteForRoles, getUserRoles, hasAccess } from "@/features/auth/permissions";
import { useAuthUser } from "@/features/auth/useAuthUser";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);
  const user = useAuthUser();
  const roles = getUserRoles(user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess(roles, allowedRoles)) {
    return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
  }

  return <>{children}</>;
}


