import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";

import apiClient from "@/lib/api/client";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Channel = "email" | "whatsapp" | "sms";
type SegmentFilter = "Todos" | string;
type StrategyFilter = "Todas" | string;

export interface AudienceRow {
  id: string;
  name: string;
  email: string;
  segmento: string;
  estrategia: string;
  categoria: string;
  totalComprado: number;
  variables: Record<string, unknown>;
}

interface CRMOmnichannelTabProps {
  companyId?: string;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function normalizeAudience(data: unknown): AudienceRow[] {
  const payload = data as {
    items?: unknown;
    rows?: unknown;
    data?: unknown;
  };

  const source = Array.isArray(data)
    ? data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.rows)
        ? payload.rows
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  return source
    .map((item): AudienceRow | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = getFirstString(record, ["id", "customer_id", "customerId"]);
      if (!id) {
        return null;
      }

      return {
        id,
        name: getFirstString(record, ["name", "nombre", "customer_name"]),
        email: getFirstString(record, ["email", "customer_email", "mail"]),
        segmento:
          getFirstString(record, ["segmento", "segment", "segment_name"]) || "SIN_SEGMENTO",
        estrategia:
          getFirstString(record, ["estrategia", "strategy", "remarketing_action"]) || "N/A",
        categoria:
          getFirstString(record, ["categoria", "category", "category_name"]) || "Sin categoría",
        totalComprado: toNumber(
          getFirstValue(record, ["totalComprado", "total_purchased", "totalPurchased", "ltv"]),
        ),
        variables: record,
      };
    })
    .filter((row): row is AudienceRow => Boolean(row));
}

function formatCopCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function segmentBadgeClass(segmento: string): string {
  const normalized = segmento.toUpperCase();
  if (normalized === "VIP") return "border-amber-300 bg-amber-100 text-amber-800";
  if (normalized === "PREMIUM") return "border-emerald-300 bg-emerald-100 text-emerald-800";
  if (normalized === "RECURRENTE") return "border-blue-300 bg-blue-100 text-blue-800";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function CRMOmnichannelTab({ companyId }: CRMOmnichannelTabProps) {
  const { toast } = useToast();
  const user = useAuthUser();

  const resolvedCompanyId =
    companyId ?? (typeof user?.company_id === "string" ? user.company_id : "");

  const [segmento, setSegmento] = useState<SegmentFilter>("Todos");
  const [estrategia, setEstrategia] = useState<StrategyFilter>("Todas");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [message, setMessage] = useState(
    "Hola {{name}}, tenemos una oferta especial para tu segmento {{segmento}}.",
  );

  const {
    data: audience = [],
    isLoading,
    error,
  } = useQuery<AudienceRow[]>({
    queryKey: [
      "crm",
      "remarketing",
      "audience",
      resolvedCompanyId,
      segmento,
      estrategia,
    ],
    queryFn: async () => {
      if (!resolvedCompanyId) {
        return [];
      }

      const { data } = await apiClient.get("/api/crm/remarketing/audience", {
        params: {
          company_id: resolvedCompanyId,
          segmento: segmento !== "Todos" ? segmento : undefined,
          estrategia: estrategia !== "Todas" ? estrategia : undefined,
        },
      });

      return normalizeAudience(data);
    },
    enabled: Boolean(resolvedCompanyId),
  });

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return audience;
    }

    return audience.filter((row) => {
      return (
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.categoria.toLowerCase().includes(query) ||
        row.segmento.toLowerCase().includes(query) ||
        row.estrategia.toLowerCase().includes(query)
      );
    });
  }, [audience, search]);

  const segmentOptions = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(audience.map((row) => row.segmento))).filter(Boolean).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    ];
  }, [audience]);

  const strategyOptions = useMemo(() => {
    return [
      "Todas",
      ...Array.from(new Set(audience.map((row) => row.estrategia))).filter(Boolean).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    ];
  }, [audience]);

  const previewRow = filteredData.length > 0 ? filteredData[0] : null;

  const replaceVars = (text: string, row: AudienceRow | null): string => {
    if (!row) {
      return text;
    }

    return text.replace(/{{\s*([^}]+)\s*}}/g, (_, rawKey: string) => {
      const key = rawKey.trim();
      const value =
        row.variables[key] ??
        (key === "name"
          ? row.name
          : key === "email"
            ? row.email
            : key === "segmento"
              ? row.segmento
              : key === "estrategia"
                ? row.estrategia
                : key === "categoria"
                  ? row.categoria
                  : key === "totalComprado"
                    ? row.totalComprado
                    : undefined);

      if (value === undefined || value === null || value === "") {
        return `{{${key}}}`;
      }

      return String(value);
    });
  };

  const sendBatchMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedCompanyId) {
        throw new Error("No fue posible resolver el company_id de la sesión actual.");
      }

      if (filteredData.length === 0) {
        throw new Error("No hay contactos para enviar en el filtro actual.");
      }

      await apiClient.post("/api/crm/remarketing/send-batch", {
        company_id: resolvedCompanyId,
        channel,
        template_text: message,
        customer_ids: filteredData.map((row) => row.id),
      });
    },
    onSuccess: () => {
      toast({
        title: "Campaña iniciada",
        description: `El envío comenzó para ${filteredData.length} contactos.`,
      });
    },
    onError: (mutationError: unknown) => {
      const fallback = "No se pudo iniciar el envío de la campaña.";
      const description = mutationError instanceof Error ? mutationError.message : fallback;
      toast({
        title: "Error al enviar campaña",
        description,
        variant: "destructive",
      });
    },
  });

  const isSending = sendBatchMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, email, segmento o categoría"
          className="lg:col-span-2"
        />

        <Select value={segmento} onValueChange={(value) => setSegmento(value as SegmentFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            {segmentOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estrategia} onValueChange={(value) => setEstrategia(value as StrategyFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Estrategia" />
          </SelectTrigger>
          <SelectContent>
            {strategyOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
          <SelectTrigger>
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Escribe el template de campaña..."
        />
        <p className="text-xs text-muted-foreground">
          Variables disponibles: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{segmento}}"}</code>, <code>{"{{estrategia}}"}</code>.
        </p>
      </div>

      <div className="rounded-md border p-3">
        <p className="text-xs font-medium text-muted-foreground">Vista previa en tiempo real</p>
        <p className="mt-2 text-sm">{replaceVars(message, previewRow)}</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => sendBatchMutation.mutate()} disabled={isSending || filteredData.length === 0}>
          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isSending ? "Enviando..." : `Enviar a ${filteredData.length} contactos`}
        </Button>
      </div>

      <div className="erp-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segmento</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estrategia</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Total Comprado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-destructive">
                  No se pudo cargar la audiencia.
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay audiencia para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant="outline" className={segmentBadgeClass(row.segmento)}>
                      {row.segmento}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email || "-"}</TableCell>
                  <TableCell>{row.estrategia || "-"}</TableCell>
                  <TableCell>{row.categoria || "-"}</TableCell>
                  <TableCell className="text-right">{formatCopCurrency(row.totalComprado)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
