import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Gift, ChevronRight } from "lucide-react";

import { listCategories } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CategoryResponse } from "@/types/crm";
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

const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatLtv(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return `$${n.toLocaleString("es-CO")}`;
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", PAGE_SIZE, offset],
    queryFn: () => listCategories({ limit: PAGE_SIZE, offset }),
  });

  const items = categoriesQuery.data ?? [];
  const hasMore = items.length === PAGE_SIZE;
  const hasPrev = offset > 0;

  return (
    <div className="animate-fade-in space-y-4">
      <Link
        to="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        ← Volver al CRM
      </Link>
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Categorías de fidelización
          </h1>
          <p className="text-sm text-muted-foreground">
            LTV mínimo y beneficios asociados a cada categoría (solo lectura).
          </p>
        </div>
      </div>

      {categoriesQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {categoriesQuery.isError && !categoriesQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(categoriesQuery.error, "Categorías CRM")}
        </p>
      )}

      {!categoriesQuery.isLoading && !categoriesQuery.isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">
                  Nombre
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  LTV mínimo
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Creado
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">
                  Actualizado
                </TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay categorías.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((cat: CategoryResponse) => (
                  <TableRow key={cat.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatLtv(cat.min_ltv)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cat.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cat.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          navigate(`/crm/categories/${cat.id}/benefits`)
                        }
                      >
                        Ver beneficios
                        <ChevronRight className="h-4 w-4 ml-1" />
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
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPrev)
                          setOffset((o) => Math.max(0, o - PAGE_SIZE));
                      }}
                      className={
                        !hasPrev ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasMore) setOffset((o) => o + PAGE_SIZE);
                      }}
                      className={
                        !hasMore ? "pointer-events-none opacity-50" : ""
                      }
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
