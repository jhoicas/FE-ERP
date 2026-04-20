import { z } from "zod";
import type {
  RegisterMovementRequest,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductListResponse,
  WarehouseResponse,
  WarehouseListResponse,
  ReplenishmentSuggestionDTO,
  ReplenishmentListResponse,
  PageResponse,
} from "@/types/inventory";

// ========= Helpers =========

export const pageResponseSchema: z.ZodType<PageResponse> = z.object({
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

// ========= Request schemas (formularios) =========

export const registerMovementRequestSchema: z.ZodType<RegisterMovementRequest> =
  z.object({
    product_id: z.string().min(1, "El producto es obligatorio"),
    warehouse_id: z.string().uuid().optional(),
    from_warehouse_id: z.string().uuid().optional(),
    to_warehouse_id: z.string().uuid().optional(),
    type: z.string().min(1, "El tipo de movimiento es obligatorio"),
    quantity: z.string().min(1, "La cantidad es obligatoria"),
    unit_cost: z.string().optional(),
  });

const taxRateNumberSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value.replace(",", "."));
    return value;
  },
  z.number({
    required_error: "Impuesto requerido",
    invalid_type_error: "Impuesto requerido",
  })
    .min(0, "Debe estar entre 0 y 100")
    .max(100, "Debe estar entre 0 y 100"),
);

export const createProductRequestSchema: z.ZodType<CreateProductRequest> =
  z.object({
    sku: z.string().min(1, "El SKU es obligatorio").max(100),
    name: z.string().min(1, "El nombre es obligatorio").max(200),
    description: z.string().optional(),
    price: z.string().min(1, "El precio es obligatorio"),
    tax_rate: taxRateNumberSchema,
    unspsc_code: z.string().optional(),
    unit_measure: z.string().min(1, "La unidad de medida es obligatoria"),
    attributes: z.unknown().optional(),
    category_id: z.string().optional(),
    is_active: z.boolean().optional(),
  });

export const updateProductRequestSchema: z.ZodType<UpdateProductRequest> =
  z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.string().optional(),
    tax_rate: taxRateNumberSchema.optional(),
    unspsc_code: z.string().optional(),
    unit_measure: z.string().optional(),
    attributes: z.unknown().optional(),
    category_id: z.string().optional(),
    is_active: z.boolean().optional(),
  });

export const createWarehouseRequestSchema: z.ZodType<CreateWarehouseRequest> =
  z.object({
    name: z.string().min(1, "El nombre es obligatorio").max(200),
    address: z.string().optional(),
  });

// ========= Response schemas =========

export const productResponseSchema: z.ZodType<ProductResponse> = z
  .object({
    id: z.string(),
    company_id: z.string(),
    sku: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.string(),
    cost: z.string(),
    tax_rate: z.string(),
    unspsc_code: z.string(),
    unit_measure: z.string(),
    attributes: z.unknown(),
    created_at: z.string(),
    updated_at: z.string(),
    category_id: z.string().optional(),
    category_name: z.string().optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .passthrough();

export const productListResponseSchema: z.ZodType<ProductListResponse> =
  z.object({
    items: z.array(productResponseSchema),
    page: pageResponseSchema,
  });

export const warehouseResponseSchema: z.ZodType<WarehouseResponse> = z.object({
  id: z.string(),
  company_id: z.string(),
  name: z.string(),
  address: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const warehouseListResponseSchema: z.ZodType<WarehouseListResponse> =
  z.object({
    items: z.array(warehouseResponseSchema),
    page: pageResponseSchema,
  });

export const replenishmentSuggestionSchema: z.ZodType<ReplenishmentSuggestionDTO> =
  z.object({
    product_id: z.string(),
    sku: z.string(),
    product_name: z.string(),
    current_stock: z.string(),
    reorder_point: z.string(),
    ideal_stock: z.string(),
    suggested_order_qty: z.string(),
    unit_cost: z.string(),
    estimated_order_cost: z.string(),
    gross_margin_pct: z.string(),
    units_sold_last_90d: z.string(),
    inventory_days: z.string(),
    priority: z.number(),
  });

export const replenishmentListSchema: z.ZodType<ReplenishmentListResponse> =
  z.object({
    total: z.number(),
    replenishments: z.array(replenishmentSuggestionSchema),
  });

