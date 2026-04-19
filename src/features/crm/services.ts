import axios from "axios";
import apiClient from "@/lib/api/client";
import { isApiError, type ApiError } from "@/types/crm";
import type {
  CampaignTemplate,
  Profile360Response,
  CategoryResponse,
  BenefitResponse,
  TaskResponse,
  TaskResponseList,
  InteractionResponse,
  TicketResponse,
  TicketResponseList,
} from "@/types/crm";
import {
  createTaskSchema,
  updateTaskSchema,
  createInteractionSchema,
  createTicketSchema,
  updateTicketSchema,
  assignCategorySchema,
  campaignCopySchema,
  summarizeTimelineSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createBenefitSchema,
  createCategorySchema,
  updateBenefitSchema,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type CreateInteractionRequest,
  type CreateTicketRequest,
  type UpdateTicketRequest,
  type AssignCategoryRequest,
  type CreateCustomerRequest,
  type UpdateCustomerRequest,
  type CreateBenefitRequest,
  type CreateCategoryRequest,
  type SendCampaignRequest,
  type UpdateBenefitRequest,
  sendCampaignSchema,
} from "@/lib/validations/crm";
import { z } from "zod";
import {
  CustomerSchema,
  CrmAnalyticsSchema,
  RemarketingProspectSchema,
  type CustomerDTO,
  type CustomerListResponse,
  type CrmAnalyticsDTO,
  type RemarketingProspectDTO,
} from "./schemas";
import type {
  CrmAutomation,
  CreateCrmAutomationRequest,
  UpdateCrmAutomationRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  UpdateCampaignTemplateRequest,
  GetAuditLogsParams,
  AuditLogsResponse,
  AutomationResponse,
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "./crm.types";

const CampaignTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  created_at: z.string(),
}).passthrough();

const CrmAutomationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["BIRTHDAY", "REPURCHASE"]),
  template_id: z.string(),
  config: z
    .object({
      productId: z.string().optional(),
      daysSincePurchase: z.coerce.number().optional(),
    })
    .passthrough()
    .default({}),
  is_active: z.coerce.boolean(),
}).passthrough();

const AuditLogSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    user_id: z.union([z.string(), z.number()]).transform(String),
    action: z.string(),
    entity_name: z.string(),
    entity_id: z.union([z.string(), z.number()]).transform(String),
    changes: z.record(z.string(), z.unknown()).default({}),
    created_at: z.string(),
  })
  .passthrough();

const AuditLogsResponseSchema = z
  .object({
    items: z.array(AuditLogSchema).optional(),
    logs: z.array(AuditLogSchema).optional(),
    data: z.array(AuditLogSchema).optional(),
    rows: z.array(AuditLogSchema).optional(),
    total: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const CRM_BASE = "/api/crm";
const CUSTOMERS_BASE = "/api/crm/customers";

function normalizeCustomerListResponse(data: unknown): CustomerListResponse {
  if (Array.isArray(data)) {
    const items = z.array(CustomerSchema).parse(data);
    return { items, total: items.length };
  }

  const payload = z
    .object({
      items: z.array(CustomerSchema).optional(),
      data: z.array(CustomerSchema).optional(),
      customers: z.array(CustomerSchema).optional(),
      results: z.array(CustomerSchema).optional(),
      rows: z.array(CustomerSchema).optional(),
      total: z.number().optional(),
      count: z.number().optional(),
      totalCount: z.number().optional(),
      total_count: z.number().optional(),
    })
    .passthrough()
    .parse(data);

  const items =
    payload.items ??
    payload.data ??
    payload.customers ??
    payload.results ??
    payload.rows ??
    [];

  const parsedItems = z.array(CustomerSchema).parse(items);
  const total = payload.total ?? payload.count ?? payload.totalCount ?? payload.total_count ?? parsedItems.length;

  return { items: parsedItems, total };
}

function throwOnApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.data && isApiError(error.response.data)) {
    const err = new Error((error.response.data as ApiError).message) as Error & { code: string };
    err.code = (error.response.data as ApiError).code;
    throw err;
  }
  throw error;
}

export async function listCustomers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  filter?: string;
  categoryId?: string;
  category?: string;
  withoutCategory?: boolean;
}): Promise<CustomerListResponse> {
  const { data } = await apiClient.get(CUSTOMERS_BASE, {
    params: {
      limit: params?.limit ?? 10,
      offset: params?.offset ?? 0,
      search: params?.search,
      filter: params?.filter,
      category_id: params?.categoryId,
      categoryId: params?.categoryId,
      category: params?.category,
      category_name: params?.category,
      without_category: params?.withoutCategory,
      withoutCategory: params?.withoutCategory,
    },
  });
  return normalizeCustomerListResponse(data);
}

