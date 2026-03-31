import apiClient from "@/lib/api/client";
import { MarginsReportSchema, type MarginsReportDTO } from "./schemas";

export async function getMarginsReport(): Promise<MarginsReportDTO> {
  const response = await apiClient.get("/api/analytics/margins");
  const parsed = MarginsReportSchema.parse(response.data);
  return parsed;
}

export async function getCrmAnalytics() {
  const [kpisResponse, segmentationResponse, monthlyEvolutionResponse] = await Promise.all([
    apiClient.get("/api/crm/analytics/kpis"),
    apiClient.get("/api/crm/analytics/segmentation"),
    apiClient.get("/api/crm/analytics/monthly-evolution"),
  ]);

  return {
    kpis: kpisResponse.data,
    segmentation: segmentationResponse.data,
    monthlyEvolution: monthlyEvolutionResponse.data,
  };
}

