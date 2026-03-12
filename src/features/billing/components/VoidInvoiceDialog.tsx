import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { voidInvoice } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
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

const VOID_CONCEPTS = [
  { value: "1", label: "1 - Devolución parcial" },
  { value: "2", label: "2 - Error de facturación" },
  { value: "3", label: "3 - Operación no realizada" },
  { value: "4", label: "4 - Anulación por acuerdo" },
  { value: "5", label: "5 - Otro" },
] as const;

interface VoidInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
}

export default function VoidInvoiceDialog({ invoiceId, invoiceNumber }: VoidInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [concept, setConcept] = useState<string>(VOID_CONCEPTS[0].value);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      voidInvoice(invoiceId, {
        concept: Number(concept),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      setConfirmOpen(false);
      setOpen(false);
      setConcept(VOID_CONCEPTS[0].value);
      setReason("");
    },
  });

  const canSubmit = reason.trim().length > 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setConfirmOpen(false);
            mutation.reset();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="text-xs">
            Anular
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular factura</DialogTitle>
            <DialogDescription>
              Factura: {invoiceNumber}. Selecciona el concepto y describe el motivo de anulación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Concepto</p>
              <Select value={concept} onValueChange={setConcept}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione concepto" />
                </SelectTrigger>
                <SelectContent>
                  {VOID_CONCEPTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Motivo</p>
              <Textarea
                placeholder="Describe el motivo de la anulación"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(mutation.error, "Facturación / Anular factura")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar anulación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará la factura {invoiceNumber} y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Anulando…" : "Confirmar anulación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
