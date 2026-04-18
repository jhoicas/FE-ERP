import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Mail, MessageSquare, Smartphone, Sparkles, Copy, Send, Loader2, Save, FolderOpen, Phone } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  createCampaignTemplate,
  createCampaign,
  generateCampaignCopy,
  getCampaignTemplates,
  listCategories,
  getCustomers,
  sendCampaign,
  sendCampaignTest,
  sendTestMessage,
} from "@/features/crm/services";
import type { CampaignTemplate } from "@/types/crm";
import type { CustomerDTO } from "@/features/crm/schemas";
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
  FormDescription,
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
import { CreateCampaignSchema as CampaignCreateSchema } from "@/features/crm/schemas";

const schema = z.object({
  prompt: z.string().min(10, "Describe la campaña en al menos 10 caracteres"),
  tone: z.string().min(1, "Selecciona un tono"),
  target_audience: z.string().min(3, "Indica el público objetivo"),
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
  category_id: z.string().optional().default(""),
});

const sendTestSchema = z.object({
  email: z.string().email("Email inválido"),
});

const RecipientSchema = z.object({
  customer_id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
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
type PreviewContact = RecipientDTO &
  Partial<CustomerDTO> & {
    firstName?: string;
    lastName?: string;
    totalSales?: number;
    totalComprado?: number;
    totalPurchased?: number;
    phone?: string;
  };

const RECIPIENTS_PREVIEW_PAGE_SIZE = 10;

type FormValues = z.infer<typeof schema>;
type CreateCampaignValues = z.infer<typeof CampaignCreateSchema>;

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

function pickFirstString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickFirstNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function buildPreviewContact(recipient: RecipientDTO | null, customer?: CustomerDTO | null): PreviewContact | null {
  if (!recipient) {
    return null;
  }

  const merged = {
    ...customer,
    ...recipient,
  } as Record<string, unknown>;

  return {
    ...recipient,
    ...(customer ?? {}),
    name:
      pickFirstString(merged, ["name", "firstName", "first_name", "fullName", "nombre"]) ||
      recipient.name,
    email: pickFirstString(merged, ["email", "mail"]) || recipient.email,
    phone: pickFirstString(merged, ["phone", "phone_number", "phoneNumber", "telefono", "celular"]),
    segment:
      pickFirstString(merged, ["segment", "segmento", "category_name", "categoryName", "main_category"]) ||
      recipient.segment,
    categoryName: pickFirstString(merged, ["category_name", "categoryName", "main_category"]),
    totalSales: pickFirstNumber(merged, ["totalSales", "total_sales", "totalComprado", "total_purchased", "ltv"]),
  };
}

function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  return phone;
}

function getPreviewVariables(contact: PreviewContact): Record<string, unknown> {
  return {
    ...contact,
    name: contact.name,
    firstName: contact.firstName ?? contact.name,
    lastName: contact.lastName ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    telefono: contact.phone ?? "",
    segmento: contact.segment ?? "",
    segment: contact.segment ?? "",
    categoria: contact.categoryName ?? contact.category_name ?? "",
    categoryName: contact.categoryName ?? contact.category_name ?? "",
    category_name: contact.categoryName ?? contact.category_name ?? "",
    totalSales: contact.totalSales ?? contact.totalComprado ?? contact.totalPurchased ?? contact.ltv ?? 0,
    totalComprado: contact.totalSales ?? contact.totalComprado ?? contact.totalPurchased ?? contact.ltv ?? 0,
    total_purchased: contact.totalSales ?? contact.totalComprado ?? contact.totalPurchased ?? contact.ltv ?? 0,
    ltv: contact.totalSales ?? contact.totalComprado ?? contact.totalPurchased ?? contact.ltv ?? 0,
  };
}

function replacePreviewVars(text: string, contact: PreviewContact | null): string {
  if (!contact) return text;

  const replacedBracketSyntax = text.replace(/\[(nombre|name|firstname)\]/gi, contact.name);

  return replacedBracketSyntax.replace(/{{\s*([^}]+)\s*}}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const normalized = key.toLowerCase();

    if (normalized === "name" || normalized === "firstname" || normalized === "nombre") {
      return contact.name;
    }

    return `{{${key}}}`;
  });
}

function limitSmsText(text: string): string {
  return text.length > 150 ? text.slice(0, 150) : text;
}

