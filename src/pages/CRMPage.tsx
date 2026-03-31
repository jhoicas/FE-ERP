import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CrmAnalyticsDashboard from "@/features/analytics/components/CrmAnalyticsDashboard";
import CustomersTable from "@/features/crm/components/CustomersTable";

export default function CRMPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" />
        </h1>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analítica</TabsTrigger>
          <TabsTrigger value="directory">Directorio</TabsTrigger>
          <TabsTrigger value="remarketing">Remarketing</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <CrmAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Directorio de clientes con búsqueda, filtros y paginación.
            </p>
          </div>
          <CustomersTable />
        </TabsContent>

        <TabsContent value="remarketing" className="space-y-4">
          <div className="erp-card p-6">
            <h2 className="text-sm font-semibold">Remarketing</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Próximamente: campañas y automatizaciones de remarketing.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
