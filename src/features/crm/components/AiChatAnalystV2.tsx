import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { askAiAnalyst } from "@/features/crm/services";
import type { AiChatMessage } from "@/features/crm/crm.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RowData = Record<string, unknown>;
const DATA_PAGE_SIZE = 10;
const CHART_COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

function formatCellValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsvValue(value: unknown): string {
  const raw = formatCellValue(value).replace(/"/g, '""');
  return `"${raw}"`;
}

function downloadCsvFromRows(rows: RowData[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];
  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getChartAxes(data: RowData[]): { xKey: string; yKey: string } | null {
  if (data.length === 0) return null;
  const first = data[0];
  const keys = Object.keys(first);
  const xKey = keys.find((key) => typeof first[key] === "string");
  const yKey = keys.find((key) => typeof first[key] === "number");
  if (!xKey || !yKey) return null;
  return { xKey, yKey };
}

function ChartPanel({
  chartType,
  data,
}: {
  chartType?: "bar" | "pie" | "line" | "none";
  data: RowData[];
}) {
  const axes = useMemo(() => getChartAxes(data), [data]);
  if (!chartType || chartType === "none" || !axes) return null;
  const { xKey, yKey } = axes;

  return (
    <div className="h-64 w-full rounded-md border bg-background p-2">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart data={data}>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={data}>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={82}>
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function AssistantDataPanel({
  data,
  chartType,
}: {
  data?: RowData[];
  chartType?: "bar" | "pie" | "line" | "none";
}) {
  if (!data || data.length === 0) return null;

  const [page, setPage] = useState(1);
  const headers = Object.keys(data[0]);
  const totalPages = Math.max(1, Math.ceil(data.length / DATA_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * DATA_PAGE_SIZE;
  const pageRows = data.slice(pageStart, pageStart + DATA_PAGE_SIZE);

  return (
    <div className="mt-3 space-y-3">
      <ChartPanel chartType={chartType} data={data} />

      <div className="overflow-x-auto rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="text-xs font-semibold">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, rowIdx) => (
              <TableRow key={`row-${rowIdx}`}>
                {headers.map((header) => (
                  <TableCell key={`${rowIdx}-${header}`} className="text-xs">
                    {formatCellValue(row[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => downloadCsvFromRows(data, "crm-ai-resultados.csv")}
        >
          Exportar a CSV
        </Button>
      </div>

      {data.length > DATA_PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {pageStart + 1}–{Math.min(pageStart + DATA_PAGE_SIZE, data.length)} de {data.length}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <span className="px-2 py-1 border rounded-md">{currentPage}/{totalPages}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiChatAnalystV2() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: askAiAnalyst,
    onSuccess: (response) => {
      const assistantMessage: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer ?? "",
        timestamp: new Date().toISOString(),
        data: response.data,
        chartType: response.chartType ?? "none",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "Hubo un error al consultar la base de datos o generar el SQL. Por favor intenta de nuevo.",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    },
  });

  const handleSend = () => {
    const question = input.trim();
    if (!question || askMutation.isPending) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: question, timestamp: new Date().toISOString() }]);
    setInput("");
    askMutation.mutate(question);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          IA Analyst
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[28rem] overflow-y-auto rounded-md border bg-background p-4">
          {messages.length === 0 && !askMutation.isPending ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">Inicia el chat preguntando por tus datos del CRM.</div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[90%] sm:max-w-[80%]">
                      <div className={`rounded-xl border px-3 py-2 text-sm shadow-sm ${message.isError ? "bg-red-50 text-red-900 border-red-200" : isUser ? "bg-primary text-primary-foreground border-primary/30" : "bg-card text-card-foreground border-border"}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {!isUser && !message.isError && <AssistantDataPanel data={message.data} chartType={message.chartType} />}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground px-1">
                        {new Date(message.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm sm:max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Consultando base de datos...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para salto de línea)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            disabled={askMutation.isPending}
            className="min-h-16 resize-none"
          />
          <Button type="button" onClick={handleSend} disabled={askMutation.isPending || !input.trim()} size="icon">
            {askMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
