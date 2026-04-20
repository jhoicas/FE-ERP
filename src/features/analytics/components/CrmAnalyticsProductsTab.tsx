import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Package, Pencil, Plus } from "lucide-react";

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

const CRM_PRODUCTS_HUB_QK = ["crm-products-hub"] as const;
const CRM_CATEGORIES_HUB_QK = ["crm-categories-hub"] as const;

const NO_CATEGORY = "__none__" as const;

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

function formatUnitCost(value: string | number): string {
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
}

function unitCostToPayload(value: string): string | number {
  const trimmed = value.trim();
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : trimmed;
}

export default function CrmAnalyticsProductsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<CrmProductHub | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: CRM_PRODUCTS_HUB_QK,
    queryFn: () => listCrmProductsHub({ limit: 500, offset: 0 }),
  });

  const categoriesQuery = useQuery({
    queryKey: CRM_CATEGORIES_HUB_QK,
    queryFn: () => listCrmCategoriesHub({ limit: 500, offset: 0 }),
  });

  const categoryOptions = categoriesQuery.data ?? [];

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

  const items = productsQuery.data ?? [];

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
      unit_cost: String(p.unit_cost),
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
        {productsQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : productsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(productsQuery.error, "CRM / Hub productos")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Costo unitario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay productos en el catálogo Hub.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow key={p.id}>
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
