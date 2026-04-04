import { z } from "zod";
import apiClient from "@/lib/api/client";

export const AdminUserStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const CompanyUserFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
  status: AdminUserStatusSchema,
});

export type UserPayload = z.infer<typeof CompanyUserFormSchema>;

export const CompanyUserSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    email: z.string().email().or(z.string()),
    status: AdminUserStatusSchema,
  })
  .passthrough();

export type CompanyUserDTO = z.infer<typeof CompanyUserSchema>;

function normalizeUsersResponse(data: unknown): CompanyUserDTO[] {
  const payload = data as { items?: unknown; users?: unknown };
  const candidates = Array.isArray(data) ? data : (payload?.items ?? payload?.users);
  return z.array(CompanyUserSchema).catch([]).parse(candidates ?? []);
}

export async function getCompanyUsers(companyId: string): Promise<CompanyUserDTO[]> {
  const response = await apiClient.get(`/api/admin/companies/${companyId}/users`);
  return normalizeUsersResponse(response.data);
}

export async function createCompanyUser(companyId: string, data: UserPayload): Promise<CompanyUserDTO> {
  const response = await apiClient.post(`/api/admin/companies/${companyId}/users`, data);
  return CompanyUserSchema.parse(response.data);
}

export async function updateCompanyUser(companyId: string, userId: string, data: UserPayload): Promise<CompanyUserDTO> {
  const response = await apiClient.put(`/api/admin/companies/${companyId}/users/${userId}`, data);
  return CompanyUserSchema.parse(response.data);
}