export async function getCustomers(): Promise<CustomerDTO[]> {
  const response = await apiClient.get(CUSTOMERS_BASE);
  return normalizeCustomerListResponse(response.data).items;
}

export interface ImportCustomersResponse {
  jobID: string;
}

export interface ImportRowDetail {
  row?: number;
  email?: string;
  action: "inserted" | "updated" | "skipped" | "failed" | "invalid" | "warning" | "processed";
  errors: string[];
  warnings: string[];
}

export interface ImportReportResponse {
  TotalRows: number;
  ValidRows: number;
  InvalidRows: number;
  DuplicateRows: number;
  InsertedRows: number;
  UpdatedRows: number;
  SkippedRows: number;
  FailedRows: number;
  ProcessedRows: number;
  Status: string;
  SuccessRows: number;
  MissingEmailRows: number;
  WarningRows: number;
  Rows: ImportRowDetail[];
  FailedRecords: Array<{
    row?: number;
    identifier?: string;
    reason: string;
  }>;
  ProcessedRecords: Array<{
    row?: number;
    identifier?: string;
    status: "uploaded" | "failed" | "processed";
    reason?: string;
  }>;
  RawPayload?: Record<string, unknown>;
}

export type ImportStatusResponse = ImportReportResponse;

export interface ImportPreviewResponse extends ImportReportResponse {}

export interface ImportCustomerColumnMappings {
  category_name?: string;
}

export interface ImportSalesResponse {
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export async function importCustomersFile(
  file: File,
  columnMappings?: ImportCustomerColumnMappings,
): Promise<ImportCustomersResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (columnMappings && Object.keys(columnMappings).length > 0) {
    formData.append("columnMappings", JSON.stringify(columnMappings));
  }

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    const payload = data as { jobID?: unknown; jobId?: unknown };
    const resolvedJobId = String(payload?.jobID ?? payload?.jobId ?? "").trim();

    if (!resolvedJobId) {
      throw new Error("La respuesta de importación no incluyó un jobID válido.");
    }

