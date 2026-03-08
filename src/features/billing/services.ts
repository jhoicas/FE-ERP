import { z } from "zod";
import axios from "axios";
import apiClient from "@/lib/api/client";
import { InvoiceSchema, CreditNoteSchema, type InvoiceDTO, type CreditNoteDTO } from "./schemas";

export async function getInvoices(): Promise<InvoiceDTO[]> {
  const response = await apiClient.get("/api/invoices");
  return z.array(InvoiceSchema).parse(response.data);
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
