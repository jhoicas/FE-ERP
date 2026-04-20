import { z } from "zod";

/**
 * Analítica CRM (`/api/crm/analytics`): los esquemas y DTO viven en `@/features/crm/schemas`
 * y la normalización en `getCrmAnalytics` (`@/features/crm/services`).
 */

// API returns numeric fields as strings — use z.coerce.number() throughout
export const MarginByChannelSchema = z.object({
  channel_id: z.string(),
  channel_name: z.string(),
  channel_type: z.string().optional(),
  commission_rate: z.coerce.number().optional(),
  invoice_count: z.number().optional(),
  units_sold: z.coerce.number().optional(),
  gross_revenue: z.coerce.number(),
  total_cogs: z.coerce.number(),
  commission_cost: z.coerce.number().optional(),
  logistics_cost: z.coerce.number().optional(),
  discount_total: z.coerce.number().optional(),
  total_margin: z.coerce.number(),
  margin_pct: z.coerce.number(),
  revenue_pct: z.coerce.number().optional(),
});

export type MarginByChannelDTO = z.infer<typeof MarginByChannelSchema>;

export const SKURankingSchema = z.object({
  rank: z.number().optional(),
  product_id: z.string().optional(),
  sku: z.string(),
  product_name: z.string(),
  units_sold: z.coerce.number(),
  gross_revenue: z.coerce.number(),
  total_cogs: z.coerce.number().optional(),
  gross_profit: z.coerce.number().optional(),
  margin_pct: z.coerce.number(),
  revenue_pct: z.coerce.number().optional(),
  cumulative_revenue_pct: z.coerce.number().optional(),
  is_top_pareto: z.boolean().optional(),
});

export type SKURankingDTO = z.infer<typeof SKURankingSchema>;

// The API returns channel_profitability as an object wrapper containing a `channels` array.
// We transform it so that the rest of the app can treat it as a plain array.
const ChannelProfitabilityWrapperSchema = z.object({
  total_revenue: z.coerce.number().optional(),
  total_cogs: z.coerce.number().optional(),
  total_margin: z.coerce.number().optional(),
  overall_margin_pct: z.coerce.number().optional(),
  channels: z.array(MarginByChannelSchema),
});

export const MarginsReportSchema = z.object({
  period: z
    .object({ start_date: z.string(), end_date: z.string() })
    .optional(),
  channel_profitability: ChannelProfitabilityWrapperSchema.transform(
    (cp) => cp.channels
  ),
  sku_ranking: z.array(SKURankingSchema),
  pareto_skus: z.array(SKURankingSchema).nullable().transform((value) => value ?? []),
});

export type MarginsReportDTO = z.infer<typeof MarginsReportSchema>;

