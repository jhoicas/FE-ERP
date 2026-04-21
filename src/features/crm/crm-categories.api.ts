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
    is_active: z.coerce.boolean().optional(),
    created_at: z.string(),
  })
  .passthrough();

function parseCategory(data: unknown): CrmCategoryProductHub {
  const c = crmCategoryHubSchema.parse(data);
  return {
    id: c.id,
    name: c.name,
    is_active: c.is_active ?? true,
    created_at: c.created_at,
  };
}

export type CrmCategoryHubListResult = {
  items: CrmCategoryProductHub[];
  total: number;
  limit: number;
  offset: number;
};

function parseCategoryHubListResponse(
  data: unknown,
  requestedLimit: number,
  requestedOffset: number,
): CrmCategoryHubListResult {
  if (Array.isArray(data)) {
    const items = data.map(parseCategory);
    return {
      items,
      total: items.length,
      limit: requestedLimit,
      offset: requestedOffset,
    };
  }
  const record = data as {
    items?: unknown;
    data?: unknown;
    rows?: unknown;
    total?: unknown;
    limit?: unknown;
    offset?: unknown;
  };
  const raw = record.items ?? record.data ?? record.rows ?? [];
  const items = Array.isArray(raw) ? raw.map(parseCategory) : [];
  const total = typeof record.total === "number" ? record.total : items.length;
  const limit = typeof record.limit === "number" ? record.limit : requestedLimit;
  const offset = typeof record.offset === "number" ? record.offset : requestedOffset;
  return { items, total, limit, offset };
}

export async function listCrmCategoriesHub(params?: {
  limit?: number;
  offset?: number;
  /** Filtrar por nombre (si el backend lo soporta). */
  search?: string;
  /** Filtrar por estado (si el backend lo soporta). */
  is_active?: boolean;
}): Promise<CrmCategoryHubListResult> {
  const limit = params?.limit ?? 500;
  const offset = params?.offset ?? 0;
  try {
    const queryParams: Record<string, string | number | boolean | undefined> = { limit, offset };
    const s = params?.search?.trim();
    if (s) queryParams.search = s;
    if (typeof params?.is_active === "boolean") queryParams.is_active = params.is_active;

    const { data } = await apiClient.get(BASE, { params: queryParams });
    return parseCategoryHubListResponse(data, limit, offset);
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

