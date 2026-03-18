import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Gift, ChevronRight, Trash2, Plus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { listBenefitsByCategory, listCategories, deactivateCrmCategory, createCategory, updateCategory } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { BenefitResponse, CategoryResponse } from "@/types/crm";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { isAdmin as isAdminUser } from "@/features/auth/permissions";
import { createCategorySchema, type CreateCategoryRequest } from "@/lib/validations/crm";
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
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

type StatusFilter = "all" | "active" | "inactive";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthUser();
  const [pageSize, setPageSize] = useState(5);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(null);

  const isAdmin = isAdminUser(user);

  const createCategoryForm = useForm<CreateCategoryRequest>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", min_ltv: 0 },
  });

  const editCategoryForm = useForm<CreateCategoryRequest>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", min_ltv: 0 },
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", pageSize, offset, search, statusFilter],
    queryFn: () =>
      listCategories({
        limit: pageSize,
        offset,
        search: search.trim() || undefined,
        status:
          statusFilter === "all"
            ? undefined
            : statusFilter === "active"
              ? "active"
              : "inactive",
      }),
  });

  const benefitsQuery = useQuery({
    queryKey: ["crm-category-benefits", selectedCategory?.id, 100, 0],
    queryFn: () => listBenefitsByCategory(selectedCategory!.id, { limit: 100, offset: 0 }),
    enabled: selectedCategory?.id != null,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast({ title: "Categoría creada" });
      queryClient.invalidateQueries({ queryKey: ["crm-categories"] });
      setCreateDialogOpen(false);
      createCategoryForm.reset({ name: "", min_ltv: 0 });
    },
    onError: (error) => {
      toast({
        title: "Error al crear categoría",
        description: getApiErrorMessage(error, "Categorías CRM"),
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (body: CreateCategoryRequest) =>
      updateCategory(editingCategory!.id, body),
    onSuccess: () => {
      toast({ title: "Categoría actualizada" });
      queryClient.invalidateQueries({ queryKey: ["crm-categories"] });
      setEditingCategory(null);
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar categoría",
        description: getApiErrorMessage(error, "Categorías CRM"),
        variant: "destructive",
      });
    },
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

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    const wantActive = statusFilter === "active";
    return items.filter((c) => (c.is_active ?? true) === wantActive);
  }, [items, statusFilter]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Categorías de fidelización
          </h1>
          <p className="text-sm text-muted-foreground">
            <ExplainableAcronym sigla="LTV" /> mínimo y beneficios asociados a cada categoría
            {isAdmin ? "" : " (solo lectura)."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => {
              setOffset(0);
              setSearch(e.target.value);
            }}
            placeholder="Buscar…"
            className="h-9 w-48"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setOffset(0);
              setStatusFilter(v as StatusFilter);
            }}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)} className="h-9">
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          )}
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
                <TableHead className="text-xs text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay categorías.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((cat: CategoryResponse) => (
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
                    <TableCell>
                      <Badge variant={(cat.is_active ?? true) ? "default" : "secondary"}>
                        {(cat.is_active ?? true) ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setSelectedCategory(cat);
                        }}
                      >
                        Ver beneficios
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setEditingCategory(cat);
                            editCategoryForm.reset({
                              name: cat.name,
                              min_ltv: Number(cat.min_ltv),
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                      )}
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

      {selectedCategory && (
        <div className="erp-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold">
                Beneficios · {selectedCategory.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Mostrando beneficios para esta categoría (limit 100).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Cerrar
            </Button>
          </div>

          {benefitsQuery.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {benefitsQuery.isError && !benefitsQuery.isLoading && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(benefitsQuery.error, "Beneficios")}
            </p>
          )}

          {!benefitsQuery.isLoading && !benefitsQuery.isError && (
            <>
              {(benefitsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay beneficios definidos para esta categoría.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs text-muted-foreground">
                        Nombre
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground">
                        Descripción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(benefitsQuery.data ?? []).map((b: BenefitResponse) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear categoría</DialogTitle>
          </DialogHeader>
          <Form {...createCategoryForm}>
            <form
              onSubmit={createCategoryForm.handleSubmit((values) => createCategoryMutation.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={createCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Oro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCategoryForm.control}
                name="min_ltv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <ExplainableAcronym sigla="LTV" /> mínimo
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? "Guardando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingCategory != null} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>
          <Form {...editCategoryForm}>
            <form
              onSubmit={editCategoryForm.handleSubmit((values) => updateCategoryMutation.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={editCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Plata" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editCategoryForm.control}
                name="min_ltv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <ExplainableAcronym sigla="LTV" /> mínimo
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
