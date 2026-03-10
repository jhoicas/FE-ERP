import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";

import {
  listTickets,
  createTicket,
  updateTicket,
  getCustomers,
} from "@/features/crm/services";
import CreateCustomerDialog from "@/features/crm/components/CreateCustomerDialog";
import {
  createTicketSchema,
  updateTicketSchema,
  type CreateTicketRequest,
  type UpdateTicketRequest,
} from "@/lib/validations/crm";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { TicketResponse } from "@/types/crm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
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

function truncateId(id: string): string {
  if (!id || id.length <= 8) return id;
  return id.slice(-8);
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

export default function TicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState(20);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "_all">("_all");
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<TicketResponse | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

  const ticketsQuery = useQuery({
    queryKey: ["crm-tickets", pageSize, offset, debouncedSearch, statusFilter, sort],
    queryFn: () =>
      listTickets({
        limit: pageSize,
        offset,
        status: statusFilter === "_all" ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        sort,
      }),
  });

  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => getCustomers(),
  });

  const createForm = useForm<CreateTicketRequest>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { customer_id: "", subject: "", description: "" },
  });

  const editForm = useForm<UpdateTicketRequest>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: { subject: "", description: "", status: "" },
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tickets"] });
      setCreateOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTicketRequest }) =>
      updateTicket(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["crm-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["crm-tickets"] });
      setEditTicket(null);
      editForm.reset();
    },
  });

  const customerMap = new Map(
    customersQuery.data?.map((c) => [c.id, c.name]) ?? []
  );

  const items = ticketsQuery.data?.items ?? [];
  const hasMore = items.length === pageSize;
  const hasPrev = offset > 0;

  const openCreate = () => {
    setCreateOpen(true);
    createForm.reset({ customer_id: "", subject: "", description: "" });
  };

  const openEdit = (t: TicketResponse) => {
    setEditTicket(t);
    editForm.reset({
      subject: t.subject,
      description: t.description,
      status: t.status,
    });
  };

  const onSubmitCreate = (values: CreateTicketRequest) => {
    createMutation.mutate(values);
  };

  const onSubmitEdit = (values: UpdateTicketRequest) => {
    if (!editTicket) return;
    updateMutation.mutate({ id: editTicket.id, body: values });
  };

  const escalateMutation = useMutation({
    mutationFn: (id: string) => updateTicket(id, { status: "escalated" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["crm-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["crm-tickets"] });
    },
  });

  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        ← Volver al <ExplainableAcronym sigla="CRM" />
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Tickets <ExplainableAcronym sigla="PQR" />
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de solicitudes, quejas y reclamos de clientes.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo ticket
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Filtrar por estado:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as typeof statusFilter);
              setOffset(0);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>Ordenar por fecha:</span>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as typeof sort);
              setOffset(0);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Más recientes primero</SelectItem>
              <SelectItem value="date_asc">Más antiguos primero</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar por asunto o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {ticketsQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {ticketsQuery.isError && !ticketsQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(ticketsQuery.error, "Tickets PQR")}
        </p>
      )}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-xs text-muted-foreground">Asunto</TableHead>
                <TableHead className="text-xs text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs text-muted-foreground">Sentimiento</TableHead>
                <TableHead className="text-xs text-muted-foreground">Fecha creación</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No hay tickets registrados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {truncateId(t.id)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {customerMap.get(t.customer_id) ?? t.customer_id}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {t.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SentimentBadge sentiment={t.sentiment} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(t.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/crm/tickets/${t.id}`)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => openEdit(t)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={escalateMutation.isPending}
                          onClick={() => escalateMutation.mutate(t.id)}
                        >
                          Escalar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–{offset + items.length}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      const size = Number(value);
                      setOffset(0);
                      setPageSize(size);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPrev) setOffset((o) => Math.max(0, o - pageSize));
                        }}
                        className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasMore) setOffset((o) => o + pageSize);
                        }}
                        className={!hasMore ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      )}

      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={(customerId) => {
          createForm.setValue("customer_id", customerId);
          queryClient.invalidateQueries({ queryKey: ["customers-list"] });
        }}
      />

      {/* Dialog Crear ticket */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ticket PQR</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Cliente</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setCreateCustomerOpen(true)}
                        title="Crear nuevo cliente"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={customersQuery.isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customersQuery.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                        {customersQuery.data?.length === 0 && !customersQuery.isLoading && (
                          <SelectItem value="_none" disabled>
                            No hay clientes
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
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
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción detallada" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          {createMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              {(createMutation.error as Error).message}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar ticket */}
      <Dialog open={!!editTicket} onOpenChange={(o) => !o && setEditTicket(null)}>
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
                  onClick={() => setEditTicket(null)}
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
