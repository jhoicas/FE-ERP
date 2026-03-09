import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Package, Pencil, Plus, AlertCircle } from "lucide-react";

import {
  useProducts,
  useCreateProduct,
  useProduct,
  useUpdateProduct,
  type ListProductsParams,
} from "@/features/inventory/products.api";
import type { ProductResponse } from "@/types/inventory";
import {
  createProductRequestSchema,
  updateProductRequestSchema,
} from "@/lib/validations/inventory";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function formatMoney(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
}

function formatTaxRate(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
}

function ProductFormFields({
  form,
}: {
  form: ReturnType<typeof useForm<any>>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="sku"
        render={({ field }) => (
          <FormItem>
            <FormLabel>SKU</FormLabel>
            <FormControl>
              <Input placeholder="Código único del producto" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input placeholder="Nombre comercial" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Descripción breve del producto"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio</FormLabel>
              <FormControl>
                <Input
                  placeholder="0.00"
                  inputMode="decimal"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tax_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impuesto</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="19">19%</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unspsc_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código UNSPSC</FormLabel>
              <FormControl>
                <Input placeholder="Opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="unit_measure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad de medida</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || "94"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="94">Unidad (94)</SelectItem>
                    <SelectItem value="C62">Unidad de pieza (C62)</SelectItem>
                    <SelectItem value="KGM">Kilogramo (KGM)</SelectItem>
                    <SelectItem value="LTR">Litro (LTR)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attributes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Atributos (JSON opcional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder='Ej. {"color":"rojo","talla":"M"}'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function ProductCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<any>({
    resolver: zodResolver(createProductRequestSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      price: "",
      tax_rate: "19",
      unspsc_code: "",
      unit_measure: "94",
      attributes: "",
    },
  });

  const mutation = useCreateProduct({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = (values: any) => {
    let attributes: unknown = undefined;
    if (values.attributes && values.attributes.trim().length > 0) {
      try {
        attributes = JSON.parse(values.attributes);
      } catch {
        form.setError("attributes", {
          type: "manual",
          message: "JSON inválido",
        });
        return;
      }
    }
    mutation.mutate({ ...values, attributes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-primary" />
            Crear producto
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ProductFormFields form={form} />
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {(mutation.error as Error).message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creando…" : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProductEditDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const productQuery = useProduct(productId ?? undefined, {
    enabled: open && !!productId,
  });

  const form = useForm<any>({
    resolver: zodResolver(updateProductRequestSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      tax_rate: "",
      unspsc_code: "",
      unit_measure: "",
      attributes: "",
    },
  });

  // Pre-carga cuando llega el producto
  if (productQuery.data && !form.formState.isDirty) {
    const p = productQuery.data;
    const attrsString =
      p.attributes && typeof p.attributes === "object"
        ? JSON.stringify(p.attributes, null, 2)
        : "";
    form.reset({
      name: p.name,
      description: p.description,
      price: p.price,
      tax_rate: p.tax_rate,
      unspsc_code: p.unspsc_code,
      unit_measure: p.unit_measure,
      attributes: attrsString,
    });
  }

  const mutation = useUpdateProduct({
    onSuccess: () => {
      if (!productId) return;
      queryClient.invalidateQueries({ queryKey: ["inventory-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: any) => {
    if (!productId) return;

    let attributes: unknown = undefined;
    if (values.attributes && values.attributes.trim().length > 0) {
      try {
        attributes = JSON.parse(values.attributes);
      } catch {
        form.setError("attributes", {
          type: "manual",
          message: "JSON inválido",
        });
        return;
      }
    }

    mutation.mutate({
      id: productId,
      body: { ...values, attributes },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar producto
          </DialogTitle>
        </DialogHeader>

        {productQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {productQuery.isError && !productQuery.isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar producto</AlertTitle>
            <AlertDescription>
              {getApiErrorMessage(productQuery.error, "Inventario / Productos")}
            </AlertDescription>
          </Alert>
        )}

        {!productQuery.isLoading && !productQuery.isError && productQuery.data && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* En edición no permitimos editar el SKU */}
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <Input value={productQuery.data.sku} disabled />
              </FormItem>
              <ProductFormFields form={form} />
              {mutation.isError && (
                <p className="text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryProductsPage() {
  const navigate = useNavigate();
  const [pageSize, setPageSize] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const params: ListProductsParams = { limit: pageSize, offset };
  const { data, isLoading, isError, error } = useProducts(params);

  const items: ProductResponse[] = data?.items ?? [];
  const total = data?.page.total ?? 0;
  const hasMore = offset + items.length < total;
  const hasPrev = offset > 0;

  const openEdit = (id: string) => {
    setSelectedProductId(id);
    setEditOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <button
        onClick={() => navigate("/inventario")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver a Inventario
      </button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Gestión de productos</h1>
            <p className="text-sm text-muted-foreground">
              Administra tu catálogo de productos, precios e impuestos.
            </p>
          </div>
        </div>
        <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Crear producto
        </Button>
      </div>

      {isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(error, "Inventario / Productos")}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <Card className="erp-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">SKU</TableHead>
                <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-xs text-muted-foreground">Descripción</TableHead>
                <TableHead className="text-xs text-muted-foreground">Precio</TableHead>
                <TableHead className="text-xs text-muted-foreground">Impuesto</TableHead>
                <TableHead className="text-xs text-muted-foreground">Unidad</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay productos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.sku}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {p.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatMoney(p.price)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTaxRate(p.tax_rate)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.unit_measure}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openEdit(p.id)}
                      >
                        Ver / Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {(hasPrev || hasMore) && (
            <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
              <p className="text-xs text-muted-foreground">
                Mostrando {offset + 1}–
                {offset + items.length}
                {total ? ` de ${total}` : ""}
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
        </Card>
      )}

      <ProductCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProductEditDialog
        productId={selectedProductId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

