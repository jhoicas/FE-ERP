import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomersTable from "@/features/crm/components/CustomersTable";
import TicketsList from "@/features/crm/components/TicketsList";
import CrmTasksBoard from "@/features/crm/components/CrmTasksBoard";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { canAccessFrontendRoute } from "@/features/auth/permissions";
import { useRbacMenu } from "@/features/auth/useRbacMenu";

const CRM_TABS: {
  value: string;
  label: string;
  path?: string;
  content?: React.ReactNode;
}[] = [
  {
    value: "customers",
    label: "Directorio de Clientes",
    content: <CustomersTable />,
  },
  {
    value: "tickets",
    label: "Tickets",
    path: "/crm/tickets",
    content: <TicketsList />,
  },
  {
    value: "tasks",
    label: "Tareas",
    path: "/crm/tasks/kanban",
    content: <CrmTasksBoard />,
  },
  {
    value: "campaigns",
    label: "Laboratorio de campañas",
    path: "/crm/campaigns",
    content: null,
  },
  {
    value: "loyalty",
    label: "Fidelización",
    path: "/crm/loyalty",
    content: null,
  },
];

export default function CRMPage() {
  const { data: menu } = useRbacMenu();

  const visibleTabs = useMemo(
    () =>
      CRM_TABS.filter((tab) =>
        canAccessFrontendRoute(menu, tab.path ?? "/crm"),
      ),
    [menu],
  );

  const defaultTab = visibleTabs[0]?.value ?? "customers";

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> / Clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu base de clientes, tickets, tareas de seguimiento y programas de fidelización.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          {visibleTabs.map((tab) =>
            tab.path ? (
              <TabsTrigger key={tab.value} value={tab.value} asChild>
                <Link to={tab.path}>{tab.label}</Link>
              </TabsTrigger>
            ) : (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ),
          )}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
