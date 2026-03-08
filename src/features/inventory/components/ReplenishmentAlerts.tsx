import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";

import { getProducts } from "@/features/inventory/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReplenishmentAlerts() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory", "products"],
    queryFn: getProducts,
  });

  const critical = (data ?? []).filter((p) => p.current_stock <= p.reorder_point);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-warning" />
        <div>
          <h2 className="text-sm font-semibold">Alertas de reposición</h2>
          <p className="text-xs text-muted-foreground">
            Productos por debajo de su punto de reorden.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Inventario / Alertas")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          {critical.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Producto</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">SKU</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Punto de reorden</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Estado</th>
                </tr>
              </thead>
              <tbody>
                {critical.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.current_stock}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.reorder_point}</td>
                    <td className="py-3 px-4">
                      <Badge variant="destructive" className="text-[10px]">
                        Crítico
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No hay productos en estado crítico de reposición.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

