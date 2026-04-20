import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CrmAnalyticsTab from "@/features/analytics/components/CrmAnalyticsTab";
import CrmAnalyticsProductCategoriesTab from "@/features/analytics/components/CrmAnalyticsProductCategoriesTab";
import CrmAnalyticsProductsTab from "@/features/analytics/components/CrmAnalyticsProductsTab";

export default function CrmAnalyticsDashboard() {
  return (
    <Tabs defaultValue="analytics" className="space-y-4">
      <TabsList>
        <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        <TabsTrigger value="products">Productos</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
      </TabsList>
      <TabsContent value="analytics" className="space-y-4">
        <CrmAnalyticsTab />
      </TabsContent>
      <TabsContent value="products">
        <CrmAnalyticsProductsTab />
      </TabsContent>
      <TabsContent value="categories">
        <CrmAnalyticsProductCategoriesTab />
      </TabsContent>
    </Tabs>
  );
}
