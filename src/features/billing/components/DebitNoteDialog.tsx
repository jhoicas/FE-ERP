import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

import { createDebitNote } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DebitNoteItemRow = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

interface DebitNoteDialogProps {
  invoiceId: string;
  invoiceNumber: string;
}

function createEmptyRow(): DebitNoteItemRow {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

export default function DebitNoteDialog({ invoiceId, invoiceNumber }: DebitNoteDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<DebitNoteItemRow[]>([createEmptyRow()]);

  const parsedItems = useMemo(
    () =>
      rows.map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity),
        unit_price: Number(row.unitPrice),
      })),
    [rows],
  );

  const isValidForm =
    reason.trim().length > 0 &&
    parsedItems.length > 0 &&
    parsedItems.every(
      (item) =>
        item.description.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unit_price) &&
        item.unit_price >= 0,
    );

  const mutation = useMutation({
    mutationFn: () =>
      createDebitNote(invoiceId, {
        reason: reason.trim(),
        items: parsedItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      setOpen(false);
      setReason("");
      setRows([createEmptyRow()]);
    },
  });

  const handleAddRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.id !== rowId);
    });
  };

  const updateRow = (rowId: string, field: keyof Omit<DebitNoteItemRow, "id">, value: string) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

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
        <Button variant="outline" size="sm" className="text-xs">
          Nota débito
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crear nota débito</DialogTitle>
          <DialogDescription>
            Factura: {invoiceNumber}. Registra el motivo y los ítems que incrementan el valor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Motivo</p>
            <Textarea
              placeholder="Describe el motivo de la nota débito"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ítems</p>
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handleAddRow}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Descripción</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs w-28">Cantidad</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs w-40">Valor unitario</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-14"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-2">
                        <Input
                          placeholder="Concepto"
                          value={row.description}
                          onChange={(event) => updateRow(row.id, "description", event.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={row.quantity}
                          onChange={(event) => updateRow(row.id, "quantity", event.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice}
                          onChange={(event) => updateRow(row.id, "unitPrice", event.target.value)}
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.id)}
                          disabled={rows.length === 1}
                          aria-label="Eliminar ítem"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{getApiErrorMessage(mutation.error, "Facturación / Nota débito")}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!isValidForm || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Guardando…" : "Crear nota débito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
