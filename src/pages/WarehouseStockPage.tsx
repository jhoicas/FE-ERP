import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Warehouse as WarehouseIcon, Filter } from "lucide-react";

import { useWarehouse } from "@/features/inventory/warehouses.api";
import { useReplenishmentList } from "@/features/inventory/api";
import type { ReplenishmentSuggestionDTO } from "@/types/inventory";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

function formatDecimal(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function priorityBadge(priority: number) {
  if (priority === 1) {
    return (
      <Badge variant="destructive" className="text-[11px]">
        Prioridad 1
      </Badge>
    );
  }
  if (priority === 2) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/60 text-amber-800 dark:text-amber-300 text-[11px]"
      >
        Prioridad 2
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[11px]">
      Prioridad {priority}
    </Badge>
  );
}

export default function WarehouseStockPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [priorityFilter, setPriorityFilter] = useState<string>("_all");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(0);

  const warehouseQuery = useWarehouse(id, {
    enabled: !!id,
  });

  const replenishmentQuery = useReplenishmentList(
    { warehouse_id: id },
    { enabled: !!id },
  );

  const filteredItems = useMemo(() => {
    const items: ReplenishmentSuggestionDTO[] =
      replenishmentQuery.data?.replenishments ?? [];

    return items.filter((r) => {
      const matchesPriority =
        priorityFilter === "_all" ||
        String(r.priority) === priorityFilter;

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
    <div className="animate-fade-in space-y-4 max-w-6xl">
      <button
        onClick={() => navigate("/inventory/warehouses")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver a bodegas
      </button>

      {/* Datos de la bodega */}
      {warehouseQuery.isLoading ? (
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ) : warehouseQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar bodega</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(warehouseQuery.error, "Inventario / Bodegas")}
          </AlertDescription>
        </Alert>
      ) : warehouseQuery.data ? (
        <Card>
          <CardHeader className="pb-2 flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-base">
                {warehouseQuery.data.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {warehouseQuery.data.address || "Sin dirección registrada"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div>
              <span className="block">ID</span>
              <span className="font-mono">{warehouseQuery.data.id}</span>
            </div>
            <div>
              <span className="block">Creada</span>
              <span>
                {new Date(warehouseQuery.data.created_at).toLocaleString("es-CO")}
              </span>
            </div>
            <div>
              <span className="block">Actualizada</span>
              <span>
                {new Date(warehouseQuery.data.updated_at).toLocaleString("es-CO")}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filtros y tabla de stock */}
      <Card className="erp-card p-0 overflow-hidden">
        <CardHeader className="space-y-3 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Niveles de stock y alertas</CardTitle>
            <Badge variant="secondary" className="text-[11px]">
              {replenishmentQuery.data?.total ?? 0} SKUs evaluados
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
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
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[11px] text-muted-foreground">
                Buscar por SKU o nombre
              </label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Ej. ABC123 o 'Camiseta'"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {replenishmentQuery.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : replenishmentQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al cargar niveles de stock</AlertTitle>
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
                    <TableHead className="text-xs text-muted-foreground">
                      SKU
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Producto
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Stock actual
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">
                      Punto de pedido
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
                        No hay registros para los filtros actuales.
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
                      : currentPage * rowsPerPage + 1}
                    –
                    {Math.min(
                      filteredItems.length,
                      currentPage * rowsPerPage + pageItems.length,
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
                              handlePageChange(currentPage - 1);
                            }}
                            className={
                              currentPage === 0
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage + 1);
                            }}
                            className={
                              currentPage >= totalPages - 1
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

