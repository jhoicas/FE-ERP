import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuditLogs } from "@/features/crm/hooks/use-crm";
import type { AuditLog } from "@/features/crm/crm.types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionBadge(action: string) {
  const normalized = action.toUpperCase();

  if (normalized === "CREATE") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">CREATE</Badge>;
  }

  if (normalized === "UPDATE") {
    return <Badge className="bg-blue-600 hover:bg-blue-600">UPDATE</Badge>;
  }

  if (normalized === "DELETE") {
    return <Badge className="bg-red-600 hover:bg-red-600">DELETE</Badge>;
  }

  return <Badge variant="secondary">{action}</Badge>;
}

export default function AuditLogsPage() {
  const [entity, setEntity] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logsQuery = useAuditLogs({
    entity: entity === "ALL" ? undefined : entity,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    limit: 50,
    offset: 0,
  });

  const metrics = logsQuery.data?.metrics ?? {};
  const chartData = Array.isArray(metrics.changes_by_day) ? metrics.changes_by_day : [];

  const metricCards = useMemo(() => {
    const totalChanges = Number(metrics.total_changes ?? 0);
    const mostModified = String(metrics.most_modified_entity ?? "N/D");
    const cards = [
      { label: "Total de cambios", value: totalChanges.toLocaleString("es-CO") },
      { label: "Entidad más modificada", value: mostModified },
      { label: "Registros cargados", value: String(logsQuery.data?.items.length ?? 0) },
    ];

    return cards;
  }, [logsQuery.data?.items.length, metrics.most_modified_entity, metrics.total_changes]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bitácoras de Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Revisa cambios críticos por entidad, usuario y rango de fechas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cambios por día</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger>
              <SelectValue placeholder="Entidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="CAMPAIGN">CAMPAIGN</SelectItem>
              <SelectItem value="AUTOMATION">AUTOMATION</SelectItem>
              <SelectItem value="TEMPLATE">TEMPLATE</SelectItem>
            </SelectContent>
          </Select>

          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <Button
            variant="outline"
            onClick={() => {
              setEntity("ALL");
              setStartDate("");
              setEndDate("");
            }}
          >
            Limpiar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividad</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : logsQuery.isError ? (
            <div className="p-4 text-sm text-destructive">
              {(logsQuery.error as Error).message}
            </div>
          ) : (logsQuery.data?.items.length ?? 0) === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay registros para los filtros seleccionados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logsQuery.data?.items ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>{log.user_id}</TableCell>
                    <TableCell>{actionBadge(log.action)}</TableCell>
                    <TableCell>{log.entity_name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                        Ver Cambios
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedLog != null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de cambios</DialogTitle>
            <DialogDescription>
              Acción {selectedLog?.action} sobre {selectedLog?.entity_name} #{selectedLog?.entity_id}
            </DialogDescription>
          </DialogHeader>

          <pre className="max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            {JSON.stringify(selectedLog?.changes ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
