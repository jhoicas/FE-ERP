import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import ProductsTable from "@/features/inventory/components/ProductsTable";
import ReplenishmentAlerts from "@/features/inventory/components/ReplenishmentAlerts";
import MovementsTable from "@/features/inventory/components/MovementsTable";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Inventario y Logística</h1>
          <p className="text-sm text-muted-foreground">
            Controla tu catálogo de productos, niveles de stock y alertas de reposición.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/inventario/proveedores">Proveedores</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/inventario/conteo">Conteo físico</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Directorio de Productos</TabsTrigger>
          <TabsTrigger value="replenishment">Alertas de Reposición</TabsTrigger>
          <TabsTrigger value="movements">Historial de Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTable />
        </TabsContent>

        <TabsContent value="replenishment">
          <ReplenishmentAlerts />
        </TabsContent>

        <TabsContent value="movements">
          <MovementsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
