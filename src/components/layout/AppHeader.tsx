import { Search, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDianEnvironment } from "@/hooks/use-dian-environment";
import { getMenuTitleForPath } from "@/features/auth/permissions";
import { useRbacMenu } from "@/features/auth/useRbacMenu";
import { useCompanyScreens } from "@/features/auth/useCompanyScreens";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/inventario": "Inventario",
  "/facturacion": "Facturación",
  "/crm": "CRM / Clientes",
  "/ajustes": "Ajustes",
};

export default function AppHeader() {
  const location = useLocation();
  const { environment } = useDianEnvironment();
  const { data: menu } = useRbacMenu();
  const { data: activeScreenRoutes = [] } = useCompanyScreens();
  const hasBillingEnabled = activeScreenRoutes.some((route) => {
    const normalizedRoute = route.trim().replace(/\/+$/, "");
    return (
      normalizedRoute === "/billing" ||
      normalizedRoute.startsWith("/billing/") ||
      normalizedRoute === "/facturacion" ||
      normalizedRoute.startsWith("/facturacion/")
    );
  });
  const menuTitle = getMenuTitleForPath(menu, location.pathname);
  const title = Object.entries(titles).find(([path]) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
  )?.[1];
  const resolvedTitle = menuTitle ?? title ?? "NaturERP";

  return (
    <header className="h-14 border-b flex items-center gap-4 px-6">
      <h1 className="text-sm font-semibold">{resolvedTitle}</h1>
      {hasBillingEnabled && (
        <Badge
          variant="outline"
          className={
            environment === "production"
              ? "border-success/40 bg-success/15 text-success"
              : "border-warning/40 bg-warning/15 text-warning"
          }
        >
          {environment === "production" ? "DIAN: PRODUCCIÓN" : "DIAN: PRUEBAS"}
        </Badge>
      )}
      <div className="flex-1 max-w-md ml-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar productos, clientes, facturas…" className="pl-9 h-9 text-sm" />
      </div>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
      </Button>
    </header>
  );
}
