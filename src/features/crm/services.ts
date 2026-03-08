import { z } from "zod";
import apiClient from "@/lib/api/client";
import { CustomerSchema, TicketSchema, CrmTaskSchema, type CustomerDTO, type TicketDTO, type CrmTaskDTO } from "./schemas";

export async function getCustomers(): Promise<CustomerDTO[]> {
  const response = await apiClient.get("/api/customers");
  return z.array(CustomerSchema).parse(response.data);
}

export async function getTickets(): Promise<TicketDTO[]> {
  const response = await apiClient.get("/api/crm/tickets");
  return z.array(TicketSchema).parse(response.data);
}

export async function getTasks(): Promise<CrmTaskDTO[]> {
  const response = await apiClient.get("/api/crm/tasks");
  return z.array(CrmTaskSchema).parse(response.data);
}
