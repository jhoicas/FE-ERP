import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, CircleDashed, Plus, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createTask,
  getCustomers,
  getTask,
  listTasks,
  updateTask,
} from "@/features/crm/services";
import CreateCustomerDialog from "@/features/crm/components/CreateCustomerDialog";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from "@/lib/validations/crm";
import type { TaskResponse } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type TaskStatus = "pending" | "done" | "cancelled";

const PAGE_SIZE = 30;

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
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

function isOverdue(dueAt: string | null) {
  if (!dueAt) return false;
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function StatusHeader({
  status,
  count,
}: {
  status: TaskStatus;
  count: number;
}) {
  const map: Record<TaskStatus, { label: string; icon: React.ReactNode }> = {
    pending: { label: "Pendientes", icon: <CircleDashed className="h-4 w-4" /> },
    done: { label: "Hechas", icon: <CheckCircle2 className="h-4 w-4" /> },
    cancelled: { label: "Canceladas", icon: <XCircle className="h-4 w-4" /> },
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-primary">{map[status].icon}</span>
        <h2 className="text-sm font-semibold">{map[status].label}</h2>
      </div>
      <Badge variant="secondary" className="text-[11px]">
        {count}
      </Badge>
    </div>
  );
}

function TaskCard({
  task,
  customerName,
  onClick,
}: {
  task: TaskResponse;
  customerName?: string;
  onClick: () => void;
}) {
  const overdue = isOverdue(task.due_at);
  return (
    <button
      onClick={onClick}
      className="text-left w-full focus:outline-none"
    >
      <Card
        className={[
          "transition-colors hover:bg-muted/40",
          overdue ? "border-red-400/60" : "",
        ].join(" ")}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm truncate">{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {task.description ? (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {task.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin descripción</p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">
              Cliente: {customerName ?? task.customer_id ?? "—"}
            </span>
            {task.due_at ? (
              <span className={overdue ? "text-red-600 dark:text-red-400" : ""}>
                Vence: {formatDateTime(task.due_at)}
              </span>
            ) : (
              <span>Vence: —</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Creada: {formatDateTime(task.created_at)}
            </span>
            {overdue && (
              <Badge variant="destructive" className="text-[11px]">
                Vencida
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function TaskDetailDialog({
  open,
  onOpenChange,
  taskId,
  customerMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  customerMap: Map<string, string>;
}) {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["crm-task", taskId],
    queryFn: () => getTask(taskId!),
    enabled: open && !!taskId,
  });

  const form = useForm<UpdateTaskRequest>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      due_at: undefined,
      status: "pending",
    },
    values: taskQuery.data
      ? {
          title: taskQuery.data.title,
          description: taskQuery.data.description ?? "",
          due_at: taskQuery.data.due_at ? new Date(taskQuery.data.due_at) : undefined,
          status: (taskQuery.data.status as TaskStatus) ?? "pending",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (body: UpdateTaskRequest) => updateTask(taskId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: UpdateTaskRequest) => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de la tarea</DialogTitle>
        </DialogHeader>

        {taskQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {taskQuery.isError && !taskQuery.isLoading && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {getApiErrorMessage(taskQuery.error, "Tarea")}
            </AlertDescription>
          </Alert>
        )}

        {!taskQuery.isLoading && !taskQuery.isError && taskQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p>
                  {taskQuery.data.customer_id
                    ? customerMap.get(taskQuery.data.customer_id) ?? taskQuery.data.customer_id
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p className="text-muted-foreground">
                  {formatDateTime(taskQuery.data.created_at)}
                </p>
              </div>
            </div>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Editar</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Título" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="due_at"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vence (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                value={
                                  field.value instanceof Date
                                    ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000)
                                        .toISOString()
                                        .slice(0, 16)
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

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={String(field.value ?? "pending")}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="done">Hecha</SelectItem>
                                <SelectItem value="cancelled">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {updateMutation.isError && (
                      <p className="text-sm text-destructive">
                        {(updateMutation.error as Error).message}
                      </p>
                    )}

                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cerrar
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Guardando…" : "Guardar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TasksKanbanPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

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

  const pendingQuery = useQuery({
    queryKey: ["crm-tasks", PAGE_SIZE, 0, "pending"],
    queryFn: () => listTasks({ limit: PAGE_SIZE, offset: 0, status: "pending" }),
  });
  const doneQuery = useQuery({
    queryKey: ["crm-tasks", PAGE_SIZE, 0, "done"],
    queryFn: () => listTasks({ limit: PAGE_SIZE, offset: 0, status: "done" }),
  });
  const cancelledQuery = useQuery({
    queryKey: ["crm-tasks", PAGE_SIZE, 0, "cancelled"],
    queryFn: () => listTasks({ limit: PAGE_SIZE, offset: 0, status: "cancelled" }),
  });

  const pending = pendingQuery.data?.items ?? [];
  const done = doneQuery.data?.items ?? [];
  const cancelled = cancelledQuery.data?.items ?? [];
  const customerMap = new Map(
    customersQuery.data?.map((c) => [c.id, c.name]) ?? []
  );

  const anyLoading = pendingQuery.isLoading || doneQuery.isLoading || cancelledQuery.isLoading;

  const openTask = (id: string) => {
    setSelectedTaskId(id);
    setDialogOpen(true);
  };

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

  const columns = useMemo(
    () => [
      { status: "pending" as const, items: pending, query: pendingQuery },
      { status: "done" as const, items: done, query: doneQuery },
      { status: "cancelled" as const, items: cancelled, query: cancelledQuery },
    ],
    [pending, done, cancelled, pendingQuery, doneQuery, cancelledQuery],
  );

  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver al CRM
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Kanban de tareas</h1>
            <p className="text-sm text-muted-foreground">
              Organiza pendientes, hechas y canceladas en un tablero visual.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva tarea
        </Button>
      </div>

      {(pendingQuery.isError || doneQuery.isError || cancelledQuery.isError) && (
        <Alert variant="destructive">
          <AlertTitle>Error cargando tareas</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(
              (pendingQuery.error ?? doneQuery.error ?? cancelledQuery.error) as unknown,
              "Tareas CRM",
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.status} className="space-y-3">
            <StatusHeader status={col.status} count={col.items.length} />

            {anyLoading && col.items.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {col.items.length === 0 ? (
                  <Card>
                    <CardContent className="py-6">
                      <p className="text-sm text-muted-foreground">
                        No hay tareas en esta columna.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  col.items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      customerName={
                        t.customer_id
                          ? customerMap.get(t.customer_id)
                          : undefined
                      }
                      onClick={() => openTask(t.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={(customerId) => {
          createForm.setValue("customer_id", customerId);
          queryClient.invalidateQueries({ queryKey: ["customers-list"] });
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Llamar para seguimiento" {...field} />
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
                      <Textarea rows={4} placeholder="Detalle de la tarea" {...field} value={field.value ?? ""} />
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
                        type="datetime-local"
                        value={
                          field.value instanceof Date
                            ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16)
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

              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(createMutation.error, "Tareas CRM")}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskId={selectedTaskId}
        customerMap={customerMap}
      />
    </div>
  );
}

