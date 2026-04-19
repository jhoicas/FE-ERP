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
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_KEY } from "@/config/auth";
import { useMemo, useState, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { Badge } from "@/components/ui/badge";
import { useDianEnvironment } from "@/hooks/use-dian-environment";
import { useCompanyScreens } from "@/features/auth/useCompanyScreens";

// --- 1. DICCIONARIO DE ÍCONOS ---
const moduleIconByKey: Record<string, ComponentType<{ className?: string }>> = {
  analytics: LayoutDashboard,
  inventory: Package,
  billing: FileText,
  crm: Users,
  purchasing: Package,
  settings: Settings,
  superadmin: ShieldCheck,
};

function getModuleIcon(key: string) {
  return moduleIconByKey[key.toLowerCase()] || LayoutDashboard;
}

// --- 2. CONFIGURACIÓN MAESTRA DEL MENÚ FRONTEND ---
// Aquí defines todas las rutas y subrutas de tu aplicación. 
// El "module_key" debe coincidir EXACTAMENTE con el "module_name" que devuelve tu API.
const APP_MENU_CONFIG = [
  {
    module_key: "crm",
    label: "CRM",
    frontend_route: "/crm",
    screens: [
      { id: "crm-cliente", label: "Cliente CRM", frontend_route: "/crm/customers" },
      { id: "crm-analytics", label: "Analítica", frontend_route: "/crm/analytics" },
      { id: "crm-remarketing", label: "Remarketing", frontend_route: "/crm/remarketing" },
      { id: "crm-omnichannel", label: "Omnichannel", frontend_route: "/crm/omnichannel" },
      { id: "crm-automations", label: "Automatizaciones", frontend_route: "/crm/automations" },
      { id: "crm-categorias", label: "Categorías", frontend_route: "/crm/categories" },
      { id: "crm-campanas", label: "Campañas", frontend_route: "/crm/campaigns" },
      { id: "crm-campanas-historial", label: "Historial Campañas", frontend_route: "/crm/campaigns/list" },
      { id: "crm-import", label: "Importaciones", frontend_route: "/crm/import" },
      { id: "crm-audit-logs", label: "Bitácoras", frontend_route: "/crm/audit-logs" },
      { id: "crm-tareas", label: "Tareas", frontend_route: "/crm/tasks" },
      { id: "crm-tickets", label: "Tickets", frontend_route: "/crm/tickets" },
      { id: "crm.inbox", label: "Inbox", frontend_route: "/crm/inbox" },
      { id: "crm-fidelizacion", label: "Fidelización", frontend_route: "/crm/loyalty" },
       { id: "settings-super-admin", label: "Super Admin", frontend_route: "/admin", icon: ShieldCheck, requiresSuperAdmin: true }
    ]
  },
  {
    module_key: "billing",
    label: "Facturación",
    frontend_route: "/facturacion",
    screens: [
      { id: "billing-customers", label: "Clientes", frontend_route: "/billing/customers" },
      { id: "billing-invoices", label: "Facturas", frontend_route: "/billing/invoices" },
      { id: "billing-resolutions", label: "Resoluciones", frontend_route: "/billing/resolutions" },
      { id: "billing-dian-settings", label: "Configuración DIAN", frontend_route: "/billing/settings/dian" },
      { id: "billing-emails", label: "Correos", frontend_route: "/billing/emails" },
      { id: "billing-dian-summary", label: "Resumen DIAN", frontend_route: "/billing/dian/summary" },
    ]
  },
  {
    module_key: "inventory",
    label: "Inventario",
    frontend_route: "/inventario",
    screens: [
      { id: "inventory-products", label: "Productos", frontend_route: "/inventory/products" },
      { id: "inventory-warehouses", label: "Bodegas", frontend_route: "/inventory/warehouses" },
      { id: "inventory-stock", label: "Stock", frontend_route: "/inventory/stock" },
      { id: "inventory-movements", label: "Movimientos", frontend_route: "/inventory/movements" },
      { id: "inventory-suppliers", label: "Proveedores", frontend_route: "/inventory/suppliers" },
      { id: "inventory-purchase-orders", label: "Órdenes de compra", frontend_route: "/inventory/purchase-orders" },
      { id: "inventory-replenishment", label: "Reposición", frontend_route: "/inventory/replenishment" },
      { id: "inventory-stocktake", label: "Conteo físico", frontend_route: "/inventory/stocktake" },
    ]
  },
  {
    module_key: "purchasing",
    label: "Compras",
    frontend_route: "/compras",
    screens: []
  },
  {
    module_key: "settings",
    label: "Administrador General",
    frontend_route: "/ajustes",
    screens: [
      { id: "settings-super-admin", label: "Super Admin", frontend_route: "/admin", icon: ShieldCheck, requiresSuperAdmin: true },
      { id: "settings-ajustes", label: "Ajustes", frontend_route: "/ajustes" },
      { id: "settings-users", label: "Usuarios", frontend_route: "/settings/users" },
      { id: "settings-email", label: "Correo IMAP", frontend_route: "/settings/email" }
    ]
  }
];


export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [closedSubmenus, setClosedSubmenus] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthUser();
  const { environment } = useDianEnvironment();
  const queryClient = useQueryClient();
  const isAdminUser = user?.roles?.includes("admin") ?? false;
  const isSuperAdminUser = user?.roles?.includes("superadmin") || user?.roles?.includes("super_admin") || false;
  const { data: activeScreenRoutes = [], isLoading } = useCompanyScreens();

  const activeRoutesSet = useMemo(
    () => new Set(activeScreenRoutes.map((route) => route.trim().replace(/\/+$/, ""))),
    [activeScreenRoutes],
  );

  const isRouteActive = (route?: string): boolean => {
    if (!route) return false;
    const normalized = route.trim().replace(/\/+$/, "");
    return activeRoutesSet.has(normalized);
  };

  const MODULE_PREFIXES: Record<string, string[]> = {
    analytics: ["/dashboard", "/analytics"],
    crm: ["/crm"],
    billing: ["/billing", "/facturacion"],
    inventory: ["/inventory", "/inventario"],
    purchasing: ["/purchasing", "/compras"],
    settings: ["/settings", "/ajustes"],
  };

  const hasModulePrefixMatch = (moduleKey: string): boolean => {
    const prefixes = MODULE_PREFIXES[moduleKey] ?? [];
    if (prefixes.length === 0) return false;

    return activeScreenRoutes.some((route) => {
      const normalizedRoute = route.trim().replace(/\/+$/, "");
      return prefixes.some((prefix) => {
        const normalizedPrefix = prefix.trim().replace(/\/+$/, "");
        return (
          normalizedRoute === normalizedPrefix ||
          normalizedRoute.startsWith(`${normalizedPrefix}/`)
        );
      });
    });
  };

  // --- 3. LÓGICA DE FILTRADO ESTRICTO ---
  // Filtrado dinámico usando activeScreenRoutes
  const visibleModules = useMemo(() => {
    if (isSuperAdminUser) {
      // Menú exclusivo para superadmin
      return [
        {
          module_key: "superadmin",
          label: "Administración",
          frontend_route: "/admin",
          screens: [],
        },
      ];
    }

    return APP_MENU_CONFIG.map((module) => {
      const activeScreens = (module.screens ?? []).filter((screen) => {
        if (screen.requiresSuperAdmin) {
          return false;
        }
        return isRouteActive(screen.frontend_route);
      });

      const isModuleRouteActive = isRouteActive(module.frontend_route);
      const hasActiveChildren = activeScreens.length > 0;
      const hasPrefixMatch = hasModulePrefixMatch(module.module_key);

      if (module.screens.length > 0) {
        if (!isModuleRouteActive && !hasActiveChildren && !hasPrefixMatch) return null;

        return {
          ...module,
          screens: activeScreens,
        };
      }

      if (!isModuleRouteActive && !hasPrefixMatch) return null;

      return {
        ...module,
        screens: [],
      };
    }).filter(Boolean) as typeof APP_MENU_CONFIG;
  }, [activeRoutesSet, isRouteActive, isSuperAdminUser]);

  const handleLogout = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE_KEY);
    localStorage.clear();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

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
        {isLoading && (
          <p className="px-3 py-2 text-xs text-sidebar-fg">Cargando menú...</p>
        )}

        {!isLoading && visibleModules.length === 0 && (
          <p className="px-3 py-2 text-xs text-sidebar-fg">Sin opciones disponibles.</p>
        )}

        {visibleModules.map((module) => {
          const moduleKey = module.module_key;
          const moduleRoute = module.frontend_route;
          const ModuleIcon = getModuleIcon(moduleKey);
          const hasScreens = module.screens.length > 0;
          
          const moduleIsActive = Boolean(
            location.pathname === moduleRoute || location.pathname.startsWith(`${moduleRoute}/`)
          );
          const isSubmenuOpen = !closedSubmenus[moduleKey];

          return (
            <div key={moduleKey} className="space-y-1">
              {!collapsed && hasScreens ? (
                <button
                  type="button"
                  onClick={() => {
                    toggleSubmenu(moduleKey);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    moduleIsActive
                      ? "bg-sidebar-accent text-sidebar-fg-active"
                      : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                  )}
                >
                  <ModuleIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{module.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !isSubmenuOpen && "-rotate-90",
                    )}
                  />
                </button>
              ) : (
                <NavLink
                  to={moduleRoute}
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
                  {!collapsed && <span>{module.label}</span>}
                </NavLink>
              )}

              {/* RENDERIZADO DE SUBMENÚS */}
              {!collapsed && hasScreens && isSubmenuOpen && (
                <div className="ml-9 mt-1 mb-1 space-y-1">
                  {module.screens
                    .filter((screen) => {
                      if (screen.requiresSuperAdmin) {
                        return isSuperAdminUser;
                      }
                      return true;
                    })
                    .map((screen) => (
                      <NavLink
                        key={screen.id}
                        to={screen.frontend_route}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-fg-active"
                              : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-border/50",
                          )
                        }
                      >
                        <Circle className="h-3.5 w-3.5 shrink-0" />
                        <span>{screen.label}</span>
                      </NavLink>
                    ))}
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