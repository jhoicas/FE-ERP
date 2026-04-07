import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { deactivateCustomer, listCustomers } from "@/features/crm/services";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
import CreateCustomerDialog from "@/features/crm/components/CreateCustomerDialog";
import EditCustomerDialog from "@/features/crm/components/EditCustomerDialog";
import type { CustomerDTO } from "@/features/crm/schemas";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
type CustomerFilter = "_all" | "with_tax_id" | "with_email" | "with_phone";

function getSegmentValue(customer: CustomerDTO): string {
  const value = customer.segment?.trim().toUpperCase();
  return value || "OCASIONAL";
}

function getSegmentClass(segment: string): string {
  switch (segment) {
    case "VIP":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "PREMIUM":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case "RECURRENTE":
      return "border-blue-300 bg-blue-100 text-blue-800";
    case "OCASIONAL":
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function formatCurrency(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "$0";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMainCategory(customer: CustomerDTO): string {
  return customer.main_category?.trim() || customer.category_name?.trim() || "Sin categoría";
}

function getRemarketingAction(customer: CustomerDTO): string {
  return customer.remarketing_action?.trim() || "Sin acción";
}

interface CustomersTableProps {
  externalActions?: ReactNode;
}

export default function CustomersTable({ externalActions }: CustomersTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthUser();
  const initialPageSize = Number(searchParams.get("pageSize")) || 5;
  const initialOffset = Number(searchParams.get("offset")) || 0;
  const initialSearch = searchParams.get("search") ?? "";
  const initialFilter = (searchParams.get("filter") as CustomerFilter) ?? "_all";
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [offset, setOffset] = useState(initialOffset);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerDTO | null>(null);
  const [deactivatingCustomer, setDeactivatingCustomer] = useState<CustomerDTO | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canEditCustomers = isAdmin(user);
   const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [filter, setFilter] = useState<CustomerFilter>(initialFilter);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search.trim()) {
      nextParams.set("search", search.trim());
    }

    if (filter !== "_all") {
      nextParams.set("filter", filter);
    }

    if (offset > 0) {
      nextParams.set("offset", String(offset));
    }

    if (pageSize !== 5) {
      nextParams.set("pageSize", String(pageSize));
    }

    setSearchParams(nextParams, { replace: true });
  }, [search, filter, offset, pageSize, setSearchParams]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customers", pageSize, offset, debouncedSearch],
    queryFn: () =>
      listCustomers({
        limit: pageSize,
        offset,
        search: debouncedSearch || undefined,
      }),
  });

  const items = data?.items ?? [];
  const filteredItems = items.filter((c) => {
    if (filter === "_all") return true;
    if (filter === "with_tax_id") return Boolean(c.tax_id);
    if (filter === "with_email") return Boolean(c.email);
    if (filter === "with_phone") return Boolean(c.phone);
    return true;
  });
  const total = data?.total ?? items.length;
  const hasMore = offset + items.length < total || items.length === pageSize;
  const hasPrev = offset > 0;

  const deactivateMutation = useMutation({
    mutationFn: (customerId: string) => deactivateCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      setConfirmOpen(false);
      setDeactivatingCustomer(null);
    },
  });

  const openDeactivate = (customer: CustomerDTO) => {
    setDeactivatingCustomer(customer);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCircle className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Directorio de clientes</h2>
          <p className="text-xs text-muted-foreground">
            Listado paginado con{" "}
            <ExplainableAcronym sigla="NIT" />
            , contacto y acceso al Perfil 360.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar por nombre, NIT o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filter}
            onValueChange={(value) => {
              setOffset(0);
              setFilter(value as CustomerFilter);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              <SelectItem value="with_tax_id">Con NIT</SelectItem>
              <SelectItem value="with_email">Con email</SelectItem>
              <SelectItem value="with_phone">Con teléfono</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(canEditCustomers || externalActions) && (
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            {externalActions}
            {canEditCustomers && (
              <Button size="sm" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo cliente
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "CRM / Clientes")}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground">Segmento</TableHead>
                <TableHead className="text-xs text-muted-foreground">Total Comprado</TableHead>
                <TableHead className="text-xs text-muted-foreground">Categoría Principal</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Acción Remarketing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No hay clientes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSegmentClass(getSegmentValue(c))}>
                        {getSegmentValue(c)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(c.total_purchased ?? c.ltv)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getMainCategory(c)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Badge variant="outline" className="text-[11px]">
                          {getRemarketingAction(c)}
                        </Badge>
                        {canEditCustomers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setEditCustomer(c)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar Cliente
                          </Button>
                        )}
                        {canEditCustomers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => openDeactivate(c)}
                            disabled={deactivateMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Desactivar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => navigate(`/crm/customers/${c.id}`)}
                        >
                          Ver perfil 360
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

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
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPrev) setOffset((o) => Math.max(0, o - pageSize));
                        }}
                        className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasMore) setOffset((o) => o + pageSize);
                        }}
                        className={!hasMore ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      )}

      <EditCustomerDialog
        open={!!editCustomer}
        onOpenChange={(o) => !o && setEditCustomer(null)}
        customer={editCustomer}
      />

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(customerId) => {
          // ir directo al perfil 360, y el dialog ya invalida queries de clientes
          navigate(`/crm/customers/${customerId}`);
        }}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar este cliente? Esta acción lo ocultará pero no lo elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivatingCustomer) {
                  deactivateMutation.mutate(deactivatingCustomer.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
