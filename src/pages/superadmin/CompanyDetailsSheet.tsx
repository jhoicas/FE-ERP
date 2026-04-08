import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getVisibleRbacModules, getMenuItemLabel } from "@/features/auth/permissions";
import { getRbacMenu, type RbacMenuDTO } from "@/features/auth/services";
import {
  CompanyFormSchema,
  type CompanyDTO,
  type CompanyFormValues,
  type ModuleDTO,
  type CompanyModuleDTO,
  getCompany,
  getCompanyScreens,
  saveCompanyScreens,
  updateCompany,
  getGlobalModules,
  getCompanyModules,
  toggleCompanyModule,
  type CompanyScreenDTO,
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

function resolveScreenLabel(screen: CompanyScreenDTO): string {
  return screen.label || screen.name || screen.title || screen.frontend_route || "Sin nombre";
}

function routeToScreenKey(route?: string): string {
  if (!route) return "";
  return route.replace(/^\/+/, "").replace(/\//g, ".");
}

function getScreenCandidates(screen: CompanyScreenDTO): string[] {
  const values = [
    screen.id,
    screen.screen_id,
    screen.screen_key,
    screen.frontend_route,
    routeToScreenKey(screen.frontend_route),
  ];

  return values.map((value) => String(value ?? "")).filter(Boolean);
}

export function CompanyDetailsSheet({ open, companyId, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("data");
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);

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

  const menuQuery = useQuery<RbacMenuDTO>({
    queryKey: ["rbac-menu"],
    queryFn: getRbacMenu,
    enabled: open,
  });

  const modulesQuery = useQuery({
    queryKey: ["admin-global-modules"],
    queryFn: getGlobalModules,
    enabled: open,
  });

  const companyModulesQuery = useQuery({
    queryKey: ["admin-company-modules", companyId],
    queryFn: () => getCompanyModules(companyId!),
    enabled: open && Boolean(companyId),
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: toFormValues(null),
  });

  const visibleModules = useMemo(() => getVisibleRbacModules(menuQuery.data), [menuQuery.data]);

  useEffect(() => {
    if (companyQuery.data) {
      companyForm.reset(toFormValues(companyQuery.data));
    }
  }, [companyForm, companyQuery.data]);

  useEffect(() => {
    if (screensQuery.data) {
      setSelectedScreenIds(screensQuery.data.activeScreenIds);
    }
  }, [screensQuery.data]);

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

  const saveScreensMutation = useMutation({
    mutationFn: async (screenIds: string[]) => {
      if (!companyId) throw new Error("No hay una empresa seleccionada");
      await saveCompanyScreens(companyId, screenIds);
    },
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({
      moduleId,
      isActive,
    }: {
      moduleId: string;
      isActive: boolean;
    }) => {
      if (!companyId) throw new Error("No hay una empresa seleccionada");
      return toggleCompanyModule(companyId, moduleId, isActive);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-company-modules", companyId] });
      toast({ title: "Módulo actualizado correctamente" });
    },
    onError: () => {
      toast({ title: "No se pudo actualizar el módulo", variant: "destructive" });
    },
  });

  const handleSaveCompany = (values: CompanyFormValues) => {
    updateCompanyMutation.mutate(values);
  };

  const handleToggleScreen = async (screenId: string, checked: boolean) => {
    if (!companyId) return;

    const previousIds = selectedScreenIds;
    const nextIds = checked
      ? Array.from(new Set([...previousIds, screenId]))
      : previousIds.filter((id) => id !== screenId);

    setSelectedScreenIds(nextIds);

    try {
      await saveScreensMutation.mutateAsync(nextIds);
      await queryClient.invalidateQueries({ queryKey: ["admin-company-screens", companyId] });
    } catch {
      setSelectedScreenIds(previousIds);
      toast({ title: "No se pudo actualizar el acceso", variant: "destructive" });
    }
  };

  const groupedScreens = useMemo(() => {
    const grouped = new Map<string, CompanyScreenDTO[]>();

    for (const module of visibleModules) {
      const moduleLabel = getMenuItemLabel(module);
      const items: CompanyScreenDTO[] = [];

      if (module.frontend_route) {
        items.push({
          id: module.frontend_route,
          label: module.label,
          name: module.name,
          title: module.title,
          frontend_route: module.frontend_route,
        });
      }

      for (const screen of module.screens ?? []) {
        if (!screen.frontend_route?.trim()) continue;
        items.push(screen as CompanyScreenDTO);
      }

      if (items.length > 0) {
        grouped.set(moduleLabel, items);
      }
    }

    return grouped;
  }, [visibleModules]);

  const activeScreenSet = useMemo(() => new Set(selectedScreenIds), [selectedScreenIds]);

  const resolvePersistedScreenId = (screen: CompanyScreenDTO): string => {
    const candidates = getScreenCandidates(screen);
    const apiScreens = screensQuery.data?.screens ?? [];

    const matched = apiScreens.find((apiScreen) => {
      const apiCandidates = getScreenCandidates(apiScreen);
      return candidates.some((candidate) => apiCandidates.includes(candidate));
    });

    return matched?.id ?? screen.id;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Empresa</SheetTitle>
          <SheetDescription>Actualiza los datos de la empresa y sus accesos al sistema.</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="data">Datos de la empresa</TabsTrigger>
            <TabsTrigger value="modules">Módulos Activos</TabsTrigger>
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

          <TabsContent value="modules" className="space-y-4">
            {modulesQuery.isLoading || companyModulesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando módulos...</div>
            ) : (
              <div className="space-y-3">
                {(modulesQuery.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay módulos disponibles.</div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Habilita o deshabilita los módulos que esta empresa puede utilizar en el sistema.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(modulesQuery.data ?? []).map((module) => {
                        const companyModule = (companyModulesQuery.data ?? []).find(
                          (cm) => cm.module_id === module.id,
                        );
                        const isActive = companyModule?.is_active ?? false;

                        return (
                          <div
                            key={module.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-4"
                          >
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{module.name}</p>
                              {module.description && (
                                <p className="text-xs text-muted-foreground">{module.description}</p>
                              )}
                            </div>
                            <Switch
                              checked={isActive}
                              disabled={toggleModuleMutation.isPending}
                              onCheckedChange={(checked) => {
                                void toggleModuleMutation.mutate({
                                  moduleId: module.id,
                                  isActive: checked,
                                });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="screens" className="space-y-4">
            {screensQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando pantallas...</div>
            ) : (
              <div className="space-y-5">
                {Array.from(groupedScreens.entries()).map(([moduleLabel, screens]) => (
                  <div key={moduleLabel} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{moduleLabel}</h3>
                      <Badge variant="outline">{screens.length} opciones</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {screens.map((screen) => {
                        const persistedScreenId = resolvePersistedScreenId(screen);
                        const checked = getScreenCandidates(screen).some((candidate) =>
                          activeScreenSet.has(candidate),
                        );

                        return (
                          <label
                            key={screen.id}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                          >
                            <span>{resolveScreenLabel(screen)}</span>
                            <Switch
                              checked={checked}
                              onCheckedChange={(value) => {
                                void handleToggleScreen(persistedScreenId, Boolean(value));
                              }}
                              disabled={saveScreensMutation.isPending}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {groupedScreens.size === 0 && (
                  <div className="text-sm text-muted-foreground">No hay pantallas disponibles para mostrar.</div>
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
