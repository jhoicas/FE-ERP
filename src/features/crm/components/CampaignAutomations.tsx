import { useMemo, useState } from "react";
import { Bot, CalendarHeart, Plus, RotateCcw, Pencil, Trash2 } from "lucide-react";

import type { AutomationResponse, CreateAutomationRequest } from "@/features/crm/crm.types";
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useUpdateAutomation,
} from "@/features/crm/hooks/use-automations";
import AutomationForm from "@/features/crm/components/AutomationForm";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin as isAdminUser } from "@/features/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function getTriggerLabel(automation: AutomationResponse): string {
  if (automation.trigger && automation.trigger.trim()) {
    return automation.trigger.trim();
  }

  return automation.type === "BIRTHDAY" ? "Cumpleaños" : "Recompra";
}

function getTriggerIcon(automation: AutomationResponse) {
  const trigger = getTriggerLabel(automation).toUpperCase();
  return trigger.includes("CUMPLE") ? CalendarHeart : RotateCcw;
}

function getChannelLabel(automation: AutomationResponse): string {
  if (automation.channel && automation.channel.trim()) {
    return automation.channel.trim().toUpperCase();
  }

  return "EMAIL";
}

function getStatusLabel(automation: AutomationResponse): string {
  if (automation.status && automation.status.trim()) {
    return automation.status.trim();
  }

  return automation.is_active ? "Activa" : "Inactiva";
}

export default function CampaignAutomations() {
  const { toast } = useToast();
  const user = useAuthUser();
  const canManage = isAdminUser(user);

  const automationsQuery = useAutomations();
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const deleteMutation = useDeleteAutomation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationResponse | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<AutomationResponse | null>(null);

  const automations = useMemo(() => automationsQuery.data ?? [], [automationsQuery.data]);

  const handleCreate = (payload: CreateAutomationRequest) => {
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

  const handleUpdate = (payload: CreateAutomationRequest) => {
    if (!editingAutomation) return;

    updateMutation.mutate(
      { automationId: editingAutomation.id, payload },
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
            Configura reglas automáticas para ejecutar campañas según eventos del CRM.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Automatización
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
              Crea una automatización para activar campañas sin intervención manual.
            </p>
          </CardContent>
        </Card>
      )}

      {!automationsQuery.isLoading && !automationsQuery.isError && automations.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Evento/Trigger</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => {
                  const TriggerIcon = getTriggerIcon(automation);
                  const statusLabel = getStatusLabel(automation);

                  return (
                    <TableRow key={automation.id}>
                      <TableCell className="font-medium">{automation.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <TriggerIcon className="h-3.5 w-3.5" />
                          {getTriggerLabel(automation)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getChannelLabel(automation)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabel.toLowerCase().includes("activ") ? "default" : "outline"}>
                          {statusLabel}
                        </Badge>
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
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Automatización</DialogTitle>
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
