import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { getTickets } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status: "open" | "resolved" }) {
  const label = status === "open" ? "Abierto" : "Resuelto";
  const variant = status === "open" ? "default" : "secondary";
  return (
    <Badge variant={variant} className="text-[10px]">
      {label}
    </Badge>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const base = "text-[10px] px-2 py-0.5 rounded-full";
  if (sentiment === "positive") {
    return <span className={`${base} bg-emerald-50 text-emerald-700`}>Positivo</span>;
  }
  if (sentiment === "negative") {
    return <span className={`${base} bg-red-50 text-red-700`}>Negativo</span>;
  }
  return <span className={`${base} bg-amber-50 text-amber-700`}>Neutral</span>;
}

export default function TicketsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["crm", "tickets"],
    queryFn: getTickets,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Tickets de soporte</h2>
          <p className="text-xs text-muted-foreground">
            Consulta el estado de las PQRS y solicitudes de tus clientes.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Tickets CRM")}</p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {data && data.length > 0 ? (
            <ul className="divide-y">
              {data.map((t) => (
                <li key={t.id} className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={t.status} />
                      <SentimentBadge sentiment={t.sentiment} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No hay tickets registrados.</p>
          )}
        </div>
      )}
    </div>
  );
}