    return { jobID: resolvedJobId };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function importSales(file: File): Promise<ImportSalesResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/import/sales`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const payload = z
      .object({
        status: z.string().optional(),
        message: z.string().optional(),
      })
      .passthrough()
      .parse(data);

    return payload;
  } catch (error) {
    return throwOnApiError(error);
  }
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/[;,|]/g).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeImportRowDetail(item: unknown): ImportRowDetail | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const row = Number(record.row ?? record.rowNumber ?? record.line ?? record.index ?? NaN);
  const email = String(
    record.email ??
    record.identifier ??
    record.nit ??
    record.name ??
    record.customer ??
    "",
  ).trim();
  const rawAction = String(record.action ?? record.status ?? record.result ?? record.state ?? "processed").toLowerCase();
  const action: ImportRowDetail["action"] =
    rawAction === "inserted" || rawAction === "created" || rawAction === "new" || rawAction === "success"
      ? "inserted"
      : rawAction === "updated" || rawAction === "reused"
        ? "updated"
        : rawAction === "skipped" || rawAction === "ignored" || rawAction === "duplicate"
          ? "skipped"
          : rawAction === "failed" || rawAction === "error" || rawAction === "invalid"
            ? "failed"
            : rawAction === "warning"
              ? "warning"
              : "processed";

  const errors = normalizeStringList(record.errors ?? record.errorMessages ?? record.error ?? record.message);
  const warnings = normalizeStringList(record.warnings ?? record.warningMessages ?? record.warning);

  return {
    row: Number.isFinite(row) ? row : undefined,
    email: email || undefined,
    action,
    errors,
    warnings,
  };
}

function normalizeImportReport(data: unknown): ImportReportResponse {
  const rawPayload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined;

  const payload = data as {
    TotalRows?: unknown;
    totalRows?: unknown;
    total_rows?: unknown;
    ValidRows?: unknown;
    validRows?: unknown;
    valid_rows?: unknown;
    InvalidRows?: unknown;
    invalidRows?: unknown;
    invalid_rows?: unknown;
    invalidRowsCount?: unknown;
    DuplicateRows?: unknown;
    duplicateRows?: unknown;
    duplicate_rows?: unknown;
    InsertedRows?: unknown;
    insertedRows?: unknown;
    inserted_rows?: unknown;
    UpdatedRows?: unknown;
    updatedRows?: unknown;
    updated_rows?: unknown;
    SkippedRows?: unknown;
    skippedRows?: unknown;
    skipped_rows?: unknown;
    FailedRows?: unknown;
    failedRows?: unknown;
    failed_rows?: unknown;
    ProcessedRows?: unknown;
    processedRows?: unknown;
    processed_rows?: unknown;
    WarningRows?: unknown;
    warningRows?: unknown;
    warning_rows?: unknown;
    MissingEmailRows?: unknown;
    missingEmailRows?: unknown;
    missing_email_rows?: unknown;
    Status?: unknown;
    status?: unknown;
    rows?: unknown;
    Rows?: unknown;
    FailedRecords?: unknown;
    failedRecords?: unknown;
    ProcessedRecords?: unknown;
    processedRecords?: unknown;
  };

  const toOptionalNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const totalRows = Number(payload?.TotalRows ?? payload?.totalRows ?? payload?.total_rows ?? 0);
  const validRowsRaw = toOptionalNumber(payload?.ValidRows ?? payload?.validRows ?? payload?.valid_rows);
  const invalidRowsRaw = toOptionalNumber(payload?.InvalidRows ?? payload?.invalidRows ?? payload?.invalid_rows ?? payload?.invalidRowsCount);
  const duplicateRows = Math.max(toOptionalNumber(payload?.DuplicateRows ?? payload?.duplicateRows ?? payload?.duplicate_rows) ?? 0, 0);
  const insertedRowsRaw = toOptionalNumber(payload?.InsertedRows ?? payload?.insertedRows ?? payload?.inserted_rows);
  const updatedRowsRaw = toOptionalNumber(payload?.UpdatedRows ?? payload?.updatedRows ?? payload?.updated_rows);
  const skippedRowsRaw = toOptionalNumber(payload?.SkippedRows ?? payload?.skippedRows ?? payload?.skipped_rows);
  const failedRowsRaw = toOptionalNumber(payload?.FailedRows ?? payload?.failedRows ?? payload?.failed_rows);
  const processedRows = Number(payload?.ProcessedRows ?? payload?.processedRows ?? payload?.processed_rows ?? 0);
  const warningRows = Math.max(toOptionalNumber(payload?.WarningRows ?? payload?.warningRows ?? payload?.warning_rows) ?? 0, 0);
  const missingEmailRows = Math.max(toOptionalNumber(payload?.MissingEmailRows ?? payload?.missingEmailRows ?? payload?.missing_email_rows) ?? 0, 0);

  const rawRows = payload?.rows ?? payload?.Rows ?? [];
  const Rows = Array.isArray(rawRows) ? rawRows.map(normalizeImportRowDetail).filter((item): item is ImportRowDetail => Boolean(item)) : [];

  const rawFailedRecords = payload?.FailedRecords ?? payload?.failedRecords ?? [];
  const FailedRecords = Array.isArray(rawFailedRecords)
    ? rawFailedRecords
        .map((item): { row?: number; identifier?: string; reason: string } | null => {
          if (typeof item === "string") {
            return { reason: item };
          }

          const normalized = normalizeImportRowDetail(item);
          if (!normalized) {
            return null;
          }

          return {
            row: normalized.row,
            identifier: normalized.email,
            reason: normalized.errors[0] ?? normalized.warnings[0] ?? "Error de validacion",
          };
        })
        .filter((item): item is { row?: number; identifier?: string; reason: string } => Boolean(item))
    : [];

  const rawProcessedRecords = payload?.ProcessedRecords ?? payload?.processedRecords ?? Rows;
  const ProcessedRecords = Array.isArray(rawProcessedRecords)
    ? rawProcessedRecords
        .map((item): { row?: number; identifier?: string; status: "uploaded" | "failed" | "processed"; reason?: string } | null => {
          const normalized = normalizeImportRowDetail(item);
          if (!normalized) {
            return null;
          }

          const status = normalized.action === "inserted" || normalized.action === "updated"
            ? "uploaded"
            : normalized.action === "failed"
              ? "failed"
              : "processed";

          return {
            row: normalized.row,
            identifier: normalized.email,
            status,
            reason: normalized.errors[0] ?? normalized.warnings[0],
          };
        })
        .filter((item): item is { row?: number; identifier?: string; status: "uploaded" | "failed" | "processed"; reason?: string } => Boolean(item))
    : [];

  const hasValidRows = typeof validRowsRaw === "number";
  const hasInvalidRows = typeof invalidRowsRaw === "number";
  const hasInsertedRows = typeof insertedRowsRaw === "number";
  const hasUpdatedRows = typeof updatedRowsRaw === "number";
  const hasSkippedRows = typeof skippedRowsRaw === "number";
  const hasFailedRows = typeof failedRowsRaw === "number";

  const validRows = hasValidRows ? Math.max(validRowsRaw ?? 0, 0) : Math.max(processedRows - (failedRowsRaw ?? 0), 0);
  const invalidRows = hasInvalidRows ? Math.max(invalidRowsRaw ?? 0, 0) : Math.max(totalRows - validRows, 0);
  const insertedRows = hasInsertedRows ? Math.max(insertedRowsRaw ?? 0, 0) : Math.max(Rows.filter((row) => row.action === "inserted").length, 0);
  const updatedRows = hasUpdatedRows ? Math.max(updatedRowsRaw ?? 0, 0) : Math.max(Rows.filter((row) => row.action === "updated").length, 0);
  const skippedRows = hasSkippedRows ? Math.max(skippedRowsRaw ?? 0, 0) : Math.max(Rows.filter((row) => row.action === "skipped").length, 0);
  const failedRows = hasFailedRows ? Math.max(failedRowsRaw ?? 0, 0) : Math.max(invalidRows, Rows.filter((row) => row.action === "failed").length, 0);

  return {
    TotalRows: totalRows,
    ValidRows: validRows,
    InvalidRows: invalidRows,
    DuplicateRows: duplicateRows,
    InsertedRows: insertedRows,
    UpdatedRows: updatedRows,
    SkippedRows: skippedRows,
    FailedRows: failedRows,
    ProcessedRows: processedRows,
    Status: String(payload?.Status ?? payload?.status ?? "pending"),
    SuccessRows: validRows,
    MissingEmailRows: missingEmailRows,
    WarningRows: warningRows,
    Rows,
    FailedRecords,
    ProcessedRecords,
    RawPayload: rawPayload,
  };
}

export async function previewImportCustomersFile(
  file: File,
  columnMappings?: ImportCustomerColumnMappings,
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (columnMappings && Object.keys(columnMappings).length > 0) {
    formData.append("columnMappings", JSON.stringify(columnMappings));
  }

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/import/preview`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return normalizeImportReport(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getImportStatus(jobId: string): Promise<ImportReportResponse> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/import/status/${jobId}`);
    return normalizeImportReport(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCustomer(body: CreateCustomerRequest): Promise<CustomerDTO> {
  const payload = createCustomerSchema.parse(body);
  try {
    const { data } = await apiClient.post<CustomerDTO>(CUSTOMERS_BASE, payload);
    return CustomerSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCustomer(
  customerId: string,
  body: UpdateCustomerRequest
): Promise<CustomerDTO> {
  const payload = updateCustomerSchema.parse(body);
  try {
    const { data } = await apiClient.put<CustomerDTO>(
      `${CUSTOMERS_BASE}/${customerId}`,
      payload
    );
    return CustomerSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getProfile360(customerId: string): Promise<Profile360Response> {
  try {
    const { data } = await apiClient.get<Profile360Response>(
      `${CRM_BASE}/customers/${customerId}/profile360`
    );
    const resolvedMetadata = data.metadata ?? data.customer?.metadata;
    return {
      ...data,
      customer: {
        ...data.customer,
        metadata: resolvedMetadata,
      },
      metadata: resolvedMetadata,
    };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function assignCategory(
  customerId: string,
  body: AssignCategoryRequest
): Promise<{ status: string }> {
  const payload = assignCategorySchema.parse(body);
  try {
    const { data } = await apiClient.put<{ status: string }>(
      `${CRM_BASE}/customers/${customerId}/category`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createBenefit(
  categoryId: string,
  body: CreateBenefitRequest,
): Promise<BenefitResponse> {
  const payload = createBenefitSchema.parse(body);
  try {
    const { data } = await apiClient.post<BenefitResponse>(
      `${CRM_BASE}/categories/${categoryId}/benefits`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCategory(
  body: CreateCategoryRequest,
): Promise<CategoryResponse> {
  const payload = createCategorySchema.parse(body);
  try {
    const { data } = await apiClient.post<CategoryResponse>(
      `${CRM_BASE}/categories`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCategory(
  categoryId: string,
  body: CreateCategoryRequest,
): Promise<CategoryResponse> {
  const payload = createCategorySchema.parse(body);
  try {
    const { data } = await apiClient.put<CategoryResponse>(
      `${CRM_BASE}/categories/${categoryId}`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateBenefit(
  benefitId: string,
  body: UpdateBenefitRequest,
): Promise<BenefitResponse> {
  const payload = updateBenefitSchema.parse(body);
  try {
    const { data } = await apiClient.put<BenefitResponse>(
      `${CRM_BASE}/benefits/${benefitId}`,
      payload,
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deleteBenefit(benefitId: string): Promise<void> {
  try {
    await apiClient.put(`${CRM_BASE}/benefits/${benefitId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listCategories(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: "active" | "inactive";
}): Promise<CategoryResponse[]> {
  try {
    const { data } = await apiClient.get<CategoryResponse[]>(`${CRM_BASE}/categories`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        search: params?.search,
        status: params?.status,
      },
    });
    if (Array.isArray(data)) {
      return data;
    }

    const payload = data as {
      items?: unknown;
      data?: unknown;
      rows?: unknown;
    };

    const candidates = payload?.items ?? payload?.data ?? payload?.rows ?? [];
    return Array.isArray(candidates) ? (candidates as CategoryResponse[]) : [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listBenefitsByCategory(
  categoryId: string,
  params?: { limit?: number; offset?: number }
): Promise<BenefitResponse[]> {
  try {
    const { data } = await apiClient.get<BenefitResponse[] | { items?: unknown; data?: unknown; rows?: unknown }>(
      `${CRM_BASE}/categories/${categoryId}/benefits`,
      { params: { limit: params?.limit, offset: params?.offset } }
    );

    if (Array.isArray(data)) {
      return data;
    }

    const payload = data as {
      items?: unknown;
      data?: unknown;
      rows?: unknown;
    };

    const candidates = payload?.items ?? payload?.data ?? payload?.rows ?? [];
    return Array.isArray(candidates) ? (candidates as BenefitResponse[]) : [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createTask(body: CreateTaskRequest): Promise<TaskResponse> {
  const payload = createTaskSchema.parse(body);
  const serialized = {
    ...payload,
    due_at: payload.due_at != null ? payload.due_at.toISOString() : null,
  };
  try {
    const { data } = await apiClient.post<TaskResponse>(`${CRM_BASE}/tasks`, serialized);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listTasks(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  customer_id?: string;
}): Promise<TaskResponseList> {
  try {
    const { data } = await apiClient.get<TaskResponseList>(`${CRM_BASE}/tasks`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        customer_id: params?.customer_id,
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getTask(id: string): Promise<TaskResponse> {
  try {
    const { data } = await apiClient.get<TaskResponse>(`${CRM_BASE}/tasks/${id}`);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateTask(id: string, body: UpdateTaskRequest): Promise<TaskResponse> {
  const payload = updateTaskSchema.parse(body);
  const serialized = {
    ...payload,
    due_at: payload.due_at != null ? payload.due_at.toISOString() : undefined,
  };
  try {
    const { data } = await apiClient.put<TaskResponse>(`${CRM_BASE}/tasks/${id}`, serialized);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createInteraction(
  body: CreateInteractionRequest
): Promise<InteractionResponse> {
  const payload = createInteractionSchema.parse(body);
  try {
    const { data } = await apiClient.post<InteractionResponse>(
      `${CRM_BASE}/interactions`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createTicket(body: CreateTicketRequest): Promise<TicketResponse> {
  const payload = createTicketSchema.parse(body);
  try {
    const { data } = await apiClient.post<TicketResponse>(`${CRM_BASE}/tickets`, payload);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listTickets(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  sort?: string;
}): Promise<TicketResponseList> {
  try {
    const { data } = await apiClient.get<TicketResponseList>(`${CRM_BASE}/tickets`, {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        search: params?.search,
        sort: params?.sort,
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getTicket(id: string): Promise<TicketResponse> {
  try {
    const { data } = await apiClient.get<TicketResponse>(`${CRM_BASE}/tickets/${id}`);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateTicket(
  id: string,
  body: UpdateTicketRequest
): Promise<TicketResponse> {
  const payload = updateTicketSchema.parse(body);
  try {
    const { data } = await apiClient.put<TicketResponse>(`${CRM_BASE}/tickets/${id}`, payload);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function generateCampaignCopy(body: { prompt: string }): Promise<{ text: string }> {
  const payload = campaignCopySchema.parse(body);
  try {
    const { data } = await apiClient.post<{ text: string }>(
      `${CRM_BASE}/ai/campaign-copy`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function summarizeTimeline(body: {
  customer_id: string;
}): Promise<{ summary: string }> {
  const payload = summarizeTimelineSchema.parse(body);
  try {
    const { data } = await apiClient.post<{ summary: string }>(
      `${CRM_BASE}/ai/summarize-timeline`,
      payload
    );
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function sendCampaign(body: SendCampaignRequest): Promise<{ status: string }> {
  const payload = sendCampaignSchema.parse(body);
  try {
    const { data } = await apiClient.post<{ status: string }>(`${CRM_BASE}/campaigns/send`, payload);
    return z.object({ status: z.string() }).parse(data) as { status: string };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function importCrmExcel(file: File): Promise<{ status?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await apiClient.post<{ status?: string }>(`${CRM_BASE}/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function sendBulkCampaign(customerIds: string[]): Promise<{ status: string }> {
  try {
    const { data } = await apiClient.post<{ status: string }>(`${CRM_BASE}/campaigns/send-bulk`, {
      customer_ids: customerIds,
    });
    return z.object({ status: z.string() }).parse(data) as { status: string };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function sendCampaignTest(body: {
  channel: string;
  subject?: string;
  body: string;
  customer_id?: string;
  email?: string;
}): Promise<{ status: string }> {
  const payload = z.object({
    channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
    subject: z.string().optional(),
    body: z.string().min(1),
    customer_id: z.string().optional(),
    email: z.string().email().optional(),
  }).parse(body);

  try {
    const { data } = await apiClient.post<{ status: string }>(`${CRM_BASE}/campaigns/send-test`, payload);
    return z.object({ status: z.string() }).parse(data) as { status: string };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getCampaignTemplates(): Promise<CampaignTemplate[]> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/campaign-templates`, {
      params: { limit: 100, offset: 0 },
    });

    if (Array.isArray(data)) {
      return z.array(CampaignTemplateSchema).parse(data) as CampaignTemplate[];
    }

    if (data && Array.isArray((data as { items?: unknown[] }).items)) {
      return z
        .array(CampaignTemplateSchema)
        .parse((data as { items: unknown[] }).items) as CampaignTemplate[];
    }

    return [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getCrmAnalytics(): Promise<CrmAnalyticsDTO> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/analytics`);
    const payload = data as {
      kpis?: unknown;
      segmentacion?: unknown;
      segmentation?: unknown;
      evolucionMensual?: unknown;
      evolucion_mensual?: unknown;
      monthlyEvolution?: unknown;
      monthly_evolution?: unknown;
    };

    const rawKpis = (payload?.kpis ?? {}) as {
      totalClientes?: unknown;
      total_clientes?: unknown;
      ventasTotales?: unknown;
      ventas_totales?: unknown;
      ticketPromedio?: unknown;
      ticket_promedio?: unknown;
      clientesVip?: unknown;
      clientes_vip?: unknown;
    };

    const rawSegmentation =
      payload?.segmentacion ?? payload?.segmentation ?? [];

    const normalizedSegmentation = Array.isArray(rawSegmentation)
      ? rawSegmentation.map((item) => {
          const row = item as {
            segmento?: unknown;
            clientes?: unknown;
            porcentaje?: unknown;
            ventasTotales?: unknown;
            ventas_totales?: unknown;
            ticketPromedio?: unknown;
            ticket_promedio?: unknown;
            accion?: unknown;
          };

          return {
            segmento: row.segmento,
            clientes: row.clientes,
            porcentaje: row.porcentaje,
            ventasTotales: row.ventasTotales ?? row.ventas_totales ?? 0,
            ticketPromedio: row.ticketPromedio ?? row.ticket_promedio ?? 0,
            accion: row.accion,
          };
        })
      : [];

    const normalized = {
      kpis: {
        totalClientes: rawKpis.totalClientes ?? rawKpis.total_clientes ?? 0,
        ventasTotales: rawKpis.ventasTotales ?? rawKpis.ventas_totales ?? 0,
        ticketPromedio: rawKpis.ticketPromedio ?? rawKpis.ticket_promedio ?? 0,
        clientesVip: rawKpis.clientesVip ?? rawKpis.clientes_vip ?? 0,
      },
      segmentacion: normalizedSegmentation,
      evolucionMensual:
        payload?.evolucionMensual ??
        payload?.evolucion_mensual ??
        payload?.monthlyEvolution ??
        payload?.monthly_evolution ??
        [],
    };

    return CrmAnalyticsSchema.parse(normalized);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getRemarketingProspects(): Promise<RemarketingProspectDTO[]> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/remarketing`);
    const payload = data as { items?: unknown; prospects?: unknown };
    const candidates = Array.isArray(data)
      ? data
      : (payload?.items ?? payload?.prospects ?? []);

    return z.array(RemarketingProspectSchema).catch([]).parse(candidates);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCampaignTemplate(body: {
  name: string;
  subject: string;
  body: string;
}): Promise<CampaignTemplate> {
  const payload = z.object({
    name: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
  }).parse(body);

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/campaign-templates`, payload);
    return CampaignTemplateSchema.parse(data) as CampaignTemplate;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateTemplate(
  templateId: string,
  body: UpdateCampaignTemplateRequest,
): Promise<CampaignTemplate> {
  const payload = z
    .object({
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
    })
    .parse(body);

  try {
    const { data } = await apiClient.put(`${CRM_BASE}/campaign-templates/${templateId}`, payload);
    return CampaignTemplateSchema.parse(data) as CampaignTemplate;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createCampaign(body: CreateCampaignRequest): Promise<unknown> {
  try {
    const { data } = await apiClient.post(`${CRM_BASE}/campaigns`, {
      name: body.name,
      description: body.description,
      subject: body.subject,
      body: body.body,
      category_id: body.category_id,
      channel: body.channel,
      scheduled_at: body.scheduled_at,
    });

    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function triggerCampaignWorker(): Promise<unknown> {
  try {
    const { data } = await apiClient.post(`${CRM_BASE}/campaigns/worker/trigger`);
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function listCrmAutomations(): Promise<CrmAutomation[]> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/automations`, {
      params: { limit: 200, offset: 0 },
    });

    if (Array.isArray(data)) {
      return z.array(CrmAutomationSchema).parse(data) as CrmAutomation[];
    }

    if (data && Array.isArray((data as { items?: unknown[] }).items)) {
      return z.array(CrmAutomationSchema).parse((data as { items: unknown[] }).items) as CrmAutomation[];
    }

    if (data && Array.isArray((data as { rows?: unknown[] }).rows)) {
      return z.array(CrmAutomationSchema).parse((data as { rows: unknown[] }).rows) as CrmAutomation[];
    }

    return [];
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getAutomations(): Promise<AutomationResponse[]> {
  return listCrmAutomations();
}

export async function createCrmAutomation(body: CreateCrmAutomationRequest): Promise<CrmAutomation> {
  const payload = z
    .object({
      name: z.string().min(1),
      type: z.enum(["BIRTHDAY", "REPURCHASE"]),
      template_id: z.string().min(1),
      config: z
        .object({
          productId: z.string().optional(),
          daysSincePurchase: z.coerce.number().optional(),
        })
        .passthrough()
        .default({}),
      is_active: z.boolean().optional(),
    })
    .parse(body);

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/automations`, payload);
    return CrmAutomationSchema.parse(data) as CrmAutomation;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function createAutomation(body: CreateAutomationRequest): Promise<AutomationResponse> {
  return createCrmAutomation(body);
}

export async function updateCrmAutomation(
  automationId: string,
  body: UpdateCrmAutomationRequest,
): Promise<CrmAutomation> {
  const payload = z
    .object({
      name: z.string().min(1).optional(),
      type: z.enum(["BIRTHDAY", "REPURCHASE"]).optional(),
      template_id: z.string().min(1).optional(),
      config: z
        .object({
          productId: z.string().optional(),
          daysSincePurchase: z.coerce.number().optional(),
        })
        .passthrough()
        .optional(),
      is_active: z.boolean().optional(),
    })
    .parse(body);

  try {
    const { data } = await apiClient.put(`${CRM_BASE}/automations/${automationId}`, payload);
    return CrmAutomationSchema.parse(data) as CrmAutomation;
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateAutomation(
  automationId: string,
  body: UpdateAutomationRequest,
): Promise<AutomationResponse> {
  return updateCrmAutomation(automationId, body);
}

export async function deleteCrmAutomation(automationId: string): Promise<void> {
  try {
    await apiClient.delete(`${CRM_BASE}/automations/${automationId}`);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deleteAutomation(automationId: string): Promise<void> {
  return deleteCrmAutomation(automationId);
}

/** Compatibilidad: devuelve solo los items de tareas (lista plana). */
export async function getTasks(): Promise<TaskResponse[]> {
  const result = await listTasks({});
  return result.items;
}

/** Compatibilidad: devuelve solo los items de tickets (lista plana). */
export async function getTickets(): Promise<TicketResponse[]> {
  const result = await listTickets({});
  return result.items;
}

// ===========================
// Desactivation functions
// ===========================

export async function deactivateCrmCategory(categoryId: string): Promise<void> {
  try {
    await apiClient.put(`${CRM_BASE}/categories/${categoryId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deactivateCustomer(customerId: string): Promise<void> {
  try {
    await apiClient.put(`${CUSTOMERS_BASE}/${customerId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function deactivateSupplier(supplierId: string): Promise<void> {
  try {
    await apiClient.put(`/api/suppliers/${supplierId}/deactivate`, {});
  } catch (error) {
    return throwOnApiError(error);
  }
}

// ========================================================================
// AI ANALYTICS - Chat & Data Import
// ========================================================================

/**
 * POST /api/crm/ai/ask - Envía una pregunta al asistente de IA para análisis
 * Retorna texto de análisis + opcionalmente datos tabulares y configuración de gráfico
 */
export async function askAiAnalyst(question: string): Promise<{
  text: string;
  data?: Record<string, any>[];
  chartType?: "bar" | "line" | "pie" | "area";
  chartConfig?: {
    xAxis: string;
    yAxis: string;
  };
}> {
  try {
    const { data } = await apiClient.post(`${CRM_BASE}/ai/ask`, { question });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

/**
 * POST /api/crm/sales/import - Importa un archivo CSV/Excel con mapeo de columnas
 * Retorna resultado del procesamiento: rows procesadas, exitosas, fallidas + errores
 */
export async function uploadSalesFile(
  file: File,
  columnMappings: Array<{
    sourceIndex: number;
    sourceHeader: string;
    targetField: string;
  }>
): Promise<{
  status: "success" | "partial" | "error";
  rowsProcessed: number;
  rowsSuccess: number;
  rowsFailed: number;
  errors?: Array<{ row: number; error: string }>;
  message: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("columnMappings", JSON.stringify(columnMappings));

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/sales/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

/**
 * POST /api/crm/sales/detect-columns - Detecta columnas en archivo CSV/Excel
 * Retorna sugerencias de mapeo automático basadas en similitud de encabezados
 */
export async function detectColumnsInFile(file: File): Promise<
  Array<{
    index: number;
    header: string;
    suggestedField?: string;
    confidence?: number;
  }>
> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await apiClient.post(`${CRM_BASE}/sales/detect-columns`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    return throwOnApiError(error);
  }
}

// ── Campaign History & Execution ────────────────────────────────────────────

import {
  CampaignResponseSchema,
  type CampaignResponseDTO,
  type SendTestMessageDTO,
} from "@/features/crm/schemas";

/**
 * GET /api/crm/campaigns – Lista campañas de la empresa.
 */
export async function getCampaigns(
  limit = 50,
  offset = 0,
): Promise<{ items: CampaignResponseDTO[]; total: number }> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/campaigns`, {
      params: { limit, offset },
    });

    // El backend devuelve { items, total, limit, offset }
    if (data && Array.isArray(data.items)) {
      const items = z.array(CampaignResponseSchema).parse(data.items);
      return { items, total: data.total ?? items.length };
    }

    // Fallback: respuesta como array plano
    if (Array.isArray(data)) {
      const items = z.array(CampaignResponseSchema).parse(data);
      return { items, total: items.length };
    }

    return { items: [], total: 0 };
  } catch (error) {
    return throwOnApiError(error);
  }
}

/**
 * POST /api/crm/campaigns/:id/execute – Ejecuta una campaña manualmente.
 */
export async function executeCampaign(
  campaignId: string,
): Promise<{ status: string }> {
  try {
    const { data } = await apiClient.post<{ status: string }>(
      `${CRM_BASE}/campaigns/${campaignId}/execute`,
    );
    return z.object({ status: z.string() }).parse(data) as { status: string };
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function updateCampaign(
  campaignId: string,
  body: UpdateCampaignRequest,
): Promise<CampaignResponseDTO> {
  const payload = z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      status: z.string().optional(),
      is_active: z.boolean().optional(),
    })
    .parse(body);

  try {
    const { data } = await apiClient.put(`${CRM_BASE}/campaigns/${campaignId}`, payload);
    return CampaignResponseSchema.parse(data);
  } catch (error) {
    return throwOnApiError(error);
  }
}

export async function getAuditLogs(params?: GetAuditLogsParams): Promise<AuditLogsResponse> {
  try {
    const { data } = await apiClient.get(`${CRM_BASE}/audit-logs`, {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        user_id: params?.user_id,
        entity: params?.entity,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    });

    const parsed = AuditLogsResponseSchema.parse(data);
    const rawItems = parsed.items ?? parsed.logs ?? parsed.data ?? parsed.rows ?? [];
    const items = rawItems.map((item) => ({
      id: String(item.id ?? ""),
      user_id: String(item.user_id ?? ""),
      action: String(item.action ?? ""),
      entity_name: String(item.entity_name ?? ""),
      entity_id: String(item.entity_id ?? ""),
      changes: (item.changes ?? {}) as Record<string, unknown>,
      created_at: String(item.created_at ?? ""),
    }));

    return {
      items,
      total: parsed.total ?? items.length,
      limit: parsed.limit ?? (params?.limit ?? 20),
      offset: parsed.offset ?? (params?.offset ?? 0),
      metrics: parsed.metrics ?? {},
    };
  } catch (error) {
    return throwOnApiError(error);
  }
}

/**
 * POST /api/crm/campaigns/test-message – Envía un mensaje directo de prueba (SMS o WHATSAPP).
 */
export async function sendTestMessage(
  payload: SendTestMessageDTO,
): Promise<{ status: string }> {
  try {
    const { data } = await apiClient.post<{ status: string }>(
      `${CRM_BASE}/campaigns/test-message`,
      payload,
    );
    return z.object({ status: z.string() }).parse(data) as { status: string };
  } catch (error) {
    return throwOnApiError(error);
  }
}
