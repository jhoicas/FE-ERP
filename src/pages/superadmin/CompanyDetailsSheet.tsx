import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getModules, getScreens } from "@/features/admin/screens.service";
import type { Module, Screen } from "@/types/admin";
import {
  CompanyFormSchema,
  type CompanyDTO,
  type CompanyFormValues,
  getCompany,
  getCompanyScreens,
  updateCompany,
  toggleCompanyScreen,
} from "./companies.service";
import CompanyUsersTab from "./CompanyUsersTab.tsx";

interface Props {
  open: boolean;
  companyId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

function normalizeStatus(status?: string): "active" | "inactive" | "suspended" {
  const value = (status ?? "").trim().toLowerCase();

  if (value === "inactive" || value === "inactivo") {
    return "inactive";
  }

  if (value === "suspended" || value === "suspendido") {
    return "suspended";
  }

  return "active";
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "suspended":
      return "Suspendido";
    default:
      return status;
  }
}

function toFormValues(company?: CompanyDTO | null): CompanyFormValues {
  return {
    name: company?.name ?? "",
    nit: company?.nit ?? "",
    email: company?.email ?? "",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
    status: normalizeStatus(company?.status),
  };
}

export function CompanyDetailsSheet({ open, companyId, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("data");

  const companyQuery = useQuery({
    queryKey: ["admin-company", companyId],
    queryFn: () => getCompany(companyId!),
    enabled: open && Boolean(companyId),
  });

  const screensQuery = useQuery({
    queryKey: ["admin-company-screens", companyId],
    queryFn: () => getCompanyScreens(companyId!),
    enabled: open && Boolean(companyId),
  });

  const globalScreensQuery = useQuery<Screen[]>({
    queryKey: ["admin-screens"],
    queryFn: getScreens,
    enabled: open,
  });

  const modulesQuery = useQuery<Module[]>({
    queryKey: ["admin-modules"],
    queryFn: getModules,
    enabled: open,
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: toFormValues(null),
  });

  useEffect(() => {
    if (companyQuery.data) {
      companyForm.reset(toFormValues(companyQuery.data));
    }
  }, [companyForm, companyQuery.data]);

  useEffect(() => {
    if (!open) {
      setTab("data");
    }
  }, [open]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      if (!companyId) throw new Error("No hay una empresa seleccionada");
      return updateCompany(companyId, values);
    },
    onSuccess: async () => {
      toast({ title: "Empresa actualizada" });
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-company", companyId] });
      onUpdated();
    },
    onError: () => {
      toast({ title: "No se pudo actualizar la empresa", variant: "destructive" });
    },
  });

  const toggleScreenMutation = useMutation({
    mutationFn: async ({ screenId, isActive }: { screenId: string; isActive: boolean }) => {
      if (!companyId) throw new Error("No hay una empresa seleccionada");
      await toggleCompanyScreen(companyId, screenId, isActive);
    },
    onSuccess: async () => {
      toast({ title: "Acceso actualizado" });
      await queryClient.invalidateQueries({ queryKey: ["admin-company-screens", companyId] });
    },
    onError: () => {
      toast({ title: "No se pudo actualizar el acceso", variant: "destructive" });
    },
  });

  const handleSaveCompany = (values: CompanyFormValues) => {
    updateCompanyMutation.mutate(values);
  };

  const groupedScreens = useMemo(() => {
    const grouped = new Map<string, Screen[]>();
    const modulesById = new Map((modulesQuery.data ?? []).map((module) => [String(module.id), module]));
    const sortedScreens = [...(globalScreensQuery.data ?? [])].sort((a, b) => a.order - b.order);

    for (const module of modulesQuery.data ?? []) {
      grouped.set(module.name, []);
    }

    const ungroupedScreens: Screen[] = [];

    for (const screen of sortedScreens) {
      const module = modulesById.get(String(screen.module_id));

      if (module) {
        const current = grouped.get(module.name);
        if (current) {
          current.push(screen);
        } else {
          grouped.set(module.name, [screen]);
        }
      } else {
        ungroupedScreens.push(screen);
      }
    }

    if (ungroupedScreens.length > 0) {
      grouped.set("Sin módulo", ungroupedScreens);
    }

    return grouped;
  }, [globalScreensQuery.data, modulesQuery.data]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Empresa</SheetTitle>
          <SheetDescription>Actualiza los datos de la empresa y sus accesos al sistema.</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="data">Datos de la empresa</TabsTrigger>
            <TabsTrigger value="screens">Accesos / Pantallas</TabsTrigger>
            <TabsTrigger value="users">Usuarios Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-4">
            {companyQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando empresa...</div>
            ) : (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={companyForm.handleSubmit(handleSaveCompany)}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-company-name">Nombre</Label>
                  <Input id="edit-company-name" {...companyForm.register("name")} />
                  {companyForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company-nit">NIT</Label>
                  <Input id="edit-company-nit" {...companyForm.register("nit")} />
                  {companyForm.formState.errors.nit && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.nit.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company-email">Email</Label>
                  <Input id="edit-company-email" type="email" {...companyForm.register("email")} />
                  {companyForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-company-address">Dirección</Label>
                  <Input id="edit-company-address" {...companyForm.register("address")} />
                  {companyForm.formState.errors.address && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company-phone">Teléfono</Label>
                  <Input id="edit-company-phone" {...companyForm.register("phone")} />
                  {companyForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Controller
                    control={companyForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                          <SelectItem value="suspended">Suspendido</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {companyForm.formState.errors.status && (
                    <p className="text-xs text-destructive">{companyForm.formState.errors.status.message}</p>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    Cerrar
                  </Button>
                  <Button type="submit" disabled={updateCompanyMutation.isPending}>
                    {updateCompanyMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="screens" className="space-y-4">
            {globalScreensQuery.isLoading || modulesQuery.isLoading || screensQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando pantallas...</div>
            ) : (
              <div className="space-y-4">
                {Array.from(groupedScreens.entries()).map(([moduleName, screens]) => {
                  if (screens.length === 0) return null;

                  return (
                    <div key={moduleName} className="space-y-3 rounded-lg border p-4">
                      <h3 className="text-sm font-semibold">{moduleName}</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {screens.map((screen) => {
                          const activeScreenIds =
                            screensQuery.data?.activeScreenIds?.length
                              ? screensQuery.data.activeScreenIds
                              : (screensQuery.data?.screens ?? [])
                                  .filter((item) => item.is_active)
                                  .map((item) => item.id);
                          const isAssigned = activeScreenIds.includes(String(screen.id));

                          return (
                            <div
                              key={screen.id}
                              className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3"
                            >
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm font-medium leading-none">{screen.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {screen.key} · {screen.frontend_route}
                                </p>
                              </div>
                              <Switch
                                checked={isAssigned}
                                disabled={toggleScreenMutation.isPending}
                                onCheckedChange={(checked) => {
                                  void toggleScreenMutation.mutate({
                                    screenId: String(screen.id),
                                    isActive: checked,
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {groupedScreens.size === 0 && (
                  <div className="text-sm text-muted-foreground">No hay pantallas disponibles.</div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {companyId ? (
              <CompanyUsersTab companyId={companyId} />
            ) : (
              <div className="text-sm text-muted-foreground">Selecciona una empresa para ver sus usuarios.</div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
