import type { AuthUser } from "./useAuthUser";

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

