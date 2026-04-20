import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Package, Pencil, Plus } from "lucide-react";

import { useTableSearch } from "@/hooks/use-debounce";

import {
  createCrmProductHub,
  deactivateCrmProductHub,
  listCrmProductsHub,
  updateCrmProductHub,
} from "@/features/crm/crm-products.api";
import { listCrmCategoriesHub } from "@/features/crm/crm-categories.api";
import type { CrmProductHub } from "@/features/crm/crm-hub.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const CRM_PRODUCTS_HUB_QK = ["crm-products-hub"] as const;
const CRM_CATEGORIES_HUB_SELECTOR_QK = ["crm-categories-hub", "selector"] as const;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const ALL_CATEGORIES_FILTER = "_all";
const WITHOUT_CATEGORY_FILTER = "_without_category";

const NO_CATEGORY = "__none__" as const;

type ProductStatusFilter = "all" | "active" | "inactive";

function parseStatusFilter(value: string | null): ProductStatusFilter {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

const productFormSchema = z.object({
  product_code: z.string().min(1, "El código es obligatorio"),
  product_name: z.string().min(1, "El nombre es obligatorio"),
  unit_cost: z.string().min(1, "El costo unitario es obligatorio"),
  category_id: z.string(),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function resolveCategoryId(value: string): string | null {
  return value === NO_CATEGORY ? null : value;
}

function formatUnitCost(value: string | number | null): string {
  if (value == null || String(value).trim() === "") return "—";
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
}

function unitCostToPayload(value: string): string | number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : trimmed;
}

export default function CrmAnalyticsProductsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("ph_search") ?? "";
  const initialCategoryFilter = searchParams.get("ph_cat") ?? ALL_CATEGORIES_FILTER;

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<CrmProductHub | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(() => {
    const n = Number(searchParams.get("ph_pageSize"));
    return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : 5;
  });
  const [offset, setOffset] = useState(() => {
    const o = Number(searchParams.get("ph_offset"));
    return Number.isFinite(o) && o >= 0 ? o : 0;
  });
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>(() =>
    parseStatusFilter(searchParams.get("ph_status")),
  );

  const { searchTerm: search, setSearchTerm: setSearch, debouncedSearchTerm: debouncedSearch } =
    useTableSearch(initialSearch, 400);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (search.trim()) next.set("ph_search", search.trim());
        else next.delete("ph_search");

        if (categoryFilter !== ALL_CATEGORIES_FILTER) next.set("ph_cat", categoryFilter);
        else next.delete("ph_cat");

        if (statusFilter !== "all") next.set("ph_status", statusFilter);
        else next.delete("ph_status");

        if (offset > 0) next.set("ph_offset", String(offset));
        else next.delete("ph_offset");

        if (pageSize !== 5) next.set("ph_pageSize", String(pageSize));
        else next.delete("ph_pageSize");

        return next;
      },
      { replace: true },
    );
  }, [search, categoryFilter, statusFilter, offset, pageSize, setSearchParams]);

  const categoryApi =
    categoryFilter === ALL_CATEGORIES_FILTER
      ? {}
      : categoryFilter === WITHOUT_CATEGORY_FILTER
        ? { uncategorized: true as const }
        : { category_id: categoryFilter };

  const isActiveParam =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const productsQuery = useQuery({
    queryKey: [
      ...CRM_PRODUCTS_HUB_QK,
      "list",
      pageSize,
      offset,
      debouncedSearch,
      categoryFilter,
      statusFilter,
    ],
    queryFn: () =>
      listCrmProductsHub({
        limit: pageSize,
        offset,
        search: debouncedSearch || undefined,
        ...categoryApi,
        is_active: isActiveParam,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: CRM_CATEGORIES_HUB_SELECTOR_QK,
    queryFn: () => listCrmCategoriesHub({ limit: 500, offset: 0 }),
  });

  const categoryOptions = categoriesQuery.data?.items ?? [];

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categoryOptions) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categoryOptions]);

  const createForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      product_code: "",
      product_name: "",
      unit_cost: "",
      category_id: NO_CATEGORY,
      is_active: true,
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      product_code: "",
      product_name: "",
      unit_cost: "",
      category_id: NO_CATEGORY,
      is_active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      createCrmProductHub({
        product_code: values.product_code.trim(),
        product_name: values.product_name.trim(),
        unit_cost: unitCostToPayload(values.unit_cost),
        category_id: resolveCategoryId(values.category_id),
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_PRODUCTS_HUB_QK });
      toast({ title: "Producto creado" });
      setCreateOpen(false);
      createForm.reset({
        product_code: "",
        product_name: "",
        unit_cost: "",
        category_id: NO_CATEGORY,
        is_active: true,
      });
    },
    onError: (e) => {
      toast({
        title: "No se pudo crear",
        description: getApiErrorMessage(e, "CRM / Hub productos"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      updateCrmProductHub(id, {
        product_code: values.product_code.trim(),
        product_name: values.product_name.trim(),
        unit_cost: unitCostToPayload(values.unit_cost),
        category_id: resolveCategoryId(values.category_id),
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_PRODUCTS_HUB_QK });
      toast({ title: "Producto actualizado" });
      setEditProduct(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo guardar",
        description: getApiErrorMessage(e, "CRM / Hub productos"),
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateCrmProductHub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_PRODUCTS_HUB_QK });
      toast({ title: "Producto desactivado" });
      setDeactivateId(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo desactivar",
        description: getApiErrorMessage(e, "CRM / Hub productos"),
        variant: "destructive",
      });
    },
  });

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total;
  const hasMore =
    typeof total === "number" ? offset + items.length < total : items.length === pageSize;
  const hasPrev = offset > 0;

  const emptyCategoriesHint = useMemo(() => {
    if (categoriesQuery.isError) {
      return "No se pudieron cargar las categorías del Hub CRM.";
    }
    if (!categoriesQuery.isLoading && categoryOptions.length === 0) {
      return "Crea categorías en la pestaña Categorías para asociarlas aquí.";
    }
    return null;
  }, [categoriesQuery.isError, categoriesQuery.isLoading, categoryOptions.length]);

  const openEdit = (p: CrmProductHub) => {
    setEditProduct(p);
    const cat = p.category_id && p.category_id.length > 0 ? p.category_id : NO_CATEGORY;
    editForm.reset({
      product_code: p.product_code,
      product_name: p.product_name,
      unit_cost: p.unit_cost == null ? "" : String(p.unit_cost),
      category_id: cat,
      is_active: p.is_active !== false,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Productos (Hub CRM)
        </CardTitle>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {emptyCategoriesHint && (
          <p className="text-xs text-muted-foreground">{emptyCategoriesHint}</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Input
              placeholder="Buscar por código o nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setOffset(0);
                setCategoryFilter(value);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_FILTER}>Todas las categorías</SelectItem>
                <SelectItem value={WITHOUT_CATEGORY_FILTER}>Sin categoría</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setOffset(0);
                setStatusFilter(value as ProductStatusFilter);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(productsQuery.error, "CRM / Hub productos")}
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-right text-xs">Costo unitario</TableHead>
                  <TableHead className="text-xs">Categoría</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-right text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      No hay productos que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-sm">{p.product_code}</TableCell>
                      <TableCell className="font-medium">{p.product_name}</TableCell>
                      <TableCell className="text-right">{formatUnitCost(p.unit_cost)}</TableCell>
                      <TableCell>
                        {p.category_id ? categoryNameById.get(p.category_id) ?? p.category_id : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active === false ? "secondary" : "default"}>
                          {p.is_active === false ? "Inactivo" : "Activo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeactivateId(p.id)}
                          disabled={p.is_active === false}
                        >
                          Desactivar
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
            <DialogTitle>Nuevo producto (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="product_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="product_name"
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
              <FormField
                control={createForm.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo unitario</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Activo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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

      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) => {
                if (!editProduct) return;
                updateMutation.mutate({ id: editProduct.id, values: v });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="product_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="product_name"
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
              <FormField
                control={editForm.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo unitario</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Activo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditProduct(null)}>
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

      <AlertDialog open={!!deactivateId} onOpenChange={(o) => !o && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará una solicitud para marcar el producto como inactivo en el catálogo Hub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
              disabled={deactivateMutation.isPending}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
