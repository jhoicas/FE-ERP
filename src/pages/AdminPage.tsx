import { useEffect, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@/types/admin";
import { getTenants, toggleTenantModule, updateRolePermissions } from "@/features/admin/services";
import { getApiErrorMessage } from "@/lib/api/errors";

const moduleList = ["Inventario", "Facturación", "CRM", "Analítica", "Compras"] as const;
const roles = ["Admin", "Gerente", "Vendedor", "Bodeguero", "Contador"] as const;
const screens = ["Dashboard", "Inventario", "Facturación", "CRM", "Analítica", "Compras", "Ajustes"] as const;

type Role = (typeof roles)[number];
type Screen = (typeof screens)[number];
type PermissionsState = Record<Role, Record<Screen, boolean>>;

const initialPermissions: PermissionsState = {
  Admin: Object.fromEntries(screens.map((s) => [s, true])) as Record<Screen, boolean>,
  Gerente: Object.fromEntries(screens.map((s) => [s, s !== "Ajustes"])) as Record<Screen, boolean>,
  Vendedor: {
    Dashboard: true,
    Inventario: false,
    Facturación: true,
    CRM: true,
    Analítica: false,
    Compras: false,
    Ajustes: false,
  },
  Bodeguero: {
    Dashboard: true,
    Inventario: true,
    Facturación: false,
    CRM: false,
    Analítica: false,
    Compras: true,
    Ajustes: false,
  },
  Contador: {
    Dashboard: true,
    Inventario: false,
    Facturación: true,
    CRM: false,
    Analítica: true,
    Compras: true,
    Ajustes: false,
  },
};

const statusClasses: Record<Tenant["status"], string> = {
  Activo: "bg-success/15 text-success border-success/30",
  Suspendido: "bg-destructive/15 text-destructive border-destructive/30",
  Prueba: "bg-warning/15 text-warning border-warning/30",
};

export default function AdminPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [permissions, setPermissions] = useState<PermissionsState>(initialPermissions);

  useEffect(() => {
    let active = true;

    async function loadTenants() {
      try {
        const data = await getTenants();
        if (!active) return;
        setTenants(data);
      } catch (error) {
        if (!active) return;
        toast({
          title: "No se pudieron cargar los tenants",
          description: getApiErrorMessage(error, "Super Admin"),
          variant: "destructive",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTenants();

    return () => {
      active = false;
    };
  }, [toast]);

  const toggleModule = async (tenantId: string, mod: string) => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (!targetTenant) return;

    const nextValue = !targetTenant.modules[mod];

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId ? { ...t, modules: { ...t.modules, [mod]: nextValue } } : t,
      ),
    );

    if (selectedTenant?.id === tenantId) {
      setSelectedTenant((prev) =>
        prev ? { ...prev, modules: { ...prev.modules, [mod]: nextValue } } : null,
      );
    }

    try {
      await toggleTenantModule(tenantId, mod, nextValue);
      toast({
        title: "Módulo actualizado",
        description: `${mod} ${nextValue ? "activado" : "desactivado"} correctamente.`,
      });
    } catch (error) {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId ? { ...t, modules: { ...t.modules, [mod]: !nextValue } } : t,
        ),
      );

      if (selectedTenant?.id === tenantId) {
        setSelectedTenant((prev) =>
          prev ? { ...prev, modules: { ...prev.modules, [mod]: !nextValue } } : null,
        );
      }

      toast({
        title: "No se pudo actualizar el módulo",
        description: getApiErrorMessage(error, "Super Admin"),
        variant: "destructive",
      });
    }
  };

  const togglePermission = async (role: Role, screen: Screen) => {
    const nextPermissionsForRole = {
      ...permissions[role],
      [screen]: !permissions[role][screen],
    };

    setPermissions((prev) => ({
      ...prev,
      [role]: nextPermissionsForRole,
    }));

    try {
      await updateRolePermissions(role, nextPermissionsForRole);
      toast({
        title: "Permisos actualizados",
        description: `Permisos para el rol ${role} actualizados.`,
      });
    } catch (error) {
      setPermissions((prev) => ({
        ...prev,
        [role]: permissions[role],
      }));

      toast({
        title: "No se pudieron actualizar permisos",
        description: getApiErrorMessage(error, "Super Admin"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Panel Super Admin</h1>
          <p className="text-xs text-muted-foreground">Gestión de tenants, módulos y permisos del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Empresas (Tenants)</TabsTrigger>
          <TabsTrigger value="permissions">Permisos de Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          {loading ? (
            <div className="erp-card p-4 text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="erp-card p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Empresa</TableHead>
                    <TableHead className="text-xs">NIT</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Módulos Activos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedTenant(t)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{t.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.nit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusClasses[t.status]}`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold">
                        {Object.values(t.modules).filter(Boolean).length}/{moduleList.length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <div className="erp-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sticky left-0 bg-card z-10">Rol</TableHead>
                    {screens.map((s) => (
                      <TableHead key={s} className="text-xs text-center">
                        {s}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role}>
                      <TableCell className="text-sm font-medium sticky left-0 bg-card z-10">{role}</TableCell>
                      {screens.map((screen) => (
                        <TableCell key={screen} className="text-center">
                          <Checkbox
                            checked={permissions[role][screen]}
                            onCheckedChange={() => togglePermission(role, screen)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedTenant} onOpenChange={(open) => !open && setSelectedTenant(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedTenant && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selectedTenant.name}
                </SheetTitle>
                <SheetDescription>
                  NIT: {selectedTenant.nit} · Plan: {selectedTenant.plan}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estado</span>
                  <Badge variant="outline" className={`text-xs ${statusClasses[selectedTenant.status]}`}>
                    {selectedTenant.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Módulos del Sistema</h3>
                  <p className="text-xs text-muted-foreground mb-3">Activa o desactiva módulos para esta empresa.</p>
                  <div className="space-y-3">
                    {moduleList.map((mod) => (
                      <div key={mod} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{mod}</span>
                        <Switch
                          checked={selectedTenant.modules[mod]}
                          onCheckedChange={() => toggleModule(selectedTenant.id, mod)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
