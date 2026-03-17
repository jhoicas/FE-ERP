import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
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
import { Textarea } from "@/components/ui/textarea";

type ProductFormFieldsProps = {
  form: UseFormReturn<any>;
  includeSku?: boolean;
};

const TAX_PRESET_VALUES = ["0", "5", "19"] as const;
type TaxPresetValue = (typeof TAX_PRESET_VALUES)[number];
type TaxOptionValue = TaxPresetValue | "custom";

function isTaxPresetValue(value: string): value is TaxPresetValue {
  return TAX_PRESET_VALUES.includes(value as TaxPresetValue);
}

export default function ProductFormFields({
  form,
  includeSku = true,
}: ProductFormFieldsProps) {
  const watchedTaxRateRaw = form.watch("tax_rate");
  const watchedTaxRate = watchedTaxRateRaw == null ? "" : String(watchedTaxRateRaw);

  const [selectedTaxOption, setSelectedTaxOption] = useState<TaxOptionValue>(() => {
    if (isTaxPresetValue(watchedTaxRate)) {
      return watchedTaxRate;
    }
    return "custom";
  });
  const [lastCustomTaxRate, setLastCustomTaxRate] = useState<string>(() => {
    if (isTaxPresetValue(watchedTaxRate)) {
      return "";
    }
    return watchedTaxRate;
  });

  useEffect(() => {
    if (isTaxPresetValue(watchedTaxRate)) {
      setSelectedTaxOption(watchedTaxRate);
      return;
    }

    setSelectedTaxOption("custom");
    if (watchedTaxRate.length > 0) {
      setLastCustomTaxRate(watchedTaxRate);
    }
  }, [watchedTaxRate]);

  return (
    <>
      {includeSku ? (
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
      ) : null}

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
              <FormLabel>Impuesto (%)</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(nextValue) => {
                    if (nextValue === "custom") {
                      setSelectedTaxOption("custom");
                      form.setValue("tax_rate", lastCustomTaxRate, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      if (!lastCustomTaxRate) {
                        form.setError("tax_rate", {
                          type: "manual",
                          message: "Impuesto requerido",
                        });
                      }
                      return;
                    }

                    setSelectedTaxOption(nextValue as TaxPresetValue);
                    form.clearErrors("tax_rate");
                    form.setValue("tax_rate", nextValue, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  value={selectedTaxOption}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="19">19%</SelectItem>
                    <SelectItem value="custom">Personalizado…</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>

              {selectedTaxOption === "custom" ? (
                <FormControl>
                  <div className="relative mt-2">
                    <Input
                      placeholder="Ej. 7.5"
                      inputMode="decimal"
                      className="pr-8"
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value.replace(",", ".");
                        setLastCustomTaxRate(nextValue);
                        field.onChange(nextValue);
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </FormControl>
              ) : null}

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
                <Select onValueChange={field.onChange} value={field.value || "94"}>
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
