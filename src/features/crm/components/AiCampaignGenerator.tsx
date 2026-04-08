import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Copy, Send, Loader2, Save, FolderOpen } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  createCampaignTemplate,
  generateCampaignCopy,
  getCampaignTemplates,
  listCategories,
  getCustomers,
  listCustomers,
  sendCampaign,
  sendCampaignTest,
} from "@/features/crm/services";
import type { CampaignTemplate } from "@/types/crm";
import type { CrmSegment } from "@/features/crm/schemas";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const schema = z.object({
  prompt: z.string().min(10, "Describe la campaña en al menos 10 caracteres"),
  tone: z.string().min(1, "Selecciona un tono"),
  target_audience: z.string().min(3, "Indica el público objetivo"),
  category_id: z.string().min(1, "Selecciona segmento"),
  subject: z.string().min(1, "El asunto del correo es obligatorio para enviar"),
});

const sendTestSchema = z.object({
  mode: z.enum(["customer", "email"]),
  // Nota: en react-hook-form el campo puede existir con "" cuando no está visible.
  // Hacemos que "" cuente como `undefined` para que no bloquee el submit.
  customer_id: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string())
    .optional(),
  email: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().email("Email inválido"))
    .optional(),
}).superRefine((values, ctx) => {
  if (values.mode === "customer") {
    if (!values.customer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer_id"],
        message: "Selecciona un cliente.",
      });
    }
  }

  if (values.mode === "email") {
    if (!values.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Ingresa un email.",
      });
    }
  }
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

const saveTemplateSchema = z.object({
  name: z.string().min(1, "El nombre de la plantilla es obligatorio"),
});

type RecipientStrategy = { type: "category"; category_id: string };

type RecipientDTO = z.infer<typeof RecipientSchema>;

const RECIPIENTS_PREVIEW_PAGE_SIZE = 10;

type FormValues = z.infer<typeof schema>;
type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

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

const SEGMENT_OPTIONS: CrmSegment[] = ["VIP", "PREMIUM", "RECURRENTE", "OCASIONAL"];

function buildAutomationPrompt(segment: CrmSegment, customers: Array<{ metadata?: { followUpStrategy?: string } }>) {
  const strategies = customers
    .map((customer) => customer.metadata?.followUpStrategy?.trim())
    .filter((strategy): strategy is string => Boolean(strategy));

  const uniqueStrategies = Array.from(new Set(strategies));
  const strategyText =
    uniqueStrategies.length > 0
      ? uniqueStrategies.join(" | ")
      : `Segmento ${segment} sin estrategia específica registrada.`;

  return [
    `Genera una campaña automática de remarketing para el segmento ${segment}.`,
    `Usa como referencia la siguiente estrategia de seguimiento: ${strategyText}.`,
    `Devuelve el contenido en español, con un asunto breve y persuasivo, y un cuerpo listo para borrador.`,
    `Incluye un saludo personalizado con [Nombre] y evita enlaces innecesarios.`,
  ].join(" ");
}

