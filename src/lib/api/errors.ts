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
      return moduleName
        ? `El módulo "${moduleName}" no está disponible en tu plan.`
        : "Este módulo no está disponible en tu plan.";
    }
    if (status === 401) return "Sesión expirada. Inicia sesión de nuevo.";
    if (status === 404) return "Recurso no encontrado.";
    if (status && status >= 500) return "Error del servidor. Intenta más tarde.";
    if (typeof data?.message === "string") return data.message;
    if (error.message) return error.message;
  }
  return "Error inesperado. Intenta de nuevo.";
}
