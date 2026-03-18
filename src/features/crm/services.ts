import axios from "axios";
import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
  CampaignTemplate,
  Profile360Response,
  CategoryResponse,
  BenefitResponse,
  TaskResponse,
  TaskResponseList,
  InteractionResponse,
  TicketResponse,
  TicketResponseList,
} from "@/types/crm";
import {
  createTaskSchema,
  updateTaskSchema,
  createInteractionSchema,
  createTicketSchema,
  updateTicketSchema,
  assignCategorySchema,
  campaignCopySchema,
  summarizeTimelineSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createBenefitSchema,
  createCategorySchema,
  updateBenefitSchema,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type CreateInteractionRequest,
  type CreateTicketRequest,
  type UpdateTicketRequest,
  type AssignCategoryRequest,
  type CreateCustomerRequest,
  type UpdateCustomerRequest,
  type CreateBenefitRequest,
  type CreateCategoryRequest,
  type SendCampaignRequest,
  type UpdateBenefitRequest,
  sendCampaignSchema,
} from "@/lib/validations/crm";
import { z } from "zod";
import { CustomerSchema, CustomerListResponseSchema, type CustomerDTO, type CustomerListResponse } from "./schemas";

const CampaignTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  created_at: z.string(),
}).passthrough();

const CRM_BASE = "/api/crm";
const CUSTOMERS_BASE = "/api/customers";

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export async function listCustomers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<CustomerListResponse> {
  const { data } = await apiClient.get(CUSTOMERS_BASE, {
    params: {
      limit: params?.limit ?? 10,
      offset: params?.offset ?? 0,
      search: params?.search,
    },
  });
  if (Array.isArray(data)) {
    const items = z.array(CustomerSchema).parse(data);
    return { items, total: items.length };
  }
  return CustomerListResponseSchema.parse(data);
}

export async function getCustomers(): Promise<CustomerDTO[]> {
  const response = await apiClient.get(CUSTOMERS_BASE);
  return z.array(CustomerSchema).parse(response.data);
}

