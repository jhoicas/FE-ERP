import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlayCircle,
  Mail,
  Smartphone,
  MessageSquare,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { getCampaignDetails, getCampaigns, executeCampaign } from "@/features/crm/services";
import { useUpdateCampaign } from "@/features/crm/hooks/use-crm";
import type { CampaignResponseDTO } from "@/features/crm/schemas";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DOMPurify from "dompurify";
import type { CampaignDetailsResponse } from "@/types/crm";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateValue: string | null | undefined) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelBadge(channel: string | null | undefined) {
  const ch = (channel ?? "").toUpperCase();
  switch (ch) {
    case "EMAIL":
      return (
        <Badge
          variant="outline"
          className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 gap-1"
        >
          <Mail className="h-3 w-3" /> Email
        </Badge>
      );
    case "SMS":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
        >
          <Smartphone className="h-3 w-3" /> SMS
        </Badge>
      );
    case "WHATSAPP":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"
        >
          <MessageSquare className="h-3 w-3" /> WhatsApp
        </Badge>
      );
    default:
      return <Badge variant="secondary">{ch || "—"}</Badge>;
  }
}

function statusBadge(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "pending") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
      >
        Pendiente
      </Badge>
    );
  }
  if (s === "scheduled") {
    return (
      <Badge
        variant="outline"
        className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      >
        Programada
      </Badge>
    );
  }
  if (s === "sending") {
    return (
      <Badge
        variant="outline"
        className="border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
      >
        Enviando
      </Badge>
    );
  }
  if (s === "completed" || s === "sent") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        Completada
      </Badge>
    );
  }
  return <Badge variant="secondary">{status ?? "—"}</Badge>;
}

function recipientStatusBadge(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "SENT") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        SENT
      </Badge>
    );
  }
  if (normalized === "FAILED") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
      >
        FAILED
      </Badge>
    );
  }
  if (normalized === "QUEUED") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        QUEUED
      </Badge>
    );
  }
  return <Badge variant="secondary">{normalized || "—"}</Badge>;
}

