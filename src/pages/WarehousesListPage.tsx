import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Warehouse, Warehouse as WarehouseIcon, Plus, AlertCircle, Pencil, Trash2 } from "lucide-react";

import {
  useWarehouses,
  useCreateWarehouse,
  type ListWarehousesParams,
} from "@/features/inventory/warehouses.api";
import type { WarehouseResponse } from "@/types/inventory";
import apiClient from "@/lib/api/client";
import {
  createWarehouseRequestSchema,
} from "@/lib/validations/inventory";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function WarehouseCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<any>({
    resolver: zodResolver(createWarehouseRequestSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  const mutation = useCreateWarehouse({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary" />
            Nueva bodega
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la bodega" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección física" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {(mutation.error as Error).message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creando…" : "Crear bodega"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function WarehouseEditDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: WarehouseResponse | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(createWarehouseRequestSchema),
    defaultValues: {
      name: warehouse?.name ?? "",
      address: warehouse?.address ?? "",
    },
    values: {
      name: warehouse?.name ?? "",
      address: warehouse?.address ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: { name: string; address?: string }) => {
      if (!warehouse) return;
      await apiClient.put(`/api/warehouses/${warehouse.id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      toast({ title: "Bodega actualizada" });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar bodega
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la bodega" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección física" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(mutation.error, "Inventario / Bodegas")}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehousesListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useAuthUser();
  const canManageWarehouses = isAdmin(user);

  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState(5);
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivatingWarehouseId, setDeactivatingWarehouseId] = useState<string | null>(null);

  const params: ListWarehousesParams = { limit: pageSize, offset };
  const { data, isLoading, isError, error } = useWarehouses(params);

  const items: WarehouseResponse[] = data?.items ?? [];
  const total = data?.page.total ?? 0;
  const hasMore = offset + items.length < total;
  const hasPrev = offset > 0;

  const deactivateMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      if (!canManageWarehouses) {
        throw new Error("No tienes permisos");
      }
      await apiClient.put(`/api/warehouses/${warehouseId}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      toast({ title: "Desactivado correctamente" });
      setConfirmOpen(false);
      setDeactivatingWarehouseId(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Error al desactivar",
        description: getApiErrorMessage(error, "Inventario / Bodegas"),
        variant: "destructive",
      });
    },
  });

  const openEdit = (warehouse: WarehouseResponse) => {
    if (!canManageWarehouses) return;
    setEditingWarehouse(warehouse);
    setEditOpen(true);
  };

  const openDeactivate = (warehouseId: string) => {
    if (!canManageWarehouses) return;
    setDeactivatingWarehouseId(warehouseId);
    setConfirmOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <button
        onClick={() => navigate("/inventario")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver a Inventario
      </button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WarehouseIcon className="h-4 w-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Bodegas</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las bodegas físicas y visualiza sus niveles de stock.
            </p>
          </div>
        </div>
        {canManageWarehouses && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva bodega
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar bodegas</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(error, "Inventario / Bodegas")}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <Card className="erp-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">
                  Nombre
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Dirección
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Creada
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Actualizada
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
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay bodegas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {w.address || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(w.updated_at).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            navigate(`/inventory/warehouses/${w.id}/stock`)
                          }
                        >
                          Ver stock
                        </Button>
                        {canManageWarehouses && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => openEdit(w)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive"
                              onClick={() => openDeactivate(w.id)}
                              disabled={deactivateMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Desactivar
                            </Button>
                          </>
                        )}
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
                {total ? ` de ${total}` : ""}
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
        </Card>
      )}

      <WarehouseCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <WarehouseEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        warehouse={editingWarehouse}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar bodega</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar este registro? Esta acción oculta el registro pero no lo elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivatingWarehouseId) {
                  deactivateMutation.mutate(deactivatingWarehouseId);
                }
              }}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

