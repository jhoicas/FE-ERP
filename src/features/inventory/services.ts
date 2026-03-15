import { z } from "zod";
import apiClient from "@/lib/api/client";
import {
  ProductSchema,
  ReplenishmentSchema,
  MovementSchema,
  MovementsListResponseSchema,
  type ProductDTO,
  type ReplenishmentDTO,
  type MovementDTO,
  type MovementsListResponse,
} from "./schemas";

export async function getProducts(): Promise<ProductDTO[]> {
  const response = await apiClient.get("/api/products");
  if (Array.isArray(response.data)) {
    return z.array(ProductSchema).parse(response.data);
  }

  const parsed = z
    .object({
      items: z.array(ProductSchema),
    })
    .passthrough()
    .parse(response.data);

  return parsed.items;
}

export async function getReplenishmentList(): Promise<ReplenishmentDTO[]> {
  const response = await apiClient.get("/api/inventory/replenishment-list");
  return z.array(ReplenishmentSchema).parse(response.data);
}

export interface GetMovementsParams {
  product_id?: string;
  warehouse_id?: string;
  type?: "IN" | "OUT" | "ADJUSTMENT";
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function getMovements(
  params: GetMovementsParams = {},
): Promise<MovementsListResponse> {
  const response = await apiClient.get("/api/inventory/movements", { params });
  // Support both paginated { items, total } and legacy array responses
  if (Array.isArray(response.data)) {
    const items = z.array(MovementSchema).parse(response.data);
    return { items, total: items.length };
  }
  return MovementsListResponseSchema.parse(response.data);
}

export type { MovementDTO, MovementsListResponse };

