import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, CalendarDays, MessageSquarePlus } from "lucide-react";

import type { InteractionResponse } from "@/types/crm";
import { createInteraction } from "@/features/crm/services";
import {
  createInteractionSchema,
  type CreateInteractionRequest,
} from "@/lib/validations/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const INTERACTION_TYPES = [
  { value: "call", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
  { value: "other", label: "Otro" },
] as const;

type InteractionType = (typeof INTERACTION_TYPES)[number]["value"];

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function InteractionTypeBadge({ type }: { type: InteractionType }) {
  const colorByType: Record<InteractionType, string> = {
    call: "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    email: "border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    meeting: "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    other: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };
  const label = INTERACTION_TYPES.find((t) => t.value === type)?.label ?? type;
  return (
    <Badge variant="outline" className={`text-[11px] ${colorByType[type]}`}>
      {label}
    </Badge>
  );
}

function useLocalInteractions(customerId: string) {
  const queryClient = useQueryClient();
  const key = ["crm-interactions", customerId] as const;

  const query = useQuery({
    queryKey: key,
    // No hay GET en backend: la fuente es caché local.
    queryFn: async () => {
      const cached = queryClient.getQueryData<InteractionResponse[]>(key);
      return cached ?? [];
    },
    staleTime: Infinity,
  });

  const upsert = (interaction: InteractionResponse) => {
    queryClient.setQueryData<InteractionResponse[]>(key, (prev) => {
      const list = prev ?? [];
      if (list.some((i) => i.id === interaction.id)) return list;
      return [interaction, ...list];
    });
  };

  return { ...query, upsert };
}

export default function CustomerInteractionsTimeline({
  customerId,
  maxItems = 20,
}: {
  customerId: string;
  maxItems?: number;
}) {
  const { data, isLoading, upsert } = useLocalInteractions(customerId);

  const form = useForm<CreateInteractionRequest>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      customer_id: customerId,
      type: "call",
      subject: "",
      body: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: (interaction) => {
      upsert(interaction);
      form.reset({
        customer_id: customerId,
        type: "call",
        subject: "",
        body: "",
      });
    },
  });

  const interactions = useMemo(() => {
    const list = (data ?? []).slice();
    list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return list.slice(0, maxItems);
  }, [data, maxItems]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Registrar interacción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-4"
            >
              {/* customer_id oculto */}
              <input type="hidden" value={customerId} {...form.register("customer_id")} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          {INTERACTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
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
                      <FormLabel>Asunto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Seguimiento de pago" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Resumen, acuerdos, próximos pasos…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mutation.isError && (
                <p className="text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              )}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando…" : "Registrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Timeline
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {interactions.length} item{interactions.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay interacciones registradas todavía.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4">
              {/* línea vertical */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

              {interactions.map((i, idx) => {
                const type = i.type as InteractionType;
                const side = idx % 2 === 0 ? "left" : "right";
                return (
                  <div key={i.id} className="relative">
                    {/* punto */}
                    <div className="absolute -left-[3px] top-3 h-3 w-3 rounded-full bg-primary shadow" />

                    <div
                      className={[
                        "max-w-[680px]",
                        side === "right" ? "ml-auto" : "mr-auto",
                      ].join(" ")}
                    >
                      <Card className="border bg-background/80">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <InteractionTypeBadge type={type} />
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDateTime(i.created_at)}
                            </span>
                          </div>
                          <CardTitle className="text-sm">
                            {i.subject || "Sin asunto"}
                          </CardTitle>
                        </CardHeader>
                        {i.body ? (
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {i.body}
                            </p>
                          </CardContent>
                        ) : null}
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

