import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useWarehouses, useProducts } from "@/features/inventory/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const StocktakeRowSchema = z
  .object({
    product_id: z.string(),
    product_name: z.string().optional(),
    system_quantity: z.union([z.number(), z.string()]).optional(),
    counted_quantity: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

const StocktakeCreateResponseSchema = z
  .object({
    id: z.string(),
    warehouse_id: z.string().optional(),
    status: z.string().optional(),
    items: z.array(StocktakeRowSchema).optional(),
  })
  .passthrough();

type StocktakeRow = {
  product_id: string;
  product_name?: string;
  system_quantity: number;
  counted_quantity: string;
  hasSavedCount: boolean;
};

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function StocktakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [rows, setRows] = useState<StocktakeRow[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const warehousesQuery = useWarehouses({ limit: 100, offset: 0 });
  const productsQuery = useProducts({ limit: 500, offset: 0 });

  const productNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsQuery.data?.items ?? []) {
      map.set(product.id, product.name);
    }
    return map;
  }, [productsQuery.data?.items]);

  const createStocktakeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/api/inventory/stocktake", {
        warehouse_id: warehouseId,
      });
      return StocktakeCreateResponseSchema.parse(response.data);
    },
    onSuccess: (data) => {
      setStocktakeId(data.id);
      const mappedRows = (data.items ?? []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name ?? productNames.get(item.product_id),
        system_quantity: toNumber(item.system_quantity),
        counted_quantity: item.counted_quantity != null ? String(item.counted_quantity) : "",
        hasSavedCount: item.counted_quantity != null,
      }));
      setRows(mappedRows);
      setActiveStep(2);
      toast({
        title: "Snapshot creado",
        description: "Ya puedes capturar cantidades contadas por producto.",
      });
    },
  });

  const saveCountMutation = useMutation({
    mutationFn: async ({ product_id, counted_quantity }: { product_id: string; counted_quantity: number }) => {
      if (!stocktakeId) {
        throw new Error("No hay conteo activo");
      }
      await apiClient.put(`/api/inventory/stocktake/${stocktakeId}/count`, {
        product_id,
        counted_quantity,
      });
      return { product_id, counted_quantity };
    },
    onSuccess: ({ product_id }) => {
      setRows((current) =>
        current.map((row) => (row.product_id === product_id ? { ...row, hasSavedCount: true } : row)),
      );
      queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
    },
  });

  const closeStocktakeMutation = useMutation({
    mutationFn: async () => {
      if (!stocktakeId) {
        throw new Error("No hay conteo activo");
      }
      await apiClient.post(`/api/inventory/stocktake/${stocktakeId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-replenishment-list"] });
      toast({
        title: "Conteo cerrado",
        description: "Se aplicaron las diferencias del conteo físico.",
      });
      setActiveStep(3);
    },
  });

  const selectedWarehouseName = useMemo(
    () => warehousesQuery.data?.items.find((w) => w.id === warehouseId)?.name ?? "—",
    [warehousesQuery.data?.items, warehouseId],
  );

  const summary = useMemo(() => {
    const withDiff = rows.map((row) => {
      const counted = Number(row.counted_quantity);
      const normalizedCounted = Number.isFinite(counted) ? counted : 0;
      return {
        ...row,
        counted: normalizedCounted,
        diff: normalizedCounted - row.system_quantity,
      };
    });

    return {
      total: withDiff.length,
      withDifference: withDiff.filter((row) => row.diff !== 0).length,
      positive: withDiff.filter((row) => row.diff > 0).length,
      negative: withDiff.filter((row) => row.diff < 0).length,
      rows: withDiff,
    };
  }, [rows]);

  const canCreateSnapshot = warehouseId.length > 0;
  const canClose = rows.length > 0 && rows.every((row) => row.hasSavedCount);

  const updateCounted = (productId: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.product_id === productId ? { ...row, counted_quantity: value, hasSavedCount: false } : row,
      ),
    );
  };

  const saveRow = (row: StocktakeRow) => {
    const counted = Number(row.counted_quantity);
    if (!Number.isFinite(counted)) return;
    saveCountMutation.mutate({ product_id: row.product_id, counted_quantity: counted });
  };

  return (
    <div className="animate-fade-in space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/inventario")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Inventario
        </button>
      </div>

      <div>
        <h1 className="text-lg font-semibold tracking-tight">Conteo físico de inventario</h1>
        <p className="text-sm text-muted-foreground">
          Ejecuta conteos por bodega en 3 pasos: snapshot, captura por producto y cierre.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className={activeStep === 1 ? "border-primary/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paso 1 · Snapshot</CardTitle>
            <CardDescription>Selecciona bodega y crea el snapshot inicial.</CardDescription>
          </CardHeader>
        </Card>
        <Card className={activeStep === 2 ? "border-primary/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paso 2 · Captura</CardTitle>
            <CardDescription>Ingresa contado y guarda cada fila.</CardDescription>
          </CardHeader>
        </Card>
        <Card className={activeStep === 3 ? "border-primary/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paso 3 · Cierre</CardTitle>
            <CardDescription>Revisa diferencias y cierra el conteo.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paso 1: Seleccionar bodega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {warehousesQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bodega</p>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehousesQuery.data?.items.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                disabled={!canCreateSnapshot || createStocktakeMutation.isPending}
                onClick={() => createStocktakeMutation.mutate()}
              >
                {createStocktakeMutation.isPending ? "Creando snapshot…" : "Crear snapshot"}
              </Button>
            </div>
          )}

          {createStocktakeMutation.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(createStocktakeMutation.error, "Inventario / Conteo físico")}
            </p>
          )}

          {stocktakeId && (
            <p className="text-xs text-muted-foreground">
              Conteo activo: <span className="font-mono">{stocktakeId}</span> · Bodega: {selectedWarehouseName}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paso 2: Captura por producto</CardTitle>
          <CardDescription>Columnas: Producto, Sistema, Contado y Diferencia.</CardDescription>
        </CardHeader>
        <CardContent>
          {!stocktakeId ? (
            <p className="text-sm text-muted-foreground">Primero crea el snapshot en el paso 1.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">El snapshot no retornó filas para capturar.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">Sistema</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">Contado</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">Diferencia</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const counted = Number(row.counted_quantity);
                    const isValidCount = Number.isFinite(counted);
                    const difference = isValidCount ? counted - row.system_quantity : 0;

                    return (
                      <TableRow key={row.product_id}>
                        <TableCell>
                          <div className="font-medium text-sm">{row.product_name ?? productNames.get(row.product_id) ?? row.product_id}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{row.product_id}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{row.system_quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            className="h-8 text-right font-mono"
                            inputMode="decimal"
                            value={row.counted_quantity}
                            onChange={(e) => updateCounted(row.product_id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          <span
                            className={
                              difference > 0
                                ? "text-green-600 dark:text-green-400"
                                : difference < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }
                          >
                            {difference > 0 ? "+" : ""}
                            {difference}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={!isValidCount || saveCountMutation.isPending}
                            onClick={() => saveRow(row)}
                          >
                            Guardar fila
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {saveCountMutation.isError && (
            <p className="text-sm text-destructive mt-3">
              {getApiErrorMessage(saveCountMutation.error, "Inventario / Conteo por fila")}
            </p>
          )}

          {stocktakeId && rows.length > 0 && (
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setActiveStep(3)}>
                Ir a resumen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paso 3: Resumen y cierre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stocktakeId ? (
            <p className="text-sm text-muted-foreground">Completa el paso 1 para continuar.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Filas: {summary.total}</Badge>
                <Badge variant="secondary">Con diferencia: {summary.withDifference}</Badge>
                <Badge variant="secondary">Sobrantes: {summary.positive}</Badge>
                <Badge variant="secondary">Faltantes: {summary.negative}</Badge>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">Sistema</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">Contado</TableHead>
                      <TableHead className="text-right text-xs text-muted-foreground">Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.rows
                      .filter((row) => row.diff !== 0)
                      .map((row) => (
                        <TableRow key={`summary-${row.product_id}`}>
                          <TableCell className="text-sm">{row.product_name ?? productNames.get(row.product_id) ?? row.product_id}</TableCell>
                          <TableCell className="text-right font-mono">{row.system_quantity}</TableCell>
                          <TableCell className="text-right font-mono">{row.counted}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={row.diff > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                              {row.diff > 0 ? "+" : ""}
                              {row.diff}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}

                    {summary.withDifference === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                          No hay diferencias registradas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Para cerrar el conteo, guarda todas las filas en el paso 2.
                </p>
                <Button
                  type="button"
                  onClick={() => closeStocktakeMutation.mutate()}
                  disabled={!canClose || closeStocktakeMutation.isPending}
                >
                  {closeStocktakeMutation.isPending ? "Cerrando…" : "Cerrar conteo"}
                </Button>
              </div>

              {closeStocktakeMutation.isSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Conteo cerrado correctamente.
                </p>
              )}

              {closeStocktakeMutation.isError && (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(closeStocktakeMutation.error, "Inventario / Cierre de conteo")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}