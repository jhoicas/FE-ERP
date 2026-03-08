import { ReplenishmentDTO } from "@/features/inventory/schemas";
import { Badge } from "@/components/ui/badge";

type ReplenishmentTableProps = {
  items: ReplenishmentDTO[];
};

function ReplenishmentRow({ item }: { item: ReplenishmentDTO }) {
  const isCritical = item.priority === 1;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <Badge variant={isCritical ? "destructive" : "secondary"}>
          {isCritical ? "Crítico" : "Sugerencia"}
        </Badge>
      </td>
      <td className="py-3 px-4 font-medium">
        <div className="flex flex-col gap-0.5">
          <span>{item.product_name}</span>
          <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right font-mono">{item.current_stock}</td>
      <td className="py-3 px-4 text-right font-mono">{item.ideal_stock}</td>
      <td className="py-3 px-4 text-right font-mono">
        {item.suggested_order_qty > 0 ? item.suggested_order_qty : "—"}
      </td>
    </tr>
  );
}

export default function ReplenishmentTable({ items }: ReplenishmentTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Estado</th>
          <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Producto</th>
          <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Stock Actual</th>
          <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Stock Ideal</th>
          <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Cant. Sugerida</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <ReplenishmentRow key={item.product_id} item={item} />
        ))}
      </tbody>
    </table>
  );
}

