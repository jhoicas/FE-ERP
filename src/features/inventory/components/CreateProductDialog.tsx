import { PackagePlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProduct } from "@/features/inventory/products.api";
import type { ProductResponse } from "@/types/inventory";
import { createProductRequestSchema } from "@/lib/validations/inventory";
import { getApiErrorMessage } from "@/lib/api/errors";
import ProductFormFields from "@/features/inventory/components/ProductFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
} from "@/components/ui/form";

type CreateProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (product: ProductResponse) => void;
  title?: string;
  description?: string;
};

export default function CreateProductDialog({
  open,
  onOpenChange,
  onCreated,
  title = "Crear producto",
  description,
}: CreateProductDialogProps) {
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

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      let attributes: unknown = undefined;
      if (values.attributes && values.attributes.trim().length > 0) {
        try {
          attributes = JSON.parse(values.attributes);
        } catch {
          form.setError("attributes", {
            type: "manual",
            message: "JSON inválido",
          });
          throw new Error("Atributos JSON inválidos");
        }
      }

      return createProduct({ ...values, attributes });
    },
    onSuccess: (createdProduct) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
      onCreated?.(createdProduct);
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = (values: any) => mutation.mutate(values);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          mutation.reset();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ProductFormFields form={form} includeSku />

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(mutation.error, "Inventario / Productos")}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
