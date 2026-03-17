/**
 * Tipos TypeScript del módulo de Inventario alineados con el backend NaturERP.
 * Prefijo de rutas principal: /api/inventory, /api/products, /api/warehouses
 */

// ========== Tipos base ==========

/** TODO: validar estructura exacta de paginación con el backend */
export interface PageResponse {
  limit: number;
  offset: number;
  total: number;
}

// ========== Movimientos de inventario ==========

export interface RegisterMovementRequest {
  product_id: string;
  warehouse_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  type: string;
  quantity: string;
  unit_cost?: string;
}

export interface ReplenishmentSuggestionDTO {
  product_id: string;
  sku: string;
  product_name: string;
  current_stock: string;
  reorder_point: string;
  ideal_stock: string;
  suggested_order_qty: string;
  unit_cost: string;
  estimated_order_cost: string;
  gross_margin_pct: string;
  units_sold_last_90d: string;
  inventory_days: string;
  priority: number;
}

export interface ReplenishmentListResponse {
  total: number;
  replenishments: ReplenishmentSuggestionDTO[];
}

// ========== Productos ==========

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  price: string;
  tax_rate: number;
  unspsc_code?: string;
  unit_measure: string;
  attributes?: unknown;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: string;
  tax_rate?: number;
  unspsc_code?: string;
  unit_measure?: string;
  attributes?: unknown;
}

export interface ProductResponse {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  tax_rate: string;
  unspsc_code: string;
  unit_measure: string;
  attributes: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  items: ProductResponse[];
  page: PageResponse;
}

// IA – clasificación de producto (para futuros flujos)

export interface AIClassificationRequest {
  product_name: string;
  description: string;
}

export interface AIClassificationDTO {
  suggested_unspsc: string;
  suggested_tax_rate: string;
  confidence_score: number;
  reasoning: string;
}

// ========== Materias primas ==========

export interface RawMaterialImpactDTO {
  raw_material_id: string;
  sku: string;
  name: string;
  total_cost_impact: string;
  usage_pct: string;
}

// ========== Bodegas ==========

export interface CreateWarehouseRequest {
  name: string;
  address?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  address?: string;
}

export interface WarehouseResponse {
  id: string;
  company_id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseListResponse {
  items: WarehouseResponse[];
  page: PageResponse;
}

