import apiClient from "@/lib/api/client";
import { LoginSchema, LoginResponseSchema, type LoginInput, type LoginResponse } from "./schemas";
import { z } from "zod";

export async function loginService(data: LoginInput): Promise<LoginResponse> {
  const validatedData = LoginSchema.parse(data);

  const response = await apiClient.post("/api/auth/login", validatedData);

  const parsed = LoginResponseSchema.parse(response.data);

  return parsed;
}

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
});

const ResolutionSchema = z
  .object({
    id: z.string(),
    prefix: z.string(),
    resolution_number: z.string(),
    from_number: z.number(),
    to_number: z.number(),
    current_number: z.number().optional(),
    valid_from: z.string(),
    valid_to: z.string(),
    alert_threshold: z.number(),
  })
  .passthrough();

export type UserDTO = z.infer<typeof UserSchema>;
export type ResolutionDTO = z.infer<typeof ResolutionSchema>;

export async function getUsers(): Promise<UserDTO[]> {
  const response = await apiClient.get("/api/users");
  return z.array(UserSchema).parse(response.data);
}

export async function createUser(body: {
  name: string;
  email: string;
  password?: string;
  roles: string[];
}): Promise<UserDTO> {
  const response = await apiClient.post("/api/users", body);
  return UserSchema.parse(response.data);
}

export async function updateUser(
  id: string,
  body: {
    name?: string;
    email?: string;
    password?: string;
    roles?: string[];
  },
): Promise<UserDTO> {
  if (id == null || id === "" || String(id) === "undefined") {
    throw new Error("El ID del usuario es obligatorio para actualizar.");
  }
  const response = await apiClient.put(`/api/users/${id}`, body);
  return UserSchema.parse(response.data);
}

export async function getResolutions(): Promise<ResolutionDTO[]> {
  const response = await apiClient.get("/api/resolutions");
  return z.array(ResolutionSchema).parse(response.data);
}

export async function createResolution(body: {
  prefix: string;
  resolution_number: string;
  from_number: number;
  to_number: number;
  current_number?: number;
  valid_from: string;
  valid_to: string;
  alert_threshold: number;
}): Promise<ResolutionDTO> {
  const response = await apiClient.post("/api/resolutions", body);
  return ResolutionSchema.parse(response.data);
}

export async function updateResolution(
  id: string,
  body: {
    prefix?: string;
    resolution_number?: string;
    from_number?: number;
    to_number?: number;
    current_number?: number;
    valid_from?: string;
    valid_to?: string;
    alert_threshold?: number;
  },
): Promise<ResolutionDTO> {
  if (id == null || id === "" || String(id) === "undefined") {
    throw new Error("El ID de la resolución es obligatorio para actualizar.");
  }
  const response = await apiClient.put(`/api/resolutions/${id}`, body);
  return ResolutionSchema.parse(response.data);
}

export async function deleteResolution(id: string): Promise<void> {
  if (id == null || id === "" || String(id) === "undefined") {
    throw new Error("El ID de la resolución es obligatorio para eliminar.");
  }

  await apiClient.delete(`/api/resolutions/${id}`);
}

