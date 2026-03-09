import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { CalendarClock, Plus } from "lucide-react";

import {
  listTasks,
  createTask,
  getCustomers,
} from "@/features/crm/services";
import {
  createTaskSchema,
  type CreateTaskRequest,
} from "@/lib/validations/crm";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { TaskResponse } from "@/types/crm";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 20;
const STATUS_FILTERS = [
  { value: "_all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "done", label: "Hechas" },
  { value: "cancelled", label: "Canceladas" },
];

function TaskStatusBadge({ status }: { status: TaskResponse["status"] }) {
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="text-xs">
        Pendiente
      </Badge>
    );
  }
  if (status === "done") {
    return (
      <Badge variant="default" className="text-xs">
        Hecha
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-xs">
      Cancelada
    </Badge>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string): string {
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

export default function TasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [createOpen, setCreateOpen] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ["crm-tasks", PAGE_SIZE, offset, statusFilter],
    queryFn: () =>
      listTasks({
        limit: PAGE_SIZE,
        offset,
        status: statusFilter === "_all" ? undefined : statusFilter,
      }),
  });

  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => getCustomers(),
  });

  const createForm = useForm<CreateTaskRequest>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      customer_id: "",
      title: "",
      description: "",
      due_at: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      setCreateOpen(false);
      createForm.reset();
    },
  });

  const customerMap = new Map(
    customersQuery.data?.map((c) => [c.id, c.name]) ?? []
  );

  const items = tasksQuery.data?.items ?? [];
  const hasMore = items.length === PAGE_SIZE;
  const hasPrev = offset > 0;

  const openCreate = () => {
    setCreateOpen(true);
    createForm.reset({
      customer_id: "",
      title: "",
      description: "",
      due_at: undefined,
    });
  };

  const onSubmitCreate = (values: CreateTaskRequest) => {
    createMutation.mutate({
      ...values,
      customer_id:
        values.customer_id && values.customer_id !== "_none"
          ? values.customer_id
          : undefined,
      due_at:
        values.due_at && String(values.due_at) !== ""
          ? values.due_at
          : undefined,
    });
  };

  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        ← Volver al CRM
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tareas CRM</h1>
            <p className="text-sm text-muted-foreground">
              Llamadas, visitas y seguimientos asociados a clientes.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva tarea
        </Button>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        className="w-full"
      >
        <TabsList>
          {STATUS_FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tasksQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {tasksQuery.isError && !tasksQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(tasksQuery.error, "Tareas CRM")}
        </p>
      )}

      {!tasksQuery.isLoading && !tasksQuery.isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">
                  Título
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Cliente
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Vencimiento
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Creado
                </TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay tareas.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {t.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.customer_id
                        ? customerMap.get(t.customer_id) ?? t.customer_id
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(t.due_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(t.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/crm/tasks/${t.id}`)}
                        >
                          Ver detalle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/crm/tasks/${t.id}`)}
                        >
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–{offset + items.length}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPrev)
                          setOffset((o) => Math.max(0, o - PAGE_SIZE));
                      }}
                      className={
                        !hasPrev ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasMore) setOffset((o) => o + PAGE_SIZE);
                      }}
                      className={
                        !hasMore ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Dialog Crear tarea */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (opcional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v || undefined)}
                      value={field.value || "_none"}
                      disabled={customersQuery.isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sin asignar</SelectItem>
                        {customersQuery.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título de la tarea" {...field} />
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
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="due_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de vencimiento (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value instanceof Date
                            ? field.value.toISOString().slice(0, 10)
                            : field.value
                            ? String(field.value).slice(0, 10)
                            : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v ? new Date(v) : undefined);
                        }}
                      />
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
    </div>
  );
}
