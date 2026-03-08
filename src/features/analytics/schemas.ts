import { z } from "zod";

export const MarginByChannelSchema = z.object({
  channel_id: z.string(),
  channel_name: z.string(),
  gross_revenue: z.number(),
  total_cogs: z.number(),
  total_margin: z.number(),
  margin_pct: z.number(),
});

export type MarginByChannelDTO = z.infer<typeof MarginByChannelSchema>;

export const SKURankingSchema = z.object({
  sku: z.string(),
  product_name: z.string(),
  units_sold: z.number(),
  gross_revenue: z.number(),
  margin_pct: z.number(),
});

export type SKURankingDTO = z.infer<typeof SKURankingSchema>;

export const MarginsReportSchema = z.object({
  channel_profitability: z.array(MarginByChannelSchema),
  sku_ranking: z.array(SKURankingSchema),
  pareto_skus: z.array(z.string()),
});

export type MarginsReportDTO = z.infer<typeof MarginsReportSchema>;

