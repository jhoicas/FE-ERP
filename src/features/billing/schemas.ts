import { z } from "zod";

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  prefix: z.string(),
  date: z.string(),
  grand_total: z.number(),
  dian_status: z.enum(["Sent", "Error", "DRAFT", "Pending"]),
  customer_name: z.string().optional(),
});

export type InvoiceDTO = z.infer<typeof InvoiceSchema>;

export const CreditNoteSchema = z.object({
  id: z.string(),
  number: z.string(),
  related_invoice_id: z.string(),
  amount: z.number(),
  reason: z.string(),
});

export type CreditNoteDTO = z.infer<typeof CreditNoteSchema>;

