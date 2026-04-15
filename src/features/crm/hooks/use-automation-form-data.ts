import { useQuery } from "@tanstack/react-query";

import { getCampaignTemplates } from "@/features/crm/services";
import { getProducts } from "@/features/inventory/services";

export function useAutomationFormData() {
  const templatesQuery = useQuery({
    queryKey: ["crm", "campaign-templates", "automations"],
    queryFn: getCampaignTemplates,
  });

  const productsQuery = useQuery({
    queryKey: ["inventory", "products", "automations"],
    queryFn: getProducts,
  });

  return {
    templatesQuery,
    productsQuery,
  };
}
