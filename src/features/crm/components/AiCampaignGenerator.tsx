import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Copy, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { generateCampaignCopy, listCategories, sendCampaign } from "@/features/crm/services";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const schema = z.object({
  prompt: z.string().min(10, "Describe la campaña en al menos 10 caracteres"),
  tone: z.string().min(1, "Selecciona un tono"),
  target_audience: z.string().min(3, "Indica el público objetivo"),
  category_id: z.string().min(1, "Selecciona segmento"),
  subject: z.string().min(1, "El asunto del correo es obligatorio para enviar"),
});

const createCampaignSchema = z.object({
  name: z.string().min(3, "Nombre mínimo de 3 caracteres"),
  subject: z.string().min(3, "Asunto mínimo de 3 caracteres"),
  body: z.string().min(10, "Contenido mínimo de 10 caracteres"),
  segment: z.string().min(2, "Segmento mínimo de 2 caracteres"),
  channel: z.enum(["Email", "SMS", "WhatsApp"], {
    required_error: "Selecciona un canal",
  }),
  scheduled_at: z.string().min(1, "Selecciona fecha programada"),
});

const RecipientSchema = z.object({
  customer_id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
});

const ResolveRecipientsResponseSchema = z.object({
  recipients: z.array(RecipientSchema),
});

const ProductLookupSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();

const ProductListLookupSchema = z.object({
  items: z.array(ProductLookupSchema),
}).passthrough();

type RecipientStrategy =
  | { type: "category_gold" }
  | { type: "reorder_product"; product_id: string; months_ago: number };

type RecipientDTO = z.infer<typeof RecipientSchema>;
type ProductLookupDTO = z.infer<typeof ProductLookupSchema>;

const RECIPIENTS_PREVIEW_PAGE_SIZE = 10;

type FormValues = z.infer<typeof schema>;
type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

async function searchProducts(search: string): Promise<ProductLookupDTO[]> {
  const { data } = await apiClient.get("/api/products", {
    params: {
      search,
      limit: 20,
      offset: 0,
    },
  });

  if (Array.isArray(data)) {
    return z.array(ProductLookupSchema).parse(data);
  }

  const parsed = ProductListLookupSchema.safeParse(data);
  if (parsed.success) {
    return parsed.data.items;
  }

  return [];
}

async function resolveCampaignRecipients(strategies: RecipientStrategy[]): Promise<RecipientDTO[]> {
  const { data } = await apiClient.post("/api/crm/campaigns/recipients/resolve", {
    strategies,
  });
  const parsed = ResolveRecipientsResponseSchema.parse(data);
  return parsed.recipients;
}

function suggestSubjectFromGeneratedText(generatedText: string, fallbackPrompt: string): string {
  const lines = generatedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const subjectLine = lines.find((line) => /^asunto\s*:/i.test(line));
  if (subjectLine) {
    const cleaned = subjectLine.replace(/^asunto\s*:/i, "").trim();
    if (cleaned.length > 0) {
      return cleaned.slice(0, 120);
    }
  }

  const firstMeaningfulLine = lines[0];
  if (firstMeaningfulLine && firstMeaningfulLine.length > 0) {
    return firstMeaningfulLine.slice(0, 120);
  }

  return `Campaña: ${fallbackPrompt}`.slice(0, 120);
}