export default function AiCampaignGenerator() {
  const queryClient = useQueryClient();
  const [autoCampaignSegment, setAutoCampaignSegment] = useState<CrmSegment | "">("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [resolvedRecipients, setResolvedRecipients] = useState<RecipientDTO[]>([]);
  const [lastPreviewStrategies, setLastPreviewStrategies] = useState<RecipientStrategy[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
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

  const templatesQuery = useQuery({
    queryKey: ["crm", "campaign-templates"],
    queryFn: getCampaignTemplates,
    enabled: templatesOpen,
  });

  const customersQuery = useQuery({
    queryKey: ["crm", "customers", "campaign-test", customerSearch],
    queryFn: () =>
      listCustomers({
        limit: 20,
        offset: 0,
        search: customerSearch.trim() || undefined,
      }),
    enabled: testSendOpen,
  });

  const saveTemplateForm = useForm<z.infer<typeof saveTemplateSchema>>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: {
      name: "",
    },
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

  const buildRecipientStrategies = (): RecipientStrategy[] => {
    if (!selectedCategoryId) {
      return [];
    }

    return [{ type: "category", category_id: selectedCategoryId }];
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
        `Incluye un asunto atractivo y un cuerpo de email listo para enviar.`,
        `Reglas estrictas:`,
        `- Debes incluir el placeholder [Nombre] para personalizar el saludo al cliente (por ejemplo: "Hola [Nombre], ...").`,
        `- No agregues placeholders adicionales entre corchetes (solo [Nombre]).`,
        `- No inventes secciones tipo "[Llamada a la acción...]" ni agregues enlaces si no fueron solicitados.`,
      ].join(" ");

      const { text } = await generateCampaignCopy({ prompt: fullPrompt });
      return text;
    },
    onSuccess: (generatedText, values) => {
      setGeneratedText(generatedText);
      createCampaignForm.setValue("body", generatedText, { shouldDirty: true, shouldValidate: true });
      const currentSubject = form.getValues("subject");
      if (!currentSubject || currentSubject.trim().length === 0) {
        const suggestedSubject = suggestSubjectFromGeneratedText(generatedText, values.prompt);
        form.setValue("subject", suggestedSubject, {
          shouldDirty: true,
          shouldValidate: true,
        });
        createCampaignForm.setValue("subject", suggestedSubject, {
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

  const autoCampaignMutation = useMutation<
    { prompt: string; subject: string; body: string; segment: CrmSegment },
    Error,
    CrmSegment
  >({
    mutationFn: async (segment) => {
      const allCustomers = await queryClient.fetchQuery({
        queryKey: ["crm", "customers", "campaign-automation"],
        queryFn: () => getCustomers(),
      });

      const segmentCustomers = allCustomers.filter(
        (customer) => (customer.segment ?? customer.category_name ?? "").toUpperCase() === segment,
      );

      const prompt = buildAutomationPrompt(segment, segmentCustomers.length > 0 ? segmentCustomers : allCustomers);
      const { text } = await generateCampaignCopy({ prompt });
      const subject = suggestSubjectFromGeneratedText(text, `Campaña ${segment}`);

      return { prompt, subject, body: text, segment };
    },
    onSuccess: ({ prompt, subject, body, segment }) => {
      setGeneratedText(body);
      form.setValue("prompt", prompt, { shouldDirty: true, shouldValidate: true });
      form.setValue("subject", subject, { shouldDirty: true, shouldValidate: true });
      createCampaignForm.setValue("name", `Campaña ${segment}`, { shouldDirty: true, shouldValidate: true });
      createCampaignForm.setValue("segment", segment, { shouldDirty: true, shouldValidate: true });
      createCampaignForm.setValue("subject", subject, { shouldDirty: true, shouldValidate: true });
      createCampaignForm.setValue("body", body, { shouldDirty: true, shouldValidate: true });
      toast({
        title: "Campaña automática lista",
        description: `Se generó un borrador para ${segment}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo generar la campaña automática",
        description: error.message ?? "Intenta nuevamente.",
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
      setSelectedCategoryId("");
      setResolvedRecipients([]);
      setLastPreviewStrategies([]);
      setRecipientsPage(1);
      setGeneratedText("");
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
    if (!generatedText) return;
    await navigator.clipboard.writeText(generatedText);
    toast({
      title: "Texto copiado",
      description: "El copy se ha copiado al portapapeles.",
    });
  };

  const saveTemplateMutation = useMutation<CampaignTemplate, Error, z.infer<typeof saveTemplateSchema>>({
    mutationFn: async ({ name }) => {
      const subject = form.getValues("subject").trim();
      return createCampaignTemplate({
        name,
        subject,
        body: generatedText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "campaign-templates"] });
      toast({
        title: "Plantilla guardada",
        description: "La plantilla se guardó correctamente.",
      });
      setSaveTemplateOpen(false);
      saveTemplateForm.reset({ name: "" });
    },
    onError: (error) => {
      toast({
        title: "No se pudo guardar la plantilla",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedAudience = form.watch("category_id");
  const campaignSubject = form.watch("subject");
  const canSendCampaign = Boolean(generatedText && campaignSubject?.trim());
  const canSaveTemplate = Boolean(generatedText && campaignSubject?.trim());
  const selectedCategory = (categoriesQuery.data ?? []).find((c) => c.id === selectedAudience);
  const selectedSegmentLabel = selectedAudience === "all"
    ? "Todos los clientes"
    : selectedCategory?.name ?? "Segmento no encontrado";
  const campaignBodyPreview = (generatedText ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 3)
    .join("\n");

  const handleSendCampaign = () => {
    if (!generatedText || !campaignSubject?.trim()) return;

    sendCampaignMutation.mutate({
      subject: campaignSubject.trim(),
      body: generatedText,
      category_id: selectedAudience === "all" ? null : selectedAudience,
    });
  };

  const sendTestForm = useForm<z.infer<typeof sendTestSchema>>({
    resolver: zodResolver(sendTestSchema),
    defaultValues: { mode: "email", email: "" },
  });

  useEffect(() => {
    if (!testSendOpen) return;
    // Evita estados “pegados” entre aperturas del modal.
    sendTestForm.reset({ mode: "email", email: "" });
    setCustomerSearch("");
  }, [testSendOpen, sendTestForm]);

  const sendTestMutation = useMutation<{ status: string }, Error, z.infer<typeof sendTestSchema>>({
    mutationFn: async (values) => {
      const subject = form.getValues("subject").trim();
      const body = generatedText;
      if (!subject || !body) {
        throw new Error("Primero genera el mensaje y define el asunto.");
      }

      if (values.mode === "customer") {
        if (!values.customer_id) throw new Error("Selecciona un cliente.");
        return sendCampaignTest({
          subject,
          body,
          customer_id: values.customer_id,
          // El backend valida que `email` exista para el envío de prueba.
          email: values.email,
        });
      }

      if (!values.email) throw new Error("Ingresa un email.");
      return sendCampaignTest({ subject, body, email: values.email });
    },
    onSuccess: () => {
      toast({ title: "Correo de prueba enviado" });
      setTestSendOpen(false);
      sendTestForm.reset({ mode: "email", email: "" });
      setCustomerSearch("");
    },
    onError: (error) => {
      toast({
        title: "No se pudo enviar el correo de prueba",
        description: error.message ?? "Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    const mode = sendTestForm.watch("mode");
    const customerId = sendTestForm.watch("customer_id");
    const emailInput = sendTestForm.watch("email");

    if (mode === "customer") {
      if (!customerId) {
        toast({
          title: "Revisa el destino",
          description: "Selecciona un cliente válido.",
          variant: "destructive",
        });
        return;
      }

      const selected = (customersQuery.data?.items ?? []).find((c) => c.id === customerId);

      const selectedEmail = selected?.email ?? undefined;
      const maybeSend = (email?: string) => {
        if (!email) {
          toast({
            title: "Cliente sin email",
            description:
              "El backend requiere `email` para el envío de prueba. No pude obtener el email del cliente seleccionado. Usa “Destino: Email manual”.",
            variant: "destructive",
          });
          return;
        }

        sendTestMutation.mutate({
          mode: "customer",
          customer_id: customerId,
          email,
        });
      };

      if (selectedEmail) {
        maybeSend(selectedEmail);
        return;
      }

      // Fallback: si el query de clientes filtrado/buscado no trajo el email,
      // lo consultamos completo para encontrar el email por `id`.
      void (async () => {
        try {
          const all = await getCustomers();
          const fromAll = all.find((c) => c.id === customerId);
          maybeSend(fromAll?.email ?? undefined);
        } catch {
          toast({
            title: "No se pudo obtener el email",
            description: "Intenta nuevamente o usa “Destino: Email manual”.",
            variant: "destructive",
          });
        }
      })();
      return;
    }

    if (mode === "email") {
      const parsedEmail = z.string().email("Ingresa un email válido.").safeParse(emailInput);
      if (!parsedEmail.success) {
        toast({
          title: "Revisa el destino",
          description: parsedEmail.error.issues[0]?.message ?? "Ingresa un email válido.",
          variant: "destructive",
        });
        return;
      }

      sendTestMutation.mutate({
        mode: "email",
        email: parsedEmail.data,
      });
      return;
    }

    toast({
      title: "Revisa el destino",
      description: "Selecciona un destino válido.",
      variant: "destructive",
    });
  };

  const handleUseTemplate = (template: CampaignTemplate) => {
    form.setValue("subject", template.subject, { shouldDirty: true, shouldValidate: true });
    createCampaignForm.setValue("subject", template.subject, { shouldDirty: true, shouldValidate: true });
    createCampaignForm.setValue("body", template.body, { shouldDirty: true, shouldValidate: true });
    setGeneratedText(template.body);
    setTemplatesOpen(false);
    toast({
      title: "Plantilla cargada",
      description: `Se cargó la plantilla \"${template.name}\".`,
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

    if (!selectedCategoryId) {
      toast({
        title: "Falta categoría",
        description: "Selecciona una categoría destino antes de previsualizar.",
        variant: "destructive",
      });
      return;
    }

    if (strategies.length === 0) {
      toast({
        title: "Selecciona al menos una estrategia",
        description: "Define quiénes recibirán la campaña antes de previsualizar.",
        variant: "destructive",
      });
      return;
    }

    previewRecipientsMutation.mutate(strategies);
  };

  const handleGenerateAutomaticCampaign = () => {
    if (!autoCampaignSegment) {
      toast({
        title: "Selecciona un segmento",
        description: "Elige VIP, PREMIUM, RECURRENTE u OCASIONAL.",
        variant: "destructive",
      });
      return;
    }

    autoCampaignMutation.mutate(autoCampaignSegment);
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Sin botón "Volver a CRM" */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generador de Campañas con IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Describe tu campaña y genera copy comercial al instante.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => setTemplatesOpen(true)}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Mis Plantillas
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-xs">
          <FormLabel>Segmento a impactar</FormLabel>
          <Select value={autoCampaignSegment} onValueChange={(value) => setAutoCampaignSegment(value as CrmSegment)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un segmento" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_OPTIONS.map((segment) => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={handleGenerateAutomaticCampaign}
          disabled={autoCampaignMutation.isPending}
          className="md:self-end"
        >
          {autoCampaignMutation.isPending ? "Generando…" : "Generar Campaña Automática"}
        </Button>
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
          {!mutation.isPending && generatedText && (
            <>
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveTemplateOpen(true)}
                  disabled={!canSaveTemplate || saveTemplateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar como Plantilla
                </Button>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {generatedText}
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setTestSendOpen(true)}
                  disabled={!canSendCampaign}
                >
                  Enviar prueba
                </Button>
                <Button
                  type="button"
                  className="w-full"
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
              </div>
            </>
          )}
          {!mutation.isPending && !generatedText && (
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
                  Selecciona la categoría de clientes y previsualiza la audiencia.
                </p>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Categoría destino</p>
                  <Select
                    value={selectedCategoryId || undefined}
                    onValueChange={setSelectedCategoryId}
                    disabled={categoriesQuery.isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesQuery.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {(categoriesQuery.data ?? []).length === 0 && !categoriesQuery.isLoading && (
                        <SelectItem value="_none" disabled>
                          Sin categorías disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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

      <Dialog open={testSendOpen} onOpenChange={setTestSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar correo de prueba</DialogTitle>
            <DialogDescription>
              Envía el mensaje actual a un email manual o a un cliente específico. El placeholder{" "}
              <span className="font-mono">[Nombre]</span> se mantiene.
            </DialogDescription>
          </DialogHeader>

          <Form {...sendTestForm}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTest();
              }}
              className="space-y-4"
            >
              <FormField
                control={sendTestForm.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        sendTestForm.setValue("mode", value as "customer" | "email", {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email manual</SelectItem>
                        <SelectItem value="customer">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {sendTestForm.watch("mode") === "email" ? (
                <FormField
                  control={sendTestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="correo@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    <FormLabel>Buscar cliente</FormLabel>
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Nombre, NIT o email…"
                    />
                  </div>

                  <FormField
                    control={sendTestForm.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select
                          // `undefined` puede dejar el Select en estado no controlado.
                          // Para sincronizar con RHF usamos "" cuando no hay valor.
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            field.onChange(value);
                            sendTestForm.setValue("customer_id", value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={customersQuery.isLoading ? "Cargando..." : "Seleccionar"}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(customersQuery.data?.items ?? []).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                {/* <p className="text-xs text-muted-foreground">
                    customer_id en el formulario:{" "}
                    <span className="font-mono">
                      {sendTestForm.watch("customer_id") || "—"}
                    </span>
                  </p> */}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setTestSendOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={sendTestMutation.isPending}>
                  {sendTestMutation.isPending ? "Enviando..." : "Enviar prueba"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla</DialogTitle>
            <DialogDescription>
              Guarda este asunto y contenido para reutilizarlos después.
            </DialogDescription>
          </DialogHeader>

          <Form {...saveTemplateForm}>
            <form
              onSubmit={saveTemplateForm.handleSubmit((values) =>
                saveTemplateMutation.mutate({ name: values.name ?? "" })
              )}
              className="space-y-4"
            >
              <FormField
                control={saveTemplateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la plantilla</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Promo Oro Marzo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setSaveTemplateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveTemplateMutation.isPending || !canSaveTemplate}>
                  {saveTemplateMutation.isPending ? "Guardando..." : "Guardar plantilla"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mis Plantillas</SheetTitle>
            <SheetDescription>
              Reutiliza plantillas guardadas para acelerar el envío de campañas.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {templatesQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : templatesQuery.isError ? (
              <p className="text-sm text-destructive">{(templatesQuery.error as Error).message}</p>
            ) : (templatesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay plantillas guardadas.</p>
            ) : (
              (templatesQuery.data ?? []).map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.subject}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {template.body}
                    </p>
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={() => handleUseTemplate(template)}>
                        Usar Plantilla
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

