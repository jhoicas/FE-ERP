import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomersTable from "@/features/crm/components/CustomersTable";
import TicketsList from "@/features/crm/components/TicketsList";
import CrmTasksBoard from "@/features/crm/components/CrmTasksBoard";
import LoyaltyProfiles from "@/features/crm/components/LoyaltyProfiles";

export default function CRMPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">CRM / Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu base de clientes, tickets, tareas de seguimiento y programas de fidelización.
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Directorio de Clientes</TabsTrigger>
          <TabsTrigger value="tickets" asChild>
          <Link to="/crm/tickets">Tickets</Link>
        </TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="loyalty">Fidelización</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomersTable />
        </TabsContent>

        <TabsContent value="tickets">
          <TicketsList />
        </TabsContent>

        <TabsContent value="tasks">
          <CrmTasksBoard />
        </TabsContent>

        <TabsContent value="loyalty">
          <LoyaltyProfiles />
        </TabsContent>
      </Tabs>
    </div>
  );
}
