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

function parseList(data: unknown): CrmProductHub[] {
  if (Array.isArray(data)) {
    return data.map(parseProduct);
  }
  const record = data as { items?: unknown; data?: unknown; rows?: unknown };
  const raw = record.items ?? record.data ?? record.rows ?? [];
  return Array.isArray(raw) ? raw.map(parseProduct) : [];
}

export async function listCrmProductsHub(params?: {
  limit?: number;
  offset?: number;
}): Promise<CrmProductHub[]> {
  try {
    const { data } = await apiClient.get(BASE, {
      params: { limit: params?.limit ?? 500, offset: params?.offset ?? 0 },
    });
    return parseList(data);
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
