import axios from "axios";

/**
 * Obtiene un mensaje amigable a partir de un error de la API.
 * Maneja 403 MODULE_DISABLED y otros casos comunes.
 */
export function getApiErrorMessage(error: unknown, moduleName?: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { code?: string; message?: string } | undefined;

    if (status === 403 && data?.code === "MODULE_DISABLED") {
      if (typeof data?.message === "string" && data.message.trim().length > 0) {
        return data.message;
      }

      return moduleName
        ? `No tienes acceso a "${moduleName}" con tu rol actual.`
        : "No tienes acceso a este módulo con tu rol actual.";
    }
    if (status === 401) return "Sesión expirada. Inicia sesión de nuevo.";
    if (status === 404) return "Recurso no encontrado.";
    if (status && status >= 500) return "Error del servidor. Intenta más tarde.";
    if (typeof data?.message === "string") return data.message;
    if (error.message) return error.message;
  }
  return "Error inesperado. Intenta de nuevo.";
}
