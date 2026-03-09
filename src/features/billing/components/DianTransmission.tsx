import { Badge } from "@/components/ui/badge";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

export default function DianTransmission() {
  // Valores mockeados por ahora; más adelante se pueden conectar a un endpoint real
  const summary = {
    sentToday: 24,
    pending: 5,
    rejected: 1,
  };

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-background p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Enviados hoy</span>
            <Badge variant="default" className="text-[10px]">
              OK
            </Badge>
          </div>
          <p className="text-xl font-semibold">{summary.sentToday}</p>
        </div>

        <div className="rounded-lg border bg-background p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pendientes</span>
            <Badge variant="secondary" className="text-[10px]">
              En cola
            </Badge>
          </div>
          <p className="text-xl font-semibold">{summary.pending}</p>
        </div>

        <div className="rounded-lg border bg-background p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rechazados</span>
            <Badge variant="destructive" className="text-[10px]">
              Revisar
            </Badge>
          </div>
          <p className="text-xl font-semibold">{summary.rejected}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Este resumen es informativo y no reemplaza el detalle de los acuses de recibo de la{" "}
        <ExplainableAcronym sigla="DIAN" />.
      </p>
    </div>
  );
}

