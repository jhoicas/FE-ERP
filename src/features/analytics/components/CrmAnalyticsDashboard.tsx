import { useQuery } from "@tanstack/react-query";
import { DollarSign, Receipt, Star, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCrmAnalytics } from "@/features/crm/services";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  color: "hsl(var(--foreground))",
};

function segmentBadgeClass(segmento: string): string {
  switch (segmento) {
    case "VIP":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "PREMIUM":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case "RECURRENTE":
      return "border-blue-300 bg-blue-100 text-blue-800";
    case "OCASIONAL":
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function formatCopCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CrmAnalyticsDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["crm-analytics"],
    queryFn: getCrmAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-52" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">
            No se pudo cargar la analitica del CRM. Intenta nuevamente en unos segundos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasSalesData = data.evolucionMensual.some((item) => Number(item.ventas) > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{formatInteger(data.kpis.totalClientes)}</p>
            <Users className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ventas Totales</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{formatCopCurrency(data.kpis.ventasTotales)}</p>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{formatCopCurrency(data.kpis.ticketPromedio)}</p>
            <Receipt className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Clientes VIP</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{formatInteger(data.kpis.clientesVip)}</p>
            <Star className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolucion Mensual de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasSalesData && (
            <p className="mb-3 text-xs text-muted-foreground">
              Aun no hay ventas registradas en el periodo seleccionado.
            </p>
          )}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.evolucionMensual}>
                <defs>
                  <linearGradient id="crmSalesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 24%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 24%)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatCopCurrency(value), "Ventas"]}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="hsl(160, 84%, 24%)"
                  strokeWidth={2.5}
                  fill="url(#crmSalesGradient)"
                  name="Ventas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Segmentacion de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Ventas Totales</TableHead>
                <TableHead className="text-right">Ticket Promedio</TableHead>
                <TableHead>Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.segmentacion.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay datos de segmentacion para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                data.segmentacion.map((item) => (
                  <TableRow key={item.segmento}>
                    <TableCell>
                      <Badge variant="outline" className={segmentBadgeClass(item.segmento)}>
                        {item.segmento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatInteger(item.clientes)}</TableCell>
                    <TableCell className="text-right">{item.porcentaje}</TableCell>
                    <TableCell className="text-right">{formatCopCurrency(item.ventasTotales)}</TableCell>
                    <TableCell className="text-right">{formatCopCurrency(item.ticketPromedio)}</TableCell>
                    <TableCell>{item.accion}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
