import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Users,
  Target,
} from "lucide-react";

import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

const OpportunitySchema = z
  .object({
    id: z.string(),
    company_id: z.string().optional(),
    customer_id: z.string().optional().nullable(),
    customer_name: z.string().optional().nullable(),
    name: z.string().optional().default(""),
    title: z.string().optional().nullable(),
    stage: z.string(),
    amount: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
    probability: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
    close_date: z.string().optional().nullable(),
    estimated_close_date: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

type OpportunityDTO = z.infer<typeof OpportunitySchema>;

const FunnelItemSchema = z
  .object({
    stage: z.string(),
    count: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
    total_amount: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
  })
  .passthrough();

type FunnelItem = z.infer<typeof FunnelItemSchema>;

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

type StageKey =
  | "prospecto"
  | "calificado"
  | "propuesta"
  | "negociacion"
  | "ganado"
  | "perdido";

interface StageConfig {
  key: StageKey;
  label: string;
  accent: string;        // Tailwind color classes for header strip
  badgeClass: string;    // Badge inline classes
}

const STAGES: StageConfig[] = [
  {
    key: "prospecto",
    label: "Prospecto",
    accent: "bg-slate-400/20 border-slate-400/30",
    badgeClass: "border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  },
  {
    key: "calificado",
    label: "Calificado",
    accent: "bg-blue-500/20 border-blue-500/30",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    key: "propuesta",
    label: "Propuesta",
    accent: "bg-violet-500/20 border-violet-500/30",
    badgeClass: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    key: "negociacion",
    label: "Negociación",
    accent: "bg-amber-500/20 border-amber-500/30",
    badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    key: "ganado",
    label: "Ganado",
    accent: "bg-emerald-500/20 border-emerald-500/30",
    badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "perdido",
    label: "Perdido",
    accent: "bg-red-500/20 border-red-500/30",
    badgeClass: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Normalise stage string from backend to one of our StageKey values */
function normaliseStage(raw: string): StageKey {
  const s = raw.toLowerCase().trim();
  if (s === "prospecto") return "prospecto";
  if (s === "calificado") return "calificado";
  if (s === "propuesta") return "propuesta";
  if (s === "negociacion" || s === "negociación") return "negociacion";
  if (s === "ganado") return "ganado";
  if (s === "perdido") return "perdido";
  return "prospecto";
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function listOpportunities(): Promise<OpportunityDTO[]> {
  const { data } = await apiClient.get("/api/crm/opportunities", {
    params: { limit: 200, offset: 0 },
  });
  if (Array.isArray(data)) {
    return z.array(OpportunitySchema).parse(data);
  }
  if (data && Array.isArray(data.items)) {
    return z.array(OpportunitySchema).parse(data.items);
  }
  return [];
}

async function getOpportunitiesFunnel(): Promise<FunnelItem[]> {
  const { data } = await apiClient.get("/api/crm/opportunities/funnel");
  if (Array.isArray(data)) {
    return z.array(FunnelItemSchema).parse(data);
  }
  if (data && Array.isArray(data.items)) {
    return z.array(FunnelItemSchema).parse(data.items);
  }
  return [];
}

async function updateOpportunityStage(
  id: string,
  stage: string,
): Promise<OpportunityDTO> {
  const { data } = await apiClient.put(`/api/crm/opportunities/${id}/stage`, {
    stage,
  });
  return OpportunitySchema.parse(data);
}

// ---------------------------------------------------------------------------
// Opportunity card component
// ---------------------------------------------------------------------------

function OpportunityCard({
  opp,
  onDragStart,
  isDragging,
}: {
  opp: OpportunityDTO;
  onDragStart: (e: React.DragEvent, opp: OpportunityDTO) => void;
  isDragging: boolean;
}) {
  const closeDate = opp.close_date ?? opp.estimated_close_date;

  const displayName =
    opp.customer_name ??
    opp.name ??
    opp.title ??
    `Oportunidad ${opp.id.slice(0, 6)}`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, opp)}
      className={cn(
        "group rounded-md border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all",
        isDragging
          ? "opacity-40 scale-95 border-primary/40 shadow-md"
          : "hover:border-primary/30 hover:shadow-md",
      )}
    >
      <p className="text-sm font-medium leading-snug truncate">{displayName}</p>

      <p className="mt-1 text-base font-semibold text-primary">
        {formatCOP(opp.amount)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-medium">
          {opp.probability}%
        </span>
        <span>Cierre: {formatDate(closeDate)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban column
// ---------------------------------------------------------------------------

function KanbanColumn({
  config,
  items,
  draggingId,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
}: {
  config: StageConfig;
  items: OpportunityDTO[];
  draggingId: string | null;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent, stage: StageKey) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, stage: StageKey) => void;
  onCardDragStart: (e: React.DragEvent, opp: OpportunityDTO) => void;
}) {
  const total = items.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border transition-all min-w-0",
        config.accent,
        isDragOver && "ring-2 ring-primary/40 scale-[1.01]",
      )}
      onDragOver={(e) => onDragOver(e, config.key)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, config.key)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-inherit">
        <span className="text-xs font-semibold">{config.label}</span>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 h-4", config.badgeClass)}
          >
            {items.length}
          </Badge>
        </div>
      </div>

      {/* Column total */}
      {items.length > 0 && (
        <div className="px-3 py-1 border-b border-inherit">
          <p className="text-[10px] text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground">
              {formatCOP(total)}
            </span>
          </p>
        </div>
      )}

      {/* Cards */}
      <div
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[120px] transition-colors",
          isDragOver && "bg-primary/5",
        )}
      >
        {items.length === 0 && !isDragOver && (
          <p className="text-[11px] text-muted-foreground text-center py-6 select-none">
            Sin oportunidades
          </p>
        )}
        {items.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            onDragStart={onCardDragStart}
            isDragging={draggingId === opp.id}
          />
        ))}
        {isDragOver && (
          <div className="rounded-md border-2 border-dashed border-primary/40 h-14 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline summary bar
// ---------------------------------------------------------------------------

function PipelineSummary({ funnel }: { funnel: FunnelItem[] }) {
  const totalAmount = funnel.reduce((s, f) => s + f.total_amount, 0);
  const totalCount = funnel.reduce((s, f) => s + f.count, 0);
  const wonItem = funnel.find((f) => normaliseStage(f.stage) === "ganado");
  const wonAmount = wonItem?.total_amount ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="border-primary/20">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Pipeline total
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-lg font-bold text-primary">{formatCOP(totalAmount)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-lg font-bold">{totalCount}</p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            Ganadas
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-lg font-bold text-emerald-600">{formatCOP(wonAmount)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Por etapa
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {STAGES.map((st) => {
              const fi = funnel.find((f) => normaliseStage(f.stage) === st.key);
              return (
                <span
                  key={st.key}
                  className={cn(
                    "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium border",
                    st.badgeClass,
                  )}
                >
                  {st.label[0]}: {fi?.count ?? 0}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();

  // Drag state
  const draggingRef = useRef<{ id: string; stage: StageKey } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<StageKey | null>(null);

  // Optimistic stage overrides: oppId → newStage
  const [stageOverrides, setStageOverrides] = useState<Record<string, StageKey>>({});

  // Queries
  const oppsQuery = useQuery({
    queryKey: ["crm-opportunities"],
    queryFn: listOpportunities,
  });

  const funnelQuery = useQuery({
    queryKey: ["crm-opportunities-funnel"],
    queryFn: getOpportunitiesFunnel,
  });

  // Stage mutation
  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: StageKey }) =>
      updateOpportunityStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities-funnel"] });
    },
    onError: (_err, { id }) => {
      // Revert optimistic override
      setStageOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
  });

  // Build grouped board with optimistic overrides applied
  const grouped = useMemo<Record<StageKey, OpportunityDTO[]>>(() => {
    const base: Record<StageKey, OpportunityDTO[]> = {
      prospecto: [],
      calificado: [],
      propuesta: [],
      negociacion: [],
      ganado: [],
      perdido: [],
    };
    for (const opp of oppsQuery.data ?? []) {
      const effectiveStage = stageOverrides[opp.id] ?? normaliseStage(opp.stage);
      base[effectiveStage].push({ ...opp, stage: effectiveStage });
    }
    return base;
  }, [oppsQuery.data, stageOverrides]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, opp: OpportunityDTO) => {
      draggingRef.current = {
        id: opp.id,
        stage: (stageOverrides[opp.id] ?? normaliseStage(opp.stage)) as StageKey,
      };
      setDraggingId(opp.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [stageOverrides],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stage: StageKey) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStage(stage);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toStage: StageKey) => {
      e.preventDefault();
      setDragOverStage(null);
      setDraggingId(null);

      if (!draggingRef.current) return;
      const { id, stage: fromStage } = draggingRef.current;
      draggingRef.current = null;

      if (fromStage === toStage) return;

      // Optimistic update
      setStageOverrides((prev) => ({ ...prev, [id]: toStage }));

      // Fire mutation
      stageMutation.mutate({ id, stage: toStage });
    },
    [stageMutation],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStage(null);
    draggingRef.current = null;
  }, []);

  const isLoading = oppsQuery.isLoading;
  const isError = oppsQuery.isError || funnelQuery.isError;
  const errorMsg = getApiErrorMessage(
    (oppsQuery.error ?? funnelQuery.error) as unknown,
    "Oportunidades CRM",
  );

  return (
    <div className="animate-fade-in space-y-4" onDragEnd={handleDragEnd}>
      {/* Back link */}
      <Link
        to="/crm"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al CRM
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Oportunidades
            </h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de ventas organizado por etapa. Arrastra las tarjetas para avanzar oportunidades.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Error cargando datos</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Mutation error */}
      {stageMutation.isError && (
        <Alert variant="destructive">
          <AlertTitle>Error al mover oportunidad</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(stageMutation.error as unknown, "Oportunidades")}
          </AlertDescription>
        </Alert>
      )}

      {/* Pipeline summary */}
      {funnelQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <PipelineSummary funnel={funnelQuery.data ?? []} />
      )}

      {/* Kanban board */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
          {STAGES.map((s) => (
            <div key={s.key} className="space-y-2">
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGES.map((stageConfig) => (
            <KanbanColumn
              key={stageConfig.key}
              config={stageConfig}
              items={grouped[stageConfig.key]}
              draggingId={draggingId}
              isDragOver={dragOverStage === stageConfig.key}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onCardDragStart={handleDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
