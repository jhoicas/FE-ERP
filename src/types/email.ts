/**
 * Tipos TypeScript del módulo Email/Inbox alineados con el backend NaturERP.
 * Prefijo de rutas: /api/email
 */

/**
 * Configuración de cuenta IMAP para lectura de correos
 */
export interface EmailAccount {
  id: string;
  company_id: string;
  email_address: string;
  imap_server: string;
  imap_port: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Solicitud para crear/actualizar una cuenta de email
 */
export interface EmailAccountRequest {
  email_address: string;
  password: string;
  imap_server: string;
  imap_port: number;
}

/**
 * Solicitud para actualizar una cuenta de email existente
 */
export interface EmailAccountUpdateRequest {
  imap_server?: string;
  imap_port?: number;
  password?: string;
  is_active?: boolean;
}

/**
 * Respuesta de prueba de conexión IMAP
 */
export interface EmailConnectionTestResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Mensaje de correo electrónico recuperado de IMAP
 */
export interface EmailMessage {
  id: string;
  account_id: string;
  message_id: string;
  customer_id?: string;
  from_address: string;
  to_address: string;
  cc_address?: string;
  bcc_address?: string;
  subject: string;
  body_html: string;
  body_text: string;
  received_at: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Solicitud para crear un ticket desde un correo
 */
export interface CreateTicketFromEmailRequest {
  email_id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
}

/**
 * Respuesta al crear un ticket desde un correo
 */
export interface TicketFromEmailResponse {
  id: string;
  email_id: string;
  ticket_id: string;
  created_at: string;
}
