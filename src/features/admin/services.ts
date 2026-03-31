import apiClient from "@/lib/api/client";
import type { Tenant } from "@/types/admin";

export async function getTenants(): Promise<Tenant[]> {
  const response = await apiClient.get("/api/admin/companies");
  return response.data as Tenant[];
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
