import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Download, X } from "lucide-react";

import { getMovements } from "@/features/inventory/services";
import { useProducts, useWarehouses } from "@/features/inventory/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { MovementDTO } from "@/features/inventory/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

type MovementType = "IN" | "OUT" | "ADJUSTMENT";

function MovementTypeBadge({ type }: { type: MovementType }) {
  if (type === "IN")
    return <Badge variant="default" className="text-[10px]">Entrada</Badge>;
  if (type === "OUT")
    return <Badge variant="destructive" className="text-[10px]">Salida</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Ajuste</Badge>;
}

function BalanceCell({ balance, quantity, type }: { balance?: number; quantity: number; type: MovementType }) {
  const value = balance ?? (type === "OUT" ? -Math.abs(quantity) : quantity);
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        isPositive && "text-green-600 dark:text-green-400",
        isNegative && "text-destructive",
        !isPositive && !isNegative && "text-muted-foreground",
      )}
    >
      {isPositive ? "+" : ""}
      {value.toLocaleString("es-CO")}
    </span>
  );
}

function parseSafeDate(str: string | null): Date | undefined {
  if (!str) return undefined;
  try {
    const d = parseISO(str);
    return isValid(d) ? d : undefined;
  } catch {
    return undefined;
  }
}

function exportToCSV(items: MovementDTO[]) {
  const headers = ["Fecha", "Producto", "SKU", "Bodega", "Tipo", "Cantidad", "Saldo", "Notas"];
  const rows = items.map((m) => [
    m.date ? format(parseISO(m.date), "dd/MM/yyyy HH:mm") : "",
    m.product_name ?? m.product_id,
    m.sku ?? "",
    m.warehouse_name ?? m.warehouse_id ?? "",
    m.type === "IN" ? "Entrada" : m.type === "OUT" ? "Salida" : "Ajuste",
    String(m.quantity),
    m.balance != null
      ? String(m.balance)
      : String(m.type === "OUT" ? -Math.abs(m.quantity) : m.quantity),
    m.notes ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movimientos_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MovementsTable() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Init from URL ──────────────────────────────────────────────────────────
  const initialPageSize = PAGE_SIZE_OPTIONS.includes(Number(searchParams.get("pageSize")))
    ? Number(searchParams.get("pageSize"))
    : DEFAULT_PAGE_SIZE;
  const initialOffset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const initialType = (["IN", "OUT", "ADJUSTMENT"].includes(searchParams.get("type") ?? "")
    ? searchParams.get("type")
    : "ALL") as MovementType | "ALL";
  const initialProduct = searchParams.get("product") ?? "ALL";
  const initialWarehouse = searchParams.get("warehouse") ?? "ALL";
  const initialFrom = parseSafeDate(searchParams.get("from"));
  const initialTo = parseSafeDate(searchParams.get("to"));

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [offset, setOffset] = useState(initialOffset);
  const [typeFilter, setTypeFilter] = useState<MovementType | "ALL">(initialType);
  const [productFilter, setProductFilter] = useState<string>(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState<string>(initialWarehouse);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialFrom ? { from: initialFrom, to: initialTo } : undefined,
  );

  // ── URL sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const next = new URLSearchParams();
    if (typeFilter !== "ALL") next.set("type", typeFilter);
    if (productFilter !== "ALL") next.set("product", productFilter);
    if (warehouseFilter !== "ALL") next.set("warehouse", warehouseFilter);
    if (dateRange?.from) next.set("from", format(dateRange.from, "yyyy-MM-dd"));
    if (dateRange?.to) next.set("to", format(dateRange.to, "yyyy-MM-dd"));
    if (offset > 0) next.set("offset", String(offset));
    if (pageSize !== DEFAULT_PAGE_SIZE) next.set("pageSize", String(pageSize));
    setSearchParams(next, { replace: true });
  }, [typeFilter, productFilter, warehouseFilter, dateRange, offset, pageSize, setSearchParams]);

  // ── Filter data for select options ────────────────────────────────────────
  const { data: productsData } = useProducts({ limit: 200 });
  const { data: warehousesData } = useWarehouses({ limit: 100 });
  const products = productsData?.items ?? [];
  const warehouses = warehousesData?.items ?? [];

  // ── Main query ─────────────────────────────────────────────────────────────
  const queryParams = {
    product_id: productFilter !== "ALL" ? productFilter : undefined,
    warehouse_id: warehouseFilter !== "ALL" ? warehouseFilter : undefined,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
    from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    limit: pageSize,
    offset,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory", "movements", queryParams],
    queryFn: () => getMovements(queryParams),
  });

  const items = data?.items ?? [];
  const total = typeof data?.total === "number" ? data.total : undefined;
  const hasMore =
    typeof total === "number" ? offset + items.length < total : items.length === pageSize;
  const hasPrev = offset > 0;

  // ── Reset offset when filters change ──────────────────────────────────────
  function clearDateRange() {
    setDateRange(undefined);
    setOffset(0);
  }

  // ── Date range label ───────────────────────────────────────────────────────
  const dateLabel = (() => {
    if (!dateRange?.from) return "Seleccionar rango";
    if (dateRange.to) {
      return `${format(dateRange.from, "dd MMM", { locale: es })} – ${format(dateRange.to, "dd MMM yyyy", { locale: es })}`;
    }
    return format(dateRange.from, "dd MMM yyyy", { locale: es });
  })();

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5",
                dateRange?.from && "border-primary/60 bg-primary/5 text-primary",
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range ?? undefined);
                setOffset(0);
              }}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {dateRange?.from && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearDateRange}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Tipo */}
        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v as MovementType | "ALL"); setOffset(0); }}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            <SelectItem value="IN">Entrada</SelectItem>
            <SelectItem value="OUT">Salida</SelectItem>
            <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
          </SelectContent>
        </Select>

        {/* Producto */}
        <Select
          value={productFilter}
          onValueChange={(v) => { setProductFilter(v); setOffset(0); }}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los productos</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bodega */}
        <Select
          value={warehouseFilter}
          onValueChange={(v) => { setWarehouseFilter(v); setOffset(0); }}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Bodega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las bodegas</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={items.length === 0}
            onClick={() => exportToCSV(items)}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Inventario / Movimientos")}
        </p>
      )}

      {/* ── Table ── */}
      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-xs text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs text-muted-foreground">Bodega</TableHead>
                <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Cantidad</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Saldo</TableHead>
                <TableHead className="text-xs text-muted-foreground">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No hay movimientos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {m.date
                        ? format(parseISO(m.date), "dd/MM/yyyy HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <span>{m.product_name ?? m.product_id}</span>
                      {m.sku && (
                        <span className="block font-mono text-[10px] text-muted-foreground">
                          {m.sku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.warehouse_name ?? m.warehouse_id ?? "—"}
                    </TableCell>
                    <TableCell>
                      <MovementTypeBadge type={m.type} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {m.quantity.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <BalanceCell
                        balance={m.balance}
                        quantity={m.quantity}
                        type={m.type}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {m.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* ── Footer ── */}
          {items.length > 0 && (
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
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setOffset(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                        aria-disabled={!hasPrev}
                        className={cn(!hasPrev && "pointer-events-none opacity-40")}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setOffset((o) => o + pageSize)}
                        aria-disabled={!hasMore}
                        className={cn(!hasMore && "pointer-events-none opacity-40")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

