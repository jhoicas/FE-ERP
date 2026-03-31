import apiClient from "@/lib/api/client";
import { MarginsReportSchema, type MarginsReportDTO } from "./schemas";

export async function getMarginsReport(): Promise<MarginsReportDTO> {
  const response = await apiClient.get("/api/analytics/margins");
  const parsed = MarginsReportSchema.parse(response.data);
  return parsed;
}

export async function getCrmAnalytics() {
  const response = await apiClient.get("/api/crm/analytics");
  return response.data;
}

