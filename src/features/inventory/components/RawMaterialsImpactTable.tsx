import type { RawMaterialImpactDTO } from "@/types/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RawMaterialsImpactTableProps {
  items: RawMaterialImpactDTO[];
}

export default function RawMaterialsImpactTable({ items }: RawMaterialsImpactTableProps) {
  return (
    <Card className="erp-card p-0 overflow-hidden">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">Materias primas - impacto en costo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Futuro: conectar con endpoint GET /api/raw-materials/impact para análisis de costo.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
              <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-xs text-muted-foreground">Impacto total costo</TableHead>
              <TableHead className="text-xs text-muted-foreground">% Uso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No hay datos de impacto disponibles.
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.raw_material_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.sku}
                  </TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {Number(m.total_cost_impact).toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {Number(m.usage_pct).toLocaleString("es-CO", {
                      style: "percent",
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

