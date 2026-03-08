import { TrendingUp, TrendingDown, DollarSign, Percent, Ticket, ListTodo } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { salesByChannel } from "@/data/mockData";
import { getMarginsReport } from "@/features/analytics/services";
import TopProductsTable from "@/features/analytics/components/TopProductsTable";

const kpiIcons = [DollarSign, Percent, Ticket, ListTodo];

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "margins"],
    queryFn: getMarginsReport,
  });

  const kpis = data
    ? [
        {
          label: "Ingresos Brutos",
          value: `$${data.channel_profitability
            .reduce((acc, ch) => acc + ch.gross_revenue, 0)
            .toLocaleString()}`,
          change: "",
          positive: true,
        },
        {
          label: "Margen Global",
          value: `${(
            data.channel_profitability.reduce((acc, ch) => acc + ch.total_margin, 0) /
            Math.max(data.channel_profitability.reduce((acc, ch) => acc + ch.gross_revenue, 0), 1)
          ) * 100
            .toFixed(1)
            .toString()}%`,
          change: "",
          positive: true,
        },
        {
          label: "Canales Analizados",
          value: data.channel_profitability.length.toString(),
          change: "",
          positive: true,
        },
        {
          label: "SKUs Analizados",
          value: data.sku_ranking.length.toString(),
          change: "",
          positive: true,
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="kpi-card animate-pulse">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-7 w-28 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ))}
          </>
        )}
        {!isLoading &&
          kpis.map((kpi, i) => {
            const Icon = kpiIcons[i];
            return (
              <div key={kpi.label} className="kpi-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.positive ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${kpi.positive ? "text-success" : "text-destructive"}`}>
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">vs mes anterior</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Charts + Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-3 erp-card">
          <h2 className="text-sm font-semibold mb-4">Ventas por Canal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByChannel}>
                <defs>
                  <linearGradient id="colorEcom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 24%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 24%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTienda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
                <Legend />
                <Area type="monotone" dataKey="ecommerce" name="E-commerce" stroke="hsl(160, 84%, 24%)" fillOpacity={1} fill="url(#colorEcom)" strokeWidth={2} />
                <Area type="monotone" dataKey="tienda" name="Tienda Física" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorTienda)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="lg:col-span-2 erp-card">
          <h2 className="text-sm font-semibold mb-4">Top Productos Más Rentables</h2>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando métricas...</p>}
          {isError && !isLoading && (
            <p className="text-sm text-destructive">No se pudieron cargar los productos más rentables.</p>
          )}
          {!isLoading && !isError && data && (
            <TopProductsTable items={data.sku_ranking} />
          )}
        </div>
      </div>
    </div>
  );
}
