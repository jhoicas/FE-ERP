import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UserCircle, Pencil } from "lucide-react";

import { listCustomers } from "@/features/crm/services";
import { useAuthUser } from "@/features/auth/useAuthUser";
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

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function CustomersTable() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [editCustomer, setEditCustomer] = useState<CustomerDTO | null>(null);
  const isAdmin = user?.role === "admin";
   const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

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
  const total = data?.total ?? items.length;
  const hasMore = offset + items.length < total || items.length === pageSize;
  const hasPrev = offset > 0;

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
        <div className="ml-auto w-full sm:w-64">
          <Input
            placeholder="Buscar por nombre, NIT o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
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
                <TableHead className="text-xs text-muted-foreground">
                  <ExplainableAcronym sigla="NIT" /> / Tax ID
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground">Teléfono</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No hay clientes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.tax_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
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

          {(hasPrev || hasMore) && (
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
    </div>
  );
}