function renderRecipientContact(recipient: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}) {
  if (recipient.email?.trim()) return recipient.email;
  if (recipient.phone?.trim()) return recipient.phone;
  if (recipient.name?.trim()) return recipient.name;
  return "—";
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function CampaignsListPage() {
  const queryClient = useQueryClient();
  const updateCampaignMutation = useUpdateCampaign();
  const [editingCampaign, setEditingCampaign] = useState<CampaignResponseDTO | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ["crm", "campaigns", "list"],
    queryFn: () => getCampaigns(100, 0),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => executeCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "campaigns"] });
      toast({
        title: "Campaña ejecutada",
        description: "La campaña se ha enviado correctamente a los destinatarios.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al ejecutar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const campaigns: CampaignResponseDTO[] = campaignsQuery.data?.items ?? [];

  const campaignDetailQuery = useQuery<CampaignDetailsResponse>({
    queryKey: ["crm", "campaigns", "detail", selectedCampaignId],
    queryFn: () => getCampaignDetails(selectedCampaignId ?? ""),
    enabled: Boolean(selectedCampaignId),
  });

  const sanitizedBodyHtml = useMemo(
    () => DOMPurify.sanitize(campaignDetailQuery.data?.body ?? ""),
    [campaignDetailQuery.data?.body],
  );

  const isExecutable = (status: string | null | undefined) => {
    const s = (status ?? "").toLowerCase();
    return s === "pending" || s === "scheduled";
  };

  const isPaused = (status: string | null | undefined) => {
    const s = (status ?? "").toLowerCase();
    return s === "paused" || s === "inactive";
  };

  const openEditDialog = (campaign: CampaignResponseDTO) => {
    setEditingCampaign(campaign);
    setEditingName(campaign.name ?? "");
    setEditingDescription(campaign.description ?? "");
  };

  const handleSaveCampaign = () => {
    if (!editingCampaign) return;

    updateCampaignMutation.mutate(
      {
        campaignId: editingCampaign.id,
        payload: {
          name: editingName.trim(),
          description: editingDescription.trim(),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Campaña actualizada",
            description: "Los cambios se guardaron correctamente.",
          });
          setEditingCampaign(null);
        },
        onError: (error: Error) => {
          toast({
            title: "No se pudo actualizar",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleToggleCampaignStatus = (campaign: CampaignResponseDTO) => {
    const nextStatus = isPaused(campaign.status) ? "ACTIVE" : "PAUSED";

    updateCampaignMutation.mutate(
      {
        campaignId: campaign.id,
        payload: { status: nextStatus },
      },
      {
        onSuccess: () => {
          toast({
            title: "Estado actualizado",
            description: `La campaña quedó en estado ${nextStatus}.`,
          });
        },
        onError: (error: Error) => {
          toast({
            title: "No se pudo cambiar el estado",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Campañas</h1>
          <p className="text-sm text-muted-foreground">
            Revisa y ejecuta las campañas de marketing de tu empresa.
          </p>
        </div>
      </div>

      {/* Table */}
      <Card className="erp-card overflow-hidden">
        {campaignsQuery.isLoading && (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {campaignsQuery.isError && (
          <div className="p-6 text-center text-destructive">
            <p>Error al cargar las campañas: {(campaignsQuery.error as Error).message}</p>
          </div>
        )}

        {!campaignsQuery.isLoading && !campaignsQuery.isError && (
          <>
            {campaigns.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Sin campañas</p>
                <p className="text-sm">Crea tu primera campaña desde el generador de IA.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow
                      key={campaign.id}
                      className={`cursor-pointer transition-colors ${
                        selectedCampaignId === campaign.id ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                      onClick={() => setSelectedCampaignId(campaign.id)}
                    >
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {campaign.name}
                      </TableCell>
                      <TableCell>{channelBadge(campaign.channel)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(campaign.created_at)}
                      </TableCell>
                      <TableCell>{statusBadge(campaign.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isExecutable(campaign.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-primary/30 hover:bg-primary/10 hover:text-primary"
                              disabled={executeMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                executeMutation.mutate(campaign.id);
                              }}
                            >
                              {executeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                              Ejecutar
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Acciones de campaña"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditDialog(campaign);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleToggleCampaignStatus(campaign);
                                }}
                              >
                                {isPaused(campaign.status) ? (
                                  <Play className="mr-2 h-4 w-4" />
                                ) : (
                                  <Pause className="mr-2 h-4 w-4" />
                                )}
                                {isPaused(campaign.status) ? "Activar" : "Pausar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Card>

      <Sheet
        open={Boolean(selectedCampaignId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCampaignId(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {campaignDetailQuery.data?.name ?? "Detalle de campaña"}
            </SheetTitle>
            <SheetDescription>
              Consulta el contenido enviado y el estado por destinatario.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {campaignDetailQuery.isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-7 w-52" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-36 w-full" />
              </div>
            )}

            {campaignDetailQuery.isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                No se pudo cargar el detalle: {(campaignDetailQuery.error as Error).message}
              </div>
            )}

            {!campaignDetailQuery.isLoading && !campaignDetailQuery.isError && campaignDetailQuery.data && (
              <>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(campaignDetailQuery.data.status)}
                    {channelBadge(campaignDetailQuery.data.channel)}
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Qué se envió
                  </h3>
                  <div className="rounded-xl border bg-background p-4 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Asunto</p>
                      <p className="font-medium">{campaignDetailQuery.data.subject?.trim() || "Sin asunto"}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Cuerpo</p>
                      {sanitizedBodyHtml ? (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin contenido.</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    A quién y cuándo
                  </h3>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destino</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Enviado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(campaignDetailQuery.data.recipients ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No hay destinatarios registrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          campaignDetailQuery.data.recipients.map((recipient, index) => (
                            <TableRow key={recipient.id ?? `${recipient.customer_id ?? "recipient"}-${index}`}>
                              <TableCell className="font-medium">
                                {renderRecipientContact(recipient)}
                              </TableCell>
                              <TableCell>{recipientStatusBadge(recipient.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(recipient.sent_at)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={editingCampaign != null} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar campaña</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nombre</Label>
              <Input
                id="campaign-name"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                placeholder="Nombre de la campaña"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Descripción</Label>
              <Input
                id="campaign-description"
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                placeholder="Descripción"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCampaign(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCampaign} disabled={updateCampaignMutation.isPending}>
              {updateCampaignMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
