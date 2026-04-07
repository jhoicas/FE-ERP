import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  category_name: z.string().optional(),
  ltv: z.number().optional(),
  segment: z.string().optional(),
  total_purchased: z.number().optional(),
  main_category: z.string().optional(),
  remarketing_action: z.string().optional(),
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

