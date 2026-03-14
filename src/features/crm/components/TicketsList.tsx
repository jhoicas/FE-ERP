import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { getTickets } from "@/features/crm/services";
import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TicketListItem = {
  id: string;
  subject: string;
  description: string;
  status: "open" | "resolved";
  sentiment: "positive" | "neutral" | "negative";
  sla_overdue?: boolean;
};

function StatusBadge({ status }: { status: "open" | "resolved" }) {
  const label = status === "open" ? "Abierto" : "Resuelto";
  const variant = status === "open" ? "default" : "secondary";
  return (
    <Badge variant={variant} className="text-[10px]">
      {label}
    </Badge>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const base = "text-[10px] px-2 py-0.5 rounded-full";
  if (sentiment === "positive") {
    return <span className={`${base} bg-emerald-50 text-emerald-700`}>Positivo</span>;
  }
  if (sentiment === "negative") {
    return <span className={`${base} bg-red-50 text-red-700`}>Negativo</span>;
  }
  return <span className={`${base} bg-amber-50 text-amber-700`}>Neutral</span>;
}

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function TicketsList() {
  const queryClient = useQueryClient();
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketListItem | null>(null);
  const [escalationReason, setEscalationReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["crm", "tickets"],
    queryFn: getTickets,
  });

  const escalateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.put(`/api/crm/tickets/${id}/escalate`, {
        reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["crm-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["crm-ticket"] });
      setSelectedTicket(null);
      setEscalationReason("");
    },
  });

  const items = (data as TicketListItem[] | undefined) ?? [];
  const total = items.length;
  const start = page * rowsPerPage;
  const end = Math.min(start + rowsPerPage, total);
  const pageItems = items.slice(start, end);
  const hasPrev = page > 0;
  const hasNext = end < total;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Tickets de soporte</h2>
          <p className="text-xs text-muted-foreground">
            Consulta el estado de las PQRS y solicitudes de tus clientes.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Tickets CRM")}</p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {total > 0 ? (
            <>
              <ul className="divide-y">
                {pageItems.map((t) => (
                  <li key={t.id} className="p-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{t.subject}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.sla_overdue === true && (
                          <Badge variant="destructive" className="text-[10px]">
                            Vencido SLA
                          </Badge>
                        )}
                        <StatusBadge status={t.status} />
                        <SentimentBadge sentiment={t.sentiment} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedTicket(t);
                          setEscalationReason("");
                        }}
                      >
                        Escalar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {total > rowsPerPage && (
                <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {total === 0 ? 0 : start + 1}–{end} de {total}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Filas por página</span>
                      <Select
                        value={String(rowsPerPage)}
                        onValueChange={(value) => {
                          const size = Number(value);
                          setRowsPerPage(size);
                          setPage(0);
                        }}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROWS_PER_PAGE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasPrev) setPage((p) => Math.max(0, p - 1));
                            }}
                            className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasNext) setPage((p) => p + 1);
                            }}
                            className={!hasNext ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No hay tickets registrados.</p>
          )}
        </div>
      )}

      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
            setEscalationReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalar ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Indica el motivo de la escalación para el ticket seleccionado.
            </p>
            <Textarea
              rows={4}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="Describe el motivo de la escalación"
            />
            {escalateMutation.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(escalateMutation.error, "Escalación de ticket")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedTicket(null);
                setEscalationReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={escalateMutation.isPending || escalationReason.trim().length < 3 || !selectedTicket}
              onClick={() => {
                if (!selectedTicket) return;
                escalateMutation.mutate({
                  id: selectedTicket.id,
                  reason: escalationReason.trim(),
                });
              }}
            >
              {escalateMutation.isPending ? "Escalando…" : "Confirmar escalación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

