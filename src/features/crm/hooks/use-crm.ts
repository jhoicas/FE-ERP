import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  GetAuditLogsParams,
  UpdateCampaignRequest,
  UpdateCampaignTemplateRequest,
} from "@/features/crm/crm.types";
import {
  createCampaignTemplate,
  getAuditLogs,
  getCampaignTemplates,
  importSales,
  updateCampaign,
  updateTemplate,
} from "@/features/crm/services";

export const CRM_TEMPLATES_QUERY_KEY = ["crm", "campaign-templates"] as const;
export const CRM_AUDIT_LOGS_QUERY_KEY = ["crm", "audit-logs"] as const;
export const CRM_CAMPAIGNS_QUERY_KEY = ["crm", "campaigns", "list"] as const;

export function useCampaignTemplates() {
  return useQuery({
    queryKey: CRM_TEMPLATES_QUERY_KEY,
    queryFn: getCampaignTemplates,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaignTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: UpdateCampaignTemplateRequest }) =>
      updateTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, payload }: { campaignId: string; payload: UpdateCampaignRequest }) =>
      updateCampaign(campaignId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CAMPAIGNS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["crm", "campaigns"] });
    },
  });
}

export function useAuditLogs(params?: GetAuditLogsParams) {
  return useQuery({
    queryKey: [
      ...CRM_AUDIT_LOGS_QUERY_KEY,
      params?.start_date ?? "",
      params?.end_date ?? "",
      params?.user_id ?? "",
      params?.entity ?? "",
      params?.limit ?? 20,
      params?.offset ?? 0,
    ],
    queryFn: () => getAuditLogs(params),
  });
}

export function useImportSales() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => importSales(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      await queryClient.invalidateQueries({ queryKey: ["crm", "analytics"] });
    },
  });

  return {
    ...mutation,
    isLoading: mutation.isPending,
  };
}
