/**
 * Tipos TypeScript del módulo CRM alineados con el backend NaturERP.
 * Prefijo de rutas: /api/crm
 */

export interface CustomerResponse {
  id: string;
  company_id: string;
  name: string;
  tax_id: string;
  email?: string;
  phone?: string;
  categoryName?: string;
  category_name?: string | null;
  ltv?: number;
}

export interface BenefitResponse {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileMetadata {
  ordersCount?: number;
  mainCategory?: string;
  productsList?: string;
  distinctProducts?: number;
  followUpStrategy?: string;
  lastPurchaseDate?: string;
}

export interface CRMCustomerProfile extends CustomerResponse {
  metadata?: ProfileMetadata;
}

export interface Profile360Response {
  customer: CRMCustomerProfile;
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
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
}

export interface TaskResponse {
  id: string;
  company_id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  status: "pending" | "done" | "cancelled";
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
  type: "call" | "email" | "meeting" | "other";
  subject: string | null;
  body: string | null;
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

export interface ApiError {
  code: string;
  message: string;
}

export function isApiError(data: unknown): data is ApiError {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    "message" in data &&
    typeof (data as ApiError).code === "string" &&
    typeof (data as ApiError).message === "string"
  );
}
