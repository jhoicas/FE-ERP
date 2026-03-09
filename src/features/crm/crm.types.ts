import { z } from "zod";

/**
 * Tipos TypeScript y esquemas Zod del módulo CRM,
 * alineados 1:1 con los DTOs del backend Go.
 *
 * Prefijo de rutas: /api/crm
 */

// -----------------------------
// Tipos base y helpers
// -----------------------------

export interface ErrorResponse {
  code: string;
  message: string;
}

export type CrmTaskStatus = "pending" | "done" | "cancelled" | (string & {});

export type CrmInteractionType = "call" | "email" | "meeting" | "other";

/**
 * Tipo genérico para Customer usado en Profile360.
 * TODO: alinear con estructura real del backend.
 */
export interface CustomerResponse {
  id: string;
  name: string;
  email?: string;
  // TODO: añadir campos como tax_id, phone, etc. cuando el backend los exponga aquí.
  [key: string]: unknown;
}

// -----------------------------
// DTOs de requests
// -----------------------------

// CreateTaskRequest (POST /api/crm/tasks)
export interface CreateTaskRequest {
  customer_id?: string | null;
  title: string;
  description?: string;
  due_at?: string | null; // ISO-8601, puede ser null
}

// UpdateTaskRequest (PUT /api/crm/tasks/{id})
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_at?: string | null;
  status?: CrmTaskStatus;
}

// CreateInteractionRequest (POST /api/crm/interactions)
export interface CreateInteractionRequest {
  customer_id: string;
  type: CrmInteractionType;
  subject?: string;
  body?: string;
}

// CreateTicketRequest (POST /api/crm/tickets)
export interface CreateTicketRequest {
  customer_id: string;
  subject: string;
  description: string;
}

// UpdateTicketRequest (PUT /api/crm/tickets/{id})
export interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  status?: string;
  sentiment?: string;
}

// AssignCategoryRequest (PUT /api/crm/customers/{id}/category)
export interface AssignCategoryRequest {
  category_id: string;
  ltv: string; // decimal como string
}

// IA requests
export interface CampaignCopyRequest {
  prompt: string;
}

export interface SummarizeTimelineRequest {
  customer_id: string;
}

// -----------------------------
// DTOs de responses
// -----------------------------

export interface BenefitResponse {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Profile360Response {
  customer: CustomerResponse;
  profile_id: string;
  category_id: string;
  category_name?: string;
  ltv: string;
  benefits?: BenefitResponse[];
}

export interface CategoryResponse {
  id: string;
  company_id: string;
  name: string;
  min_ltv: string;
  created_at: string;
  updated_at: string;
}

export interface TaskResponse {
  id: string;
  company_id: string;
  customer_id: string;
  title: string;
  description: string;
  due_at: string | null;
  status: CrmTaskStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskResponseList {
  items: TaskResponse[];
  limit: number;
  offset: number;
}

export interface InteractionResponse {
  id: string;
  company_id: string;
  customer_id: string;
  type: CrmInteractionType;
  subject: string;
  body: string;
  created_by: string;
  created_at: string;
}

export interface TicketResponse {
  id: string;
  company_id: string;
  customer_id: string;
  subject: string;
  description: string;
  status: string;
  sentiment: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TicketResponseList {
  items: TicketResponse[];
  limit: number;
  offset: number;
}

export interface TaskAlert {
  product_id: string;
  product_name: string;
  reason: string;
}

export interface CampaignCopyResponse {
  text: string;
}

export interface SummarizeTimelineResponse {
  summary: string;
}

// -----------------------------
// Zod schemas – requests
// -----------------------------

export const createTaskRequestSchema = z.object({
  customer_id: z.string().nullable().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  due_at: z.string().datetime().nullable().optional(),
});

export const updateTaskRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  due_at: z.string().datetime().nullable().optional(),
  status: z.enum(["pending", "done", "cancelled"]).optional(),
});

export const createInteractionRequestSchema = z.object({
  customer_id: z.string().min(1, "El cliente es obligatorio"),
  type: z.enum(["call", "email", "meeting", "other"]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export const createTicketRequestSchema = z.object({
  customer_id: z.string().min(1, "El cliente es obligatorio"),
  subject: z.string().min(1, "El asunto es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

export const updateTicketRequestSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  sentiment: z.string().optional(),
});

export const assignCategoryRequestSchema = z.object({
  category_id: z.string().min(1, "La categoría es obligatoria"),
  ltv: z.string().min(1, "El LTV es obligatorio"),
});

export const campaignCopyRequestSchema = z.object({
  prompt: z.string().min(1, "El prompt es obligatorio"),
});

export const summarizeTimelineRequestSchema = z.object({
  customer_id: z.string().min(1, "El ID de cliente es obligatorio"),
});

// -----------------------------
// Zod schemas – responses
// -----------------------------

export const customerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export const benefitResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  category_id: z.string(),
  name: z.string(),
  description: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const profile360ResponseSchema = z.object({
  customer: customerResponseSchema,
  profile_id: z.string(),
  category_id: z.string(),
  category_name: z.string().optional(),
  ltv: z.string(),
  benefits: z.array(benefitResponseSchema).optional(),
});

export const categoryResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  min_ltv: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const taskResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  customer_id: z.string(),
  title: z.string(),
  description: z.string(),
  due_at: z.string().nullable(),
  status: z.string(), // backend acepta string genérico
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const taskResponseListSchema = z.object({
  items: z.array(taskResponseSchema),
  limit: z.number(),
  offset: z.number(),
});

export const interactionResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  customer_id: z.string(),
  type: z.enum(["call", "email", "meeting", "other"]),
  subject: z.string(),
  body: z.string(),
  created_by: z.string(),
  created_at: z.string(),
});

export const ticketResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  customer_id: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.string(),
  sentiment: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ticketResponseListSchema = z.object({
  items: z.array(ticketResponseSchema),
  limit: z.number(),
  offset: z.number(),
});

export const campaignCopyResponseSchema = z.object({
  text: z.string(),
});

export const summarizeTimelineResponseSchema = z.object({
  summary: z.string(),
});

// -----------------------------
// Helpers para decimales (LTV, min_ltv, etc.)
// -----------------------------

export function decimalStringToNumber(value: string): number | null {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function formatCurrencyFromDecimalString(
  value: string,
  locale: string = "es-CO",
  currency: string = "COP",
): string {
  const n = decimalStringToNumber(value);
  if (n == null) return value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

