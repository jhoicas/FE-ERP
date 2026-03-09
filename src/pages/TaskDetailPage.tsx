import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarClock, Pencil } from "lucide-react";

import {
  getTask,
  updateTask,
  getCustomers,
} from "@/features/crm/services";
import {
  updateTaskSchema,
  type UpdateTaskRequest,
} from "@/lib/validations/crm";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { TaskResponse } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  { value: "pending", label: "Pendiente" },
  { value: "done", label: "Hecha" },
  { value: "cancelled", label: "Cancelada" },
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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["crm-task", id],
    queryFn: () => getTask(id!),
    enabled: !!id,
  });

  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => getCustomers(),
  });

  const editForm = useForm<UpdateTaskRequest>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      due_at: undefined,
      status: undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id: taskId,
      body,
    }: {
      id: string;
      body: UpdateTaskRequest;
    }) => updateTask(taskId, body),
    onSuccess: (_, { id: taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["crm-task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
    },
  });

  const customerMap = new Map(
    customersQuery.data?.map((c) => [c.id, c.name]) ?? []
  );

  useEffect(() => {
    if (taskQuery.data) {
      const t = taskQuery.data;
      editForm.reset({
        title: t.title,
        description: t.description ?? "",
        due_at: t.due_at ? new Date(t.due_at) : undefined,
        status: t.status,
      });
    }
  }, [taskQuery.data, editForm]);

  const onSubmitEdit = (values: UpdateTaskRequest) => {
    if (!id) return;
    updateMutation.mutate({
      id,
      body: {
        ...values,
        due_at:
          values.due_at && String(values.due_at) !== ""
            ? values.due_at
            : undefined,
      },
    });
  };

  if (!id) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tasks")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tareas
        </button>
        <p className="text-sm text-destructive">ID de tarea no válido.</p>
      </div>
    );
  }

  if (taskQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tasks")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tareas
        </button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (taskQuery.isError) {
    const err = taskQuery.error as Error & { code?: string };
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/tasks")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a tareas
        </button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            {getApiErrorMessage(err, "Tarea")}
          </p>
        </div>
      </div>
    );
  }

  const task = taskQuery.data!;
  const customerName = task.customer_id
    ? customerMap.get(task.customer_id) ?? task.customer_id
    : "—";

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <button
        onClick={() => navigate("/crm/tasks")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a tareas
      </button>

      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">
          Detalle de la tarea
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Descripción</p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Estado:</span>
            <TaskStatusBadge status={task.status} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimiento</p>
              <p className="text-muted-foreground">
                {formatDate(task.due_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="text-muted-foreground">
                {formatDateTime(task.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Última actualización
              </p>
              <p className="text-muted-foreground">
                {formatDateTime(task.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Pencil className="h-4 w-4" />
          <CardTitle className="text-base">Editar tarea</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
                name="due_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de vencimiento (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? task.status}
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </form>
          </Form>
          {updateMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              {(updateMutation.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
