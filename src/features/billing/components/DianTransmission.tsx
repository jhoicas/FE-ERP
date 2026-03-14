import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { getInvoices } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";

export default function DianTransmission() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billing", "dian", "summary"],
    queryFn: getInvoices,
  });

  const today = new Date().toISOString().slice(0, 10);
  const sentToday =
    data?.filter((invoice) => invoice.dian_status === "Sent" && invoice.date?.slice(0, 10) === today)
      .length ?? 0;
  const pending =
    data?.filter((invoice) => invoice.dian_status === "Pending" || invoice.dian_status === "DRAFT")
      .length ?? 0;
  const rejected = data?.filter((invoice) => invoice.dian_status === "Error").length ?? 0;

  return (
    <div className="erp-card space-y-4">
      <div>
        <h2 className="text-sm font-semibold">
          Resumen de transmisión <ExplainableAcronym sigla="DIAN" />
        </h2>
        <p className="text-xs text-muted-foreground">
          Estado general de los documentos electrónicos enviados en la jornada a la{" "}
          <ExplainableAcronym sigla="DIAN" />.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Resumen DIAN")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Enviados hoy</span>
              <Badge variant="default" className="text-[10px]">
                OK
              </Badge>
            </div>
            <p className="text-xl font-semibold">{sentToday}</p>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pendientes</span>
              <Badge variant="secondary" className="text-[10px]">
                En cola
              </Badge>
            </div>
            <p className="text-xl font-semibold">{pending}</p>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Rechazados</span>
              <Badge variant="destructive" className="text-[10px]">
                Revisar
              </Badge>
            </div>
            <p className="text-xl font-semibold">{rejected}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Este resumen es informativo y no reemplaza el detalle de los acuses de recibo de la{" "}
        <ExplainableAcronym sigla="DIAN" />.
      </p>
    </div>
  );
}

