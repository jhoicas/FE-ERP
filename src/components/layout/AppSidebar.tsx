import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Settings,
  User,
  Leaf,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { useState } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getUserRoles, hasAccess } from "@/features/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { useDianEnvironment } from "@/hooks/use-dian-environment";

const navItems: {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
}[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Inventario", path: "/inventario", icon: Package, allowedRoles: ["admin"] },
  { label: "Facturación", path: "/facturacion", icon: FileText, allowedRoles: ["admin"] },
  {
    label: "CRM / Clientes",
    path: "/crm",
    icon: Users,
    allowedRoles: ["crm", "sales", "support", "marketing", "admin"],
  },
];

const crmSubItems: {
  label: string;
  path: string;
  allowedRoles?: string[];
}[] = [
  {
    label: "Oportunidades",
    path: "/crm/oportunidades",
    allowedRoles: ["sales", "admin"],
  },
  {
    label: "Tickets",
    path: "/crm/tickets",
    allowedRoles: ["support", "admin"],
  },
  {
    label: "Tareas",
    path: "/crm/tasks",
    allowedRoles: ["sales", "admin"],
  },
  {
    label: "Fidelización de Clientes",
    path: "/crm/loyalty",
    allowedRoles: ["admin"],
  },
  {
    label: "Laboratorio de campañas",
    path: "/crm/campaigns",
    allowedRoles: ["marketing", "admin"],
  },
];

const inventorySubItems: {
  label: string;
  path: string;
  allowedRoles?: string[];
}[] = [
  { label: "Movimientos", path: "/inventory/movements", allowedRoles: ["admin"] },
  { label: "Proveedores", path: "/inventario/proveedores", allowedRoles: ["admin"] },
  { label: "Órdenes de compra", path: "/inventario/ordenes-compra", allowedRoles: ["admin"] },
  { label: "Conteo físico", path: "/inventario/conteo", allowedRoles: ["admin"] },
];

const bottomItems: {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
}[] = [
  { label: "Ajustes", path: "/ajustes", icon: Settings, allowedRoles: ["admin"] },
  {
    label: "Gestión de Usuarios",
    path: "/settings/users",
    icon: Users,
    allowedRoles: ["admin"],
  },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();
  const roles = getUserRoles(user);
  const { environment } = useDianEnvironment();

  const handleLogout = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE_KEY);
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "bg-sidebar-bg flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="h-14 flex items-center gap-3 px-4 border-b border-sidebar-border">
        <Leaf className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="text-sidebar-fg-active font-semibold text-sm tracking-tight">
            NaturERP
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto text-sidebar-fg hover:text-sidebar-fg-active transition-colors",
            collapsed && "ml-0",
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <div className="px-2 py-2">
        <Badge
          variant="outline"
          className={cn(
            "w-full justify-center text-xs",
            environment === "production"
              ? "border-success/40 bg-success/15 text-success"
              : "border-warning/40 bg-warning/15 text-warning",
          )}
        >
          {collapsed
            ? environment === "production"
              ? "PROD"
              : "TEST"
            : environment === "production"
              ? "DIAN: PRODUCCIÓN"
              : "DIAN: PRUEBAS"}
        </Badge>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems
          .filter((item) => hasAccess(roles, item.allowedRoles))
          .map((item) => {
            const active = item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

            return (
              <div key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-fg-active"
                      : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>

                {!collapsed && item.path === "/crm" && (
                  <div className="ml-9 mt-1 mb-1 space-y-1">
                    {crmSubItems
                      .filter((subItem) => hasAccess(roles, subItem.allowedRoles))
                      .map((subItem) => {
                        const subActive = location.pathname.startsWith(subItem.path);
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            className={cn(
                              "block rounded-md px-2 py-1.5 text-xs transition-colors",
                              subActive
                                ? "bg-sidebar-accent text-sidebar-fg-active"
                                : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                            )}
                          >
                            {subItem.label}
                          </NavLink>
                        );
                      })}
                  </div>
                )}

                {!collapsed && item.path === "/inventario" && (
                  <div className="ml-9 mt-1 mb-1 space-y-1">
                    {inventorySubItems
                      .filter((subItem) => hasAccess(roles, subItem.allowedRoles))
                      .map((subItem) => {
                        const subActive = location.pathname.startsWith(subItem.path);
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            className={cn(
                              "block rounded-md px-2 py-1.5 text-xs transition-colors",
                              subActive
                                ? "bg-sidebar-accent text-sidebar-fg-active"
                                : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                            )}
                          >
                            {subItem.label}
                          </NavLink>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      <div className="py-3 px-2 border-t border-sidebar-border space-y-1">
        {bottomItems
          .filter((item) => hasAccess(roles, item.allowedRoles))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50 transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50 transition-colors"
        >
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-sidebar-fg-active truncate">Admin</p>
              <p className="text-[10px] text-sidebar-fg truncate">admin@naturerp.co</p>
              <span className="text-[10px] text-red-500 font-medium">Cerrar sesión</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
