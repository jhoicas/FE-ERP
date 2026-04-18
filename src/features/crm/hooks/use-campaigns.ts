import { useMutation, useQueryClient } from "@tanstack/react-query";

import { triggerCampaignWorker } from "@/features/crm/services";

const CAMPAIGNS_QUERY_KEY = ["crm", "campaigns"] as const;

export function useTriggerCampaignWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerCampaignWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    },
  });
}
