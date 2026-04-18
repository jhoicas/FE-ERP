import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAutomation,
  deleteAutomation,
  getAutomations,
  updateAutomation,
} from "@/features/crm/services";
import type {
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "@/features/crm/crm.types";

export const AUTOMATIONS_QUERY_KEY = ["crm", "automations"] as const;

export function useAutomations() {
  return useQuery({
    queryKey: AUTOMATIONS_QUERY_KEY,
    queryFn: getAutomations,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAutomationRequest) => createAutomation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ automationId, payload }: { automationId: string; payload: UpdateAutomationRequest }) =>
      updateAutomation(automationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (automationId: string) => deleteAutomation(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_QUERY_KEY });
    },
  });
}
