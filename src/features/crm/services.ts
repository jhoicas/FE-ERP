import axios from "axios";
import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
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
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type CreateInteractionRequest,
  type CreateTicketRequest,
  type UpdateTicketRequest,
  type AssignCategoryRequest,
} from "@/lib/validations/crm";
import { z } from "zod";
import { CustomerSchema, type CustomerDTO } from "./schemas";

const CRM_BASE = "/api/crm";

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export async function getCustomers(): Promise<CustomerDTO[]> {
  const response = await apiClient.get("/api/customers");
  return z.array(CustomerSchema).parse(response.data);
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
}): Promise<TaskResponseList> {
  try {
    const { data } = await apiClient.get<TaskResponseList>(`${CRM_BASE}/tasks`, {
      params: { limit: params?.limit, offset: params?.offset, status: params?.status },
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
}): Promise<TicketResponseList> {
  try {
    const { data } = await apiClient.get<TicketResponseList>(`${CRM_BASE}/tickets`, {
      params: { limit: params?.limit, offset: params?.offset },
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
