import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UserCircle } from "lucide-react";

import { listCustomers } from "@/features/crm/services";
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

const PAGE_SIZE = 10;

export default function CustomersTable() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customers", PAGE_SIZE, offset],
    queryFn: () => listCustomers({ limit: PAGE_SIZE, offset }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const hasMore = offset + items.length < total || items.length === PAGE_SIZE;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCircle className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Directorio de clientes</h2>
          <p className="text-xs text-muted-foreground">
            Listado paginado con NIT, contacto y acceso al Perfil 360.
          </p>
        </div>
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
                <TableHead className="text-xs text-muted-foreground">NIT / Tax ID</TableHead>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/crm/customers/${c.id}`)}
                      >
                        Ver perfil 360
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–{offset + items.length}
                {typeof total === "number" && total > 0 ? ` de ${total}` : ""}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPrev) setOffset((o) => Math.max(0, o - PAGE_SIZE));
                      }}
                      className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasMore) setOffset((o) => o + PAGE_SIZE);
                      }}
                      className={!hasMore ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
