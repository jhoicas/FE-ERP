import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Gift,
  User,
  MessageSquare,
  Activity,
  Ticket,
  Sparkles,
} from "lucide-react";

import {
  getProfile360,
  assignCategory,
  listCategories,
  listTickets,
  summarizeTimeline,
} from "@/features/crm/services";
import RegisterInteractionDialog from "@/features/crm/components/RegisterInteractionDialog";
import { assignCategorySchema, type AssignCategoryRequest } from "@/lib/validations/crm";
import type { InteractionResponse, TicketResponse } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

const TICKETS_PAGE_SIZE = 50;

function formatCurrency(value: string | number | null | undefined) {
  const n =
    typeof value === "string"
      ? parseFloat(value)
      : typeof value === "number"
      ? value
      : NaN;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  });
}

function CategoryBadge({ name }: { name?: string }) {
  if (!name) {
    return <Badge variant="secondary">Sin categoría</Badge>;
  }
  const lower = name.toLowerCase();
  let variant: "default" | "secondary" | "destructive" = "secondary";
  if (lower.includes("gold") || lower.includes("vip") || lower.includes("alta")) {
    variant = "default";
  } else if (lower.includes("risk") || lower.includes("baja")) {
    variant = "destructive";
  }
  return <Badge variant={variant}>{name}</Badge>;
}

function TicketStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "open" || normalized === "pending") {
    return <Badge variant="default" className="text-xs">Abierto</Badge>;
  }
  if (normalized === "resolved") {
    return <Badge variant="secondary" className="text-xs">Resuelto</Badge>;
  }
  if (normalized === "closed") {
    return <Badge variant="outline" className="text-xs">Cerrado</Badge>;
  }
  return (
    <Badge variant="outline" className="text-xs">
      {status}
    </Badge>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  const s = (sentiment ?? "").toLowerCase();
  if (s === "positive") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[11px]"
      >
        Positivo
      </Badge>
    );
  }
  if (s === "negative") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/50 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 text-[11px]"
      >
        Negativo
      </Badge>
    );
  }
  if (s === "neutral") {
    return (
      <Badge variant="secondary" className="text-[11px]">
        Neutral
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] text-muted-foreground">
      Sin análisis
    </Badge>
  );
}

function InteractionTypeBadge({ type }: { type: InteractionResponse["type"] }) {
  const labelMap: Record<InteractionResponse["type"], string> = {
    call: "Llamada",
    email: "Email",
    meeting: "Reunión",
    other: "Otro",
  };
  return (
    <Badge variant="outline" className="text-[11px]">
      {labelMap[type] ?? type}
    </Badge>
  );
}

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

function ProfileHeader({
  name,
  email,
  categoryName,
  ltv,
}: {
  name: string;
  email?: string | null;
  categoryName?: string;
  ltv: string;
}) {
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name],
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            {name}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{email ?? "Sin email"}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
            <span className="text-muted-foreground">Categoría:</span>
            <CategoryBadge name={categoryName} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-1">
          <ExplainableAcronym sigla="LTV" /> estimado
        </p>
        <p className="text-xl font-semibold font-mono">
          {formatCurrency(ltv)}
        </p>
      </CardContent>
    </Card>
  );
}

