import apiClient from "@/lib/api/client";
import { MarginsReportSchema, type MarginsReportDTO } from "./schemas";

export async function getMarginsReport(): Promise<MarginsReportDTO> {
  const response = await apiClient.get("/api/analytics/margins");
  const parsed = MarginsReportSchema.parse(response.data);
  return parsed;
}

/** CRM: un solo GET `/api/crm/analytics` — ver `getCrmAnalytics` en `@/features/crm/services`. */
export { getCrmAnalytics } from "@/features/crm/services";

