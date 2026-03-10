import { z } from "zod";

/**
 * Esquemas Zod para los bodies de las peticiones del módulo CRM.
 * Tipos inferidos exportados para uso en servicios.
 */

export const createTaskSchema = z.object({
  customer_id: z.string().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  due_at: z.coerce.date().optional().nullable(),
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  due_at: z.coerce.date().optional().nullable(),
  status: z.enum(["pending", "done", "cancelled"]).optional(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

export const createInteractionSchema = z.object({
  customer_id: z.string().min(1, "El cliente es obligatorio"),
  type: z.enum(["call", "email", "meeting", "other"]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export type CreateInteractionRequest = z.infer<typeof createInteractionSchema>;

export const createTicketSchema = z.object({
  customer_id: z.string().min(1, "El cliente es obligatorio"),
  subject: z.string().min(1, "El asunto es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

export type CreateTicketRequest = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
});

export type UpdateTicketRequest = z.infer<typeof updateTicketSchema>;

export const assignCategorySchema = z.object({
  category_id: z
    .union([z.string().min(1, "La categoría es obligatoria"), z.literal("")])
    .transform((v) => (v === "" ? undefined : v)),
  ltv: z.union([z.string(), z.number()]).transform((v) => (typeof v === "string" ? parseFloat(v) : v)),
});

export type AssignCategoryRequest = z.infer<typeof assignCategorySchema>;

export const campaignCopySchema = z.object({
  prompt: z.string().min(1, "El prompt es obligatorio"),
});

export type CampaignCopyRequest = z.infer<typeof campaignCopySchema>;

export const summarizeTimelineSchema = z.object({
  customer_id: z.string().min(1, "El ID de cliente es obligatorio"),
});

export type SummarizeTimelineRequest = z.infer<typeof summarizeTimelineSchema>;

export const createCustomerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
}).transform((v) => ({
  name: v.name,
  email: v.email === "" ? undefined : v.email,
  phone: v.phone || undefined,
  tax_id: v.tax_id || undefined,
}));

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
}).transform((v) => ({
  ...v,
  email: v.email === "" ? undefined : v.email,
}));

export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;

export const createBenefitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

export type CreateBenefitRequest = z.infer<typeof createBenefitSchema>;

export const updateBenefitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  description: z.string().min(1, "La descripción es obligatoria").optional(),
});

export type UpdateBenefitRequest = z.infer<typeof updateBenefitSchema>;
