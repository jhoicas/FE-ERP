import { z } from "zod";
import apiClient from "@/lib/api/client";
import { CustomerSchema, TicketSchema, type CustomerDTO, type TicketDTO } from "./schemas";

export async function getCustomers(): Promise<CustomerDTO[]> {
  const response = await apiClient.get("/api/customers");
  return z.array(CustomerSchema).parse(response.data);
}

export async function getTickets(): Promise<TicketDTO[]> {
  const response = await apiClient.get("/api/crm/tickets");
  return z.array(TicketSchema).parse(response.data);
}
