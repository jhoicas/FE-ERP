import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, CalendarHeart, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";

import type { AutomationResponse, CreateAutomationRequest } from "@/features/crm/crm.types";
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useUpdateAutomation,
} from "@/features/crm/hooks/use-automations";
import { useCampaignTemplates, useCreateTemplate, useUpdateTemplate } from "@/features/crm/hooks/use-crm";
import { generateCampaignCopy } from "@/features/crm/services";
import AutomationForm from "@/features/crm/components/AutomationForm";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin as isAdminUser } from "@/features/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplateDraft = {
  name: string;
  subject: string;
  body: string;
};

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

function extractAiSubjectAndBody(text: string): Pick<TemplateDraft, "subject" | "body"> {
  const subjectLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^asunto\s*:/i.test(line));

  const subject = subjectLine?.replace(/^asunto\s*:/i, "").trim() ?? "";
  const body = subjectLine ? text.replace(subjectLine, "").trim() : text.trim();

  return {
    subject: subject || "Asunto generado por IA",
    body,
  };
}

export default function CampaignAutomations() {
  const { toast } = useToast();
  const user = useAuthUser();
  const canManage = isAdminUser(user);

  const automationsQuery = useAutomations();
  const templatesQuery = useCampaignTemplates();

  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const deleteMutation = useDeleteAutomation();

  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();

  const aiGenerateMutation = useMutation({
    mutationFn: ({ prompt }: { prompt: string }) => generateCampaignCopy({ prompt }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationResponse | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<AutomationResponse | null>(null);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createTemplatePrompt, setCreateTemplatePrompt] = useState("");
  const [createTemplateDraft, setCreateTemplateDraft] = useState<TemplateDraft>({
    name: "",
    subject: "",
    body: "",
  });

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateDraft, setEditingTemplateDraft] = useState<TemplateDraft>({
    name: "",
    subject: "",
    body: "",
  });

  const automations = useMemo(() => automationsQuery.data ?? [], [automationsQuery.data]);
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);

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

  const handleToggleAutomation = (automation: AutomationResponse, checked: boolean) => {
    updateMutation.mutate(
      {
        automationId: automation.id,
        payload: { is_active: checked },
      },
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

  const handleGenerateAiTemplate = () => {
    if (!createTemplatePrompt.trim()) {
      toast({ title: "Escribe un prompt", description: "Describe la campaña que deseas crear.", variant: "destructive" });
      return;
    }

    aiGenerateMutation.mutate(
      { prompt: createTemplatePrompt.trim() },
      {
        onSuccess: ({ answer }) => {
          const result = extractAiSubjectAndBody(answer);
          setCreateTemplateDraft((prev) => ({
            ...prev,
            subject: result.subject,
            body: result.body,
            name: prev.name || `Plantilla IA ${new Date().toLocaleDateString("es-CO")}`,
          }));
        },
        onError: (error) => {
          toast({
            title: "No se pudo generar con IA",
            description: getApiErrorMessage(error, "Plantillas"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleCreateTemplate = () => {
    if (!createTemplateDraft.name.trim() || !createTemplateDraft.subject.trim() || !createTemplateDraft.body.trim()) {
      toast({ title: "Completa los campos", description: "Nombre, asunto y cuerpo son obligatorios.", variant: "destructive" });
      return;
    }

    createTemplateMutation.mutate(
      {
        name: createTemplateDraft.name.trim(),
        subject: createTemplateDraft.subject.trim(),
        body: createTemplateDraft.body.trim(),
      },
      {
        onSuccess: () => {
          toast({ title: "Plantilla creada" });
          setCreateTemplateOpen(false);
          setCreateTemplatePrompt("");
          setCreateTemplateDraft({ name: "", subject: "", body: "" });
        },
        onError: (error) => {
          toast({
            title: "No se pudo crear la plantilla",
            description: getApiErrorMessage(error, "Plantillas"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const openEditTemplate = (template: { id: string; name: string; subject: string; body: string }) => {
    setEditingTemplateId(template.id);
    setEditingTemplateDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplateId) return;

    updateTemplateMutation.mutate(
      {
        templateId: editingTemplateId,
        payload: {
          name: editingTemplateDraft.name.trim(),
          subject: editingTemplateDraft.subject.trim(),
          body: editingTemplateDraft.body.trim(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Plantilla actualizada" });
          setEditingTemplateId(null);
        },
        onError: (error) => {
          toast({
            title: "No se pudo actualizar la plantilla",
            description: getApiErrorMessage(error, "Plantillas"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automations">Automatizaciones</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
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
                      <TableHead>Activo</TableHead>
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
                          <TableCell>
                            <Switch
                              checked={automation.is_active}
                              disabled={updateMutation.isPending || !canManage}
                              onCheckedChange={(checked) => handleToggleAutomation(automation, checked)}
                              aria-label={`Activar automatización ${automation.name}`}
                            />
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
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Plantillas de correo</h2>
              <p className="text-sm text-muted-foreground">
                Gestiona y reutiliza asuntos y cuerpos para acelerar campañas.
              </p>
            </div>
            <Button onClick={() => setCreateTemplateOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Crear con IA
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {templatesQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : templatesQuery.isError ? (
                <div className="p-4 text-sm text-destructive">
                  {getApiErrorMessage(templatesQuery.error, "Plantillas")}
                </div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No hay plantillas registradas.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{template.subject}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(template.created_at).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditTemplate(template)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear plantilla</DialogTitle>
            <DialogDescription>
              Escribe un prompt para generar contenido con IA y luego ajusta manualmente antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={createTemplatePrompt}
                onChange={(event) => setCreateTemplatePrompt(event.target.value)}
                placeholder="Ej: Campaña de recuperación para clientes inactivos con tono cercano y CTA claro."
                className="min-h-24"
              />
              <Button type="button" variant="outline" onClick={handleGenerateAiTemplate} disabled={aiGenerateMutation.isPending}>
                {aiGenerateMutation.isPending ? "Generando..." : "Generar con IA"}
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={createTemplateDraft.name}
                  onChange={(event) =>
                    setCreateTemplateDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Nombre de la plantilla"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Asunto</label>
                <Input
                  value={createTemplateDraft.subject}
                  onChange={(event) =>
                    setCreateTemplateDraft((prev) => ({
                      ...prev,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Asunto del correo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cuerpo</label>
                <Textarea
                  value={createTemplateDraft.body}
                  onChange={(event) =>
                    setCreateTemplateDraft((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                  className="min-h-48"
                  placeholder="Contenido de la plantilla"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateTemplateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingTemplateId != null} onOpenChange={(open) => !open && setEditingTemplateId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar plantilla</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editingTemplateDraft.name}
                onChange={(event) =>
                  setEditingTemplateDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto</label>
              <Input
                value={editingTemplateDraft.subject}
                onChange={(event) =>
                  setEditingTemplateDraft((prev) => ({
                    ...prev,
                    subject: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuerpo</label>
              <Textarea
                value={editingTemplateDraft.body}
                onChange={(event) =>
                  setEditingTemplateDraft((prev) => ({
                    ...prev,
                    body: event.target.value,
                  }))
                }
                className="min-h-48"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingTemplateId(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleUpdateTemplate} disabled={updateTemplateMutation.isPending}>
              {updateTemplateMutation.isPending ? "Guardando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
