import { z } from "zod";
import apiClient from "@/lib/api/client";
import type { Module, Screen } from "@/types/admin";

const ModuleSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    key: z.string().min(1),
    name: z.string().min(1),
  })
  .passthrough();

const ScreenSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    module_id: z.union([z.string(), z.number()]).transform(String),
    key: z.string().min(1),
    name: z.string().min(1),
    frontend_route: z.string().min(1),
    api_endpoint: z.string().optional().nullable().transform((value) => value ?? ""),
    order: z.number().int(),
    is_active: z.boolean(),
  })
  .passthrough();

const ScreenPayloadSchema = z.object({
  module_id: z.string().min(1, "El módulo es obligatorio"),
  key: z.string().min(1, "La key es obligatoria"),
  name: z.string().min(1, "El nombre es obligatorio"),
  frontend_route: z.string().min(1, "La ruta frontend es obligatoria"),
  api_endpoint: z.string().optional().default(""),
  order: z.coerce.number().int().min(0, "El orden debe ser mayor o igual a 0"),
  is_active: z.boolean(),
});

export type ScreenPayload = z.infer<typeof ScreenPayloadSchema>;
export type ScreenDTO = z.infer<typeof ScreenSchema>;
export type ModuleDTO = z.infer<typeof ModuleSchema>;

function normalizeScreenResponse(data: unknown): ScreenDTO[] {
  const payload = data as { items?: unknown; screens?: unknown };
  const candidates = Array.isArray(data) ? data : (payload?.items ?? payload?.screens);
  return z.array(ScreenSchema).catch([]).parse(candidates ?? []);
}

export async function getScreens(): Promise<Screen[]> {
  const response = await apiClient.get("/api/admin/screens");
  return normalizeScreenResponse(response.data) as Screen[];
}

export async function getModules(): Promise<Module[]> {
  const response = await apiClient.get("/api/admin/modules");
  const payload = response.data as { items?: unknown; modules?: unknown };
  const candidates = Array.isArray(response.data) ? response.data : (payload?.items ?? payload?.modules);
  return z.array(ModuleSchema).catch([]).parse(candidates ?? []) as Module[];
}

export async function createScreen(payload: ScreenPayload): Promise<Screen> {
  const validated = ScreenPayloadSchema.parse(payload);
  const response = await apiClient.post("/api/admin/screens", validated);
  return ScreenSchema.parse(response.data) as Screen;
}

export async function updateScreen(id: string, payload: ScreenPayload): Promise<Screen> {
  const validated = ScreenPayloadSchema.parse(payload);
  const response = await apiClient.put(`/api/admin/screens/${id}`, validated);
  return ScreenSchema.parse(response.data) as Screen;
}
