import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Gift, ChevronRight, Trash2 } from "lucide-react";

import { listCategories, deactivateCrmCategory } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CategoryResponse } from "@/types/crm";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthUser();
  const [pageSize, setPageSize] = useState(5);
  const [offset, setOffset] = useState(0);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", pageSize, offset],
    queryFn: () => listCategories({ limit: pageSize, offset }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await deactivateCrmCategory(categoryId);
    },
    onSuccess: () => {
      toast({
        title: "Desactivada correctamente",
        description: "La categoría ha sido desactivada.",
      });
      queryClient.invalidateQueries({ queryKey: ["crm-categories"] });
      setConfirmOpen(false);
      setDeactivatingId(null);
    },
    onError: (error: any) => {
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        toast({
          title: "Error de permisos",
          description: "No tienes permisos para desactivar esta categoría.",
          variant: "destructive",
        });
      } else {
        const errorMsg = getApiErrorMessage(error, "Categorías");
        toast({
          title: "Error al desactivar",
          description: errorMsg,
          variant: "destructive",
        });
      }
      setDeactivatingId(null);
    },
  });

  const handleDeactivateClick = (categoryId: string) => {
    setDeactivatingId(categoryId);
    setConfirmOpen(true);
  };

  const handleConfirmDeactivate = () => {
    if (deactivatingId) {
      deactivateMutation.mutate(deactivatingId);
    }
  };

  const items = categoriesQuery.data ?? [];
  const hasMore = items.length === pageSize;
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
            <ExplainableAcronym sigla="LTV" /> mínimo y beneficios asociados a cada categoría
            (solo lectura).
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
                  <ExplainableAcronym sigla="LTV" /> mínimo
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
                    <TableCell className="text-right space-x-2 flex items-center justify-end">
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
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeactivateClick(cat.id)}
                          disabled={deactivateMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Desactivar
                        </Button>
                      )}
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
                          if (hasPrev)
                            setOffset((o) => Math.max(0, o - pageSize));
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
                          if (hasMore) setOffset((o) => o + pageSize);
                        }}
                        className={
                          !hasMore ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar este registro? Esta acción oculta el registro pero no lo elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
