import type { AuthUser } from "./useAuthUser";

/**
 * Devuelve siempre un array de roles del usuario.
 * El backend debe enviar en login `roles: string[]` con todos los roles asignados
 * para que usuarios con varios roles (ej. marketing + support) tengan la unión de accesos.
 */
export function getUserRoles(user: AuthUser | null | undefined): string[] {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (typeof user.role === "string") return [user.role];
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

  const roles = userRoles ?? [];

  if (roles.includes("admin")) {
    return true;
  }

  return roles.some((role) => allowedRoles.includes(role));
}

