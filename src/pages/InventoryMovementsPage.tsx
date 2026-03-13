import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoveRight, MoveUpRight, MoveDownRight, AlertCircle } from "lucide-react";

import type { RegisterMovementRequest } from "@/types/inventory";
import { useRegisterInventoryMovement, useWarehouses } from "@/features/inventory/api";
import InventoryAdjustmentDialog from "@/features/inventory/components/InventoryAdjustmentDialog";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type MovementType = "IN" | "OUT" | "TRANSFER";

interface SessionMovement {
  id: string;
  created_at: string;
  request: RegisterMovementRequest;
}

const movementFormSchema = z
  .object({
    type: z.enum(["IN", "OUT", "TRANSFER"], {
      required_error: "El tipo de movimiento es obligatorio",
    }),
    product_id: z.string().min(1, "El producto es obligatorio"),
    warehouse_id: z.string().optional(),
    from_warehouse_id: z.string().optional(),
    to_warehouse_id: z.string().optional(),
    quantity: z
      .string()
      .min(1, "La cantidad es obligatoria")
      .regex(/^\d+(\.\d+)?$/, "La cantidad debe ser un número positivo"),
    unit_cost: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "El costo debe ser un número positivo")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const qty = Number(val.quantity);
    if (!(qty > 0)) {
      ctx.addIssue({
        path: ["quantity"],
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor que cero",
      });
    }

    if (val.type === "IN") {
      if (!val.warehouse_id) {
        ctx.addIssue({
          path: ["warehouse_id"],
          code: z.ZodIssueCode.custom,
          message: "La bodega es obligatoria para entradas",
        });
      }
      if (!val.unit_cost || val.unit_cost.trim() === "") {
        ctx.addIssue({
          path: ["unit_cost"],
          code: z.ZodIssueCode.custom,
          message: "El costo unitario es obligatorio para entradas",
        });
      }
    }

    if (val.type === "OUT") {
      if (!val.warehouse_id) {
        ctx.addIssue({
          path: ["warehouse_id"],
          code: z.ZodIssueCode.custom,
          message: "La bodega es obligatoria para salidas",
        });
      }
    }

    if (val.type === "TRANSFER") {
      if (!val.from_warehouse_id) {
        ctx.addIssue({
          path: ["from_warehouse_id"],
          code: z.ZodIssueCode.custom,
          message: "Bodega origen obligatoria en transferencias",
        });
      }
      if (!val.to_warehouse_id) {
        ctx.addIssue({
          path: ["to_warehouse_id"],
          code: z.ZodIssueCode.custom,
          message: "Bodega destino obligatoria en transferencias",
        });
      }
      if (
        val.from_warehouse_id &&
        val.to_warehouse_id &&
        val.from_warehouse_id === val.to_warehouse_id
      ) {
        ctx.addIssue({
          path: ["to_warehouse_id"],
          code: z.ZodIssueCode.custom,
          message: "La bodega destino debe ser diferente a la origen",
        });
      }
    }
  });

type MovementFormValues = z.infer<typeof movementFormSchema>;

function MovementTypeBadge({ type }: { type: MovementType }) {
  if (type === "IN") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]"
      >
        <MoveDownRight className="h-3 w-3 mr-1" />
        Entrada
      </Badge>
    );
  }
  if (type === "OUT") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/60 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-[11px]"
      >
        <MoveUpRight className="h-3 w-3 mr-1" />
        Salida
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-sky-500/60 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 text-[11px]"
    >
      <MoveRight className="h-3 w-3 mr-1" />
      Transferencia
    </Badge>
  );
}

