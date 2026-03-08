import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

