import { z } from "zod";
import apiClient from "@/lib/api/client";
import { ProductSchema, ReplenishmentSchema, type ProductDTO, type ReplenishmentDTO } from "./schemas";

export async function getProducts(): Promise<ProductDTO[]> {
  const response = await apiClient.get("/api/products");
  return z.array(ProductSchema).parse(response.data);
}

export async function getReplenishmentList(): Promise<ReplenishmentDTO[]> {
  const response = await apiClient.get("/api/inventory/replenishment-list");
  return z.array(ReplenishmentSchema).parse(response.data);
}

