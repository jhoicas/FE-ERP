import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScreenFormSchema, type ScreenFormValues } from "../screens.validation";
import type { Screen } from "@/types/admin";
import { getModules } from "../screens.service";

interface ScreenFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScreenFormValues) => void;
  initialScreen?: Screen | null;
  loading?: boolean;
}

const DEFAULT_VALUES: ScreenFormValues = {
  name: "",
  key: "",
  frontend_route: "",
  api_endpoint: "",
  module_id: "",
  order: 0,
  is_active: true,
};

export default function ScreenFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialScreen,
  loading,
}: ScreenFormDialogProps) {
  const form = useForm<ScreenFormValues>({
    resolver: zodResolver(ScreenFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: getModules,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initialScreen
          ? {
              name: initialScreen.name,
              key: initialScreen.key,
              frontend_route: initialScreen.frontend_route,
              api_endpoint: initialScreen.api_endpoint ?? "",
              module_id: initialScreen.module_id,
              order: initialScreen.order,
              is_active: initialScreen.is_active,
            }
          : DEFAULT_VALUES,
      );
    }
  }, [form, initialScreen, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialScreen ? "Editar Pantalla" : "Nueva Pantalla"}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="screen-name">Nombre</Label>
            <Input id="screen-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="screen-key">Key</Label>
            <Input id="screen-key" placeholder="crm.tasks" {...form.register("key")} />
            {form.formState.errors.key && (
              <p className="text-xs text-destructive">{form.formState.errors.key.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Module ID</Label>
            <Controller
              control={form.control}
              name="module_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={modulesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={modulesLoading ? "Cargando módulos..." : "Selecciona un módulo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name || module.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.module_id && (
              <p className="text-xs text-destructive">{form.formState.errors.module_id.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="screen-route">Ruta Frontend</Label>
            <Input id="screen-route" placeholder="/crm/tasks" {...form.register("frontend_route")} />
            {form.formState.errors.frontend_route && (
              <p className="text-xs text-destructive">{form.formState.errors.frontend_route.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="screen-endpoint">Endpoint API</Label>
            <Input id="screen-endpoint" placeholder="/api/crm/tasks" {...form.register("api_endpoint")} />
            {form.formState.errors.api_endpoint && (
              <p className="text-xs text-destructive">{form.formState.errors.api_endpoint.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="screen-order">Orden</Label>
            <Input id="screen-order" type="number" min="0" {...form.register("order", { valueAsNumber: true })} />
            {form.formState.errors.order && (
              <p className="text-xs text-destructive">{form.formState.errors.order.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                  <span className="text-sm">{field.value ? "Activo" : "Inactivo"}</span>
                </div>
              )}
            />
          </div>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : initialScreen ? "Guardar cambios" : "Crear Pantalla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
