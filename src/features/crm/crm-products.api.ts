import axios from "axios";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
  CreateCrmProductHubRequest,
  CrmProductHub,
  UpdateCrmProductHubRequest,
} from "@/features/crm/crm-hub.types";

const BASE = "/api/crm/products-hub";

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export const crmProductHubSchema = z
  .object({
    id: z.string(),
    category_id: z.string().nullable().optional(),
    product_code: z.string(),
    product_name: z.string(),
    unit_cost: z.union([z.string(), z.number(), z.null()]),
    is_active: z.coerce.boolean(),
    created_at: z.string(),
  })
  .passthrough();

export type CrmProductHubParsed = z.infer<typeof crmProductHubSchema>;

function parseProduct(data: unknown): CrmProductHub {
  const p = crmProductHubSchema.parse(data);
  return {
    id: p.id,
    category_id: p.category_id ?? null,
    product_code: p.product_code,
    product_name: p.product_name,
    unit_cost: p.unit_cost,
    is_active: p.is_active,
    created_at: p.created_at,
  };
}

export type CrmProductHubListResult = {
  items: CrmProductHub[];
  total: number;
  limit: number;
  offset: number;
};

function parseProductHubListResponse(
  data: unknown,
  requestedLimit: number,
  requestedOffset: number,
): CrmProductHubListResult {
  if (Array.isArray(data)) {
    const items = data.map(parseProduct);
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
  const items = Array.isArray(raw) ? raw.map(parseProduct) : [];
  const total = typeof record.total === "number" ? record.total : items.length;
  const limit = typeof record.limit === "number" ? record.limit : requestedLimit;
  const offset = typeof record.offset === "number" ? record.offset : requestedOffset;
  return { items, total, limit, offset };
}

export async function listCrmProductsHub(params?: {
  limit?: number;
  offset?: number;
  /** Búsqueda por código o nombre (si el backend lo soporta). */
  search?: string;
  category_id?: string;
  /** Solo productos sin categoría (si el backend lo soporta). */
  uncategorized?: boolean;
  is_active?: boolean;
}): Promise<CrmProductHubListResult> {
  const limit = params?.limit ?? 500;
  const offset = params?.offset ?? 0;
  try {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      limit,
      offset,
    };
    const s = params?.search?.trim();
    if (s) queryParams.search = s;
    if (params?.category_id) queryParams.category_id = params.category_id;
    if (params?.uncategorized) queryParams.uncategorized = true;
    if (typeof params?.is_active === "boolean") queryParams.is_active = params.is_active;

    const { data } = await apiClient.get(BASE, { params: queryParams });
    return parseProductHubListResponse(data, limit, offset);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCrmProductHub(body: CreateCrmProductHubRequest): Promise<CrmProductHub> {
  try {
    const { data } = await apiClient.post(BASE, body);
    return parseProduct(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCrmProductHub(
  id: string,
  body: UpdateCrmProductHubRequest,
): Promise<CrmProductHub> {
  try {
    const { data } = await apiClient.patch(`${BASE}/${id}`, body);
    return parseProduct(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

/** Desactiva el producto en el Hub (PATCH `is_active: false`). */
export async function deactivateCrmProductHub(id: string): Promise<CrmProductHub> {
  return updateCrmProductHub(id, { is_active: false });
}
