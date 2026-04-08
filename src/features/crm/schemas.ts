import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  categoryName: z.string().optional(),
  category_name: z.string().nullable().optional(),
  ltv: z.coerce.number().optional(),
  segment: z.string().optional(),
  total_purchased: z.number().optional(),
  main_category: z.string().optional(),
  remarketing_action: z.string().optional(),
  metadata: z
    .object({
      ordersCount: z.number().optional(),
      mainCategory: z.string().optional(),
      productsList: z.string().optional(),
      distinctProducts: z.number().optional(),
      followUpStrategy: z.string().optional(),
      lastPurchaseDate: z.string().optional(),
    })
    .partial()
    .optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type CustomerDTO = z.infer<typeof CustomerSchema>;

export const CustomerListResponseSchema = z.object({
  items: z.array(CustomerSchema),
  total: z.number().optional(),
});

export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.enum(["open", "resolved"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type TicketDTO = z.infer<typeof TicketSchema>;

export const CrmTaskSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable(),
  title: z.string(),
  due_date: z.string(),
  status: z.enum(["pending", "done", "cancelled"]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type CrmTaskDTO = z.infer<typeof CrmTaskSchema>;

export const CrmSegmentSchema = z.enum(["VIP", "PREMIUM", "RECURRENTE", "OCASIONAL"]);
export type CrmSegment = z.infer<typeof CrmSegmentSchema>;

export const CrmAnalyticsKpisSchema = z.object({
  totalClientes: z.coerce.number(),
  ventasTotales: z.coerce.number(),
  ticketPromedio: z.coerce.number(),
  clientesVip: z.coerce.number(),
});

export type CrmAnalyticsKpisDTO = z.infer<typeof CrmAnalyticsKpisSchema>;

export const CrmAnalyticsMonthlySchema = z.object({
  mes: z.string(),
  ventas: z.coerce.number(),
});

export type CrmAnalyticsMonthlyDTO = z.infer<typeof CrmAnalyticsMonthlySchema>;

export const CrmAnalyticsSegmentationSchema = z.object({
  segmento: CrmSegmentSchema,
  clientes: z.coerce.number(),
  porcentaje: z.union([z.string(), z.number()]).transform((value) =>
    typeof value === "number" ? `${value}%` : value,
  ),
  ventasTotales: z.coerce.number(),
  ticketPromedio: z.coerce.number(),
  accion: z.string(),
});

export type CrmAnalyticsSegmentationDTO = z.infer<typeof CrmAnalyticsSegmentationSchema>;

export const CrmAnalyticsSchema = z.object({
  kpis: CrmAnalyticsKpisSchema,
  evolucionMensual: z.array(CrmAnalyticsMonthlySchema),
  segmentacion: z.array(CrmAnalyticsSegmentationSchema),
});

export type CrmAnalyticsDTO = z.infer<typeof CrmAnalyticsSchema>;

export const RemarketingProspectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  segmento: CrmSegmentSchema,
  nombre: z.string(),
  email: z.string(),
  totalComprado: z.coerce.number(),
  categoria: z.string(),
  mensajeSugerido: z.string(),
});

export type RemarketingProspectDTO = z.infer<typeof RemarketingProspectSchema>;

