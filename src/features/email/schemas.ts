/**
 * Esquemas de validación Zod para el módulo de Email
 * Incluye validaciones para OAuth (Google, Microsoft) e IMAP/SMTP personalizado
 */

import * as z from "zod";

/**
 * Schema para configuración de IMAP/SMTP personalizado
 */
export const customImapSmtpSchema = z.object({
  email_address: z
    .string()
    .email("Ingrese un correo electrónico válido")
    .min(1, "El correo electrónico es requerido"),
  imap_host: z
    .string()
    .min(1, "El servidor IMAP es requerido")
    .refine(
      (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return false;

        // Validar que sea hostname o URL válida
        if (/^[a-zA-Z0-9.-]+$/.test(trimmedValue)) {
          return true;
        }

        try {
          const parsedUrl = new URL(trimmedValue);
          return ["imap:", "imaps:"].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      },
      "Ingrese un host válido (ej: imap.gmail.com)",
    ),
  imap_port: z
    .number()
    .int("El puerto debe ser un número entero")
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65536"),
  smtp_host: z
    .string()
    .min(1, "El servidor SMTP es requerido")
    .refine(
      (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return false;

        if (/^[a-zA-Z0-9.-]+$/.test(trimmedValue)) {
          return true;
        }

        try {
          const parsedUrl = new URL(trimmedValue);
          return ["smtp:", "smtps:"].includes(parsedUrl.protocol);
        } catch {
          return false;
        }
      },
      "Ingrese un host válido (ej: smtp.gmail.com)",
    ),
  smtp_port: z
    .number()
    .int("El puerto debe ser un número entero")
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65536"),
  app_password: z
    .string()
    .min(1, "La contraseña de aplicación es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type CustomImapSmtpFormData = z.infer<typeof customImapSmtpSchema>;

/**
 * Schema para respuesta de OAuth de Google
 */
export const googleOAuthSchema = z.object({
  credential: z.string().min(1, "Token de Google requerido"),
});

export type GoogleOAuthFormData = z.infer<typeof googleOAuthSchema>;

/**
 * Schema para respuesta de OAuth de Microsoft
 */
export const microsoftOAuthSchema = z.object({
  access_token: z.string().min(1, "Token de Microsoft requerido"),
  id_token: z.string().optional(),
});

export type MicrosoftOAuthFormData = z.infer<typeof microsoftOAuthSchema>;

/**
 * Schema para solicitud de configuración de email OAuth
 */
export const emailOAuthConfigSchema = z.object({
  provider: z.enum(["google", "microsoft"], {
    errorMap: () => ({ message: "Proveedor no válido" }),
  }),
  token: z.string().min(1, "Token requerido"),
  email_address: z.string().email("Correo electrónico no válido"),
});

export type EmailOAuthConfigData = z.infer<typeof emailOAuthConfigSchema>;

/**
 * Schema para solicitud de configuración de IMAP/SMTP personalizado
 */
export const emailCustomConfigSchema = z.object({
  email_address: z.string().email("Correo electrónico no válido"),
  imap_host: z.string().min(1, "Servidor IMAP requerido"),
  imap_port: z.number().min(1).max(65535),
  smtp_host: z.string().min(1, "Servidor SMTP requerido"),
  smtp_port: z.number().min(1).max(65535),
  app_password: z.string().min(1, "Contraseña requerida"),
});

export type EmailCustomConfigData = z.infer<typeof emailCustomConfigSchema>;
