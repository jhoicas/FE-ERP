import CustomersTable from "@/features/crm/components/CustomersTable";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

export default function CRMPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> / Clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Directorio de clientes con búsqueda, filtros y paginación.
        </p>
      </div>

      <CustomersTable />
    </div>
  );
}
