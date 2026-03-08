import { SKURankingDTO } from "@/features/analytics/schemas";

type TopProductsTableProps = {
  items: SKURankingDTO[];
};

export default function TopProductsTable({ items }: TopProductsTableProps) {
  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <div key={p.sku} className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {p.units_sold} vendidos · ${p.gross_revenue.toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {p.margin_pct.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

