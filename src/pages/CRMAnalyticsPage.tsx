import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import CrmAnalyticsDashboard from "@/features/analytics/components/CrmAnalyticsDashboard";

export default function CRMAnalyticsPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> · Analítica
        </h1>
      </div>

      <CrmAnalyticsDashboard />
    </div>
  );
}