function PreviewEmptyState({ channel }: { channel: "EMAIL" | "SMS" | "WHATSAPP" }) {
  const icon = channel === "EMAIL" ? Mail : channel === "WHATSAPP" ? MessageSquare : Smartphone;
  const label = channel === "EMAIL" ? "Email" : channel === "WHATSAPP" ? "WhatsApp" : "SMS";
  const Icon = icon;

  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-6 text-center">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Vista previa {label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Previsualiza destinatarios para mostrar aquí un ejemplo real de la audiencia seleccionada.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailPreviewMockup({
  contact,
  subject,
  body,
}: {
  contact: PreviewContact;
  subject: string;
  body: string;
}) {
  const processedBody = replacePreviewVars(body, contact);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border bg-background shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="ml-2 flex-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          mail.ludoia.com / composer
        </div>
        <Badge variant="outline" className="gap-1">
          <Mail className="h-3 w-3" />
          Email
        </Badge>
      </div>

      <div className="space-y-4 bg-white p-5 text-sm text-foreground">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Para</p>
          <p className="font-medium">{contact.email || "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Asunto</p>
          <p className="font-medium">{subject || "Sin asunto"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 leading-relaxed whitespace-pre-wrap">
          {processedBody || "Escribe un mensaje para ver la vista previa."}
        </div>
      </div>
    </div>
  );
}

function PhonePreviewMockup({
  contact,
  channel,
  body,
}: {
  contact: PreviewContact;
  channel: "SMS" | "WHATSAPP";
  body: string;
}) {
  const processedBody = replacePreviewVars(body, contact);
  const bubbleClass = channel === "WHATSAPP" ? "bg-success/10 text-foreground" : "bg-primary/10 text-foreground";
  const title = channel === "WHATSAPP" ? "WhatsApp" : "Mensajes";
  const icon = channel === "WHATSAPP" ? MessageSquare : Smartphone;
  const Icon = icon;

  return (
    <div className="mx-auto max-w-[360px] rounded-[2rem] border-[3px] border-foreground/10 bg-background p-3 shadow-lg">
      <div className="mx-auto mb-3 h-5 w-28 rounded-full bg-foreground/80" />
      <div className="rounded-[1.5rem] border bg-muted/20 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </div>
            <p className="text-xs text-muted-foreground">{formatPhone(contact.phone)}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            {channel}
          </Badge>
        </div>

        <div className={`rounded-[1.25rem] rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm ${bubbleClass}`}>
          {processedBody || "Escribe un mensaje para ver la vista previa."}
        </div>
      </div>
    </div>
  );
}

function CampaignPreviewPanel({
  channel,
  contact,
  subject,
  body,
}: {
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  contact: PreviewContact | null;
  subject: string;
  body: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Vista Previa en Tiempo Real</p>
          <p className="text-xs text-muted-foreground">
            Se renderiza con el primer destinatario real de la audiencia previsualizada.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          {channel === "EMAIL" ? <Mail className="h-3 w-3" /> : channel === "WHATSAPP" ? <MessageSquare className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
          {channel}
        </Badge>
      </div>

      {contact ? (
        channel === "EMAIL" ? (
          <EmailPreviewMockup contact={contact} subject={subject} body={body} />
        ) : (
          <PhonePreviewMockup contact={contact} channel={channel as "SMS" | "WHATSAPP"} body={body} />
        )
      ) : (
        <PreviewEmptyState channel={channel} />
      )}
    </div>
  );
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
  const [directTestOpen, setDirectTestOpen] = useState(false);
  const [directTestPhone, setDirectTestPhone] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      prompt: "",
      tone: "profesional",
      target_audience: "",
      subject: "",
      body: "",
      category_id: "",
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", "campaign-send"],
    queryFn: () => listCategories({ limit: 100, offset: 0 }),
  });

  const getCategoryIdFromSegment = (segment: CrmSegment): string | null => {
    const categories = categoriesQuery.data ?? [];
    const normalizedSegment = segment.trim().toLowerCase();

    const exact = categories.find((category) => category.name?.trim().toLowerCase() === normalizedSegment);
    if (exact?.id) {
      return exact.id;
    }

    const partial = categories.find((category) => category.name?.trim().toLowerCase().includes(normalizedSegment));
    return partial?.id ?? null;
  };

  const templatesQuery = useQuery({
    queryKey: ["crm", "campaign-templates"],
    queryFn: getCampaignTemplates,
    enabled: templatesOpen,
  });

    const previewDirectoryQuery = useQuery({
      queryKey: ["crm", "customers", "campaign-preview-directory", resolvedRecipients.length],
      queryFn: () => getCustomers(),
      enabled: resolvedRecipients.length > 0,
      staleTime: 5 * 60 * 1000,
    });

  const saveTemplateForm = useForm<z.infer<typeof saveTemplateSchema>>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: {
      name: "",
    },
  });

  const createCampaignForm = useForm<CreateCampaignValues>({
    resolver: zodResolver(CampaignCreateSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      segment: "",
      channel: "EMAIL",
      scheduledAt: "",
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
      const currentChannel = createCampaignForm.getValues("channel");
      const finalGeneratedText = currentChannel === "SMS" ? limitSmsText(generatedText) : generatedText;

      // Actualizar estado global
      setGeneratedText(finalGeneratedText);

      // Inyectar en el formulario de creación (Paso 4)
      createCampaignForm.setValue("body", finalGeneratedText, { shouldDirty: true, shouldValidate: true });
      
      const suggestedSubject = suggestSubjectFromGeneratedText(generatedText, values.prompt);
      
      // Reflejar el contenido generado en el formulario del Paso 4.
      createCampaignForm.setValue("subject", suggestedSubject, { shouldDirty: true, shouldValidate: true });
      
      toast({
        title: "Contenido generado",
        description: "El copy ha sido redactado y cargado en el editor.",
      });
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

      const categoryId = getCategoryIdFromSegment(segment);
      if (categoryId) {
        setSelectedCategoryId(categoryId);
        previewRecipientsMutation.mutate([{ type: "category", category_id: categoryId }]);
      } else {
        toast({
          title: "Campaña automática lista",
          description: `Se generó el borrador para ${segment}, pero no se encontró una categoría destino equivalente para previsualizar destinatarios automáticamente.`,
        });
        return;
      }

      toast({
        title: "Campaña automática lista",
        description: `Se generó un borrador para ${segment} y se previsualizaron sus destinatarios automáticamente.`,
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
    { channel: "EMAIL" | "SMS" | "WHATSAPP"; subject: string; body: string; category_id: string | null }
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
      const currentStrategies = buildRecipientStrategies();
      const currentStrategiesJson = JSON.stringify(currentStrategies);
      const lastPreviewStrategiesJson = JSON.stringify(lastPreviewStrategies);
      const bodyToSend = values.channel === "SMS" ? limitSmsText(values.body) : values.body;

      if (currentStrategiesJson !== lastPreviewStrategiesJson) {
        throw new Error("Debes previsualizar nuevamente los destinatarios antes de enviar.");
      }

      const scheduledAtIso = values.scheduledAt
        ? new Date(`${values.scheduledAt}:00-05:00`).toISOString()
        : undefined;

      return createCampaign({
        name: values.name,
        subject: values.subject,
        body: bodyToSend,
        segment: values.segment,
        channel: values.channel,
        scheduledAt: scheduledAtIso,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "campaigns"] });
      createCampaignForm.reset({
        name: "",
        subject: "",
        body: "",
        segment: "",
        channel: "EMAIL",
        scheduledAt: "",
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
    if (!watchedBody) return;
    await navigator.clipboard.writeText(watchedBody);
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
        body: watchedBody,
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
  const previewChannel = createCampaignForm.watch("channel");
  
  // Observar los campos del editor en tiempo real (Paso 4)
  const watchedSubject = createCampaignForm.watch("subject");
  const watchedBody = createCampaignForm.watch("body");
  const hasSubjectDraft = Boolean((watchedSubject ?? "").trim());
  const hasBodyDraft = Boolean((watchedBody ?? "").trim());

  const canSendCampaign = Boolean(hasBodyDraft && (previewChannel !== "EMAIL" || hasSubjectDraft));
  const canSaveTemplate = Boolean(hasBodyDraft && (previewChannel !== "EMAIL" || hasSubjectDraft));
  const isEmailChannel = previewChannel === "EMAIL";
  const isPhoneChannel = previewChannel === "WHATSAPP" || previewChannel === "SMS";
  
  const isSmsOverLimit = previewChannel === "SMS" && (watchedBody?.length ?? 0) > 150;
  
  const selectedCategory = (categoriesQuery.data ?? []).find((c) => c.id === selectedAudience);
  const selectedSegmentLabel = selectedAudience === "all"
    ? "Todos los clientes"
    : selectedCategory?.name ?? "Segmento no encontrado";

  const campaignBodyPreview = (watchedBody ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 3)
    .join("\n");

  const previewContact = useMemo(() => {
    const firstRecipient = resolvedRecipients[0];
    if (!firstRecipient) {
      return null;
    }

    const matchingCustomer = previewDirectoryQuery.data?.find(
      (customer) => customer.id === firstRecipient.customer_id,
    );

    return buildPreviewContact(firstRecipient, matchingCustomer ?? null);
  }, [previewDirectoryQuery.data, resolvedRecipients]);

  const handleSendCampaign = () => {
    if (!hasBodyDraft || (previewChannel === "EMAIL" && !hasSubjectDraft)) return;

    sendCampaignMutation.mutate({
      channel: previewChannel,
      subject: watchedSubject?.trim() || "",
      body: watchedBody,
      category_id: selectedAudience === "all" ? null : selectedAudience || null,
    });
  };

  // ── Mutación de prueba directa (SMS / WhatsApp) ─────────────
  const directTestMutation = useMutation({
    mutationFn: sendTestMessage,
    onSuccess: () => {
      toast({
        title: "Prueba enviada",
        description: `Mensaje de prueba enviado por ${previewChannel} correctamente.`,
      });
      setDirectTestOpen(false);
      setDirectTestPhone("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al enviar prueba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDirectTestSend = () => {
    if (!directTestPhone.trim() || !watchedBody) return;
    directTestMutation.mutate({
      channel: previewChannel as "SMS" | "WHATSAPP",
      destination_phone: directTestPhone.trim(),
      content: watchedBody,
    });
  };

  const sendTestForm = useForm<z.infer<typeof sendTestSchema>>({
    resolver: zodResolver(sendTestSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!testSendOpen) return;
    sendTestForm.reset({ email: "" });
  }, [testSendOpen, sendTestForm]);

  const sendEmailTestMutation = useMutation<{ status: string }, Error, z.infer<typeof sendTestSchema>>({
    mutationFn: async (values) => {
      const subject = createCampaignForm.getValues("subject")?.trim();
      const body = createCampaignForm.getValues("body");
      const email = values.email?.trim();

      if (!subject || !body?.trim()) {
        throw new Error("Primero genera o completa asunto y contenido del email.");
      }

      return sendCampaignTest({
        channel: "EMAIL",
        subject,
        body,
        email,
      });
    },
    onSuccess: () => {
      toast({ title: "Email de prueba enviado" });
      setTestSendOpen(false);
      sendTestForm.reset({ email: "" });
    },
    onError: (error) => {
      toast({
        title: "No se pudo enviar el email de prueba",
        description: error.message ?? "Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSendEmailTest = () => {
    const parsed = sendTestSchema.safeParse(sendTestForm.getValues());
    if (!parsed.success) {
      toast({
        title: "Revisa el destino",
        description: parsed.error.issues[0]?.message ?? "Ingresa un email válido.",
        variant: "destructive",
      });
      return;
    }

    sendEmailTestMutation.mutate(parsed.data);
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
    <div className="w-full bg-background/50 min-h-screen">
      <div className="animate-fade-in max-w-5xl mx-auto px-4 py-12 space-y-12 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            Campaña Inteligente
          </h2>
          <p className="text-muted-foreground text-lg">
            Crea, personaliza y programa tus envíos en minutos.
          </p>
        </div>
        <Button type="button" variant="outline" size="lg" onClick={() => setTemplatesOpen(true)} className="rounded-full px-6">
          <FolderOpen className="h-5 w-5 mr-2" />
          Mis Plantillas
        </Button>
      </div>

      {/* PASO 1: CONFIGURACIÓN */}
      <Card className="erp-card overflow-hidden border-none shadow-xl ring-1 ring-primary/10">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg">1</span>
            <div>
              <h3 className="text-lg font-bold">Configuración Básica</h3>
              <p className="text-xs text-muted-foreground">Define el destino y el medio de envío.</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <Form {...createCampaignForm}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={createCampaignForm.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿A quién va dirigida?</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        const catId = getCategoryIdFromSegment(val as CrmSegment);
                        if (catId) setSelectedCategoryId(catId);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-lg">
                          <SelectValue placeholder="Selecciona un segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEGMENT_OPTIONS.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createCampaignForm.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Por qué canal enviamos?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-lg">
                          <SelectValue placeholder="Selecciona el canal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email Marketing</SelectItem>
                        <SelectItem value="SMS">Mensaje de Texto (SMS)</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp Business</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </div>
      </Card>

      {/* PASO 2: ASISTENTE IA */}
      <Card className="erp-card overflow-hidden border-none shadow-xl ring-1 ring-primary/10">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg">2</span>
            <div>
              <h3 className="text-lg font-bold">Redacción con Inteligencia Artificial</h3>
              <p className="text-xs text-muted-foreground">Deja que la IA redacte un mensaje persuasivo para ti.</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">¿Cuál es el objetivo de esta campaña?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe aquí los detalles, beneficios o promociones que quieres resaltar..."
                        className="min-h-[140px] text-lg bg-muted/30 focus:bg-background transition-colors p-4 resize-none rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:max-w-xl">
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Tono de voz</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Tono" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="profesional">Profesional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="persuasivo">Persuasivo</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_audience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Público Objetivo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Clientes recurrentes"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={mutation.isPending} 
                  size="lg"
                  className="w-full lg:w-auto gap-3 h-14 px-10 rounded-xl text-lg font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all bg-primary hover:bg-primary/90"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  Generar Contenido
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Card>

      {/* PASO 3: REVISIÓN DE AUDIENCIA */}
      <Card className="erp-card overflow-hidden border-none shadow-xl ring-1 ring-primary/10">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg">3</span>
            <div>
              <h3 className="text-lg font-bold">Revisión de Audiencia</h3>
              <p className="text-xs text-muted-foreground">Valida destinatarios y detecta faltantes antes de enviar.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-lg">Audiencia Seleccionada</h4>
              <p className="text-sm text-muted-foreground">Verifica quiénes recibirán este mensaje.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={previewRecipientsMutation.isPending || !selectedCategoryId}
              onClick={handlePreviewRecipients}
            >
              {previewRecipientsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
              Actualizar Lista de Destinatarios
            </Button>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className={cn("font-bold", isEmailChannel ? "bg-primary/5 text-primary" : "text-muted-foreground")}>Email</TableHead>
                  <TableHead className={cn("font-bold", isPhoneChannel ? "bg-primary/5 text-primary" : "text-muted-foreground")}>Teléfono</TableHead>
                  <TableHead className="font-bold">Segmento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedRecipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                      Haz clic en "Actualizar Lista" para ver la audiencia.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRecipients.map((recipient) => {
                    const email = recipient.email?.trim() ?? "";
                    const phone = recipient.phone?.trim() ?? "";
                    const hasMissingEmail = !recipient.email || recipient.email.trim() === "";
                    const hasMissingPhone = !recipient.phone || recipient.phone.trim() === "";
                    const missingRequired = (isEmailChannel && hasMissingEmail) || (isPhoneChannel && hasMissingPhone);

                    return (
                      <TableRow key={recipient.customer_id} className={cn("hover:bg-muted/30 transition-colors", missingRequired && "bg-destructive/5")}>
                        <TableCell className="font-medium">{recipient.name}</TableCell>
                        <TableCell className={cn(isEmailChannel ? "bg-primary/5" : "text-muted-foreground")}>
                          {email ? (
                            email
                          ) : isEmailChannel ? (
                            <span className="inline-flex items-center gap-1 font-medium text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Sin email
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={cn(isPhoneChannel ? "bg-primary/5" : "text-muted-foreground")}>
                          {phone ? (
                            phone
                          ) : isPhoneChannel ? (
                            <span className="inline-flex items-center gap-1 font-medium text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Sin teléfono
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-normal">{recipient.segment ?? "General"}</Badge>
                            {missingRequired && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Dato requerido faltante
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {resolvedRecipients.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-bold">{recipientsSliceStart + 1}–{Math.min(recipientsSliceStart + RECIPIENTS_PREVIEW_PAGE_SIZE, recipientsTotal)}</span> de {recipientsTotal} clientes.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={currentRecipientsPage <= 1}
                    onClick={() => setRecipientsPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <div className="text-xs font-bold px-3 py-1 bg-background rounded-md border">
                    {currentRecipientsPage} / {recipientsTotalPages}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
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
        </div>
      </Card>

      {/* PASO 4: EDITOR Y LANZAMIENTO */}
      <Card className="erp-card overflow-hidden border-none shadow-2xl ring-1 ring-primary/20">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg">4</span>
            <div>
              <h3 className="text-lg font-bold">Personalización y Lanzamiento</h3>
              <p className="text-xs text-muted-foreground">Revisa el contenido final, previsualiza y programa el envío.</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <Form {...createCampaignForm}>
            <form className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={createCampaignForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Nombre de la Campaña (Interno)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Lanzamiento Verano 2026" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCampaignForm.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Fecha y Hora de Envío</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" className="h-11" {...field} />
                      </FormControl>
                      <FormDescription>Si se deja vacío, quedará como borrador pendiente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                  {previewChannel === "EMAIL" && (
                    <FormField
                      control={createCampaignForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Asunto del Mensaje</FormLabel>
                          <FormControl>
                            <Input placeholder="Escribe un asunto irresistible..." className="h-11 font-medium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={createCampaignForm.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="font-semibold">Contenido del Mensaje</FormLabel>
                          <Button variant="outline" size="sm" type="button" onClick={handleCopy} className="h-8 text-xs gap-2 rounded-lg">
                            <Copy className="h-3.5 w-3.5" /> Copiar Texto
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Aquí aparecerá el texto generado. Puedes editarlo libremente..."
                            className="min-h-[350px] text-base font-sans leading-relaxed p-6 rounded-2xl border-primary/20"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setGeneratedText(e.target.value);
                            }}
                          />
                        </FormControl>
                        {previewChannel === "SMS" && (
                          <div className="flex justify-between mt-2 px-2">
                            <p className={cn("text-xs font-medium", isSmsOverLimit ? "text-destructive" : "text-muted-foreground")}>
                              {field.value.length} / 160 caracteres
                            </p>
                            {isSmsOverLimit && <p className="text-xs text-destructive font-bold">¡Atención! Excede 1 SMS.</p>}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="lg:col-span-2 space-y-6">
                   <div className="sticky top-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Vista Previa</h4>
                    <CampaignPreviewPanel
                      channel={previewChannel}
                      contact={previewContact}
                      subject={watchedSubject}
                      body={watchedBody}
                    />
                  </div>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN FINAL */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t">
                <div className="flex gap-4">
                  {previewChannel === "EMAIL" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="rounded-xl h-14 px-6 border-dashed"
                      onClick={() => setTestSendOpen(true)}
                      disabled={!hasBodyDraft || !hasSubjectDraft}
                    >
                      Enviar Email de Prueba
                    </Button>
                  )}
                  {previewChannel === "WHATSAPP" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="rounded-xl h-14 px-6 gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      onClick={() => setDirectTestOpen(true)}
                      disabled={!watchedBody || directTestMutation.isPending}
                    >
                      <Phone className="h-5 w-5" />
                      WhatsApp de Prueba
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:w-auto px-12 h-14 text-xl font-black rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all gap-3 bg-primary"
                  onClick={createCampaignForm.handleSubmit((values) => createCampaignMutation.mutate(values))}
                  disabled={createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Save className="h-6 w-6" />
                  )}
                  Guardar Campaña
                </Button>
              </div>
            </form>
          </Form>
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
              <p className="font-medium">{watchedSubject || "—"}</p>
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
            <DialogTitle>Enviar Email de Prueba</DialogTitle>
            <DialogDescription>
              Envía el contenido actual a un destinatario de prueba por email.
            </DialogDescription>
          </DialogHeader>

          <Form {...sendTestForm}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendEmailTest();
              }}
              className="space-y-4"
            >
              <FormField
                control={sendTestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email destinatario</FormLabel>
                    <FormControl>
                      <Input placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setTestSendOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={sendEmailTestMutation.isPending}>
                  {sendEmailTestMutation.isPending ? "Enviando..." : "Enviar Email de Prueba"}
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

      {/* ── Dialog: Prueba Directa SMS / WhatsApp ─────────────────────── */}
      <Dialog open={directTestOpen} onOpenChange={setDirectTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Enviar Prueba Directa
            </DialogTitle>
            <DialogDescription>
              Envía un mensaje de prueba por <strong>{previewChannel}</strong> a un número
              de teléfono específico. No se guardará en la base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="direct-test-phone">Número de Teléfono</Label>
              <Input
                id="direct-test-phone"
                placeholder="+57 300 123 4567"
                value={directTestPhone}
                onChange={(e) => setDirectTestPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Contenido</Label>
              <p className="text-xs text-muted-foreground line-clamp-4 bg-muted/50 p-3 rounded-md">
                {watchedBody ? watchedBody.slice(0, 200) + (watchedBody.length > 200 ? "..." : "") : "Sin contenido generado."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectTestOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDirectTestSend}
              disabled={!directTestPhone.trim() || directTestMutation.isPending}
            >
              {directTestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Prueba
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

