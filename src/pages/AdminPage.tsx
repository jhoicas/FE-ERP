import { LayoutGrid, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScreensManagementTab from "@/features/admin/components/ScreensManagementTab";
import CompaniesListPage from "@/pages/superadmin/CompaniesListPage";

export default function AdminPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Panel de Administración</h1>
          <p className="text-xs text-muted-foreground">Gestiona empresas y pantallas del sistema.</p>
        </div>
      </div>

      <Tabs defaultValue="empresas" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:w-fit sm:grid-cols-none sm:auto-cols-auto sm:grid-flow-col">
          <TabsTrigger value="empresas" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="pantallas">Pantallas</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="mt-0">
          <CompaniesListPage />
        </TabsContent>

        <TabsContent value="pantallas" className="mt-0">
          <ScreensManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}