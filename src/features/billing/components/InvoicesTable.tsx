import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";

import { getInvoices } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import DebitNoteDialog from "@/features/billing/components/DebitNoteDialog";
import VoidInvoiceDialog from "@/features/billing/components/VoidInvoiceDialog";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "Sent", label: "Enviada" },
  { value: "Error", label: "Error" },
  { value: "DRAFT", label: "Borrador" },
  { value: "Pending", label: "Pendiente" },
] as const;

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
}) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "dd/MM/yyyy")} - ${format(value.to, "dd/MM/yyyy")}`
      : format(value.from, "dd/MM/yyyy")
    : "Rango de fechas";

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Fecha</p>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal h-10 w-full sm:w-[260px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="truncate">{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {value?.from && (
          <Button variant="ghost" type="button" className="text-xs" onClick={() => onChange(undefined)}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "SENT") {
    return (
      <Badge variant="default" className="text-[10px]">
        Enviada
      </Badge>
    );
  }

  if (normalized === "ERROR") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Error
      </Badge>
    );
  }

  if (normalized === "DRAFT" || normalized === "PENDING") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        {normalized === "DRAFT" ? "Borrador" : "Pendiente"}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-[10px]">
      {status}
    </Badge>
  );
}

export default function InvoicesTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPageSize = Number(searchParams.get("pageSize")) || 5;
  const initialOffset = Number(searchParams.get("offset")) || 0;
  const initialCustomer = searchParams.get("customer") ?? "";
  const initialPrefix = searchParams.get("prefix") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialFrom = searchParams.get("from");
  const initialTo = searchParams.get("to");

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [offset, setOffset] = useState(initialOffset);
  const [customerFilter, setCustomerFilter] = useState(initialCustomer);
  const [prefixFilter, setPrefixFilter] = useState(initialPrefix);
  const [debouncedCustomerFilter, setDebouncedCustomerFilter] = useState(initialCustomer.toLowerCase());
  const [debouncedPrefixFilter, setDebouncedPrefixFilter] = useState(initialPrefix.toLowerCase());
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialFrom || initialTo
      ? {
          from: initialFrom ? new Date(initialFrom) : undefined,
          to: initialTo ? new Date(initialTo) : undefined,
        }
      : undefined,
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: getInvoices,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedCustomerFilter(customerFilter.trim().toLowerCase());
      setOffset(0);
    }, 400);

    return () => clearTimeout(handle);
  }, [customerFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedPrefixFilter(prefixFilter.trim().toLowerCase());
      setOffset(0);
    }, 400);

    return () => clearTimeout(handle);
  }, [prefixFilter]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, dateRange?.from, dateRange?.to]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (customerFilter.trim()) {
      nextParams.set("customer", customerFilter.trim());
    }

    if (prefixFilter.trim()) {
      nextParams.set("prefix", prefixFilter.trim());
    }

    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }

    if (dateRange?.from) {
      nextParams.set("from", dateRange.from.toISOString().slice(0, 10));
    }

    if (dateRange?.to) {
      nextParams.set("to", dateRange.to.toISOString().slice(0, 10));
    }

    if (offset > 0) {
      nextParams.set("offset", String(offset));
    }

    if (pageSize !== 5) {
      nextParams.set("pageSize", String(pageSize));
    }

    setSearchParams(nextParams, { replace: true });
  }, [customerFilter, prefixFilter, statusFilter, dateRange, offset, pageSize, setSearchParams]);

  const filteredInvoices = useMemo(() => {
    const items = data ?? [];

    return items.filter((invoice) => {
      const matchesCustomer = debouncedCustomerFilter
        ? invoice.customer_name?.toLowerCase().includes(debouncedCustomerFilter)
        : true;
      const matchesPrefix = debouncedPrefixFilter
        ? invoice.prefix?.toLowerCase().includes(debouncedPrefixFilter)
        : true;
      const matchesStatus = statusFilter === "all" ? true : invoice.dian_status === statusFilter;

      const invoiceDate = new Date(invoice.date);
      const from = dateRange?.from ? new Date(dateRange.from) : null;
      const to = dateRange?.to ? new Date(dateRange.to) : null;

      if (from) {
        from.setHours(0, 0, 0, 0);
      }

      if (to) {
        to.setHours(23, 59, 59, 999);
      }

      const matchesDate =
        (!from || invoiceDate >= from) &&
        (!to || invoiceDate <= to);

      return matchesCustomer && matchesPrefix && matchesStatus && matchesDate;
    });
  }, [data, debouncedCustomerFilter, debouncedPrefixFilter, statusFilter, dateRange]);

  const items = filteredInvoices.slice(offset, offset + pageSize);
  const total = filteredInvoices.length;
  const hasMore = offset + items.length < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <Input
            placeholder="Buscar cliente…"
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Estado DIAN</p>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Prefijo</p>
          <Input
            placeholder="Buscar prefijo…"
            value={prefixFilter}
            onChange={(event) => setPrefixFilter(event.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Facturación / Facturas")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {items.length > 0 ? (
            <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Factura</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Fecha</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">
                    Estado <ExplainableAcronym sigla="DIAN" />
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => {
                  const displayNumber = inv.prefix ? `${inv.prefix}-${inv.number}` : inv.number;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{displayNumber}</p>
                            {inv.customer_name && (
                              <p className="text-xs text-muted-foreground truncate">{inv.customer_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${inv.grand_total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={inv.dian_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {inv.dian_status === "Sent" && (
                            <>
                              <VoidInvoiceDialog invoiceId={inv.id} invoiceNumber={displayNumber} />
                              <DebitNoteDialog invoiceId={inv.id} invoiceNumber={displayNumber} />
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs">
                            Ver XML
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–{offset + items.length}
                {typeof total === "number" && total > 0 ? ` de ${total}` : ""}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      const size = Number(value);
                      setOffset(0);
                      setPageSize(size);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
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
                        onClick={(event) => {
                          event.preventDefault();
                          if (hasPrev) setOffset((current) => Math.max(0, current - pageSize));
                        }}
                        className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (hasMore) setOffset((current) => current + pageSize);
                        }}
                        className={!hasMore ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {data && data.length > 0
                ? "No se encontraron facturas con los filtros seleccionados."
                : "No hay facturas registradas."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