function BenefitsList({
  benefits,
}: {
  benefits?: { id: string; name: string; description: string }[];
}) {
  if (!benefits || benefits.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Beneficios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay beneficios configurados para esta categoría.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Beneficios de la categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {benefits.map((b) => (
          <div
            key={b.id}
            className="rounded-md border bg-muted/40 px-3 py-2 space-y-1"
          >
            <p className="text-xs font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActiveTicketsList({
  tickets,
}: {
  tickets: TicketResponse[];
}) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Tickets activos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este cliente no tiene tickets abiertos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex items-center gap-2">
        <Ticket className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Tickets activos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="border rounded-md px-3 py-2 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{t.subject}</p>
              <div className="flex items-center gap-1">
                <TicketStatusBadge status={t.status} />
                <SentimentBadge sentiment={t.sentiment} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Creado el {formatDateTime(t.created_at)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InteractionsTimeline({
  interactions,
}: {
  interactions: InteractionResponse[];
}) {
  if (interactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Timeline de interacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no has registrado interacciones para este cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...interactions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Card>
      <CardHeader className="pb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Timeline de interacciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((i) => (
          <div key={i.id} className="flex gap-3">
            <div className="mt-1">
              <InteractionTypeBadge type={i.type} />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">
                  {i.subject || "Sin asunto"}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(i.created_at)}
                </span>
              </div>
              {i.body && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {i.body}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TimelineAISummaryCard({
  summary,
  isLoading,
  onSummarize,
  error,
}: {
  summary?: string;
  isLoading: boolean;
  onSummarize: () => void;
  error?: Error | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Resumen IA</CardTitle>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={onSummarize}
        >
          {isLoading ? "Resumiendo…" : "Resumir timeline con IA"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-10/12" />
            <Skeleton className="h-3 w-8/12" />
          </div>
        )}
        {!isLoading && summary && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {summary}
          </p>
        )}
        {!isLoading && !summary && !error && (
          <p className="text-sm text-muted-foreground">
            Genera un resumen automático del timeline de este cliente para tener
            contexto rápido antes de una llamada o reunión.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            {(error as Error).message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerProfile360Page() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
   const [recentInteractions, setRecentInteractions] = useState<
    InteractionResponse[]
  >([]);
  const [aiSummary, setAiSummary] = useState<string | undefined>();

  const profileQuery = useQuery({
    queryKey: ["crm-profile360", customerId],
    queryFn: () => getProfile360(customerId!),
    enabled: !!customerId,
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", 100, 0],
    queryFn: () => listCategories({ limit: 100, offset: 0 }),
    enabled: assignDialogOpen,
  });

  const ticketsQuery = useQuery({
    queryKey: ["crm-tickets", TICKETS_PAGE_SIZE, 0],
    queryFn: () => listTickets({ limit: TICKETS_PAGE_SIZE, offset: 0 }),
    enabled: !!customerId,
  });

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeTimeline({ customer_id: customerId! }),
    onSuccess: (data) => {
      setAiSummary(data.summary);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (body: AssignCategoryRequest) =>
      assignCategory(customerId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-profile360", customerId] });
      setAssignDialogOpen(false);
    },
  });

  const form = useForm<AssignCategoryRequest>({
    resolver: zodResolver(assignCategorySchema),
    defaultValues: { category_id: "", ltv: 0 },
  });

  const openAssignDialog = () => {
    setAssignDialogOpen(true);
    const currentLtv = profileQuery.data?.ltv;
    form.reset({
      category_id: profileQuery.data?.category_id ?? "",
      ltv: currentLtv ? parseFloat(String(currentLtv)) : 0,
    });
  };

  const onSubmitAssign = (values: AssignCategoryRequest) => {
    assignMutation.mutate(values);
  };

  if (!customerId) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <p className="text-sm text-destructive">ID de cliente no válido.</p>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (profileQuery.isError) {
    const err = profileQuery.error as Error & { code?: string };
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            {err.code ? `[${err.code}] ` : ""}
            {err.message}
          </p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data!;
  const { customer, category_name, ltv, benefits } = profile;
  const activeTickets: TicketResponse[] =
    ticketsQuery.data?.items.filter(
      (t) =>
        t.customer_id === customerId &&
        t.status.toLowerCase() !== "closed",
    ) ?? [];

  return (
    <div className="animate-fade-in space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInteractionDialogOpen(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Registrar interacción
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda: perfil + fidelización */}
        <div className="space-y-4 lg:col-span-1">
          <ProfileHeader
            name={customer.name}
            email={customer.email}
            categoryName={category_name}
            ltv={ltv}
          />

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="h-4 w-4" /> Fidelización
              </CardTitle>
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAssignDialog}
                  >
                    Asignar categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Asignar categoría al cliente</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmitAssign)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={categoriesQuery.isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoriesQuery.data?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name} (min LTV: {cat.min_ltv})
                                  </SelectItem>
                                ))}
                                {categoriesQuery.data?.length === 0 &&
                                  !categoriesQuery.isLoading && (
                                    <SelectItem value="_none" disabled>
                                      No hay categorías
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
                        name="ltv"
                        render={({ field }) => (
                          <FormItem>
            <FormLabel>
              <ExplainableAcronym sigla="LTV" /> (valor de vida)
            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                min={0}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.valueAsNumber || 0)
                                }
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
                          onClick={() => setAssignDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={assignMutation.isPending}
                        >
                          {assignMutation.isPending ? "Guardando…" : "Guardar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                  {assignMutation.isError && (
                    <p className="text-sm text-destructive mt-2">
                      {(assignMutation.error as Error).message}
                    </p>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Categoría:
                </span>
                <CategoryBadge name={category_name} />
              </div>
            </CardContent>
          </Card>

          <BenefitsList benefits={benefits} />
        </div>

        {/* Columna derecha: Tabs Timeline / Tickets */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <TimelineAISummaryCard
                summary={aiSummary}
                isLoading={summarizeMutation.isPending}
                onSummarize={() => summarizeMutation.mutate()}
                error={summarizeMutation.isError ? summarizeMutation.error as Error : null}
              />
              <InteractionsTimeline interactions={recentInteractions} />
            </TabsContent>

            <TabsContent value="tickets">
              {ticketsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : ticketsQuery.isError ? (
                <Card>
                  <CardContent>
                    <p className="text-sm text-destructive">
                      {(ticketsQuery.error as Error).message}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ActiveTicketsList tickets={activeTickets} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <RegisterInteractionDialog
        open={interactionDialogOpen}
        onOpenChange={setInteractionDialogOpen}
        customerId={customerId}
        invalidateProfile360
        onCreated={(interaction) =>
          setRecentInteractions((prev) => [interaction, ...prev])
        }
      />
    </div>
  );
}
