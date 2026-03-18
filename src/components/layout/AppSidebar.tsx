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
  ChevronDown,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { useMemo, useState, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/useAuthUser";
import {
  getMenuItemLabel,
  getVisibleRbacModules,
} from "@/features/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { useDianEnvironment } from "@/hooks/use-dian-environment";
import { useRbacMenu } from "@/features/auth/useRbacMenu";
import { useCompanyModules } from "@/features/auth/useCompanyModules";

const moduleIconByKey: Record<string, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  inventario: Package,
  inventory: Package,
  facturacion: FileText,
  billing: FileText,
  crm: Users,
  usuarios: Users,
  users: Users,
  ajustes: Settings,
  settings: Settings,
  inicio: LayoutDashboard,
};

function getModuleIcon(label: string, icon?: string) {
  const normalizedIcon = icon?.trim().toLowerCase();
  if (normalizedIcon && moduleIconByKey[normalizedIcon]) {
    return moduleIconByKey[normalizedIcon];
  }

  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel.includes("invent")) return Package;
  if (normalizedLabel.includes("fact")) return FileText;
  if (normalizedLabel.includes("crm") || normalizedLabel.includes("cliente") || normalizedLabel.includes("usuario")) {
    return Users;
  }
  if (normalizedLabel.includes("ajust") || normalizedLabel.includes("config")) return Settings;
  if (normalizedLabel.includes("dash") || normalizedLabel.includes("inicio")) return LayoutDashboard;

  return LayoutDashboard;
}

function getScreenIcon() {
  return Circle;
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [closedSubmenus, setClosedSubmenus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthUser();
  const { environment } = useDianEnvironment();
  const queryClient = useQueryClient();
  const { data: menu, isLoading } = useRbacMenu();
  const companyId = typeof user?.company_id === "string" ? user.company_id : undefined;
  const { data: companyModules } = useCompanyModules(companyId);

  const activeCompanyModules = useMemo(() => {
    const set = new Set<string>();
    for (const m of companyModules?.modules ?? []) {
      if (m.is_active) {
        set.add(m.module_name.toLowerCase());
      }
    }
    return set;
  }, [companyModules]);

  const visibleModules = useMemo(() => {
    const raw = getVisibleRbacModules(menu);
    if (activeCompanyModules.size === 0) return raw;

    const isModuleEnabledForCompany = (module: any) => {
      const explicitModuleName = typeof module.module_name === "string" ? module.module_name.toLowerCase() : null;
      if (explicitModuleName && activeCompanyModules.has(explicitModuleName)) {
        return true;
      }

      const route = (module.frontend_route ?? "").toLowerCase();
      if (route.startsWith("/crm")) return activeCompanyModules.has("crm");
      if (route.startsWith("/inventario") || route.startsWith("/inventory"))
        return activeCompanyModules.has("inventory");
      if (route.startsWith("/facturacion") || route.startsWith("/billing"))
        return activeCompanyModules.has("billing");
      if (route.startsWith("/dashboard") || route.startsWith("/analytics"))
        return activeCompanyModules.has("analytics");

      return true;
    };

    return raw.filter(isModuleEnabledForCompany);
  }, [menu, activeCompanyModules]);
  const hasDashboardShortcut = useMemo(
    () =>
      visibleModules.some((module) => {
        const moduleRoute = module.frontend_route?.trim();
        if (moduleRoute === "/" || moduleRoute === "/dashboard") {
          return true;
        }

        return (module.screens ?? []).some((screen) => {
          const screenRoute = screen.frontend_route?.trim();
          return screenRoute === "/" || screenRoute === "/dashboard";
        });
      }),
    [visibleModules],
  );

  const handleLogout = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE_KEY);
    localStorage.clear();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const moduleCount = visibleModules.length;

  const toggleSubmenu = (moduleKey: string) => {
    setClosedSubmenus((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
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
        {isLoading && !menu && (
          <p className="px-3 py-2 text-xs text-sidebar-fg">Cargando menú...</p>
        )}

        {!isLoading && moduleCount === 0 && (
          <p className="px-3 py-2 text-xs text-sidebar-fg">Sin opciones disponibles.</p>
        )}

        {!hasDashboardShortcut && (
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-fg-active"
                  : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
              )
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>
        )}

        {visibleModules.map((module) => {
          const moduleLabel = getMenuItemLabel(module);
          const moduleRoute = module.frontend_route?.trim();
          const ModuleIcon = getModuleIcon(moduleLabel, module.icon);
          const screens = (module.screens ?? []).filter((screen) => Boolean(screen.frontend_route));
          const hasModuleLink = Boolean(moduleRoute);
          const moduleKey = String(module.id ?? moduleRoute ?? moduleLabel);
          const hasScreens = screens.length > 0;
          const moduleIsActive = Boolean(
            moduleRoute &&
              (location.pathname === moduleRoute || location.pathname.startsWith(`${moduleRoute}/`)),
          );
          const isSubmenuOpen = !closedSubmenus[moduleKey];

          return (
            <div key={moduleKey} className="space-y-1">
              {!collapsed && hasScreens ? (
                <button
                  type="button"
                  onClick={() => {
                    toggleSubmenu(moduleKey);
                    if (hasModuleLink) {
                      navigate(moduleRoute!);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    moduleIsActive
                      ? "bg-sidebar-accent text-sidebar-fg-active"
                      : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                  )}
                >
                  <ModuleIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{moduleLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !isSubmenuOpen && "-rotate-90",
                    )}
                  />
                </button>
              ) : hasModuleLink ? (
                <NavLink
                  to={moduleRoute!}
                  end={moduleRoute === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-fg-active"
                        : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                    )
                  }
                >
                  <ModuleIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{moduleLabel}</span>}
                </NavLink>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-fg">
                  <ModuleIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{moduleLabel}</span>}
                </div>
              )}

              {!collapsed && hasScreens && isSubmenuOpen && (
                <div className="ml-9 mt-1 mb-1 space-y-1">
                  {screens.map((screen) => {
                    const screenRoute = screen.frontend_route.trim();
                    const ScreenIcon = getScreenIcon();

                    return (
                      <NavLink
                        key={screen.id ?? screenRoute}
                        to={screenRoute}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-fg-active"
                              : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                          )
                        }
                      >
                        <ScreenIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{getMenuItemLabel(screen)}</span>
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
              <p className="text-xs font-medium text-sidebar-fg-active truncate">
                {typeof user?.name === "string" ? user.name : "Usuario"}
              </p>
              <p className="text-[10px] text-sidebar-fg truncate">
                {typeof user?.email === "string" ? user.email : " "}
              </p>
              <span className="text-[10px] text-red-500 font-medium">Cerrar sesión</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