export default function InventoryMovementsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sessionMovements, setSessionMovements] = useState<SessionMovement[]>([]);
  const [typeFilter, setTypeFilter] = useState<MovementType | "_all">("_all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("_all");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(0);

  const warehousesQuery = useWarehouses({ limit: 100, offset: 0 }, undefined);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      type: "IN",
      product_id: "",
      warehouse_id: "",
      from_warehouse_id: "",
      to_warehouse_id: "",
      quantity: "",
      unit_cost: "",
    },
  });

  const mutation = useRegisterInventoryMovement({
    onSuccess: (_, variables) => {
      const now = new Date().toISOString();
      const id = `${now}-${sessionMovements.length + 1}`;
      setSessionMovements((prev) => [
        {
          id,
          created_at: now,
          request: variables,
        },
        ...prev,
      ]);
      form.reset({
        type: form.getValues("type"),
        product_id: "",
        warehouse_id: "",
        from_warehouse_id: "",
        to_warehouse_id: "",
        quantity: "",
        unit_cost: "",
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-replenishment-list"] });
    },
  });

  const onSubmit = (values: MovementFormValues) => {
    const payload: RegisterMovementRequest = {
      product_id: values.product_id,
      type: values.type,
      quantity: values.quantity,
    };

    if (values.type === "IN" || values.type === "OUT") {
      if (values.warehouse_id) {
        payload.warehouse_id = values.warehouse_id;
      }
    }
    if (values.type === "TRANSFER") {
      if (values.from_warehouse_id) payload.from_warehouse_id = values.from_warehouse_id;
      if (values.to_warehouse_id) payload.to_warehouse_id = values.to_warehouse_id;
    }
    if (values.type === "IN" && values.unit_cost && values.unit_cost.trim() !== "") {
      payload.unit_cost = values.unit_cost;
    }

    mutation.mutate(payload);
  };

  const filteredMovements = useMemo(() => {
    return sessionMovements.filter((m) => {
      const t = m.request.type as MovementType;
      if (typeFilter !== "_all" && t !== typeFilter) return false;

      if (warehouseFilter !== "_all") {
        const w = m.request.warehouse_id ?? m.request.from_warehouse_id ?? m.request.to_warehouse_id;
        if (w !== warehouseFilter) return false;
      }

      return true;
    });
  }, [sessionMovements, typeFilter, warehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredMovements.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage,
  );

  const mapErrorMessage = (error: Error & { code?: string }) => {
    if (!error.code) return error.message;
    if (error.code === "INSUFFICIENT_STOCK") {
      return "Stock insuficiente en la bodega origen para realizar el movimiento.";
    }
    if (error.code === "NOT_FOUND") {
      return "Producto o bodega no encontrado.";
    }
    if (error.code === "VALIDATION") {
      return "Datos inválidos en el movimiento. Revisa los campos.";
    }
    return error.message;
  };

  return (
    <div className="animate-fade-in space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/inventario")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Inventario
        </button>

        <InventoryAdjustmentDialog />
      </div>

      {/* Formulario de registro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registrar movimiento de inventario</CardTitle>
          <p className="text-xs text-muted-foreground">
            Registra entradas, salidas y transferencias entre bodegas. Los movimientos quedarán
            registrados en el historial de esta sesión.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">Entrada</SelectItem>
                            <SelectItem value="OUT">Salida</SelectItem>
                            <SelectItem value="TRANSFER">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Producto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ID o SKU del producto (por ahora ID)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bodegas para IN/OUT */}
              {form.watch("type") === "IN" || form.watch("type") === "OUT" ? (
                <FormField
                  control={form.control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bodega</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={warehousesQuery.isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar bodega" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehousesQuery.data?.items.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name}
                              </SelectItem>
                            ))}
                            {warehousesQuery.data?.items.length === 0 && !warehousesQuery.isLoading && (
                              <SelectItem value="_none" disabled>
                                No hay bodegas
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {/* Bodegas para TRANSFER */}
              {form.watch("type") === "TRANSFER" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="from_warehouse_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bodega origen</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={warehousesQuery.isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar bodega origen" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehousesQuery.data?.items.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="to_warehouse_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bodega destino</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={warehousesQuery.isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar bodega destino" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehousesQuery.data?.items.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.00"
                          inputMode="decimal"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("type") === "IN" ? (
                  <FormField
                    control={form.control}
                    name="unit_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo unitario</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            inputMode="decimal"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div />
                )}
              </div>

              {mutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error al registrar movimiento</AlertTitle>
                  <AlertDescription>
                    {mapErrorMessage(mutation.error as Error & { code?: string })}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Registrando…" : "Registrar movimiento"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Historial de la sesión */}
      <Card className="erp-card p-0 overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Historial reciente</CardTitle>
            <Badge variant="secondary" className="text-[11px]">
              {sessionMovements.length} movimiento
              {sessionMovements.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Tipo</span>
              <Select
                value={typeFilter}
                onValueChange={(v: MovementType | "_all") => {
                  setTypeFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  <SelectItem value="IN">Entradas</SelectItem>
                  <SelectItem value="OUT">Salidas</SelectItem>
                  <SelectItem value="TRANSFER">Transferencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span>Bodega</span>
              <Select
                value={warehouseFilter}
                onValueChange={(v) => {
                  setWarehouseFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {warehousesQuery.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs text-muted-foreground">Bodega(s)</TableHead>
                <TableHead className="text-xs text-muted-foreground">Cantidad</TableHead>
                <TableHead className="text-xs text-muted-foreground">Costo unitario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no se han registrado movimientos en esta sesión.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((m) => {
                  const t = m.request.type as MovementType;
                  const created = new Date(m.created_at).toLocaleString("es-CO");
                  let warehouseLabel = m.request.warehouse_id ?? "—";
                  if (t === "TRANSFER") {
                    warehouseLabel = `${m.request.from_warehouse_id ?? "?"} → ${
                      m.request.to_warehouse_id ?? "?"
                    }`;
                  }
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {created}
                      </TableCell>
                      <TableCell>
                        <MovementTypeBadge type={t} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {m.request.product_id}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {warehouseLabel}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.request.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.request.unit_cost ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {filteredMovements.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
              <p className="text-xs text-muted-foreground">
                Mostrando{" "}
                {filteredMovements.length === 0
                  ? 0
                  : currentPage * rowsPerPage + 1}
                –
                {Math.min(
                  filteredMovements.length,
                  currentPage * rowsPerPage + pageItems.length,
                )}{" "}
                de {filteredMovements.length}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página</span>
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(v) => {
                      setRowsPerPage(Number(v));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
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
                          if (currentPage > 0) setPage((p) => p - 1);
                        }}
                        className={
                          currentPage === 0 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages - 1)
                            setPage((p) => p + 1);
                        }}
                        className={
                          currentPage >= totalPages - 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

