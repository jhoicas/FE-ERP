import { z } from "zod";

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  customer_name: z.string(),
  date: z.string(),
  grand_total: z.number(),
  dian_status: z.string(),
});

export type InvoiceDTO = z.infer<typeof InvoiceSchema>;
