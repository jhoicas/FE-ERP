import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package2, Boxes, Archive, DollarSign } from "lucide-react";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { getProducts } from "@/features/inventory/services";
import { useWarehouses } from "@/features/inventory/warehouses.api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const InventoryStockSchema = z
  .object({
    current_stock: z.union([z.string(), z.number()]).optional(),
    reserved_stock: z.union([z.string(), z.number()]).optional(),
    available_stock: z.union([z.string(), z.number()]).optional(),
    average_cost: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

type InventoryStockDTO = z.infer<typeof InventoryStockSchema>;

async function getInventoryStock(productId: string, warehouseId: string): Promise<InventoryStockDTO> {
  const response = await apiClient.get("/api/inventory/stock", {
    params: {
      product_id: productId,
      warehouse_id: warehouseId,
    },
  });

  return InventoryStockSchema.parse(response.data);
}

function formatMetric(value: string | number | undefined, currency = false) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return currency
    ? numeric.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 })
    : numeric.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

export default function StockConsultWidget({ initialWarehouseId }: { initialWarehouseId?: string }) {
  const [productId, setProductId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>(initialWarehouseId ?? "");
  const [queryParams, setQueryParams] = useState<{ productId: string; warehouseId: string } | null>(null);

  const productsQuery = useQuery({
    queryKey: ["inventory", "products", "stock-widget"],
    queryFn: getProducts,
  });

  const warehousesQuery = useWarehouses({});

  const stockQuery = useQuery({
    queryKey: ["inventory", "stock", queryParams],
    queryFn: () => getInventoryStock(queryParams!.productId, queryParams!.warehouseId),
    enabled: !!queryParams?.productId && !!queryParams?.warehouseId,
  });

  const canSubmit = productId.length > 0 && warehouseId.length > 0;

  const selectedProduct = useMemo(
    () => productsQuery.data?.find((product) => product.id === queryParams?.productId),
    [productsQuery.data, queryParams?.productId],
  );

  const selectedWarehouse = useMemo(
    () => warehousesQuery.data?.items.find((warehouse) => warehouse.id === queryParams?.warehouseId),
    [warehousesQuery.data?.items, queryParams?.warehouseId],
  );

  return (
    <Card className="erp-card">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm">Consulta puntual de stock</CardTitle>
            <p className="text-xs text-muted-foreground">
              Consulta stock por producto y bodega antes de registrar movimientos o reposición.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Producto</p>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {productsQuery.data?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <Button type="button" onClick={() => setQueryParams({ productId, warehouseId })} disabled={!canSubmit}>
            Consultar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {(productsQuery.isLoading || warehousesQuery.isLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        )}

        {(productsQuery.isError || warehousesQuery.isError) && (
          <p className="text-sm text-destructive">
            {productsQuery.isError
              ? getApiErrorMessage(productsQuery.error, "Inventario / Productos")
              : getApiErrorMessage(warehousesQuery.error, "Inventario / Bodegas")}
          </p>
        )}

        {!productsQuery.isLoading && !warehousesQuery.isLoading && !productsQuery.isError && !warehousesQuery.isError && !queryParams && (
          <p className="text-sm text-muted-foreground">
            Selecciona un producto y una bodega para consultar el stock detallado.
          </p>
        )}

        {stockQuery.isLoading && queryParams && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        )}

        {stockQuery.isError && queryParams && !stockQuery.isLoading && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(stockQuery.error, "Inventario / Consulta de stock")}
          </p>
        )}

        {stockQuery.data && !stockQuery.isLoading && !stockQuery.isError && (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Producto: <span className="text-foreground font-medium">{selectedProduct?.name ?? "—"}</span>
              </span>
              <span>
                Bodega: <span className="text-foreground font-medium">{selectedWarehouse?.name ?? "—"}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Stock actual" value={formatMetric(stockQuery.data.current_stock)} icon={Package2} />
              <MetricCard label="Reservado" value={formatMetric(stockQuery.data.reserved_stock)} icon={Archive} />
              <MetricCard label="Disponible" value={formatMetric(stockQuery.data.available_stock)} icon={Boxes} />
              <MetricCard label="Costo promedio" value={formatMetric(stockQuery.data.average_cost, true)} icon={DollarSign} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
