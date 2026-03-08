import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  category_name: z.string(),
});

export type CustomerDTO = z.infer<typeof CustomerSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: z.string(),
  sentiment: z.string(),
});

export type TicketDTO = z.infer<typeof TicketSchema>;
