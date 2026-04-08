import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Crown,
  Mail,
  Phone,
  FileText,
  Gift,
  User,
  MessageSquare,
  Activity,
  Ticket,
  Sparkles,
  Pencil,
  Star,
} from "lucide-react";
import { z } from "zod";
import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  getProfile360,
  assignCategory,
  listCategories,
  listTickets,
  listTasks,
  summarizeTimeline,
} from "@/features/crm/services";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
import EditCustomerDialog from "@/features/crm/components/EditCustomerDialog";
import RegisterInteractionDialog from "@/features/crm/components/RegisterInteractionDialog";
import { assignCategorySchema, type AssignCategoryRequest } from "@/lib/validations/crm";
import type { InteractionResponse, ProfileMetadata, TicketResponse, TaskResponse } from "@/types/crm";
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
import { Progress } from "@/components/ui/progress";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

const TICKETS_PAGE_SIZE = 50;

const LoyaltyHistoryItemSchema = z
  .object({
    id: z.string().optional().catch(""),
    type: z.string().optional().catch("earned"),
    points: z.union([z.number(), z.string()]).optional().transform((v) => Number(v ?? 0)),
    reason: z.string().optional().nullable().catch(null),
    created_at: z.string().optional().nullable().catch(null),
  })
  .passthrough();

const LoyaltyResponseSchema = z
  .object({
    balance: z.union([z.number(), z.string()]).optional().transform((v) => Number(v ?? 0)),
    current_tier_name: z.string().optional().nullable().catch(null),
    next_tier_name: z.string().optional().nullable().catch(null),
    next_tier_threshold: z.union([z.number(), z.string()]).optional().transform((v) => Number(v ?? 0)),
    current_tier_min_points: z.union([z.number(), z.string()]).optional().transform((v) => Number(v ?? 0)),
    history: z.array(LoyaltyHistoryItemSchema).optional().catch([]),
    transactions: z.array(LoyaltyHistoryItemSchema).optional().catch([]),
  })
  .passthrough();

type LoyaltyHistoryItem = z.infer<typeof LoyaltyHistoryItemSchema>;
type LoyaltyResponse = z.infer<typeof LoyaltyResponseSchema> & {
  history: LoyaltyHistoryItem[];
};

async function getCustomerLoyalty(customerId: string): Promise<LoyaltyResponse> {
  const { data } = await apiClient.get(`/api/crm/customers/${customerId}/loyalty`);
  const parsed = LoyaltyResponseSchema.parse(data);
  return {
    ...parsed,
    history: parsed.history.length > 0 ? parsed.history : parsed.transactions,
  };
}

async function redeemLoyaltyPoints(params: {
  customer_id: string;
  points: number;
  reason: string;
}) {
  const { data } = await apiClient.post("/api/crm/loyalty/redeem", params);
  return data;
}

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

function formatMonthYear(value?: string | null) {
  if (!value) return "—";
  return value;
}

