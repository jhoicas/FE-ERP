import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  tax_id: z.string().optional(),
  category_name: z.string(),
  ltv: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type CustomerDTO = z.infer<typeof CustomerSchema>;

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