export default function AiCampaignGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendToCategoryGold, setSendToCategoryGold] = useState(false);
  const [sendToReorderProduct, setSendToReorderProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [reorderMonthsAgo, setReorderMonthsAgo] = useState<number>(6);
  const [resolvedRecipients, setResolvedRecipients] = useState<RecipientDTO[]>([]);
  const [lastPreviewStrategies, setLastPreviewStrategies] = useState<RecipientStrategy[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: "",
      tone: "",
      target_audience: "",
      category_id: "all",
      subject: "",
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", "campaign-send"],
    queryFn: () => listCategories({ limit: 100, offset: 0 }),
  });

  const createCampaignForm = useForm<CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      segment: "",
      channel: "Email",
      scheduled_at: "",
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products", "campaign-recipients-search", productSearch],
    queryFn: () => searchProducts(productSearch),
    enabled: sendToReorderProduct && productSearch.trim().length >= 2,
  });

  const buildRecipientStrategies = (): RecipientStrategy[] => {
    const strategies: RecipientStrategy[] = [];

    if (sendToCategoryGold) {
      strategies.push({ type: "category_gold" });
    }

    if (sendToReorderProduct && selectedProductId) {
      strategies.push({
        type: "reorder_product",
        product_id: selectedProductId,
        months_ago: reorderMonthsAgo,
      });
    }

    return strategies;
  };

  const recipientsTotal = resolvedRecipients.length;
  const recipientsTotalPages = Math.max(
    1,
    Math.ceil(recipientsTotal / RECIPIENTS_PREVIEW_PAGE_SIZE),
  );
  const currentRecipientsPage = Math.min(recipientsPage, recipientsTotalPages);
  const recipientsSliceStart = (currentRecipientsPage - 1) * RECIPIENTS_PREVIEW_PAGE_SIZE;
  const pagedRecipients = resolvedRecipients.slice(
    recipientsSliceStart,
    recipientsSliceStart + RECIPIENTS_PREVIEW_PAGE_SIZE,
  );

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
    onSuccess: (generatedText, values) => {
      const currentSubject = form.getValues("subject");
      if (!currentSubject || currentSubject.trim().length === 0) {
        const suggestedSubject = suggestSubjectFromGeneratedText(generatedText, values.prompt);
        form.setValue("subject", suggestedSubject, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
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

  const sendCampaignMutation = useMutation<
    { status: string },
    Error,
    { subject: string; body: string; category_id: string | null }
  >({
    mutationFn: sendCampaign,
    onSuccess: (data: { status: string }) => {
      if (data.status !== "sent") {
        throw new Error("El servidor no confirmó el envío de la campaña.");
      }
      toast({
        title: "Campaña enviada",
        description: "Campaña enviada exitosamente a los clientes",
      });
      mutation.reset();
      setConfirmSendOpen(false);
    },
    onError: (error) => {
      let description = error.message ?? "Intenta nuevamente.";
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const backendMessage = (error.response?.data as { message?: string } | undefined)?.message;

        if (status === 400) {
          description = backendMessage ?? "Valida el asunto y el contenido antes de enviar.";
        } else if (status === 409 || status === 503) {
          description = backendMessage ?? "El servicio SMTP no está disponible o presentó conflicto.";
        } else if (status && status >= 500) {
          description = backendMessage ?? "Ocurrió un error interno al enviar la campaña.";
        }
      }

      toast({
        title: "No se pudo enviar la campaña",
        description,
        variant: "destructive",
      });
    },
  });

  const createCampaignMutation = useMutation<unknown, Error, CreateCampaignValues>({
    mutationFn: async (values) => {
      const scheduledAtIso = new Date(values.scheduled_at).toISOString();
      const currentStrategies = buildRecipientStrategies();
      const currentStrategiesJson = JSON.stringify(currentStrategies);
      const lastPreviewStrategiesJson = JSON.stringify(lastPreviewStrategies);

      if (currentStrategiesJson !== lastPreviewStrategiesJson) {
        throw new Error("Debes previsualizar nuevamente los destinatarios antes de enviar.");
      }

      const { data } = await apiClient.post("/api/crm/campaigns", {
        name: values.name,
        subject: values.subject,
        body: values.body,
        segment: values.segment,
        channel: values.channel,
        scheduled_at: scheduledAtIso,
        recipient_strategies: currentStrategies,
        recipient_count: resolvedRecipients.length,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "campaigns"] });
      createCampaignForm.reset({
        name: "",
        subject: "",
        body: "",
        segment: "",
        channel: "Email",
        scheduled_at: "",
      });
      setSendToCategoryGold(false);
      setSendToReorderProduct(false);
      setProductSearch("");
      setSelectedProductId("");
      setReorderMonthsAgo(6);
      setResolvedRecipients([]);
      setLastPreviewStrategies([]);
      setRecipientsPage(1);
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

  const selectedAudience = form.watch("category_id");
  const campaignSubject = form.watch("subject");
  const canSendCampaign = Boolean(mutation.data && campaignSubject?.trim());
  const selectedCategory = (categoriesQuery.data ?? []).find((c) => c.id === selectedAudience);
  const selectedSegmentLabel = selectedAudience === "all"
    ? "Todos los clientes"
    : selectedCategory?.name ?? "Segmento no encontrado";
  const campaignBodyPreview = (mutation.data ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 3)
    .join("\n");

  const handleSendCampaign = () => {
    if (!mutation.data || !campaignSubject?.trim()) return;

    sendCampaignMutation.mutate({
      subject: campaignSubject.trim(),
      body: mutation.data,
      category_id: selectedAudience === "all" ? null : selectedAudience,
    });
  };

  const previewRecipientsMutation = useMutation<RecipientDTO[], Error, RecipientStrategy[]>({
    mutationFn: resolveCampaignRecipients,
    onSuccess: (recipients, strategies) => {
      setResolvedRecipients(recipients);
      setLastPreviewStrategies(strategies);
      setRecipientsPage(1);
      toast({
        title: "Destinatarios actualizados",
        description: `Se encontraron ${recipients.length} destinatarios.`,
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo previsualizar destinatarios",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePreviewRecipients = () => {
    const strategies = buildRecipientStrategies();

    if (strategies.length === 0) {
      toast({
        title: "Selecciona al menos una estrategia",
        description: "Define quiénes recibirán la campaña antes de previsualizar.",
        variant: "destructive",
      });
      return;
    }

    if (sendToReorderProduct && !selectedProductId) {
      toast({
        title: "Falta producto para recompra",
        description: "Selecciona un producto para la estrategia de recompra.",
        variant: "destructive",
      });
      return;
    }

    previewRecipientsMutation.mutate(strategies);
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

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {(categoriesQuery.data ?? []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            Solo {category.name}
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
                    <FormLabel>Asunto del Correo</FormLabel>
                    <FormControl>
                      <Input placeholder="Asunto del correo" {...field} />
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
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => setConfirmSendOpen(true)}
                disabled={!canSendCampaign || sendCampaignMutation.isPending}
              >
                {sendCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar a Clientes
                  </>
                )}
              </Button>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Destinatarios</p>
                <p className="text-xs text-muted-foreground">
                  Selecciona una o más estrategias y previsualiza la audiencia.
                </p>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="recipient-category-gold"
                    checked={sendToCategoryGold}
                    onCheckedChange={(checked) => setSendToCategoryGold(Boolean(checked))}
                  />
                  <label htmlFor="recipient-category-gold" className="text-sm leading-5">
                    Enviar a todos los clientes de Categoría Oro
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="recipient-reorder-product"
                      checked={sendToReorderProduct}
                      onCheckedChange={(checked) => {
                        const enabled = Boolean(checked);
                        setSendToReorderProduct(enabled);
                        if (!enabled) {
                          setProductSearch("");
                          setSelectedProductId("");
                          setReorderMonthsAgo(6);
                        }
                      }}
                    />
                    <label htmlFor="recipient-reorder-product" className="text-sm leading-5">
                      Enviar a los clientes que compraron X producto hace 6 meses
                    </label>
                  </div>

                  {sendToReorderProduct && (
                    <div className="space-y-2 pl-6">
                      <Input
                        placeholder="Buscar producto..."
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                      />

                      <Select
                        value={selectedProductId || undefined}
                        onValueChange={setSelectedProductId}
                        disabled={productsQuery.isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {(productsQuery.data ?? []).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                          {(productsQuery.data ?? []).length === 0 && !productsQuery.isLoading && (
                            <SelectItem value="_none" disabled>
                              Sin productos para este criterio
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <Select
                        value={String(reorderMonthsAgo)}
                        onValueChange={(value) => setReorderMonthsAgo(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rango de tiempo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses</SelectItem>
                          <SelectItem value="12">12 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={previewRecipientsMutation.isPending}
                onClick={handlePreviewRecipients}
              >
                {previewRecipientsMutation.isPending ? "Previsualizando…" : "Previsualizar destinatarios"}
              </Button>

              <div className="rounded-md border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                  <p className="text-sm font-medium">Resultado</p>
                  <p className="text-xs text-muted-foreground">
                    Total: {resolvedRecipients.length}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Segmento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedRecipients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Previsualiza destinatarios para ver resultados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedRecipients.map((recipient) => (
                        <TableRow key={recipient.customer_id}>
                          <TableCell>{recipient.name}</TableCell>
                          <TableCell>{recipient.email ?? "—"}</TableCell>
                          <TableCell>{recipient.segment ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {resolvedRecipients.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {recipientsSliceStart + 1}–{Math.min(recipientsSliceStart + RECIPIENTS_PREVIEW_PAGE_SIZE, recipientsTotal)} de {recipientsTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentRecipientsPage <= 1}
                        onClick={() => setRecipientsPage((prev) => Math.max(1, prev - 1))}
                      >
                        Anterior
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Página {currentRecipientsPage} / {recipientsTotalPages}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentRecipientsPage >= recipientsTotalPages}
                        onClick={() => setRecipientsPage((prev) => Math.min(recipientsTotalPages, prev + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
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
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Asunto</FormLabel>
                      <FormControl>
                        <Input placeholder="Asunto del mensaje" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCampaignForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contenido de la campaña"
                          className="min-h-[140px]"
                          {...field}
                        />
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
                {createCampaignMutation.isPending ? "Enviando campaña…" : "Enviar campaña"}
              </Button>
                </form>
              </Form>
            </section>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío de campaña</AlertDialogTitle>
            <AlertDialogDescription>
              Revisa los datos antes de enviar la campaña a los clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Asunto</p>
              <p className="font-medium">{campaignSubject || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Segmento</p>
              <p className="font-medium">{selectedSegmentLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resumen del contenido</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {campaignBodyPreview || "Sin contenido generado."}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleSendCampaign();
              }}
              disabled={!canSendCampaign || sendCampaignMutation.isPending}
            >
              {sendCampaignMutation.isPending ? "Enviando..." : "Confirmar envío"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

