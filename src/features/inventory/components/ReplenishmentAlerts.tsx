import { useMemo, useState } from "react";
import { CircleAlert, AlertCircle, Filter } from "lucide-react";

import { useReplenishmentList, useWarehouses } from "@/features/inventory/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { ReplenishmentSuggestionDTO } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

function formatDecimal(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function priorityBadge(priority: number) {
  if (priority === 1) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Prioridad 1
      </Badge>
    );
  }
  if (priority === 2) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/60 text-amber-800 dark:text-amber-300 text-[10px]"
      >
        Prioridad 2
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px]">
      Prioridad {priority}
    </Badge>
  );
}

export default function ReplenishmentAlerts() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("_all");
  const [priorityFilter, setPriorityFilter] = useState<string>("_all");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(0);

  const warehousesQuery = useWarehouses({ limit: 100, offset: 0 }, undefined);
  const replenishmentQuery = useReplenishmentList(
    { warehouse_id: selectedWarehouse === "_all" ? undefined : selectedWarehouse },
    undefined,
  );

  const filteredItems = useMemo(() => {
    const items: ReplenishmentSuggestionDTO[] =
      replenishmentQuery.data?.replenishments ?? [];

    return items.filter((r) => {
      const matchesPriority =
        priorityFilter === "_all" || String(r.priority) === priorityFilter;

      const q = search.trim().toLowerCase();
      const matchesText =
        q.length === 0 ||
        r.sku.toLowerCase().includes(q) ||
        r.product_name.toLowerCase().includes(q);

      return matchesPriority && matchesText;
    });
  }, [replenishmentQuery.data, priorityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filteredItems.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage,
  );

  const handleRowsPerPageChange = (value: string) => {
    const size = Number(value);
    setRowsPerPage(size);
    setPage(0);
  };

  const handlePageChange = (next: number) => {
    if (next < 0 || next >= totalPages) return;
    setPage(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-warning" />
        <div>
          <h2 className="text-sm font-semibold">Alertas de reposición</h2>
          <p className="text-xs text-muted-foreground">
            Sugerencias de compra basadas en stock actual, puntos de pedido y prioridad.
          </p>
        </div>
      </div>

      <Card className="erp-card p-0 overflow-hidden">
        <CardHeader className="space-y-3 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Sugerencias de reabastecimiento</CardTitle>
            <Badge variant="secondary" className="text-[11px]">
              {replenishmentQuery.data?.total ?? 0} SKU evaluados
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Bodega</span>
              <Select
                value={selectedWarehouse}
                onValueChange={(v) => {
                  setSelectedWarehouse(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {warehousesQuery.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Prioridad</span>
              <Select
                value={priorityFilter}
                onValueChange={(v) => {
                  setPriorityFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  <SelectItem value="1">1 (más urgente)</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[11px] text-muted-foreground">
                Buscar por SKU o producto
              </label>
              <Input
                className="h-8 text-xs"
                placeholder="Ej. ABC123 o 'Camiseta'"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {replenishmentQuery.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : replenishmentQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al cargar alertas</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(
                    replenishmentQuery.error,
                    "Inventario / Reposición",
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Producto
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Stock actual
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Punto pedido
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Stock ideal
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Sugerido pedir
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Días inventario
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Prioridad
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No hay productos en estado crítico de reposición para los
                        filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((r) => {
                      const current = Number(r.current_stock);
                      const reorder = Number(r.reorder_point);
                      const lowStock =
                        !Number.isNaN(current) &&
                        !Number.isNaN(reorder) &&
                        current < reorder;
                      return (
                        <TableRow
                          key={r.product_id}
                          className={
                            lowStock
                              ? "bg-amber-50/70 dark:bg-amber-950/30"
                              : undefined
                          }
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {r.sku}
                          </TableCell>
                          <TableCell className="text-xs">{r.product_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDecimal(r.current_stock)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDecimal(r.reorder_point)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDecimal(r.ideal_stock)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDecimal(r.suggested_order_qty)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDecimal(r.inventory_days)}
                          </TableCell>
                          <TableCell>{priorityBadge(r.priority)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {filteredItems.length > 0 && (
                <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
                  <p className="text-xs text-muted-foreground">
                    Mostrando{" "}
                    {filteredItems.length === 0
                      ? 0
                      : page * rowsPerPage + 1}
                    –
                    {Math.min(
                      filteredItems.length,
                      page * rowsPerPage + pageItems.length,
                    )}{" "}
                    de {filteredItems.length}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Filas por página</span>
                      <Select
                        value={String(rowsPerPage)}
                        onValueChange={handleRowsPerPageChange}
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
                              handlePageChange(page - 1);
                            }}
                            className={
                              page === 0 ? "pointer-events-none opacity-50" : ""
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page + 1);
                            }}
                            className={
                              page >= totalPages - 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


