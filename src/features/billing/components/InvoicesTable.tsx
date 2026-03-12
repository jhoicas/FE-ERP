import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { getInvoices } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import DebitNoteDialog from "@/features/billing/components/DebitNoteDialog";
import VoidInvoiceDialog from "@/features/billing/components/VoidInvoiceDialog";

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "SENT") {
    return (
      <Badge variant="default" className="text-[10px]">
        Enviada
      </Badge>
    );
  }

  if (normalized === "ERROR") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Error
      </Badge>
    );
  }

  if (normalized === "DRAFT" || normalized === "PENDING") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        {normalized === "DRAFT" ? "Borrador" : "Pendiente"}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-[10px]">
      {status}
    </Badge>
  );
}

export default function InvoicesTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: getInvoices,
  });

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Facturación / Facturas")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {data && data.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Factura</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Fecha</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">
                    Estado <ExplainableAcronym sigla="DIAN" />
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((inv) => {
                  const displayNumber = inv.prefix ? `${inv.prefix}-${inv.number}` : inv.number;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{displayNumber}</p>
                            {inv.customer_name && (
                              <p className="text-xs text-muted-foreground truncate">{inv.customer_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${inv.grand_total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={inv.dian_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {inv.dian_status === "Sent" && (
                            <>
                              <VoidInvoiceDialog invoiceId={inv.id} invoiceNumber={displayNumber} />
                              <DebitNoteDialog invoiceId={inv.id} invoiceNumber={displayNumber} />
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs">
                            Ver XML
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No hay facturas registradas.</p>
          )}
        </div>
      )}
    </div>
  );
}

