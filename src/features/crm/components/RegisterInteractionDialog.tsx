import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createInteraction,
  getCustomers,
} from "@/features/crm/services";
import {
  createInteractionSchema,
  type CreateInteractionRequest,
} from "@/lib/validations/crm";
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
import { Button } from "@/components/ui/button";

const INTERACTION_TYPES = [
  { value: "call", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
  { value: "other", label: "Otro" },
];

interface RegisterInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se abre desde Perfil 360, prellenar customer_id */
  customerId?: string;
  /** Invalidar perfil 360 tras crear */
  invalidateProfile360?: boolean;
}

export default function RegisterInteractionDialog({
  open,
  onOpenChange,
  customerId: initialCustomerId,
  invalidateProfile360 = false,
}: RegisterInteractionDialogProps) {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => getCustomers(),
    enabled: open,
  });

  const form = useForm<CreateInteractionRequest>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      customer_id: initialCustomerId ?? "",
      type: "call",
      subject: "",
      body: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: () => {
      if (invalidateProfile360 && initialCustomerId) {
        queryClient.invalidateQueries({
          queryKey: ["crm-profile360", initialCustomerId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["crm-interactions"] });
      onOpenChange(false);
      form.reset({
        customer_id: initialCustomerId ?? "",
        type: "call",
        subject: "",
        body: "",
      });
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        customer_id: initialCustomerId ?? "",
        type: "call",
        subject: "",
        body: "",
      });
    }
  }, [open, initialCustomerId, form]);

  const onSubmit = (values: CreateInteractionRequest) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar interacción</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={
                      !!initialCustomerId || customersQuery.isLoading
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customersQuery.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      {customersQuery.data?.length === 0 &&
                        !customersQuery.isLoading && (
                          <SelectItem value="_none" disabled>
                            No hay clientes
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INTERACTION_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Asunto de la interacción" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles de la interacción"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
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
                {mutation.isPending ? "Registrando…" : "Registrar"}
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
