import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Megaphone, Clipboard, ClipboardCheck, Loader2, Brain } from "lucide-react";

import { generateCampaignCopy, summarizeTimeline } from "@/features/crm/services";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// -----------------------------
// Zod schema frontend-only: CampaignCopyRequest
// -----------------------------

const campaignCopyFormSchema = z.object({
  topic: z.string().min(1, "El tema es obligatorio"),
  tone: z.enum(["formal", "informal", "emocional", "urgente", "educativo"], {
    required_error: "El tono es obligatorio",
  }),
  targetAudience: z.string().min(1, "La audiencia objetivo es obligatoria"),
  channel: z.enum(["email", "sms", "social", "landing_page"], {
    required_error: "El canal es obligatorio",
  }),
  language: z.enum(["es", "en"], {
    required_error: "El idioma es obligatorio",
  }),
  cta: z.string().min(1, "El llamado a la acción es obligatorio"),
  constraints: z.string().optional(),
});

type CampaignCopyFormValues = z.infer<typeof campaignCopyFormSchema>;

function buildPrompt(values: CampaignCopyFormValues): string {
  const toneLabel: Record<CampaignCopyFormValues["tone"], string> = {
    formal: "formal",
    informal: "informal",
    emocional: "emocional",
    urgente: "urgente",
    educativo: "educativo",
  };

  const channelLabel: Record<CampaignCopyFormValues["channel"], string> = {
    email: "email marketing",
    sms: "SMS",
    social: "redes sociales",
    landing_page: "landing page",
  };

  const languageLabel: Record<CampaignCopyFormValues["language"], string> = {
    es: "español",
    en: "inglés",
  };

  const base = `Genera un copy de campaña en ${languageLabel[values.language]} para el canal ${channelLabel[values.channel]}.
Tema de la campaña: ${values.topic}.
Audiencia objetivo: ${values.targetAudience}.
Tono deseado: ${toneLabel[values.tone]}.
Llamado a la acción principal: ${values.cta}.`;

  const extra =
    values.constraints && values.constraints.trim().length > 0
      ? ` Restricciones adicionales: ${values.constraints.trim()}.`
      : " Mantén el texto claro, persuasivo y orientado a resultados.";

  return `${base}${extra}`;
}

export default function MarketingAIPage() {
  const [copied, setCopied] = useState(false);
  const [summaryCustomerId, setSummaryCustomerId] = useState("");

  const form = useForm<CampaignCopyFormValues>({
    resolver: zodResolver(campaignCopyFormSchema),
    defaultValues: {
      topic: "",
      tone: "formal",
      targetAudience: "",
      channel: "email",
      language: "es",
      cta: "",
      constraints: "",
    },
  });

  const campaignMutation = useMutation({
    mutationFn: (values: CampaignCopyFormValues) => {
      const prompt = buildPrompt(values);
      return generateCampaignCopy({ prompt });
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: (customerId: string) => summarizeTimeline({ customer_id: customerId }),
  });

  const handleCopy = async () => {
    if (!campaignMutation.data?.text) return;
    try {
      await navigator.clipboard.writeText(campaignMutation.data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Herramientas IA para Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Genera copys de campaña y resúmenes inteligentes del timeline de tus clientes para preparar mejores mensajes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Generador de copy de campaña */}
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Generador de copy de campaña
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => campaignMutation.mutate(values))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema de la campaña</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej. Lanzamiento nueva línea de productos ecológicos"
                          rows={2}
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
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tono</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tono" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="informal">Informal</SelectItem>
                            <SelectItem value="emocional">Emocional</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                            <SelectItem value="educativo">Educativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar canal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="social">Redes sociales</SelectItem>
                            <SelectItem value="landing_page">Landing page</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Idioma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="en">Inglés</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audiencia objetivo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Clientes Oro de 25–40 años en ciudades principales"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Llamado a la acción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej. Reserva tu demo hoy, sin costo"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="constraints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restricciones (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej. Máx. 200 caracteres, evitar la palabra 'barato'"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {campaignMutation.isError && (
                  <Alert variant="destructive">
                    <AlertTitle>Error al generar el copy</AlertTitle>
                    <AlertDescription>
                      {(campaignMutation.error as Error).message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={campaignMutation.isPending}
                  className="w-full justify-center"
                >
                  {campaignMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando copy…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generar copy con IA
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col items-stretch gap-2 border-t bg-muted/40">
            <p className="text-xs text-muted-foreground">
              El copy se genera en el idioma y tono seleccionados. Revisa y ajusta antes de enviar a producción.
            </p>
          </CardFooter>
        </Card>

        {/* Card: Resultado IA */}
        <Card className="border-primary/10 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              Resultado IA
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {campaignMutation.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-9/12" />
              </div>
            )}

            {!campaignMutation.isPending && campaignMutation.data?.text && (
              <Textarea
                className="h-64 resize-none"
                value={campaignMutation.data.text}
                readOnly
              />
            )}

            {!campaignMutation.isPending && !campaignMutation.data?.text && (
              <p className="text-sm text-muted-foreground">
                Completa el formulario de la izquierda y genera el primer copy de campaña con IA.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t bg-muted/40">
            <p className="text-xs text-muted-foreground">
              Usa el botón para copiar y pegar el texto en tu herramienta de envío.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!campaignMutation.data?.text}
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  Copiar texto
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Extensión opcional: resumen de timeline */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Resumen IA de timeline por cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr,auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-foreground">
                ID de cliente
              </label>
              <Input
                placeholder="Ej. customer_123"
                value={summaryCustomerId}
                onChange={(e) => setSummaryCustomerId(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Usa el ID interno del cliente para obtener un resumen del timeline de interacciones.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!summaryCustomerId || summarizeMutation.isPending}
              onClick={() => summarizeMutation.mutate(summaryCustomerId)}
            >
              {summarizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resumiendo…
                </>
              ) : (
                "Resumir timeline IA"
              )}
            </Button>
          </div>

          {summarizeMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Error al resumir timeline</AlertTitle>
              <AlertDescription>
                {(summarizeMutation.error as Error).message}
              </AlertDescription>
            </Alert>
          )}

          <div>
            {summarizeMutation.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
              </div>
            )}
            {!summarizeMutation.isPending && summarizeMutation.data?.summary && (
              <Card className="mt-2 bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumen IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {summarizeMutation.data.summary}
                  </p>
                </CardContent>
              </Card>
            )}
            {!summarizeMutation.isPending && !summarizeMutation.data?.summary && (
              <p className="text-sm text-muted-foreground">
                Ingresa un ID de cliente y genera un resumen de alto nivel de su historial de interacciones.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

