import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheck, Plus, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  getResolutions,
  createResolution,
  type CreateResolutionPayload,
  updateResolution,
  deleteResolution,
  type ResolutionDTO,
} from "@/features/auth/services";
import { useDianEnvironment } from "@/hooks/use-dian-environment";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const resolutionSchema = z
  .object({
    prefix: z.string().min(1, "El prefijo es obligatorio"),
    resolution_number: z.string().min(1, "El número de resolución es obligatorio"),
    from_number: z.coerce.number().int().nonnegative("Debe ser mayor o igual a 0"),
    to_number: z.coerce.number().int().positive("Debe ser mayor a 0"),
    current_number: z.preprocess(
      (value) => (value === "" || value == null ? undefined : Number(value)),
      z.number().int().nonnegative("Debe ser mayor o igual a 0").optional(),
    ),
    valid_from: z.string().min(1, "La fecha inicial es obligatoria"),
    valid_to: z.string().min(1, "La fecha final es obligatoria"),
    environment: z.enum(["test", "prod"], {
      required_error: "El ambiente DIAN es obligatorio",
    }),
    alert_threshold: z.preprocess(
      (value) => (value === "" || value == null ? undefined : Number(value)),
      z.number().int().positive("Debe ser mayor a 0").optional(),
    ),
  })
  .refine((values) => values.to_number >= values.from_number, {
    message: "El número final debe ser mayor o igual al inicial",
    path: ["to_number"],
  });

type ResolutionFormValues = z.infer<typeof resolutionSchema>;

function mapDianEnvironmentToResolutionEnvironment(environment: "testing" | "production"): "test" | "prod" {
  return environment === "production" ? "prod" : "test";
}

