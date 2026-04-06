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
  isSuperAdmin,
} from "@/features/auth/permissions";
import { useRbacMenu } from "@/features/auth/useRbacMenu";
import { useAuthUser } from "./useAuthUser";
import { useCompanyScreens } from "@/features/auth/useCompanyScreens";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = Cookies.get(AUTH_TOKEN_COOKIE_KEY);
  const location = useLocation();
  const { data: menu, isLoading, isFetching, isError, refetch } = useRbacMenu();
  const { data: activeScreenRoutes = [], isLoading: screensLoading } = useCompanyScreens();
  const user = useAuthUser();
  const userRoles = getUserRoles(user);
  const superAdmin = isSuperAdmin(user);

  const normalizeRoute = (route: string): string => route.trim().replace(/\/+$/, "") || "/";

  const isPathAllowedByCompanyScreens = (pathname: string): boolean => {
    const currentPath = normalizeRoute(pathname);

    if (currentPath === "/" || currentPath === "/dashboard" || currentPath.startsWith("/dashboard/")) {
      return true;
    }

    return activeScreenRoutes.some((allowedRoute) => {
      const baseRoute = normalizeRoute(allowedRoute);

      if (baseRoute === "/") {
        return currentPath === "/";
      }

      return currentPath === baseRoute || currentPath.startsWith(`${baseRoute}/`);
    });
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (superAdmin && !location.pathname.startsWith("/admin")) {
    return <Navigate to="/admin" replace />;
  }

  // Validación explícita por roles permitidos en la ruta (si aplica).
  if (allowedRoles?.length && !hasAccess(userRoles, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  // Validación de la ruta actual contra las pantallas activas de la empresa.
  if (!superAdmin && !screensLoading && !isPathAllowedByCompanyScreens(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Si la ruta es de admin, manejamos el permiso inmediatamente
  if (location.pathname.startsWith("/admin")) {
    if (superAdmin) {
      return <>{children}</>;
    }
    return <Navigate to="/" replace />;
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