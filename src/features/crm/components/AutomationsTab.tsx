import { useMemo, useState } from "react";
import { Bot, CalendarHeart, RotateCcw, Plus, Pencil, Trash2 } from "lucide-react";

import type { CreateCrmAutomationRequest, CrmAutomation } from "@/features/crm/crm.types";
import { useCrmAutomations } from "@/features/crm/hooks/use-crm-automations";
import AutomationForm from "@/features/crm/components/AutomationForm";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin as isAdminUser } from "@/features/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getAutomationTypeLabel(type: CrmAutomation["type"]): string {
  return type === "BIRTHDAY" ? "Cumpleaños" : "Recompra";
}

function getAutomationIcon(type: CrmAutomation["type"]) {
  return type === "BIRTHDAY" ? CalendarHeart : RotateCcw;
}

function getAutomationChannelLabel(): "EMAIL" {
  // Las automatizaciones actuales del backend usan plantillas de email.
  return "EMAIL";
}

export default function AutomationsTab() {
  const { toast } = useToast();
  const user = useAuthUser();
  const canManage = isAdminUser(user);
  const {
    automationsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleMutation,
  } = useCrmAutomations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<CrmAutomation | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<CrmAutomation | null>(null);

  const automations = useMemo(() => automationsQuery.data ?? [], [automationsQuery.data]);

  const handleCreate = (payload: CreateCrmAutomationRequest) => {
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Automatización creada" });
        setCreateOpen(false);
      },
      onError: (error) => {
        toast({
          title: "No se pudo crear la automatización",
          description: getApiErrorMessage(error, "Automatizaciones"),
          variant: "destructive",
        });
      },
    });
  };

  const handleUpdate = (payload: CreateCrmAutomationRequest) => {
    if (!editingAutomation) return;

    updateMutation.mutate(
      {
        automationId: editingAutomation.id,
        payload,
      },
      {
        onSuccess: () => {
          toast({ title: "Automatización actualizada" });
          setEditingAutomation(null);
        },
        onError: (error) => {
          toast({
            title: "No se pudo actualizar la automatización",
            description: getApiErrorMessage(error, "Automatizaciones"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleToggleActive = (automation: CrmAutomation) => {
    toggleMutation.mutate(
      { automation },
      {
        onError: (error) => {
          toast({
            title: "No se pudo cambiar el estado",
            description: getApiErrorMessage(error, "Automatizaciones"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!automationToDelete) return;

    deleteMutation.mutate(automationToDelete.id, {
      onSuccess: () => {
        toast({ title: "Automatización eliminada" });
        setAutomationToDelete(null);
      },
      onError: (error) => {
        toast({
          title: "No se pudo eliminar la automatización",
          description: getApiErrorMessage(error, "Automatizaciones"),
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Automatizaciones</h2>
          <p className="text-sm text-muted-foreground">
            Configura reglas automáticas para cumpleaños y recompra basadas en plantillas de correo.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Automatización
          </Button>
        )}
      </div>

      {automationsQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      )}

      {automationsQuery.isError && !automationsQuery.isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {getApiErrorMessage(automationsQuery.error, "Automatizaciones")}
            </p>
          </CardContent>
        </Card>
      )}

      {!automationsQuery.isLoading && !automationsQuery.isError && automations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bot className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Aún no hay automatizaciones creadas</p>
            <p className="text-xs text-muted-foreground">
              Crea una regla y actívala para ejecutar envíos automáticos según el comportamiento de clientes.
            </p>
          </CardContent>
        </Card>
      )}

      {!automationsQuery.isLoading && !automationsQuery.isError && automations.length > 0 && (
        <>
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Evento Disparador</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map((automation) => {
                    const Icon = getAutomationIcon(automation.type);

                    return (
                      <TableRow key={automation.id}>
                        <TableCell className="font-medium">{automation.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Icon className="h-3.5 w-3.5" />
                            {getAutomationTypeLabel(automation.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getAutomationChannelLabel()}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant={automation.is_active ? "default" : "outline"}>
                              {automation.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                            {canManage && (
                              <Switch
                                checked={automation.is_active}
                                onCheckedChange={() => handleToggleActive(automation)}
                                disabled={toggleMutation.isPending || !canManage}
                                aria-label={`Activar ${automation.name}`}
                              />
                            )}
                          </div>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingAutomation(automation)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setAutomationToDelete(automation)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {automations.map((automation) => {
              const Icon = getAutomationIcon(automation.type);

              return (
                <Card key={automation.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>{automation.name}</span>
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={() => handleToggleActive(automation)}
                        disabled={toggleMutation.isPending || !canManage}
                        aria-label={`Activar ${automation.name}`}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      Evento: {getAutomationTypeLabel(automation.type)}
                    </div>
                    <p className="text-muted-foreground">Canal: {getAutomationChannelLabel()}</p>
                    <p className="text-muted-foreground">Estado: {automation.is_active ? "Activa" : "Inactiva"}</p>
                    {canManage && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingAutomation(automation)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => setAutomationToDelete(automation)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Automatización</DialogTitle>
          </DialogHeader>
          <AutomationForm
            isSubmitting={createMutation.isPending}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingAutomation != null} onOpenChange={(open) => !open && setEditingAutomation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Automatización</DialogTitle>
          </DialogHeader>
          {editingAutomation && (
            <AutomationForm
              initialAutomation={editingAutomation}
              isSubmitting={updateMutation.isPending}
              onSubmit={handleUpdate}
              onCancel={() => setEditingAutomation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={automationToDelete != null} onOpenChange={(open) => !open && setAutomationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar automatización</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la automatización de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
