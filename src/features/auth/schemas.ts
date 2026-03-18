import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.record(z.unknown()),
  role_id: z.string().optional(),
  role_key: z.string().optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

