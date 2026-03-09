import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";

import {
  getTicket,
  updateTicket,
  getCustomers,
} from "@/features/crm/services";
import {
  updateTicketSchema,
  type UpdateTicketRequest,
} from "@/lib/validations/crm";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment?.toLowerCase() ?? "neutral";
  if (s === "positive") {
    return (
      <Badge variant="outline" className="border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        Positivo
      </Badge>
    );
  }
  if (s === "negative") {
    return (
      <Badge variant="outline" className="border-red-500/50 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400">
        Negativo
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Neutral
    </Badge>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const ticketQuery = useQuery({
    queryKey: ["crm-ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });

  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => getCustomers(),
  });

  const editForm = useForm<UpdateTicketRequest>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: { subject: "", description: "", status: "" },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: ticketId, body }: { id: string; body: UpdateTicketRequest }) =>
      updateTicket(ticketId, body),
    onSuccess: (_, { id: ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["crm-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tickets"] });
      setEditOpen(false);
    },
  });

  const customerMap = new Map(
    customersQuery.data?.map((c) => [c.id, c.name]) ?? []
  );

  const openEdit = () => {
    const t = ticketQuery.data;
    if (!t) return;
    setEditOpen(true);
    editForm.reset({
      subject: t.subject,
      description: t.description,
      status: t.status,
    });
  };

  const onSubmitEdit = (values: UpdateTicketRequest) => {
    if (!id) return;
    updateMutation.mutate({ id, body: values });
  };

  if (!id) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tickets")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tickets
        </button>
        <p className="text-sm text-destructive">ID de ticket no válido.</p>
      </div>
    );
  }

  if (ticketQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tickets")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tickets
        </button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (ticketQuery.isError) {
    const err = ticketQuery.error as Error & { code?: string };
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tickets")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tickets
        </button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            {getApiErrorMessage(err, "Ticket")}
          </p>
        </div>
      </div>
    );
  }

  const ticket = ticketQuery.data!;
  const customerName = customerMap.get(ticket.customer_id) ?? ticket.customer_id;

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <button
        onClick={() => navigate("/crm/tickets")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a tickets
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Detalle del ticket</h1>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ticket.subject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <Badge variant="outline">{ticket.status}</Badge>
            <span className="text-xs text-muted-foreground ml-2">Sentimiento:</span>
            <SentimentBadge sentiment={ticket.sentiment} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha creación</p>
              <p className="text-muted-foreground">{formatDate(ticket.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="text-muted-foreground">{formatDate(ticket.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ticket</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input placeholder="Asunto del ticket" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          {updateMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              {(updateMutation.error as Error).message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
