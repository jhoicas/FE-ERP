import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";

import { getTasks } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function TaskStatusBadge({ status }: { status: "pending" | "done" | "cancelled" }) {
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Pendiente
      </Badge>
    );
  }
  if (status === "done") {
    return (
      <Badge variant="default" className="text-[10px]">
        Completada
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      Cancelada
    </Badge>
  );
}

export default function CrmTasksBoard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["crm", "tasks"],
    queryFn: getTasks,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Tareas y seguimientos</h2>
          <p className="text-xs text-muted-foreground">
            Organiza llamadas, visitas y recordatorios asociados a tus clientes.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Tareas CRM")}</p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {data && data.length > 0 ? (
            <ul className="divide-y">
              {data.map((t) => (
                <li key={t.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vence el {new Date(t.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <TaskStatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No hay tareas registradas.</p>
          )}
        </div>
      )}
    </div>
  );
}

