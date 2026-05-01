import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { BellRing, Eye, Loader2, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCrmNotifications } from "@/features/crm/services";
import type { CrmNotificationLog, CrmNotificationType } from "@/types/crm";

type DateRangeValue = {
  from: string;
  to: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
function formatTypeLabel(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized === "BIRTHDAY") return "Cumpleanos";
  if (normalized === "CAMPAIGN") return "Campana";
  return normalized;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationTypeBadge(type?: string | null) {
  const normalized = (type ?? "").toUpperCase();
  if (normalized === "BIRTHDAY") {
    return (
      <Badge
        variant="outline"
        className="border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
      >
        BIRTHDAY
      </Badge>
    );
  }
  if (normalized === "CAMPAIGN") {
    return (
      <Badge
        variant="outline"
        className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      >
        CAMPAIGN
      </Badge>
    );
  }
  return <Badge variant="secondary">{normalized || "—"}</Badge>;
}

function statusBadge(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "success" || normalized === "sent" || normalized === "completed") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        Exito
      </Badge>
    );
  }
  if (normalized === "error" || normalized === "failed") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
      >
        Error
      </Badge>
    );
  }
  return <Badge variant="secondary">{status ?? "—"}</Badge>;
}

function DatePickerWithRange({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start-date">Fecha inicial</Label>
        <Input
          id="start-date"
          type="date"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-date">Fecha final</Label>
        <Input
          id="end-date"
          type="date"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </div>
    </div>
  );
}

export default function CRMNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";
  const initialType = (searchParams.get("type") as "ALL" | CrmNotificationType | null) ?? "ALL";
  const initialPageIndex = Math.max(Number(searchParams.get("pageIndex") ?? "0") || 0, 0);
  const initialPageSizeRaw = Number(searchParams.get("pageSize") ?? "10");
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(initialPageSizeRaw as 10 | 20 | 50) ? initialPageSizeRaw : 10;

  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: initialFrom, to: initialTo });
  const [selectedType, setSelectedType] = useState<"ALL" | CrmNotificationType>(initialType);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [selectedNotification, setSelectedNotification] = useState<CrmNotificationLog | null>(null);

  const offset = pageIndex * pageSize;

  useEffect(() => {
    setPageIndex(0);
  }, [dateRange.from, dateRange.to, selectedType]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (dateRange.from) {
      nextParams.set("from", dateRange.from);
    }
    if (dateRange.to) {
      nextParams.set("to", dateRange.to);
    }
    if (selectedType !== "ALL") {
      nextParams.set("type", selectedType);
    }
    if (pageIndex > 0) {
      nextParams.set("pageIndex", String(pageIndex));
    }
    if (pageSize !== 10) {
      nextParams.set("pageSize", String(pageSize));
    }

    setSearchParams(nextParams, { replace: true });
  }, [dateRange.from, dateRange.to, selectedType, pageIndex, pageSize, setSearchParams]);

  const notificationsQuery = useQuery({
    queryKey: ["crm", "notifications", dateRange.from, dateRange.to, selectedType, pageIndex, pageSize],
    queryFn: () =>
      getCrmNotifications({
        start_date: dateRange.from || undefined,
        end_date: dateRange.to || undefined,
        type: selectedType === "ALL" ? undefined : selectedType,
        limit: pageSize,
        offset,
      }),
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const total = typeof notificationsQuery.data?.total === "number" ? notificationsQuery.data.total : 0;
  const availableTypes = notificationsQuery.data?.types ?? [];
  const typeOptions: Array<{ value: "ALL" | CrmNotificationType; label: string }> = [
    { value: "ALL", label: "Todos" },
    ...availableTypes.map((type) => ({
      value: type as CrmNotificationType,
      label: formatTypeLabel(type),
    })),
  ];
  const hasPrev = pageIndex > 0;
  const hasMore = offset + notifications.length < total;

  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(selectedNotification?.body_html ?? ""),
    [selectedNotification?.body_html],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BellRing className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bitacora de Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Historial de correos y mensajes enviados desde automatizaciones y campanas.
          </p>
        </div>
      </div>

      <Card className="erp-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de notificacion</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as "ALL" | CrmNotificationType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateRange({ from: "", to: "" });
              setSelectedType("ALL");
              setPageIndex(0);
              setPageSize(10);
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </Card>

      <Card className="erp-card overflow-hidden">
        {notificationsQuery.isLoading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        )}

        {notificationsQuery.isError && (
          <div className="p-6 text-sm text-destructive text-center">
            No se pudo cargar la bitacora: {(notificationsQuery.error as Error).message}
          </div>
        )}

        {!notificationsQuery.isLoading && !notificationsQuery.isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead className="text-right">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No hay notificaciones para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(notification.sent_at ?? notification.created_at)}
                    </TableCell>
                    <TableCell>{notificationTypeBadge(notification.type)}</TableCell>
                    <TableCell className="font-medium">
                      {notification.customer_name ??
                        notification.customer_email ??
                        notification.customer_phone ??
                        "—"}
                    </TableCell>
                    <TableCell className="max-w-[380px] truncate">
                      {notification.subject ?? "Sin asunto"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedNotification(notification)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver Mensaje
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {offset + 1}–{offset + notifications.length}
              {total > 0 ? ` de ${total}` : ""}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Filas por pagina</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageIndex(0);
                    setPageSize(Number(value));
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
                        if (hasPrev) setPageIndex((prev) => Math.max(0, prev - 1));
                      }}
                      className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (hasMore) setPageIndex((prev) => prev + 1);
                      }}
                      className={!hasMore ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </Card>

      <Sheet
        open={selectedNotification != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedNotification?.subject ?? "Detalle de notificacion"}</SheetTitle>
            <SheetDescription>
              Revisa el contenido enviado y el estado de la entrega.
            </SheetDescription>
          </SheetHeader>

          {!selectedNotification ? (
            <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 flex flex-wrap gap-2">
                {notificationTypeBadge(selectedNotification.type)}
                {statusBadge(selectedNotification.status)}
              </div>

              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-semibold">Mensaje renderizado</p>
                </div>
                {sanitizedHtml ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No hay contenido HTML disponible.</p>
                )}
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
