import { matchPath } from "react-router-dom";
import type { AuthUser } from "./schemas";
import type { RbacMenuDTO, RbacModuleDTO, RbacScreenDTO } from "./services";

function normalizeRole(rawRole: string): string {
  const role = rawRole.trim().toLowerCase();
  if (role.includes("crm")) return "crm";
  return role;
}

/**
 * Devuelve siempre un array de roles del usuario.
 * El backend debe enviar en login `roles: string[]` con todos los roles asignados
 * para que usuarios con varios roles (ej. marketing + support) tengan la unión de accesos.
 */
export function getUserRoles(user: AuthUser | null | undefined): string[] {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return Array.from(new Set(user.roles.map((role) => normalizeRole(role)).filter(Boolean)));
  }
  if (typeof user.role === "string") return [normalizeRole(user.role)].filter(Boolean);
  return [];
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return getUserRoles(user).includes("admin");
}

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  const roles = getUserRoles(user);
  return roles.includes("superadmin") || roles.includes("super_admin");
}

/**
 * Comprueba si el usuario tiene al menos uno de los roles permitidos.
 * Admin tiene acceso a todo. Varios roles suman accesos (unión).
 *
 * Escenarios CRM:
 * - Solo Marketing → Directorio + Laboratorio de campañas
 * - Marketing + Support → Directorio + Tickets + Laboratorio de campañas
 * - Solo Sales → Directorio + Tareas
 * - Sales + Support → Directorio + Tickets + Tareas
 * - Admin → todo
 */
export function hasAccess(userRoles: string[] | undefined, allowedRoles?: string[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const roles = (userRoles ?? []).map((role) => normalizeRole(role));
  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));

  if (roles.includes("admin")) {
    return true;
  }

  return roles.some((role) => normalizedAllowedRoles.includes(role));
}

export function getDefaultRouteForRoles(userRoles: string[] | undefined): string {
  const roles = userRoles ?? [];

  if (hasAccess(roles, ["admin"])) {
    return "/dashboard";
  }

  if (hasAccess(roles, ["crm", "sales", "support", "marketing"])) {
    return "/crm";
  }

  return "/dashboard";
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed.replace(/\/+$/, "") : `/${trimmed.replace(/\/+$/, "")}`;
}

type ResolvedModule = {
  key: string;
  name?: string;
};

export function resolveScreenModule(
  screen: Pick<RbacScreenDTO, "module_key" | "module_name">,
  parentModule?: Pick<RbacModuleDTO, "name" | "label" | "title"> | null,
): ResolvedModule | null {
  const keyFromScreen = screen.module_key?.trim();
  if (keyFromScreen) {
    return { key: keyFromScreen.toLowerCase(), name: screen.module_name ?? keyFromScreen };
  }

  const nameFromScreen = screen.module_name?.trim();
  if (nameFromScreen) {
    return { key: nameFromScreen.toLowerCase(), name: nameFromScreen };
  }

  if (parentModule) {
    const label = getMenuItemLabel({ ...parentModule, frontend_route: "" });
    const key = label.toLowerCase();
    return { key, name: label };
  }

  return null;
}

function isHiddenMenuEntry(
  item: { label?: string; name?: string; title?: string; frontend_route?: string | null | undefined },
): boolean {
  const haystack = `${item.label ?? ""} ${item.name ?? ""} ${item.title ?? ""} ${item.frontend_route ?? ""}`
    .toLowerCase()
    .trim();

  return haystack.includes("plantill") || haystack.includes("template") || haystack.includes("campaign-templates");
}

export function getMenuItemLabel(
  item: Pick<RbacModuleDTO | RbacScreenDTO, "name" | "label" | "title"> & { frontend_route?: string },
): string {
  const rawLabel = item.label ?? item.name ?? item.title ?? item.frontend_route ?? "Sin nombre";
  if (rawLabel.toLowerCase().includes("lealtad")) {
    return "Fidelización";
  }
  return rawLabel;
}

