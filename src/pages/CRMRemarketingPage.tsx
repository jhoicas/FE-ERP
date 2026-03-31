import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import CRMRemarketingTab from "@/features/crm/components/CRMRemarketingTab";

export default function CRMRemarketingPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> · Remarketing
        </h1>
      </div>

      <CRMRemarketingTab />
    </div>
  );
}
