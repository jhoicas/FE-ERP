import { useQuery } from "@tanstack/react-query";

import { getProducts } from "@/features/inventory/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory", "products"],
    queryFn: getProducts,
  });

  return (
    <div className="space-y-4">
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
              </tr>
            </thead>
            <tbody>
              {data?.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="py-3 px-4 text-right font-mono">${p.price.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">${p.cost.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.current_stock}</td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-sm text-muted-foreground">
                    No hay productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

