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

export const DebitNoteSchema = z
  .object({
    id: z.string(),
    number: z.string().optional(),
    related_invoice_id: z.string().optional(),
    amount: z.number().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

export type DebitNoteDTO = z.infer<typeof DebitNoteSchema>;

export const CustomerLookupSchema = z
  .object({
    id_type: z.string().optional(),
    id_number: z.string().optional(),
    company_name: z.string().optional(),
    trade_name: z.string().optional(),
    first_name: z.string().optional(),
    second_name: z.string().optional(),
    surname: z.string().optional(),
    second_surname: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export type CustomerLookupDTO = z.infer<typeof CustomerLookupSchema>;

