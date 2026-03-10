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

export type UserDTO = z.infer<typeof UserSchema>;

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

