import axios from "axios";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
  CreateCrmCategoryHubRequest,
  CrmCategoryProductHub,
  UpdateCrmCategoryHubRequest,
} from "@/features/crm/crm-hub.types";

const BASE = "/api/crm/categories-hub";

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export const crmCategoryHubSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
  })
  .passthrough();

function parseCategory(data: unknown): CrmCategoryProductHub {
  const c = crmCategoryHubSchema.parse(data);
  return {
    id: c.id,
    name: c.name,
    created_at: c.created_at,
  };
}

function parseList(data: unknown): CrmCategoryProductHub[] {
  if (Array.isArray(data)) {
    return data.map(parseCategory);
  }
  const record = data as { items?: unknown; data?: unknown; rows?: unknown };
  const raw = record.items ?? record.data ?? record.rows ?? [];
  return Array.isArray(raw) ? raw.map(parseCategory) : [];
}

export async function listCrmCategoriesHub(params?: {
  limit?: number;
  offset?: number;
}): Promise<CrmCategoryProductHub[]> {
  try {
    const { data } = await apiClient.get(BASE, {
      params: { limit: params?.limit ?? 500, offset: params?.offset ?? 0 },
    });
    return parseList(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCrmCategoryHub(body: CreateCrmCategoryHubRequest): Promise<CrmCategoryProductHub> {
  try {
    const { data } = await apiClient.post(BASE, body);
    return parseCategory(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCrmCategoryHub(
  id: string,
  body: UpdateCrmCategoryHubRequest,
): Promise<CrmCategoryProductHub> {
  try {
    const { data } = await apiClient.patch(`${BASE}/${id}`, body);
    return parseCategory(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deleteCrmCategoryHub(id: string): Promise<void> {
  try {
    await apiClient.delete(`${BASE}/${id}`);
  } catch (error) {
    return throwOnApiError(error);
  }
}
