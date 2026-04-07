import apiClient from "@/lib/api/client";
import type { Tenant } from "@/types/admin";

function normalizeTenantsResponse(payload: unknown): Tenant[] {
  if (Array.isArray(payload)) {
    return payload as Tenant[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as Tenant[];
    }

    if (Array.isArray(record.items)) {
      return record.items as Tenant[];
    }

    if (Array.isArray(record.companies)) {
      return record.companies as Tenant[];
    }
  }

  return [];
}

export async function getTenants(): Promise<Tenant[]> {
  const response = await apiClient.get("/api/admin/companies");
  return normalizeTenantsResponse(response.data);
}

export async function toggleTenantModule(
  tenantId: string,
  module: string,
  isActive: boolean,
): Promise<void> {
  await apiClient.put(`/api/admin/companies/${tenantId}/modules`, {
    module,
    isActive,
  });
}

export async function updateRolePermissions(
  role: string,
  permissions: Record<string, boolean>,
): Promise<void> {
  await apiClient.put("/api/admin/roles/permissions", {
    role,
    permissions,
  });
}
