import { useQuery } from "@tanstack/react-query";

import { getMovements } from "@/features/inventory/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function MovementTypeBadge({ type }: { type: "IN" | "OUT" | "ADJUSTMENT" }) {
  if (type === "IN") {
    return (
      <Badge variant="default" className="text-[10px]">
        Entrada
      </Badge>
    );
  }
  if (type === "OUT") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Salida
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px]">
      Ajuste
    </Badge>
  );
}

export default function MovementsTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: getMovements,
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
          {getApiErrorMessage(error, "Inventario / Movimientos")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          {data && data.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Tipo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 text-sm">
                      {new Date(m.date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No hay movimientos de inventario registrados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

