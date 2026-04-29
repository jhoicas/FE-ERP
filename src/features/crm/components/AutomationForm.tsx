import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";

import { useAutomationFormData } from "@/features/crm/hooks/use-automation-form-data";
import type { CreateCrmAutomationRequest, CrmAutomation } from "@/features/crm/crm.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

const automationFormSchema = z
  .object({
    name: z.string().min(3, "Ingresa un nombre de al menos 3 caracteres."),
    type: z.enum(["BIRTHDAY", "REPURCHASE"]),
    template_id: z.string().optional(),
    productId: z.string().optional(),
    daysSincePurchase: z.coerce.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "REPURCHASE") {
      if (!values.template_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["template_id"],
          message: "Selecciona una plantilla de correo.",
        });
      }

      if (!values.productId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["productId"],
          message: "Selecciona un producto para recompra.",
        });
      }

      if (values.daysSincePurchase == null || Number.isNaN(values.daysSincePurchase)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daysSincePurchase"],
          message: "Indica los días desde la última compra.",
        });
      }
    }
  });

type AutomationFormValues = z.infer<typeof automationFormSchema>;

interface AutomationFormProps {
  initialAutomation?: CrmAutomation | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateCrmAutomationRequest) => void;
  onCancel: () => void;
}

export default function AutomationForm({
  initialAutomation,
  isSubmitting,
  onSubmit,
  onCancel,
}: AutomationFormProps) {
  const { templatesQuery, productsQuery } = useAutomationFormData();

  const defaultValues = useMemo<AutomationFormValues>(
    () => ({
      name: initialAutomation?.name ?? "",
      type: initialAutomation?.type ?? "BIRTHDAY",
      template_id: initialAutomation?.template_id ?? "",
      productId: initialAutomation?.config?.productId ?? "",
      daysSincePurchase: initialAutomation?.config?.daysSincePurchase,
    }),
    [initialAutomation],
  );

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues,
    values: defaultValues,
  });

  const selectedType = form.watch("type");

  const handleSubmit = (values: AutomationFormValues) => {
    onSubmit({
      name: values.name,
      type: values.type,
      template_id: values.type === "REPURCHASE" ? values.template_id : undefined,
      config:
        values.type === "REPURCHASE"
          ? {
              productId: values.productId,
              daysSincePurchase: values.daysSincePurchase,
            }
          : {},
      is_active: initialAutomation?.is_active ?? true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Feliz Cumpleaños VIP" {...field} />
              </FormControl>
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
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === "BIRTHDAY") {
                    form.setValue("productId", "");
                    form.setValue("daysSincePurchase", undefined);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BIRTHDAY">Cumpleaños (IA Dinámica)</SelectItem>
                  <SelectItem value="REPURCHASE">Recompra</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedType === "REPURCHASE" && (
          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plantilla de Correo</FormLabel>
                {templatesQuery.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(templatesQuery.data ?? []).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedType === "BIRTHDAY" && (
          <Alert className="border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Cumpleaños (IA Dinámica)</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              La Inteligencia Artificial redactará un mensaje único para cada cliente en su cumpleaños, analizando sus
              productos favoritos e incluyendo un descuento basado en el límite de su categoría actual. Se enviará todos
              los días a las 9:00 AM.
            </AlertDescription>
          </Alert>
        )}

        {selectedType === "REPURCHASE" && (
          <div className="space-y-4 rounded-md border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Configuración de recompra</p>

            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  {productsQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(productsQuery.data ?? []).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="daysSincePurchase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días desde la última compra</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ej. 30"
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        field.onChange(raw === "" ? undefined : Number(raw));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar automatización"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
