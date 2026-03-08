import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { warehouses } from "@/data/mockData";
import { Package, Warehouse, AlertTriangle, MapPin, CircleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getProducts, getReplenishmentList } from "@/features/inventory/services";
import ReplenishmentTable from "@/features/inventory/components/ReplenishmentTable";

export default function InventoryPage() {
  const productsQuery = useQuery({
    queryKey: ["inventory", "products"],
    queryFn: getProducts,
  });

  const replenishmentQuery = useQuery({
    queryKey: ["inventory", "replenishment-list"],
    queryFn: getReplenishmentList,
  });

  return (
    <div className="animate-fade-in">
      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-3.5 w-3.5" />Productos</TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-1.5"><Warehouse className="h-3.5 w-3.5" />Bodegas</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Alertas de Reposición</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="erp-card overflow-hidden p-0">
            {productsQuery.isLoading && (
              <div className="p-6 text-sm text-muted-foreground">Cargando productos...</div>
            )}
            {productsQuery.isError && !productsQuery.isLoading && (
              <div className="p-6 text-sm text-destructive">
                {getApiErrorMessage(productsQuery.error, "Inventario")}
              </div>
            )}
            {!productsQuery.isLoading && !productsQuery.isError && productsQuery.data && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Producto</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Precio</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Stock</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productsQuery.data.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-right font-mono">${p.price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono">{p.current_stock}</td>
                      <td className="py-3 px-4 text-muted-foreground">{p.unit_measure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="warehouses">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.name} className="erp-card">
                <div className="flex items-center gap-2 mb-3">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{w.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />{w.location}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacidad</span>
                    <span className="font-medium">{w.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Productos</span>
                    <span className="font-medium">{w.products}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responsable</span>
                    <span className="font-medium">{w.manager}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="erp-card overflow-hidden p-0">
            <div className="flex items-center gap-2 p-4 border-b">
              <CircleAlert className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Productos que requieren reabastecimiento</h3>
            </div>
            <div className="p-4 border-b">
              {replenishmentQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Cargando alertas de reposición...</p>
              )}
              {replenishmentQuery.isError && !replenishmentQuery.isLoading && (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(replenishmentQuery.error, "Inventario")}
                </p>
              )}
            </div>
            {!replenishmentQuery.isLoading && !replenishmentQuery.isError && replenishmentQuery.data && (
              <ReplenishmentTable items={replenishmentQuery.data} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
