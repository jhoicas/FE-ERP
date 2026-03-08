import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  current_stock: z.number(),
  unit_measure: z.string(),
});

export type ProductDTO = z.infer<typeof ProductSchema>;

export const ReplenishmentSchema = z.object({
  product_id: z.string(),
  sku: z.string(),
  product_name: z.string(),
  current_stock: z.number(),
  ideal_stock: z.number(),
  suggested_order_qty: z.number(),
  priority: z.number(),
});

export type ReplenishmentDTO = z.infer<typeof ReplenishmentSchema>;

