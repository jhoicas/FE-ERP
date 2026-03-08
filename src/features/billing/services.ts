import { z } from "zod";
import apiClient from "@/lib/api/client";
import { InvoiceSchema, type InvoiceDTO } from "./schemas";

export async function getInvoices(): Promise<InvoiceDTO[]> {
  const response = await apiClient.get("/api/invoices");
  return z.array(InvoiceSchema).parse(response.data);
}
