import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  cost: z.number(),
  current_stock: z.number(),
  reorder_point: z.number(),
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

export const MovementSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string().optional(),
  sku: z.string().optional(),
  warehouse_id: z.string().optional(),
  warehouse_name: z.string().optional(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number(),
  balance: z.number().optional(),
  unit_cost: z.number().optional(),
  notes: z.string().optional(),
  date: z.string(),
}).passthrough();

export type MovementDTO = z.infer<typeof MovementSchema>;

export const MovementsListResponseSchema = z.object({
  items: z.array(MovementSchema),
  total: z.number(),
});

export type MovementsListResponse = z.infer<typeof MovementsListResponseSchema>;

