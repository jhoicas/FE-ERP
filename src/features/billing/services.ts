import { z } from "zod";
import axios from "axios";
import apiClient from "@/lib/api/client";
import {
  InvoiceSchema,
  CreditNoteSchema,
  DebitNoteSchema,
  CustomerLookupSchema,
  type InvoiceDTO,
  type CreditNoteDTO,
  type DebitNoteDTO,
  type CustomerLookupDTO,
} from "./schemas";

export interface DebitNoteItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateDebitNoteInput {
  reason: string;
  items: DebitNoteItemInput[];
}

export interface VoidInvoiceInput {
  concept: number;
  reason: string;
}

export async function getInvoices(): Promise<InvoiceDTO[]> {
  const response = await apiClient.get("/api/invoices");
  const parsed = z
    .object({
      items: z.array(InvoiceSchema),
    })
    .passthrough()
    .parse(response.data);

  return parsed.items;
}

export async function getCreditNotes(): Promise<CreditNoteDTO[]> {
  try {
    const response = await apiClient.get("/api/invoices/credit-notes");
    return z.array(CreditNoteSchema).parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getDebitNotes(): Promise<DebitNoteDTO[]> {
  try {
    const response = await apiClient.get("/api/invoices/debit-notes");
    return z.array(DebitNoteSchema).parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function lookupCustomer(
  idType: string,
  idNumber: string,
): Promise<CustomerLookupDTO | null> {
  try {
    const response = await apiClient.get("/api/customers/lookup", {
      params: {
        id_type: idType,
        id_number: idNumber,
      },
    });

    return CustomerLookupSchema.parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createDebitNote(
  invoiceId: string,
  payload: CreateDebitNoteInput,
): Promise<unknown> {
  const response = await apiClient.post(`/api/invoices/${invoiceId}/debit-note`, payload);
  return response.data;
}

export async function voidInvoice(
  invoiceId: string,
  payload: VoidInvoiceInput,
): Promise<unknown> {
  const response = await apiClient.post(`/api/invoices/${invoiceId}/void`, payload);
  return response.data;
}

export interface SendInvoiceEmailResult {
  email?: string;
}

export async function sendInvoiceEmail(invoiceId: string): Promise<SendInvoiceEmailResult> {
  const response = await apiClient.post(`/api/invoices/${invoiceId}/send-email`);
  return response.data as SendInvoiceEmailResult;
}

export async function retryDian(invoiceId: string): Promise<unknown> {
  const response = await apiClient.post(`/api/invoices/${invoiceId}/retry-dian`);
  return response.data;
}