function getCustomerTierBadge(categoryId?: string, categoryName?: string) {
  const raw = `${categoryId ?? ""} ${categoryName ?? ""}`.toUpperCase();

  if (raw.includes("VIP")) {
    return { label: "VIP", icon: Crown, className: "border-amber-300 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 text-amber-950 shadow-sm shadow-amber-500/25" };
  }

  if (raw.includes("PREMIUM")) {
    return { label: "PREMIUM", icon: Star, className: "border-slate-300 bg-gradient-to-r from-slate-200 via-slate-50 to-slate-300 text-slate-900 shadow-sm shadow-slate-400/25" };
  }

  return null;
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
  tierBadge,
}: {
  name: string;
  email?: string | null;
  categoryName?: string;
  ltv: string;
  tierBadge?: ReturnType<typeof getCustomerTierBadge>;
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
            {tierBadge && (
              <Badge variant="outline" className={`gap-1.5 border px-2 py-0.5 text-[11px] font-semibold ${tierBadge.className}`}>
                {(() => {
                  const TierIcon = tierBadge.icon;
                  return <TierIcon className="h-3.5 w-3.5" />;
                })()}
                {tierBadge.label}
              </Badge>
            )}
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

function PurchaseHabitsCard({
  metadata,
}: {
  metadata?: ProfileMetadata;
}) {
  const ordersCount = metadata?.ordersCount ?? null;
  const lastPurchaseDate = metadata?.lastPurchaseDate?.trim() || null;
  const mainCategory = metadata?.mainCategory?.trim() || null;
  const followUpStrategy = metadata?.followUpStrategy?.trim() || null;
  const products = useMemo(
    () =>
      (metadata?.productsList ?? "")
        .split("|")
        .map((product) => product.trim())
        .filter(Boolean),
    [metadata?.productsList],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Hábitos de Compra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cantidad de pedidos</p>
            <p className="mt-1 text-sm font-semibold">{ordersCount ?? "-"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fecha de Última Compra</p>
            <p className="mt-1 text-sm font-semibold">{lastPurchaseDate ?? "-"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoría Principal</p>
            <p className="mt-1 text-sm font-semibold">{mainCategory ?? "-"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Productos Distintos</p>
            {products.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {products.map((product) => (
                  <Badge key={product} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {product}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold">-</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {metadata?.distinctProducts != null ? `${metadata.distinctProducts} productos distintos` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Productos comprados</p>
          {products.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {products.map((product) => (
                <Badge key={product} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {product}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
          )}
        </div>

        <div className="rounded-lg border bg-background/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estrategia de seguimiento</p>
          <p className="mt-1 text-sm text-foreground">
            {followUpStrategy ?? "-"}
          </p>
        </div>
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

function ActiveTasksCard({
  tasks,
  isLoading,
  isError,
  error,
}: {
  tasks: TaskResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Tareas activas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Tareas activas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {(error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Tareas activas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este cliente no tiene tareas activas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const ad = a.due_at || a.created_at;
    const bd = b.due_at || b.created_at;
    return new Date(ad).getTime() - new Date(bd).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">Tareas activas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((t) => (
          <div key={t.id} className="border rounded-md px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <Badge variant="outline" className="text-[11px]">
                {t.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t.due_at
                ? `Vence el ${formatDateTime(t.due_at)}`
                : `Creada el ${formatDateTime(t.created_at)}`}
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

function LoyaltyProgressCard({ loyalty }: { loyalty: LoyaltyResponse }) {
  const balance = loyalty.balance ?? 0;
  const nextThreshold = loyalty.next_tier_threshold ?? 0;
  const currentMin = loyalty.current_tier_min_points ?? 0;
  const base = Math.max(nextThreshold - currentMin, 0);
  const progress =
    nextThreshold > 0 && base > 0
      ? Math.min(100, Math.max(0, ((balance - currentMin) / base) * 100))
      : 100;
  const missing = Math.max(nextThreshold - balance, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Balance de puntos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Balance actual</p>
            <p className="text-2xl font-semibold font-mono">{balance.toLocaleString("es-CO")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tier actual</p>
            <Badge variant="secondary" className="text-[11px]">
              {loyalty.current_tier_name || "Sin tier"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Siguiente tier: <span className="font-medium text-foreground">{loyalty.next_tier_name || "Máximo"}</span>
            </span>
            <span>
              {nextThreshold > 0
                ? missing > 0
                  ? `Faltan ${missing.toLocaleString("es-CO")} pts`
                  : "Tier alcanzado"
                : "Sin siguiente tier"}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoyaltyHistoryCard({ history }: { history: LoyaltyHistoryItem[] }) {
  const sorted = [...history].sort((a, b) => {
    const at = new Date(a.created_at ?? 0).getTime();
    const bt = new Date(b.created_at ?? 0).getTime();
    return bt - at;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Historial de puntos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No hay movimientos de puntos registrados.
          </p>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Motivo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item, index) => {
                  const isRedeem = item.type.toLowerCase().includes("redeem") || item.type.toLowerCase().includes("canje");
                  return (
                    <TableRow key={item.id || `${item.type}-${index}`} className="hover:bg-muted/40">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={isRedeem ? "border-red-500/40 bg-red-50 text-red-700" : "border-emerald-500/40 bg-emerald-50 text-emerald-700"}
                        >
                          {isRedeem ? "Canjeado" : "Ganado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.reason || "Sin motivo"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.created_at ? formatDateTime(item.created_at) : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${isRedeem ? "text-red-600" : "text-emerald-600"}`}>
                        {isRedeem ? "-" : "+"}{Math.abs(item.points).toLocaleString("es-CO")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerProfile360Page() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthUser();
  const canEditCustomer = isAdmin(user);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
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

  const tasksQuery = useQuery({
    queryKey: ["crm-tasks", customerId],
    queryFn: () => listTasks({ limit: 50, offset: 0, customer_id: customerId }),
    enabled: !!customerId,
  });

  const loyaltyQuery = useQuery({
    queryKey: ["crm-loyalty", customerId],
    queryFn: () => getCustomerLoyalty(customerId!),
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

  const redeemForm = useForm<{ points: number; reason: string }>({
    defaultValues: { points: 0, reason: "" },
  });

  const redeemMutation = useMutation({
    mutationFn: (values: { points: number; reason: string }) =>
      redeemLoyaltyPoints({
        customer_id: customerId!,
        points: values.points,
        reason: values.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-loyalty", customerId] });
      setRedeemDialogOpen(false);
      redeemForm.reset({ points: 0, reason: "" });
    },
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
        <p className="text-sm text-destructive">ID de cliente no válido.</p>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (profileQuery.isError) {
    const err = profileQuery.error as Error & { code?: string };
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
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
  const tierBadge = getCustomerTierBadge(profile.category_id, category_name);
  const activeTickets: TicketResponse[] =
    ticketsQuery.data?.items.filter(
      (t) =>
        t.customer_id === customerId &&
        t.status.toLowerCase() !== "closed",
    ) ?? [];
  const activeTasks: TaskResponse[] =
    tasksQuery.data?.items.filter((t) => {
      const s = t.status.toLowerCase();
      return t.customer_id === customerId && s !== "done" && s !== "cancelled";
    }) ?? [];
  const redeemPoints = redeemForm.watch("points") || 0;
  const currentLoyaltyBalance = loyaltyQuery.data?.balance ?? 0;
  const exceedsBalance = redeemPoints > currentLoyaltyBalance;

  return (
    <div className="animate-fade-in space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {canEditCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditCustomerOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar Cliente
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInteractionDialogOpen(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Registrar interacción
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda: perfil + fidelización */}
        <div className="space-y-4 lg:col-span-1">
          <ProfileHeader
            name={customer.name}
            email={customer.email}
            categoryName={category_name}
            ltv={ltv}
            tierBadge={tierBadge}
          />

          <PurchaseHabitsCard metadata={customer.metadata} />

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

        {/* Columna derecha: Tabs Timeline / Tickets + tareas activas */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="tasks">Tareas</TabsTrigger>
              <TabsTrigger value="points">Puntos</TabsTrigger>
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
            <TabsContent value="tasks">
              <ActiveTasksCard
                tasks={activeTasks}
                isLoading={tasksQuery.isLoading}
                isError={!!tasksQuery.isError}
                error={tasksQuery.error}
              />
            </TabsContent>

            <TabsContent value="points" className="space-y-4">
              {loyaltyQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-56 w-full" />
                </div>
              ) : loyaltyQuery.isError ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(loyaltyQuery.error, "Puntos de fidelización")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Canjear puntos
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Canjear puntos</DialogTitle>
                        </DialogHeader>
                        <Form {...redeemForm}>
                          <form
                            onSubmit={redeemForm.handleSubmit((values) => {
                              if (values.points > currentLoyaltyBalance) {
                                redeemForm.setError("points", {
                                  type: "manual",
                                  message: "La cantidad supera el balance disponible.",
                                });
                                return;
                              }
                              redeemMutation.mutate(values);
                            })}
                            className="space-y-4"
                          >
                            <FormField
                              control={redeemForm.control}
                              name="points"
                              rules={{
                                min: { value: 1, message: "Ingresa al menos 1 punto" },
                              }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cantidad</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={redeemForm.control}
                              name="reason"
                              rules={{
                                required: "El motivo es obligatorio",
                                minLength: { value: 3, message: "Motivo mínimo de 3 caracteres" },
                              }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Motivo</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej. Redención por bono de descuento" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {redeemMutation.isError && (
                              <p className="text-sm text-destructive">
                                {getApiErrorMessage(redeemMutation.error, "Canje de puntos")}
                              </p>
                            )}

                            {exceedsBalance && (
                              <p className="text-sm text-destructive">
                                La cantidad supera el balance disponible ({currentLoyaltyBalance.toLocaleString("es-CO")}).
                              </p>
                            )}

                            <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setRedeemDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button type="submit" disabled={redeemMutation.isPending || exceedsBalance}>
                                {redeemMutation.isPending ? "Canjeando…" : "Confirmar canje"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <LoyaltyProgressCard loyalty={loyaltyQuery.data!} />
                  <LoyaltyHistoryCard history={loyaltyQuery.data?.history ?? []} />
                </>
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

      <EditCustomerDialog
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customer={
          profile
            ? {
                id: customer.id,
                name: customer.name,
                email: customer.email ?? undefined,
                phone: customer.phone ?? undefined,
                tax_id: customer.tax_id ?? undefined,
              }
            : null
        }
      />
    </div>
  );
}
