import apiClient from "@/lib/api/client";
import { LoginSchema, LoginResponseSchema, type LoginInput, type LoginResponse } from "./schemas";

export async function loginService(data: LoginInput): Promise<LoginResponse> {
  const validatedData = LoginSchema.parse(data);

  const response = await apiClient.post("/api/auth/login", validatedData);

  const parsed = LoginResponseSchema.parse(response.data);

  return parsed;
}

