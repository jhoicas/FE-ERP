import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useProducts, useWarehouses } from "@/features/inventory/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ADJUSTMENT_REASONS = [
  { value: "MERMA", label: "Merma" },
  { value: "ROBO", label: "Robo" },
  { value: "VENCIMIENTO", label: "Vencimiento" },
  { value: "CONTEO_FISICO", label: "Conteo físico" },
  { value: "DETERIORO", label: "Deterioro" },
  { value: "OTRO", label: "Otro" },
] as const;

type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]["value"];

function initialForm() {
  return {
    product_id: "",
    warehouse_id: "",
    quantity: "",
    reason: "MERMA" as AdjustmentReason,
    notes: "",
  };
}

export default function InventoryAdjustmentDialog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ limit: 200, offset: 0 });
  const { data: warehousesData, isLoading: isLoadingWarehouses } = useWarehouses({ limit: 100, offset: 0 });

  const products = productsData?.items ?? [];
  const warehouses = warehousesData?.items ?? [];

  const parsedQuantity = Number(form.quantity);
  const isValid =
    form.product_id.length > 0 &&
    form.warehouse_id.length > 0 &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity !== 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: form.product_id,
        warehouse_id: form.warehouse_id,
        quantity: parsedQuantity,
        reason: form.reason,
        notes: form.notes.trim() || undefined,
      };
      await apiClient.post("/api/inventory/adjustments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-replenishment-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });
      toast({
        title: "Ajuste registrado",
        description: "El movimiento de ajuste fue creado correctamente.",
      });
      setForm(initialForm());
      setOpen(false);
    },
  });

  const quantityHint = useMemo(() => {
    if (!form.quantity) return "Usa positivo para sumar, negativo para descontar.";
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      return "Ingresa un número distinto de cero (ej: 5 o -3).";
    }
    return parsedQuantity > 0 ? "Ajuste positivo: incrementa stock." : "Ajuste negativo: disminuye stock.";
  }, [form.quantity, parsedQuantity]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          mutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          Registrar ajuste
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar ajuste de inventario</DialogTitle>
          <DialogDescription>
            Registra ajustes manuales por merma, robo, vencimiento, conteo físico o deterioro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Producto</Label>
            <Select
              value={form.product_id || undefined}
              onValueChange={(value) => setForm((prev) => ({ ...prev, product_id: value }))}
              disabled={isLoadingProducts}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
                {products.length === 0 && !isLoadingProducts && (
                  <SelectItem value="_none" disabled>
                    No hay productos
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Bodega</Label>
            <Select
              value={form.warehouse_id || undefined}
              onValueChange={(value) => setForm((prev) => ({ ...prev, warehouse_id: value }))}
              disabled={isLoadingWarehouses}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar bodega" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
                {warehouses.length === 0 && !isLoadingWarehouses && (
                  <SelectItem value="_none" disabled>
                    No hay bodegas
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cantidad (+/-)</Label>
            <Input
              inputMode="decimal"
              placeholder="Ej: 5 o -3"
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">{quantityHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Razón</Label>
            <Select
              value={form.reason}
              onValueChange={(value) => setForm((prev) => ({ ...prev, reason: value as AdjustmentReason }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              placeholder="Detalle adicional del ajuste"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(mutation.error, "Inventario / Ajustes")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Guardar ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}