export default function ResolutionsManager() {
  const { environment: dianEnvironment } = useDianEnvironment();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResolution, setEditingResolution] = useState<ResolutionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResolutionDTO | null>(null);
  const initialPageSize = Number(searchParams.get("pageSize")) || 5;
  const initialOffset = Number(searchParams.get("offset")) || 0;
  const initialSearch = searchParams.get("search") ?? "";
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [offset, setOffset] = useState(initialOffset);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim().toLowerCase());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const activeResolutionEnvironment = mapDianEnvironmentToResolutionEnvironment(dianEnvironment);

  const resolutionsQuery = useQuery({
    queryKey: ["resolutions"],
    queryFn: getResolutions,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setOffset(0);
    }, 400);

    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search.trim()) {
      nextParams.set("search", search.trim());
    }

    if (offset > 0) {
      nextParams.set("offset", String(offset));
    }

    if (pageSize !== 5) {
      nextParams.set("pageSize", String(pageSize));
    }

    setSearchParams(nextParams, { replace: true });
  }, [search, offset, pageSize, setSearchParams]);

  const form = useForm<ResolutionFormValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: {
      prefix: "",
      resolution_number: "",
      from_number: 1,
      to_number: 1,
      current_number: undefined,
      valid_from: "",
      valid_to: "",
      environment: activeResolutionEnvironment,
      alert_threshold: undefined,
    },
  });

  useEffect(() => {
    if (!editingResolution) {
      form.setValue("environment", activeResolutionEnvironment, { shouldDirty: false });
    }
  }, [activeResolutionEnvironment, editingResolution, form]);

  const markRequiredResolutionFields = () => {
    const values = form.getValues();

    if (!values.prefix?.trim()) {
      form.setError("prefix", { type: "manual", message: "Campo obligatorio" });
    }
    if (!values.resolution_number?.trim()) {
      form.setError("resolution_number", { type: "manual", message: "Campo obligatorio" });
    }
    if (values.from_number == null || Number.isNaN(Number(values.from_number))) {
      form.setError("from_number", { type: "manual", message: "Campo obligatorio" });
    }
    if (values.to_number == null || Number.isNaN(Number(values.to_number))) {
      form.setError("to_number", { type: "manual", message: "Campo obligatorio" });
    }
    if (!values.valid_from?.trim()) {
      form.setError("valid_from", { type: "manual", message: "Campo obligatorio" });
    }
    if (!values.valid_to?.trim()) {
      form.setError("valid_to", { type: "manual", message: "Campo obligatorio" });
    }
    if (!values.environment) {
      form.setError("environment", { type: "manual", message: "Campo obligatorio" });
    }
  };

  const handleValidationError = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const payload = error.response.data as { code?: string; message?: string } | undefined;
      const isValidation = payload?.code === "VALIDATION" || Boolean(payload?.message);

      if (isValidation) {
        setSubmitError(payload?.message ?? "Datos inválidos");
        markRequiredResolutionFields();
        return;
      }
    }

    setSubmitError(getApiErrorMessage(error, "Resoluciones DIAN"));
  };

  const createMutation = useMutation({
    mutationFn: (values: ResolutionFormValues) => {
      const payload: CreateResolutionPayload = {
        prefix: values.prefix,
        resolution_number: values.resolution_number,
        from_number: values.from_number,
        to_number: values.to_number,
        valid_from: values.valid_from,
        valid_to: values.valid_to,
        environment: values.environment,
      };

      if (typeof values.current_number === "number") {
        payload.current_number = values.current_number;
      }
      if (typeof values.alert_threshold === "number") {
        payload.alert_threshold = values.alert_threshold;
      }

      return createResolution(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      setDialogOpen(false);
      setEditingResolution(null);
      setSubmitError(null);
      form.reset({
        prefix: "",
        resolution_number: "",
        from_number: 1,
        to_number: 1,
        current_number: undefined,
        valid_from: "",
        valid_to: "",
        environment: activeResolutionEnvironment,
        alert_threshold: undefined,
      });
    },
    onError: handleValidationError,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: ResolutionFormValues;
    }) =>
      updateResolution(id, {
        prefix: values.prefix,
        resolution_number: values.resolution_number,
        from_number: values.from_number,
        to_number: values.to_number,
        current_number: values.current_number,
        valid_from: values.valid_from,
        valid_to: values.valid_to,
        alert_threshold: values.alert_threshold,
        environment: values.environment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      setDialogOpen(false);
      setEditingResolution(null);
      setSubmitError(null);
      form.reset({
        prefix: "",
        resolution_number: "",
        from_number: 1,
        to_number: 1,
        current_number: undefined,
        valid_from: "",
        valid_to: "",
        environment: activeResolutionEnvironment,
        alert_threshold: undefined,
      });
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error, "Resoluciones DIAN"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResolution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingResolution(null);
    setSubmitError(null);
    form.reset({
      prefix: "",
      resolution_number: "",
      from_number: 1,
      to_number: 1,
      current_number: undefined,
      valid_from: "",
      valid_to: "",
      environment: activeResolutionEnvironment,
      alert_threshold: undefined,
    });
    setDialogOpen(true);
  };

  const openEdit = (resolution: ResolutionDTO) => {
    setEditingResolution(resolution);
    setSubmitError(null);
    form.reset({
      prefix: resolution.prefix,
      resolution_number: resolution.resolution_number,
      from_number: resolution.from_number,
      to_number: resolution.to_number,
      current_number: resolution.current_number,
      valid_from: resolution.valid_from.slice(0, 10),
      valid_to: resolution.valid_to.slice(0, 10),
      environment: resolution.environment ?? "test",
      alert_threshold: resolution.alert_threshold,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: ResolutionFormValues) => {
    setSubmitError(null);
    if (editingResolution) {
      updateMutation.mutate({ id: editingResolution.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const filteredResolutions = useMemo(() => {
    const items = resolutionsQuery.data ?? [];

    if (!debouncedSearch) {
      return items;
    }

    return items.filter((resolution) => {
      const searchable = [
        resolution.prefix,
        resolution.resolution_number,
        String(resolution.from_number),
        String(resolution.to_number),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(debouncedSearch);
    });
  }, [resolutionsQuery.data, debouncedSearch]);

  const paginatedResolutions = filteredResolutions.slice(offset, offset + pageSize);
  const total = filteredResolutions.length;
  const hasPrev = offset > 0;
  const hasMore = offset + paginatedResolutions.length < total;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Resoluciones DIAN</h1>
            <p className="text-sm text-muted-foreground">
              Administra prefijos, rangos y alertas de numeración para facturación electrónica.
            </p>
          </div>
        </div>

        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Crear resolución
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-sm font-semibold">Directorio de resoluciones</h2>
          <p className="text-xs text-muted-foreground">
            Consulta por prefijo, número de resolución o rango autorizado.
          </p>
        </div>
        <div className="ml-auto w-full sm:w-64">
          <Input
            placeholder="Buscar por prefijo o resolución…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {resolutionsQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {resolutionsQuery.isError && !resolutionsQuery.isLoading && (
        <div className="erp-card p-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{getApiErrorMessage(resolutionsQuery.error, "Resoluciones DIAN")}</span>
        </div>
      )}

      {!resolutionsQuery.isLoading && !resolutionsQuery.isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">Prefijo</TableHead>
                <TableHead className="text-xs text-muted-foreground">Resolución</TableHead>
                <TableHead className="text-xs text-muted-foreground">Rango</TableHead>
                <TableHead className="text-xs text-muted-foreground">Vigencia</TableHead>
                <TableHead className="text-xs text-muted-foreground">Alerta</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResolutions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {debouncedSearch
                      ? "No se encontraron resoluciones con ese criterio."
                      : "No hay resoluciones registradas."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResolutions.map((resolution) => (
                  <TableRow key={resolution.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{resolution.prefix}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {resolution.resolution_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {resolution.from_number} - {resolution.to_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(resolution.valid_from).toLocaleDateString()} - {" "}
                      {new Date(resolution.valid_to).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {resolution.alert_threshold > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-warning/40 bg-warning/15 text-warning"
                        >
                          {resolution.alert_threshold}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => openEdit(resolution)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => setDeleteTarget(resolution)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {paginatedResolutions.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–{offset + paginatedResolutions.length}
                {total > 0 ? ` de ${total}` : ""}
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
                        onClick={(event) => {
                          event.preventDefault();
                          if (hasPrev) {
                            setOffset((current) => Math.max(0, current - pageSize));
                          }
                        }}
                        className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (hasMore) {
                            setOffset((current) => current + pageSize);
                          }
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingResolution(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingResolution ? "Editar resolución" : "Crear resolución"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefijo</FormLabel>
                      <FormControl>
                        <Input placeholder="SETP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resolution_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de resolución</FormLabel>
                      <FormControl>
                        <Input placeholder="18764012345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consecutivo inicial</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="to_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consecutivo final</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente DIAN</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona ambiente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="test">Habilitación (Test)</SelectItem>
                          <SelectItem value="prod">Producción</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consecutivo actual</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alert_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umbral de alerta</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válida desde</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válida hasta</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingResolution(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? editingResolution
                      ? "Guardando…"
                      : "Creando…"
                    : editingResolution
                      ? "Guardar cambios"
                      : "Crear resolución"}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-destructive mt-2">
              {submitError ??
                getApiErrorMessage(
                  (createMutation.error || updateMutation.error) as Error,
                  "Resoluciones DIAN",
                )}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar resolución</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminará la resolución ${deleteTarget.prefix} - ${deleteTarget.resolution_number}. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(deleteMutation.error, "Resoluciones DIAN")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
