/**
 * Servicios API para el módulo de Email/Inbox
 * Incluye funciones para gestionar cuentas de email, mensajes e integración con tickets
 */

import { apiClient } from "@/lib/api/client";
import {
  EmailAccount,
  EmailAccountRequest,
  EmailAccountUpdateRequest,
  EmailConnectionTestResponse,
  EmailMessage,
  CreateTicketFromEmailRequest,
  TicketFromEmailResponse,
} from "@/types/email";

const EMAIL_API_PREFIX = "/api/email";
const EMAIL_SETTINGS_API_PREFIX = "/api/settings";

function toImapHost(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.hostname;
  } catch {
    return trimmedValue.replace(/^imaps?:\/\//i, "");
  }
}

function toImapUrl(value: string): string {
  const host = toImapHost(value);
  if (!host) {
    return host;
  }

  return /^imaps?:\/\//i.test(value.trim()) ? value.trim() : `imaps://${host}`;
}

/**
 * Obtiene todas las cuentas de email configuradas de la empresa
 */
export async function getEmailAccounts(): Promise<EmailAccount[]> {
  try {
    const response = await apiClient.get<EmailAccount[]>(
      `${EMAIL_SETTINGS_API_PREFIX}/email-accounts`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching email accounts:", error);
    throw error;
  }
}

/**
 * Obtiene una cuenta de email específica por ID
 */
export async function getEmailAccount(
  accountId: string,
): Promise<EmailAccount> {
  try {
    const response = await apiClient.get<EmailAccount>(
      `${EMAIL_SETTINGS_API_PREFIX}/email-accounts/${accountId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching email account:", error);
    throw error;
  }
}

/**
 * Guarda o actualiza una configuración de cuenta IMAP
 * @param data - Datos de la cuenta (email, contraseña, servidor y puerto IMAP)
 * @returns La cuenta creada/actualizada
 */
export async function saveEmailAccount(
  data: EmailAccountRequest,
): Promise<EmailAccount> {
  try {
    const payload: EmailAccountRequest = {
      ...data,
      imap_server: toImapHost(data.imap_server),
    };

    const response = await apiClient.post<EmailAccount>(
      `${EMAIL_SETTINGS_API_PREFIX}/email-accounts`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error saving email account:", error);
    throw error;
  }
}

/**
 * Prueba la conexión IMAP antes de guardar la configuración
 * @param data - Datos de la cuenta a probar
 */
export async function testEmailConnection(
  data: EmailAccountRequest,
): Promise<EmailConnectionTestResponse> {
  try {
    const payload: EmailAccountRequest = {
      ...data,
      imap_server: toImapUrl(data.imap_server),
    };

    try {
      const response = await apiClient.post<EmailConnectionTestResponse>(
        `${EMAIL_SETTINGS_API_PREFIX}/email-accounts/test-connection`,
        payload,
      );
      return response.data;
    } catch {
      const fallbackResponse = await apiClient.post<EmailConnectionTestResponse>(
        `${EMAIL_API_PREFIX}/accounts/test-connection`,
        payload,
      );
      return fallbackResponse.data;
    }
  } catch (error) {
    console.error("Error testing email connection:", error);
    throw error;
  }
}

/**
 * Actualiza una cuenta de email existente
 */
export async function updateEmailAccount(
  accountId: string,
  data: EmailAccountUpdateRequest,
): Promise<EmailAccount> {
  try {
    const payload: EmailAccountUpdateRequest = {
      ...data,
      imap_server: data.imap_server ? toImapHost(data.imap_server) : undefined,
    };

    const response = await apiClient.put<EmailAccount>(
      `${EMAIL_SETTINGS_API_PREFIX}/email-accounts/${accountId}`,
      payload,
    );

    return response.data;
  } catch (error) {
    console.error("Error updating email account:", error);
    throw error;
  }
}

/**
 * Prueba una cuenta existente después de guardarla
 */
export async function testSavedEmailAccount(
  accountId: string,
): Promise<EmailConnectionTestResponse> {
  try {
    const response = await apiClient.post<EmailConnectionTestResponse>(
      `${EMAIL_SETTINGS_API_PREFIX}/email-accounts/${accountId}/test`,
    );
    return response.data;
  } catch (error) {
    console.error("Error testing saved email account:", error);
    throw error;
  }
}

/**
 * Obtiene todos los correos de una cuenta específica
 * @param accountId - ID de la cuenta de email
 * @param options - Opciones de paginación y filtro
 */
export async function getEmails(
  accountId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean },
): Promise<EmailMessage[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.unreadOnly) params.append("unreadOnly", "true");

    const response = await apiClient.get<EmailMessage[]>(
      `${EMAIL_API_PREFIX}/accounts/${accountId}/emails${params.toString() ? `?${params.toString()}` : ""}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
}

/**
 * Obtiene un correo específico por ID
 * @param emailId - ID del correo
 */
export async function getEmailById(emailId: string): Promise<EmailMessage> {
  try {
    const response = await apiClient.get<EmailMessage>(
      `${EMAIL_API_PREFIX}/emails/${emailId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching email:", error);
    throw error;
  }
}

/**
 * Marca un correo como leído
 * @param emailId - ID del correo
 */
export async function markEmailAsRead(emailId: string): Promise<void> {
  try {
    await apiClient.patch(`${EMAIL_API_PREFIX}/emails/${emailId}`, {
      is_read: true,
    });
  } catch (error) {
    console.error("Error marking email as read:", error);
    throw error;
  }
}

/**
 * Marca un correo como no leído
 * @param emailId - ID del correo
 */
export async function markEmailAsUnread(emailId: string): Promise<void> {
  try {
    await apiClient.patch(`${EMAIL_API_PREFIX}/emails/${emailId}`, {
      is_read: false,
    });
  } catch (error) {
    console.error("Error marking email as unread:", error);
    throw error;
  }
}

/**
 * Crea un ticket CRM a partir de un correo existente
 * @param emailId - ID del correo fuente
 * @param data - Datos para crear el ticket (título, descripción, prioridad, etc)
 * @returns Información del ticket creado
 */
export async function createTicketFromEmail(
  emailId: string,
  data: Omit<CreateTicketFromEmailRequest, "email_id">,
): Promise<TicketFromEmailResponse> {
  try {
    const response = await apiClient.post<TicketFromEmailResponse>(
      `${EMAIL_API_PREFIX}/emails/${emailId}/create-ticket`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error creating ticket from email:", error);
    throw error;
  }
}

/**
 * Obtiene correos asociados a un cliente específico
 * @param customerId - ID del cliente
 */
export async function getEmailsByCustomer(
  customerId: string,
): Promise<EmailMessage[]> {
  try {
    const response = await apiClient.get<EmailMessage[]>(
      `${EMAIL_API_PREFIX}/customers/${customerId}/emails`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching customer emails:", error);
    throw error;
  }
}

/**
 * Sincroniza los correos de una cuenta con el servidor IMAP
 * @param accountId - ID de la cuenta a sincronizar
 */
export async function syncEmailAccount(accountId: string): Promise<void> {
  try {
    await apiClient.post(
      `${EMAIL_API_PREFIX}/accounts/${accountId}/sync`,
    );
  } catch (error) {
    console.error("Error syncing email account:", error);
    throw error;
  }
}

/**
 * Elimina una cuenta de email
 * @param accountId - ID de la cuenta a eliminar
 */
export async function deleteEmailAccount(accountId: string): Promise<void> {
  try {
    await apiClient.delete(`${EMAIL_API_PREFIX}/accounts/${accountId}`);
  } catch (error) {
    console.error("Error deleting email account:", error);
    throw error;
  }
}