export async function createCustomer(body: CreateCustomerRequest): Promise<CustomerDTO> {
  const payload = createCustomerSchema.parse(body);
  try {
    const { data } = await apiClient.post<CustomerDTO>(CUSTOMERS_BASE, payload);
    return CustomerSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCustomer(
  customerId: string,
  body: UpdateCustomerRequest
): Promise<CustomerDTO> {
  const payload = updateCustomerSchema.parse(body);
  try {
    const { data } = await apiClient.put<CustomerDTO>(
      `${CUSTOMERS_BASE}/${customerId}`,
      payload
    );
    return CustomerSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getProfile360(customerId: string): Promise<Profile360Response> {
  try {
    const { data } = await apiClient.get<Profile360Response>(
      `${CRM_BASE}/customers/${customerId}/profile360`
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function assignCategory(
  customerId: string,
  body: AssignCategoryRequest
): Promise<{ status: string }> {
  const payload = assignCategorySchema.parse(body);
  try {
    const { data } = await apiClient.put<{ status: string }>(
      `${CRM_BASE}/customers/${customerId}/category`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createBenefit(
  categoryId: string,
  body: CreateBenefitRequest,
): Promise<BenefitResponse> {
  const payload = createBenefitSchema.parse(body);
  try {
    const { data } = await apiClient.post<BenefitResponse>(
      `${CRM_BASE}/categories/${categoryId}/benefits`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCategory(
  body: CreateCategoryRequest,
): Promise<CategoryResponse> {
  const payload = createCategorySchema.parse(body);
  try {
    const { data } = await apiClient.post<CategoryResponse>(
      `${CRM_BASE}/categories`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCategory(
  categoryId: string,
  body: CreateCategoryRequest,
): Promise<CategoryResponse> {
  const payload = createCategorySchema.parse(body);
  try {
    const { data } = await apiClient.put<CategoryResponse>(
      `${CRM_BASE}/categories/${categoryId}`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateBenefit(
  benefitId: string,
  body: UpdateBenefitRequest,
): Promise<BenefitResponse> {
  const payload = updateBenefitSchema.parse(body);
  try {
    const { data } = await apiClient.put<BenefitResponse>(
      `${CRM_BASE}/benefits/${benefitId}`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listCategories(params?: {
  limit?: number;
  offset?: number;
}): Promise<CategoryResponse[]> {
  try {
    const { data } = await apiClient.get<CategoryResponse[]>(`${CRM_BASE}/categories`, {
      params: { limit: params?.limit, offset: params?.offset },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listBenefitsByCategory(
  categoryId: string,
  params?: { limit?: number; offset?: number }
): Promise<BenefitResponse[]> {
  try {
    const { data } = await apiClient.get<BenefitResponse[]>(
      `${CRM_BASE}/categories/${categoryId}/benefits`,
      { params: { limit: params?.limit, offset: params?.offset } }
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createTask(body: CreateTaskRequest): Promise<TaskResponse> {
  const payload = createTaskSchema.parse(body);
  const serialized = {
    ...payload,
    due_at: payload.due_at != null ? payload.due_at.toISOString() : null,
  };
  try {
    const { data } = await apiClient.post<TaskResponse>(`${CRM_BASE}/tasks`, serialized);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listTasks(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  customer_id?: string;
}): Promise<TaskResponseList> {
  try {
    const { data } = await apiClient.get<TaskResponseList>(`${CRM_BASE}/tasks`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        customer_id: params?.customer_id,
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getTask(id: string): Promise<TaskResponse> {
  try {
    const { data } = await apiClient.get<TaskResponse>(`${CRM_BASE}/tasks/${id}`);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateTask(id: string, body: UpdateTaskRequest): Promise<TaskResponse> {
  const payload = updateTaskSchema.parse(body);
  const serialized = {
    ...payload,
    due_at: payload.due_at != null ? payload.due_at.toISOString() : undefined,
  };
  try {
    const { data } = await apiClient.put<TaskResponse>(`${CRM_BASE}/tasks/${id}`, serialized);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createInteraction(
  body: CreateInteractionRequest
): Promise<InteractionResponse> {
  const payload = createInteractionSchema.parse(body);
  try {
    const { data } = await apiClient.post<InteractionResponse>(
      `${CRM_BASE}/interactions`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createTicket(body: CreateTicketRequest): Promise<TicketResponse> {
  const payload = createTicketSchema.parse(body);
  try {
    const { data } = await apiClient.post<TicketResponse>(`${CRM_BASE}/tickets`, payload);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listTickets(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  sort?: string;
}): Promise<TicketResponseList> {
  try {
    const { data } = await apiClient.get<TicketResponseList>(`${CRM_BASE}/tickets`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        search: params?.search,
        sort: params?.sort,
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getTicket(id: string): Promise<TicketResponse> {
  try {
    const { data } = await apiClient.get<TicketResponse>(`${CRM_BASE}/tickets/${id}`);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateTicket(
  id: string,
  body: UpdateTicketRequest
): Promise<TicketResponse> {
  const payload = updateTicketSchema.parse(body);
  try {
    const { data } = await apiClient.put<TicketResponse>(`${CRM_BASE}/tickets/${id}`, payload);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function generateCampaignCopy(body: { prompt: string }): Promise<{ text: string }> {
  const payload = campaignCopySchema.parse(body);
  try {
    const { data } = await apiClient.post<{ text: string }>(
      `${CRM_BASE}/ai/campaign-copy`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function summarizeTimeline(body: {
  customer_id: string;
}): Promise<{ summary: string }> {
  const payload = summarizeTimelineSchema.parse(body);
  try {
    const { data } = await apiClient.post<{ summary: string }>(
      `${CRM_BASE}/ai/summarize-timeline`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function sendCampaign(body: SendCampaignRequest): Promise<{ status: string }> {
  const payload = sendCampaignSchema.parse(body);
  try {
    const { data } = await apiClient.post<{ status: string }>(`${CRM_BASE}/campaigns/send`, payload);
    return z.object({ status: z.string() }).parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getCampaignTemplates(): Promise<CampaignTemplate[]> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/campaign-templates`, {
      params: { limit: 100, offset: 0 },
    });

    if (Array.isArray(data)) {
      return z.array(CampaignTemplateSchema).parse(data);
    }

    if (data && Array.isArray((data as { items?: unknown[] }).items)) {
      return z.array(CampaignTemplateSchema).parse((data as { items: unknown[] }).items);
    }

    return [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCampaignTemplate(body: {
  name: string;
  subject: string;
  body: string;
}): Promise<CampaignTemplate> {
  const payload = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
  }).parse(body);

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/campaign-templates`, payload);
    return CampaignTemplateSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

/** Compatibilidad: devuelve solo los items de tareas (lista plana). */
export async function getTasks(): Promise<TaskResponse[]> {
  const result = await listTasks({});
  return result.items;
}

/** Compatibilidad: devuelve solo los items de tickets (lista plana). */
export async function getTickets(): Promise<TicketResponse[]> {
  const result = await listTickets({});
  return result.items;
}

// ===========================
// Desactivation functions
// ===========================

export async function deactivateCrmCategory(categoryId: string): Promise<void> {
  try {
    await apiClient.put(`${CRM_BASE}/categories/${categoryId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deactivateCustomer(customerId: string): Promise<void> {
  try {
    await apiClient.put(`${CUSTOMERS_BASE}/${customerId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deactivateSupplier(supplierId: string): Promise<void> {
  try {
    await apiClient.put(`/api/suppliers/${supplierId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}
