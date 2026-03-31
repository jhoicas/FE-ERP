import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Crown, DollarSign, Ticket, TrendingDown, TrendingUp, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getCrmAnalytics } from "@/features/analytics/services";
import { getApiErrorMessage } from "@/lib/api/errors";

type KpiApiItem = {
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
};

type SegmentationItem = {
  segment: string;
  count: number;
};

type SalesByCategoryItem = {
  name: string;
  value: number;
};

type MonthlyTrendItem = {
  month: string;
  ventas: number;
};

type CrmAnalyticsResponse = {
  crmKpis?: KpiApiItem[];
  segmentation?: SegmentationItem[];
  salesByCategory?: SalesByCategoryItem[];
  monthlyTrend?: MonthlyTrendItem[];
};

const DONUT_COLORS = [
  "hsl(160, 84%, 24%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  color: "hsl(var(--foreground))",
};

const KPI_ICONS = [Users, DollarSign, Ticket, Crown] as const;

const formatKpiValue = (value: string | number) => {
  if (typeof value === "number") return value.toLocaleString();
  return value;
};

export default function CrmAnalyticsDashboard() {
  const [data, setData] = useState<CrmAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getCrmAnalytics();
        if (!active) return;
        setData((response ?? {}) as CrmAnalyticsResponse);
      } catch (err) {
        if (!active) return;
        setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const crmKpis = useMemo(() => {
    const items = data?.crmKpis ?? [];
    return items.map((kpi, index) => ({
      ...kpi,
      icon: KPI_ICONS[index] ?? Users,
    }));
  }, [data]);

  const segmentation = data?.segmentation ?? [];
  const salesByCategory = data?.salesByCategory ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive mt-4">
        {getApiErrorMessage(error, "CRM / Analítica")}
      </p>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {crmKpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <kpi.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{formatKpiValue(kpi.value)}</p>
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
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="erp-card">
          <h2 className="text-sm font-semibold mb-4">Segmentación de Clientes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentation} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Clientes" fill="hsl(160, 84%, 24%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="erp-card">
          <h2 className="text-sm font-semibold mb-4">Ventas por Categoría</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {salesByCategory.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, ""]}
                  contentStyle={tooltipStyle}
                />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="erp-card">
        <h2 className="text-sm font-semibold mb-4">Evolución Mensual de Ventas (Últimos 12 meses)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Ventas"]}
                contentStyle={tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                name="Ventas"
                stroke="hsl(160, 84%, 24%)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--card))", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
