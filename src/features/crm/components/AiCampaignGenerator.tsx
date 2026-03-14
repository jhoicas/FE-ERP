import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { generateCampaignCopy } from "@/features/crm/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  prompt: z.string().min(10, "Describe la campaña en al menos 10 caracteres"),
  tone: z.string().min(1, "Selecciona un tono"),
  target_audience: z.string().min(3, "Indica el público objetivo"),
});

const createCampaignSchema = z.object({
  name: z.string().min(3, "Nombre mínimo de 3 caracteres"),
  segment: z.string().min(2, "Segmento mínimo de 2 caracteres"),
  channel: z.enum(["Email", "SMS", "WhatsApp"], {
    required_error: "Selecciona un canal",
  }),
  scheduled_at: z.string().min(1, "Selecciona fecha programada"),
});

type FormValues = z.infer<typeof schema>;
type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

export default function AiCampaignGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { prompt: "", tone: "", target_audience: "" },
  });

  const createCampaignForm = useForm<CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      segment: "",
      channel: "Email",
      scheduled_at: "",
    },
  });

  const mutation = useMutation<string, Error, FormValues>({
    mutationFn: async (values) => {
      const fullPrompt = [
        `Genera un copy de campaña en español para una campaña de marketing.`,
        `Tema de la campaña: ${values.prompt}.`,
        `Público objetivo: ${values.target_audience}.`,
        `Tono deseado: ${values.tone}.`,
        `Incluye un asunto atractivo, un cuerpo de email o texto comercial y un cierre con llamada a la acción.`,
      ].join(" ");

      const { text } = await generateCampaignCopy({ prompt: fullPrompt });
      return text;
    },
    onError: (error) => {
      toast({
        title: "No se pudo generar el copy",
        description: error.message ?? "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  const createCampaignMutation = useMutation<unknown, Error, CreateCampaignValues>({
    mutationFn: async (values) => {
      const scheduledAtIso = new Date(values.scheduled_at).toISOString();
      const { data } = await apiClient.post("/api/crm/campaigns", {
        name: values.name,
        segment: values.segment,
        channel: values.channel,
        scheduled_at: scheduledAtIso,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "campaigns"] });
      createCampaignForm.reset({
        name: "",
        segment: "",
        channel: "Email",
        scheduled_at: "",
      });
      toast({
        title: "Campaña creada",
        description: "La campaña fue programada correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo crear la campaña",
        description: error.message ?? "Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!mutation.data) return;
    await navigator.clipboard.writeText(mutation.data);
    toast({
      title: "Texto copiado",
      description: "El copy se ha copiado al portapapeles.",
    });
  };

  return (
    <div className="animate-fade-in space-y-4">
      <button
        onClick={() => navigate("/crm")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a CRM
      </button>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generador de Campañas con IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe tu campaña y genera copy comercial al instante.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <section className="erp-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿De qué trata la campaña?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Lanzamiento de nueva colección de aceites esenciales"
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tono</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tono" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="profesional">Profesional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="persuasivo">Persuasivo</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público objetivo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Mujeres 25-40 interesadas en bienestar"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={mutation.isPending} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                {mutation.isPending ? "Generando…" : "Generar Copy Comercial"}
              </Button>
            </form>
          </Form>
        </section>
        {/* Right: Result */}
        <section className="erp-card relative min-h-[200px]">
          <h3 className="text-sm font-semibold mb-3">Resultado</h3>
          {mutation.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/6" />
            </div>
          )}
          {!mutation.isPending && mutation.data && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="absolute top-3 right-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {mutation.data}
              </div>
            </>
          )}
          {!mutation.isPending && !mutation.data && (
            <p className="text-sm text-muted-foreground">
              El copy generado aparecerá aquí.
            </p>
          )}
        </section>
      </div>

      <Card className="erp-card">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Paso final: Crear campaña</h3>
            <p className="text-xs text-muted-foreground">
              Define los datos de publicación y registra la campaña.
            </p>
          </div>

          <Form {...createCampaignForm}>
            <form
              onSubmit={createCampaignForm.handleSubmit((values) => createCampaignMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={createCampaignForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Promo Bienestar Marzo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCampaignForm.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Clientes recurrentes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCampaignForm.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona canal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCampaignForm.control}
                  name="scheduled_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha programada</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={createCampaignMutation.isPending}
                className="w-full"
              >
                {createCampaignMutation.isPending ? "Creando campaña…" : "Crear campaña"}
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}

