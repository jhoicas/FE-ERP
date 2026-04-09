import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";

import { getProducts } from "@/features/inventory/services";
import { useWarehouses } from "@/features/inventory/api";
import { useTableSearch } from "@/hooks/use-debounce";
import type { ProductDTO } from "@/features/inventory/schemas";
import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductsTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [supplyDays, setSupplyDays] = useState("");
  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useTableSearch("", 400);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory", "products"],
    queryFn: getProducts,
  });

  const warehousesQuery = useWarehouses({ limit: 100, offset: 0 });

  // Filtrar productos basado en búsqueda (solo si >= 3 caracteres o está vacío)
  const filteredProducts = useMemo(() => {
    const searchTrimmed = debouncedSearchTerm.trim().toLowerCase();
    
    if (searchTrimmed.length === 0 || searchTrimmed.length >= 3) {
      return (data ?? []).filter((p) => 
        p.name.toLowerCase().includes(searchTrimmed) || 
        p.sku.toLowerCase().includes(searchTrimmed)
      );
    }
    
    // Si hay búsqueda pero menos de 3 caracteres, mostrar todos
    return data ?? [];
  }, [data, debouncedSearchTerm]);

  const parsedReorderPoint = Number(reorderPoint);
  const parsedMinStock = Number(minStock);
  const parsedMaxStock = Number(maxStock);
  const parsedSupplyDays = Number(supplyDays);

  const isValidForm =
    !!selectedProduct &&
    warehouseId.length > 0 &&
    Number.isFinite(parsedReorderPoint) &&
    parsedReorderPoint >= 0 &&
    Number.isFinite(parsedMinStock) &&
    parsedMinStock >= 0 &&
    Number.isFinite(parsedMaxStock) &&
    parsedMaxStock >= parsedMinStock &&
    Number.isFinite(parsedSupplyDays) &&
    parsedSupplyDays >= 0;

  const reorderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new Error("Producto no seleccionado");
      }

      await apiClient.put(`/api/products/${selectedProduct.id}/reorder-config`, {
        warehouse_id: warehouseId,
        reorder_point: parsedReorderPoint,
        min_stock: parsedMinStock,
        max_stock: parsedMaxStock,
        supply_days: parsedSupplyDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-replenishment-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
      toast({
        title: "Configuración guardada",
        description: "La configuración de reorden fue actualizada.",
      });
      setSheetOpen(false);
    },
  });

  const openReorderSheet = (product: ProductDTO) => {
    setSelectedProduct(product);
    setWarehouseId("");
    setReorderPoint(String(product.reorder_point ?? 0));
    setMinStock("");
    setMaxStock("");
    setSupplyDays("");
    reorderMutation.reset();
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-80">
        <Input
          placeholder="Buscar por nombre o SKU…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Inventario / Productos")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Nombre</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">SKU</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Precio</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Costo</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Stock Actual</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="py-3 px-4 text-right font-mono">${p.price.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">${p.cost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.current_stock}</td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openReorderSheet(p)}>
                          Config. reorden
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-sm text-muted-foreground">
                    No hay información disponible en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            reorderMutation.reset();
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Configuración de reorden</SheetTitle>
            <SheetDescription>
              {selectedProduct
                ? `Producto: ${selectedProduct.name}`
                : "Define los parámetros de reabastecimiento por bodega."}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Bodega</Label>
              <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar bodega" />
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

            <div className="space-y-1.5">
              <Label>Punto de reorden</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Stock máximo</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Días de abastecimiento</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={supplyDays}
                onChange={(e) => setSupplyDays(e.target.value)}
              />
            </div>

            {reorderMutation.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(reorderMutation.error, "Inventario / Configuración de reorden")}
              </p>
            )}
          </div>

          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => reorderMutation.mutate()}
              disabled={!isValidForm || reorderMutation.isPending}
            >
              {reorderMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

