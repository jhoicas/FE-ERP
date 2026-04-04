import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";

import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import {
  canAccessFrontendRoute,
  getDefaultRouteFromMenu,
  getUserRoles,
  hasAccess,
  isAdmin,
} from "@/features/auth/permissions";
import { useRbacMenu } from "@/features/auth/useRbacMenu";
import { useAuthUser } from "./useAuthUser";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);
  const location = useLocation();
  const { data: menu, isLoading, isFetching, isError, refetch } = useRbacMenu();
  const user = useAuthUser();
  const userRoles = getUserRoles(user);
  
  // Verificamos si es superadmin (acepta 'superadmin' o 'super_admin')
  const isSuperAdmin = user?.roles?.includes("superadmin") || user?.roles?.includes("super_admin") || false;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Validación explícita por roles permitidos en la ruta (si aplica).
  if (allowedRoles?.length && !hasAccess(userRoles, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  // Permitir acceso libre a /superadmin/* si es superadmin
  if (isSuperAdmin && location.pathname.startsWith("/superadmin")) {
    return <>{children}</>;
  }

  // Si la ruta es de admin, manejamos el permiso inmediatamente
  if (location.pathname.startsWith("/admin")) {
    if (isSuperAdmin || isAdmin(user)) {
      return <>{children}</>; // Pasa directo, sin chequear el menú dinámico
    }
    return <Navigate to="/" replace />; // No es super admin, lo sacamos
  }

  if (isLoading || (isFetching && !menu)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (menu) {
    if (!canAccessFrontendRoute(menu, location.pathname)) {
      return <Navigate to={getDefaultRouteFromMenu(menu)} replace />;
    }
    return <>{children}</>;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="erp-card max-w-md text-center space-y-3">
          <p className="text-sm font-medium">No se pudieron cargar los permisos.</p>
          <p className="text-xs text-muted-foreground">
            Verifica tu conexión e inténtalo de nuevo.
          </p>
          <Button type="button" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}