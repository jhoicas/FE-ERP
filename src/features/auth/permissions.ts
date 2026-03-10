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

