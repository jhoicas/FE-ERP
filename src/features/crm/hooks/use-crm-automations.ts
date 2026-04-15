import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCrmAutomation,
  deleteCrmAutomation,
  listCrmAutomations,
  updateCrmAutomation,
} from "@/features/crm/services";
import type { CreateCrmAutomationRequest, CrmAutomation, UpdateCrmAutomationRequest } from "@/features/crm/crm.types";

const AUTOMATIONS_QUERY_KEY = ["crm", "automations"] as const;

export function useCrmAutomations() {
  const queryClient = useQueryClient();

  const automationsQuery = useQuery({
    queryKey: AUTOMATIONS_QUERY_KEY,
    queryFn: listCrmAutomations,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCrmAutomationRequest) => createCrmAutomation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ automationId, payload }: { automationId: string; payload: UpdateCrmAutomationRequest }) =>
      updateCrmAutomation(automationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (automationId: string) => deleteCrmAutomation(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ automation }: { automation: CrmAutomation }) =>
      updateCrmAutomation(automation.id, { is_active: !automation.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });

  return {
    automationsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleMutation,
  };
}
