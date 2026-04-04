import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import apiClient from "@/lib/api/client";

const CompanyStatusSchema = z.enum(["Activo", "Inactivo"]);

export const CompanyFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  nit: z.string().min(1, "El NIT es obligatorio"),
  email: z.string().email("Ingresa un correo válido"),
  address: z.string().min(1, "La dirección es obligatoria"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  status: CompanyStatusSchema,
});

export type CompanyFormValues = z.infer<typeof CompanyFormSchema>;

const CompanySchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    nit: z.string(),
    email: z.string().email().or(z.string()).optional().default(""),
    address: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    status: z.string().default("Activo"),
  })
  .passthrough();

export type CompanyDTO = z.infer<typeof CompanySchema>;

const CompanyScreenSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string().optional(),
    label: z.string().optional(),
    title: z.string().optional(),
    frontend_route: z.string().optional(),
    module_id: z.union([z.string(), z.number()]).transform(String).optional(),
    module_name: z.string().optional(),
    module_key: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .passthrough();

export type CompanyScreenDTO = z.infer<typeof CompanyScreenSchema>;

export type CompanyScreensDTO = {
  screens: CompanyScreenDTO[];
  activeScreenIds: string[];
};

function normalizeCompaniesResponse(data: unknown): CompanyDTO[] {
  const candidates = Array.isArray(data) ? data : (data as { companies?: unknown }).companies;
  return z.array(CompanySchema).catch([]).parse(candidates ?? []);
}

export async function getCompanies(): Promise<CompanyDTO[]> {
  const response = await apiClient.get("/api/admin/companies");
  return normalizeCompaniesResponse(response.data);
}

export async function getCompany(companyId: string): Promise<CompanyDTO> {
  const response = await apiClient.get(`/api/admin/companies/${companyId}`);
  return CompanySchema.parse(response.data);
}

export async function createCompany(payload: CompanyFormValues): Promise<CompanyDTO> {
  const response = await apiClient.post("/api/admin/companies", payload);
  return CompanySchema.parse(response.data);
}

export async function updateCompany(companyId: string, payload: CompanyFormValues): Promise<CompanyDTO> {
  const response = await apiClient.put(`/api/admin/companies/${companyId}`, payload);
  return CompanySchema.parse(response.data);
}

export async function getCompanyScreens(companyId: string): Promise<CompanyScreensDTO> {
  const response = await apiClient.get(`/api/admin/companies/${companyId}/screens`);
  const data = response.data as
    | {
        screens?: unknown;
        active_screens?: unknown;
        active_screen_ids?: unknown;
      }
    | unknown;

  const candidateScreens = Array.isArray(data)
    ? data
    : (data as { screens?: unknown }).screens ?? [];

  const screens = z.array(CompanyScreenSchema).catch([]).parse(candidateScreens);

  const activeIdsFromResponse = Array.isArray(data)
    ? screens.filter((screen) => screen.is_active).map((screen) => screen.id)
    : ((data as { active_screen_ids?: unknown; active_screens?: unknown }).active_screen_ids ??
        (data as { active_screens?: unknown }).active_screens ??
        []);

  const activeScreenIds = Array.isArray(activeIdsFromResponse)
    ? activeIdsFromResponse
        .map((item) => {
          if (item && typeof item === "object") {
            const candidate = item as { id?: unknown; screen_id?: unknown };
            return String(candidate.id ?? candidate.screen_id ?? "");
          }
          return String(item ?? "");
        })
        .filter(Boolean)
    : screens.filter((screen) => screen.is_active).map((screen) => screen.id);

  return { screens, activeScreenIds };
}

export async function saveCompanyScreens(companyId: string, screenIds: string[]): Promise<void> {
  await apiClient.put(`/api/admin/companies/${companyId}/screens`, {
    screen_ids: screenIds,
  });
}

export function useCompanies() {
  const query = useQuery({
    queryKey: ["admin-companies"],
    queryFn: getCompanies,
  });

  return {
    companies: query.data ?? [],
    loading: query.isLoading,
    refresh: query.refetch,
  };
}
