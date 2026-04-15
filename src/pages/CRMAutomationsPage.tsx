import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import AutomationsTab from "@/features/crm/components/AutomationsTab";

export default function CRMAutomationsPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> · Automatizaciones
        </h1>
      </div>

      <AutomationsTab />
    </div>
  );
}
