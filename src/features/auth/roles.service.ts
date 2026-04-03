export async function deleteRole(companyId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/api/companies/${companyId}/roles/${roleId}`);
}
import apiClient from "@/lib/api/client";
import { z } from "zod";

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  company_id: z.string(),
  screen_ids: z.array(z.string()),
});

export type RoleDTO = z.infer<typeof RoleSchema>;

export async function getRoles(companyId: string): Promise<RoleDTO[]> {
  const { data } = await apiClient.get(`/api/companies/${companyId}/roles`);
  return z.array(RoleSchema).parse(data);
}

export async function createRole(payload: { name: string; description?: string; company_id: string; screen_ids: string[] }): Promise<RoleDTO> {
  const { data } = await apiClient.post(`/api/companies/${payload.company_id}/roles`, payload);
  return RoleSchema.parse(data);
}

export async function updateRole(roleId: string, payload: { name: string; description?: string; screen_ids: string[]; company_id: string }): Promise<RoleDTO> {
  const { data } = await apiClient.put(`/api/companies/${payload.company_id}/roles/${roleId}`, payload);
  return RoleSchema.parse(data);
}
