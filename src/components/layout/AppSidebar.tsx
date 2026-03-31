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
import { useCompanyModules } from "@/features/auth/useCompanyModules";

// --- 1. DICCIONARIO DE ÍCONOS ---
const moduleIconByKey: Record<string, ComponentType<{ className?: string }>> = {
  analytics: LayoutDashboard,
  inventory: Package,
  billing: FileText,
  crm: Users,
  purchasing: Package,
  settings: Settings,
};

function getModuleIcon(key: string) {
  return moduleIconByKey[key.toLowerCase()] || LayoutDashboard;
}

// --- 2. CONFIGURACIÓN MAESTRA DEL MENÚ FRONTEND ---
// Aquí defines todas las rutas y subrutas de tu aplicación. 
// El "module_key" debe coincidir EXACTAMENTE con el "module_name" que devuelve tu API.
const APP_MENU_CONFIG = [
  {
    module_key: "analytics",
    label: "Dashboard",
    frontend_route: "/dashboard",
    screens: []
  },
  {
    module_key: "crm",
    label: "CRM",
    frontend_route: "/crm",
    screens: [
      { id: "crm-cliente", label: "Cliente CRM", frontend_route: "/crm/customers" },
      { id: "crm-categorias", label: "Categorías", frontend_route: "/crm/categories" },
      { id: "crm-campanas", label: "Campañas", frontend_route: "/crm/campaigns" },
      { id: "crm-tareas", label: "Tareas", frontend_route: "/crm/tasks" },
      { id: "crm-tickets", label: "Tickets", frontend_route: "/crm/tickets" },
      { id: "crm.inbox", label: "Inbox", frontend_route: "/crm/inbox" },
      { id: "crm-fidelizacion", label: "Fidelización", frontend_route: "/crm/loyalty" }
    ]
  },
  {
    module_key: "billing",
    label: "Facturación",
    frontend_route: "/facturacion",
    screens: []
  },
  {
    module_key: "inventory",
    label: "Inventario",
    frontend_route: "/inventario",
    screens: []
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
  const isAdmin = user?.roles?.includes("admin") ?? false;
  
  // Obtenemos los módulos de la API
  const companyId = typeof user?.company_id === "string" ? user.company_id : undefined;
  const { data: companyModules, isLoading } = useCompanyModules(companyId);

  // --- 3. LÓGICA DE FILTRADO ESTRICTO ---
  const visibleModules = useMemo(() => {
    // Si la API no ha respondido, mostramos solo Admin General cuando aplique
    if (!companyModules?.modules) {
      return isAdmin
        ? APP_MENU_CONFIG.filter((mod) => mod.module_key === "settings")
        : [];
    }

    // Creamos un diccionario rápido de la respuesta para saber qué está activo
    // Ejemplo: { analytics: true, billing: false, crm: true, ... }
    const activeModulesMap = companyModules.modules.reduce((acc: any, curr: any) => {
      acc[curr.module_name.toLowerCase()] = curr.is_active;
      return acc;
    }, {});

    // Filtramos la configuración maestra.
    // settings: solo por rol admin. Otros módulos: por activación en API.
    return APP_MENU_CONFIG.filter((mod) => {
      if (mod.module_key === "settings") {
        return isAdmin;
      }

      return activeModulesMap[mod.module_key] === true;
    });
    
  }, [companyModules, isAdmin]);

  const hasDashboardShortcut = useMemo(
    () =>
      visibleModules.some((module) => {
        return module.frontend_route === "/" || module.frontend_route === "/dashboard";
      }),
    [visibleModules]
  );

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

        {!hasDashboardShortcut && !isLoading && visibleModules.length > 0 && (
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
                  {module.screens.map((screen) => {
                    if (screen.requiresSuperAdmin && !user?.roles?.includes("super_admin")) {
                      return null;
                    }

                    return (
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