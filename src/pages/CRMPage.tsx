import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomersTable from "@/features/crm/components/CustomersTable";
import TicketsList from "@/features/crm/components/TicketsList";
import CrmTasksBoard from "@/features/crm/components/CrmTasksBoard";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getUserRoles, hasAccess } from "@/features/auth/permissions";

const CRM_TABS: {
  value: string;
  label: string;
  path?: string;
  allowedRoles: string[];
  content?: React.ReactNode;
}[] = [
  {
    value: "customers",
    label: "Directorio de Clientes",
    allowedRoles: ["sales", "support", "marketing", "admin"],
    content: <CustomersTable />,
  },
  {
    value: "tickets",
    label: "Tickets",
    path: "/crm/tickets",
    allowedRoles: ["support", "admin"],
    content: <TicketsList />,
  },
  {
    value: "tasks",
    label: "Tareas",
    path: "/crm/tasks/kanban",
    allowedRoles: ["sales", "admin"],
    content: <CrmTasksBoard />,
  },
  {
    value: "campaigns",
    label: "Laboratorio de campañas",
    path: "/crm/campaigns",
    allowedRoles: ["marketing", "admin"],
    content: null,
  },
  {
    value: "loyalty",
    label: "Fidelización",
    path: "/crm/loyalty",
    allowedRoles: ["admin"],
    content: null,
  },
];

export default function CRMPage() {
  const user = useAuthUser();
  const roles = getUserRoles(user);

  const visibleTabs = useMemo(
    () => CRM_TABS.filter((tab) => hasAccess(roles, tab.allowedRoles)),
    [roles],
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
