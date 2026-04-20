import axios from "axios";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";

const BASE = "/api/inventory/product-categories";

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export const productCategoryResponseSchema = z
  .object({
    id: z.string(),
    company_id: z.string().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .passthrough();

export type ProductCategoryResponse = z.infer<typeof productCategoryResponseSchema>;

export interface ProductCategoryListResult {
  items: ProductCategoryResponse[];
  total: number;
}

export interface CreateProductCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateProductCategoryRequest {
  name?: string;
  description?: string;
}

function parseListPayload(data: unknown): ProductCategoryListResult {
  if (Array.isArray(data)) {
    const items = z.array(productCategoryResponseSchema).parse(data);
    return { items, total: items.length };
  }
  const record = data as {
    items?: unknown;
    data?: unknown;
    rows?: unknown;
    page?: { total?: unknown };
    total?: unknown;
  };
  const raw = record.items ?? record.data ?? record.rows ?? [];
  const items = z.array(productCategoryResponseSchema).parse(Array.isArray(raw) ? raw : []);
  const total = Number(record.page?.total ?? record.total ?? items.length) || items.length;
  return { items, total };
}

export async function listProductCategories(params?: {
  limit?: number;
  offset?: number;
}): Promise<ProductCategoryListResult> {
  try {
    const { data } = await apiClient.get(BASE, {
      params: { limit: params?.limit ?? 100, offset: params?.offset ?? 0 },
    });
    return parseListPayload(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createProductCategory(body: CreateProductCategoryRequest): Promise<ProductCategoryResponse> {
  try {
    const { data } = await apiClient.post(BASE, body);
    return productCategoryResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateProductCategory(
  id: string,
  body: UpdateProductCategoryRequest,
): Promise<ProductCategoryResponse> {
  try {
    const { data } = await apiClient.put(`${BASE}/${id}`, body);
    return productCategoryResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deactivateProductCategory(id: string): Promise<void> {
  try {
    await apiClient.put(`${BASE}/${id}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}
