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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const kpis = {
  totalClientes: "2,888",
  ventasTotales: "$671,779,293",
  ticketPromedio: "$232,611",
  clientesVip: 86,
};

const evolucionMensual = [
  { mes: "02/2025", ventas: 43121800 },
  { mes: "03/2025", ventas: 52625385 },
  { mes: "04/2025", ventas: 48790220 },
  { mes: "05/2025", ventas: 56911840 },
  { mes: "06/2025", ventas: 61322400 },
  { mes: "07/2025", ventas: 65803210 },
  { mes: "08/2025", ventas: 70258630 },
];

const segmentacion = [
  {
    segmento: "VIP",
    clientes: 86,
    porcentaje: "3.0%",
    ventasTotales: "$209,850,000",
    ticketPromedio: "$2,440,116",
    accion: "Fidelización + Exclusivos",
  },
  {
    segmento: "PREMIUM",
    clientes: 412,
    porcentaje: "14.3%",
    ventasTotales: "$231,340,000",
    ticketPromedio: "$561,505",
    accion: "Upsell + Recompra",
  },
  {
    segmento: "RECURRENTE",
    clientes: 1290,
    porcentaje: "44.7%",
    ventasTotales: "$172,120,000",
    ticketPromedio: "$133,426",
    accion: "Reactivar + Cross-sell",
  },
  {
    segmento: "OCASIONAL",
    clientes: 1100,
    porcentaje: "38.1%",
    ventasTotales: "$58,469,293",
    ticketPromedio: "$53,154",
    accion: "Captación / Winback",
  },
] as const;

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

export default function CrmAnalyticsDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{kpis.totalClientes}</p>
            <Users className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ventas Totales</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{kpis.ventasTotales}</p>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{kpis.ticketPromedio}</p>
            <Receipt className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Clientes VIP</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight">{kpis.clientesVip}</p>
            <Star className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolución Mensual de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucionMensual}>
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
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Ventas"]}
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
          <CardTitle className="text-sm">Segmentación de Clientes</CardTitle>
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
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentacion.map((item) => (
                <TableRow key={item.segmento}>
                  <TableCell>
                    <Badge variant="outline" className={segmentBadgeClass(item.segmento)}>
                      {item.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.clientes}</TableCell>
                  <TableCell className="text-right">{item.porcentaje}</TableCell>
                  <TableCell className="text-right">{item.ventasTotales}</TableCell>
                  <TableCell className="text-right">{item.ticketPromedio}</TableCell>
                  <TableCell>{item.accion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
