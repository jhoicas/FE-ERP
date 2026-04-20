import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

import { useTableSearch } from "@/hooks/use-debounce";

import {
  createCrmCategoryHub,
  deleteCrmCategoryHub,
  listCrmCategoriesHub,
  updateCrmCategoryHub,
} from "@/features/crm/crm-categories.api";
import type { CrmCategoryProductHub } from "@/features/crm/crm-hub.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";

const CRM_CATEGORIES_HUB_QK = ["crm-categories-hub"] as const;
const CRM_PRODUCTS_HUB_QK = ["crm-products-hub"] as const;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function CrmAnalyticsProductCategoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("ch_search") ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CrmCategoryProductHub | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get("ch_pageSize"));
    return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : 5;
  });
  const [offset, setOffset] = useState(() => {
    const o = Number(searchParams.get("ch_offset"));
    return Number.isFinite(o) && o >= 0 ? o : 0;
  });

  const { searchTerm: search, setSearchTerm: setSearch, debouncedSearchTerm: debouncedSearch } =
    useTableSearch(initialSearch, 400);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (search.trim()) next.set("ch_search", search.trim());
        else next.delete("ch_search");

        if (offset > 0) next.set("ch_offset", String(offset));
        else next.delete("ch_offset");

        if (pageSize !== 5) next.set("ch_pageSize", String(pageSize));
        else next.delete("ch_pageSize");

        return next;
      },
      { replace: true },
    );
  }, [search, offset, pageSize, setSearchParams]);

  const listQuery = useQuery({
    queryKey: [...CRM_CATEGORIES_HUB_QK, "list", pageSize, offset, debouncedSearch],
    queryFn: () =>
      listCrmCategoriesHub({
        limit: pageSize,
        offset,
        search: debouncedSearch || undefined,
      }),
  });

  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      createCrmCategoryHub({ name: values.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      toast({ title: "Categoría creada" });
      setCreateOpen(false);
      createForm.reset({ name: "" });
    },
    onError: (e) => {
      toast({
        title: "No se pudo crear",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      updateCrmCategoryHub(id, { name: values.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      toast({ title: "Categoría actualizada" });
      setEditCategory(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo guardar",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCrmCategoryHub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      queryClient.invalidateQueries({ queryKey: CRM_PRODUCTS_HUB_QK });
      toast({ title: "Categoría eliminada" });
      setDeleteId(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo eliminar",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total;
  const hasMore =
    typeof total === "number" ? offset + items.length < total : items.length === pageSize;
  const hasPrev = offset > 0;

  const openEdit = (c: CrmCategoryProductHub) => {
    setEditCategory(c);
    editForm.reset({ name: c.name });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          Categorías (Hub CRM)
        </CardTitle>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {listQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(listQuery.error, "CRM / Hub categorías")}
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs">Fecha de creación</TableHead>
                  <TableHead className="text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">
                      No hay categorías que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatCreatedAt(c.created_at)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {items.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t px-3 py-3">
                <p className="text-xs text-muted-foreground">
                  Mostrando {offset + 1}–{offset + items.length}
                  {typeof total === "number" && total > 0 ? ` de ${total}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-4">
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
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) => {
                if (!editCategory) return;
                updateMutation.mutate({ id: editCategory.id, values: v });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditCategory(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productos del Hub que usen esta categoría pueden
              quedar sin referencia válida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
