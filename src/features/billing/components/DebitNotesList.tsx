import { useQuery } from "@tanstack/react-query";

import { getDebitNotes } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";

export default function DebitNotesList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billing", "debit-notes"],
    queryFn: getDebitNotes,
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
          {getApiErrorMessage(error, "Facturación / Notas débito")}
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
                {data.map((dn) => (
                  <tr key={dn.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-medium">{dn.number ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{dn.reason ?? "—"}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {typeof dn.amount === "number" ? `$${dn.amount.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No hay notas débito registradas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
