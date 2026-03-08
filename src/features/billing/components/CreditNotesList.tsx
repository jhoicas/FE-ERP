import { useQuery } from "@tanstack/react-query";

import { getCreditNotes } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreditNotesList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billing", "credit-notes"],
    queryFn: getCreditNotes,
  });

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Facturación / Notas crédito")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          {data && data.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Número</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Motivo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.map((cn) => (
                  <tr key={cn.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-medium">{cn.number}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{cn.reason}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${cn.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No hay notas crédito registradas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

