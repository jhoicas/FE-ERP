import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductListResponse,
  CreateWarehouseRequest,
  WarehouseResponse,
  WarehouseListResponse,
  RegisterMovementRequest,
  ReplenishmentListResponse,
} from "@/types/inventory";
import {
  createProductRequestSchema,
  updateProductRequestSchema,
  createWarehouseRequestSchema,
  productResponseSchema,
  productListResponseSchema,
  warehouseResponseSchema,
  warehouseListResponseSchema,
  registerMovementRequestSchema,
  replenishmentListSchema,
} from "@/lib/validations/inventory";

function throwOnApiError(error: unknown): never {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosErr = error as any;
    const data = axiosErr.response?.data;
    if (data && isApiError(data)) {
      const err = new Error((data as ApiError).message) as Error & { code: string };
      err.code = data.code;
      throw err;
    }
  }
  throw error;
}

// ========= Productos =========

export async function createProduct(
  body: CreateProductRequest,
  accessToken?: string,
): Promise<ProductResponse> {
  const payload = createProductRequestSchema.parse(body);
  try {
    const { data } = await apiClient.post<ProductResponse>("/api/products", payload, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return productResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getProductById(
  id: string,
  accessToken?: string,
): Promise<ProductResponse> {
  try {
    const { data } = await apiClient.get<ProductResponse>(`/api/products/${id}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return productResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export interface ListProductsParams {
  limit?: number;
  offset?: number;
}

export async function listProducts(
  params: ListProductsParams = {},
  accessToken?: string,
): Promise<ProductListResponse> {
  try {
    const { data } = await apiClient.get<ProductListResponse>("/api/products", {
      params: {
        limit: params.limit,
        offset: params.offset,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return productListResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateProduct(
  id: string,
  body: UpdateProductRequest,
  accessToken?: string,
): Promise<ProductResponse> {
  const payload = updateProductRequestSchema.parse(body);
  try {
    const { data } = await apiClient.put<ProductResponse>(`/api/products/${id}`, payload, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return productResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

// ========= Bodegas =========

export async function createWarehouse(
  body: CreateWarehouseRequest,
  accessToken?: string,
): Promise<WarehouseResponse> {
  const payload = createWarehouseRequestSchema.parse(body);
  try {
    const { data } = await apiClient.post<WarehouseResponse>("/api/warehouses", payload, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return warehouseResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getWarehouseById(
  id: string,
  accessToken?: string,
): Promise<WarehouseResponse> {
  try {
    const { data } = await apiClient.get<WarehouseResponse>(`/api/warehouses/${id}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return warehouseResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export interface ListWarehousesParams {
  limit?: number;
  offset?: number;
}

export async function listWarehouses(
  params: ListWarehousesParams = {},
  accessToken?: string,
): Promise<WarehouseListResponse> {
  try {
    const { data } = await apiClient.get<WarehouseListResponse>("/api/warehouses", {
      params: {
        limit: params.limit,
        offset: params.offset,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return warehouseListResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

// ========= Movimientos & Replenishment =========

export async function registerInventoryMovement(
  body: RegisterMovementRequest,
  accessToken?: string,
): Promise<{ message: string }> {
  const payload = registerMovementRequestSchema.parse(body);
  try {
    const { data } = await apiClient.post<{ message: string }>("/api/inventory/movements", payload, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export interface ReplenishmentParams {
  warehouse_id?: string;
}

export async function getReplenishmentList(
  params: ReplenishmentParams = {},
  accessToken?: string,
): Promise<ReplenishmentListResponse> {
  try {
    const { data } = await apiClient.get<ReplenishmentListResponse>("/api/inventory/replenishment-list", {
      params: {
        warehouse_id: params.warehouse_id,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return replenishmentListSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

// ========= React Query hooks =========

// Products

export function useProducts(
  params: ListProductsParams,
  options?: UseQueryOptions<ProductListResponse, Error>,
  accessToken?: string,
) {
  return useQuery<ProductListResponse, Error>({
    queryKey: ["inventory-products", params],
    queryFn: () => listProducts(params, accessToken),
    ...options,
  });
}

export function useProduct(
  id: string | undefined,
  options?: UseQueryOptions<ProductResponse, Error>,
  accessToken?: string,
) {
  return useQuery<ProductResponse, Error>({
    queryKey: ["inventory-product", id],
    queryFn: () => getProductById(id!, accessToken),
    enabled: !!id,
    ...options,
  });
}

export function useCreateProduct(
  options?: UseMutationOptions<ProductResponse, Error, CreateProductRequest>,
  accessToken?: string,
) {
  return useMutation<ProductResponse, Error, CreateProductRequest>({
    mutationFn: (body) => createProduct(body, accessToken),
    ...options,
  });
}

export function useUpdateProduct(
  options?: UseMutationOptions<ProductResponse, Error, { id: string; body: UpdateProductRequest }>,
  accessToken?: string,
) {
  return useMutation<ProductResponse, Error, { id: string; body: UpdateProductRequest }>({
    mutationFn: ({ id, body }) => updateProduct(id, body, accessToken),
    ...options,
  });
}

// Warehouses

export function useWarehouses(
  params: ListWarehousesParams,
  options?: UseQueryOptions<WarehouseListResponse, Error>,
  accessToken?: string,
) {
  return useQuery<WarehouseListResponse, Error>({
    queryKey: ["inventory-warehouses", params],
    queryFn: () => listWarehouses(params, accessToken),
    ...options,
  });
}

export function useWarehouse(
  id: string | undefined,
  options?: UseQueryOptions<WarehouseResponse, Error>,
  accessToken?: string,
) {
  return useQuery<WarehouseResponse, Error>({
    queryKey: ["inventory-warehouse", id],
    queryFn: () => getWarehouseById(id!, accessToken),
    enabled: !!id,
    ...options,
  });
}

export function useCreateWarehouse(
  options?: UseMutationOptions<WarehouseResponse, Error, CreateWarehouseRequest>,
  accessToken?: string,
) {
  return useMutation<WarehouseResponse, Error, CreateWarehouseRequest>({
    mutationFn: (body) => createWarehouse(body, accessToken),
    ...options,
  });
}

// Movements & replenishment

export function useRegisterInventoryMovement(
  options?: UseMutationOptions<{ message: string }, Error, RegisterMovementRequest>,
  accessToken?: string,
) {
  return useMutation<{ message: string }, Error, RegisterMovementRequest>({
    mutationFn: (body) => registerInventoryMovement(body, accessToken),
    ...options,
  });
}

export function useReplenishmentList(
  params: ReplenishmentParams,
  options?: UseQueryOptions<ReplenishmentListResponse, Error>,
  accessToken?: string,
) {
  return useQuery<ReplenishmentListResponse, Error>({
    queryKey: ["inventory-replenishment-list", params],
    queryFn: () => getReplenishmentList(params, accessToken),
    ...options,
  });
}