export function getVisibleRbacModules(menu: RbacMenuDTO | null | undefined): RbacModuleDTO[] {
  return (menu?.modules ?? [])
    .map((module) => ({
      ...module,
      screens: (module.screens ?? []).filter(
        (screen) => Boolean(screen.frontend_route?.trim()) && !isHiddenMenuEntry(screen),
      ),
    }))
    .filter((module) => {
      if (isHiddenMenuEntry(module)) {
        return false;
      }
      return Boolean(module.frontend_route?.trim()) || module.screens.length > 0;
    });
}

/**
 * Retorna todas las rutas del menú RBAC, clasificadas por módulo usando resolveScreenModule.
 * Permite agrupar/anidar rutas por módulo para el Sidebar y para matching de rutas autorizadas.
 */
export function getFlattenedRbacRoutes(menu: RbacMenuDTO | null | undefined): string[] {
  const routes = new Set<string>();

  for (const module of menu?.modules ?? []) {
    if (isHiddenMenuEntry(module)) continue;

    // Clasifica la ruta del módulo principal
    if (module.frontend_route) {
      routes.add(normalizeRoute(module.frontend_route));
    }

    for (const screen of module.screens ?? []) {
      if (screen.frontend_route?.trim() && !isHiddenMenuEntry(screen)) {
        // Clasificación por módulo usando helper
        const resolved = resolveScreenModule(screen, module);
        // Si se requiere agrupar por módulo, aquí se puede usar resolved.key
        routes.add(normalizeRoute(screen.frontend_route));
      }
    }
  }

  return Array.from(routes);
}

function routeMatches(pattern: string, pathname: string): boolean {
  const normalizedPattern = normalizeRoute(pattern);
  const normalizedPath = normalizeRoute(pathname);

  if (normalizedPattern === "/") {
    return normalizedPath === "/";
  }

  return Boolean(
    matchPath({ path: normalizedPattern, end: false }, normalizedPath) ??
      matchPath({ path: normalizedPattern, end: true }, normalizedPath),
  );
}

export function canAccessFrontendRoute(menu: RbacMenuDTO | null | undefined, pathname: string): boolean {
  const normalizedPath = normalizeRoute(pathname);
  if (normalizedPath === "/" || normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/")) {
    return true;
  }

  const routes = getFlattenedRbacRoutes(menu);
  if (routes.length === 0) return false;

  if (routes.some((route) => routeMatches(route, normalizedPath))) {
    return true;
  }

  // Permite subrutas de cualquier ruta autorizada, evitando que '/' sea padre universal.
  if (routes.some((route) => route !== "/" && normalizedPath.startsWith(`${route}/`))) {
    return true;
  }

  return false;
}

export function getDefaultRouteFromMenu(menu: RbacMenuDTO | null | undefined): string {
  const routes = getFlattenedRbacRoutes(menu);

  if (routes.includes("/dashboard")) {
    return "/dashboard";
  }

  return routes[0] ?? "/dashboard";
}

export function getMenuTitleForPath(menu: RbacMenuDTO | null | undefined, pathname: string): string | null {
  let bestMatch: { route: string; label: string } | null = null;

  for (const module of menu?.modules ?? []) {
    const moduleLabel = getMenuItemLabel(module);

    if (module.frontend_route && routeMatches(module.frontend_route, pathname)) {
      const route = normalizeRoute(module.frontend_route);
      if (!bestMatch || route.length > bestMatch.route.length) {
        bestMatch = { route, label: moduleLabel };
      }
    }

    for (const screen of module.screens ?? []) {
      if (routeMatches(screen.frontend_route, pathname)) {
        const route = normalizeRoute(screen.frontend_route);
        if (!bestMatch || route.length > bestMatch.route.length) {
          bestMatch = { route, label: getMenuItemLabel(screen) };
        }
      }
    }
  }

  return bestMatch?.label ?? null;
}

