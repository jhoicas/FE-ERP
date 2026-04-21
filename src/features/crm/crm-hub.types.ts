/**
 * Catálogo Hub del CRM (`crm_products_hub`, `crm_category_product_hub`).
 * Endpoints base: `/api/crm/products-hub`, `/api/crm/categories-hub`.
 */

export interface CrmProductHub {
  id: string;
  category_id: string | null;
  product_code: string;
  product_name: string;
  unit_cost: string | number | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateCrmProductHubRequest {
  product_code: string;
  product_name: string;
  unit_cost: string | number | null;
  category_id?: string | null;
  is_active?: boolean;
}

export interface UpdateCrmProductHubRequest {
  product_code?: string;
  product_name?: string;
  unit_cost?: string | number | null;
  category_id?: string | null;
  is_active?: boolean;
}

export interface CrmCategoryProductHub {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCrmCategoryHubRequest {
  name: string;
}

export interface UpdateCrmCategoryHubRequest {
  name?: string;
  is_active?: boolean;
}
