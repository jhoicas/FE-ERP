import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { updateCustomer } from "@/features/crm/services";
import type { CustomerDTO } from "@/features/crm/schemas";
import { updateCustomerSchema, type UpdateCustomerRequest } from "@/lib/validations/crm";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerDTO | null;
}

function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
}: EditCustomerDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateCustomerRequest>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: { name: "", email: "", phone: "", tax_id: "", birth_date: "" },
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        tax_id: customer.tax_id ?? "",
        birth_date: formatDateForInput(customer.birth_date),
      });
    }
  }, [customer, open, form]);

  const mutation = useMutation({
    mutationFn: (body: UpdateCustomerRequest) =>
      updateCustomer(customer!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["crm-profile360", customer?.id] });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: UpdateCustomerRequest) => {
    mutation.mutate(values);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT / Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de identificación tributaria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-sm text-destructive mt-2">
            {(mutation.error as Error).message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
