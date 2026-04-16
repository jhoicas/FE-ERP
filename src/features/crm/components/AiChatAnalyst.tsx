import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
} from "recharts";
import { Loader2, Send, MessageSquare } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { askAiAnalyst } from "../services";
import type { AiChatMessage } from "../crm.types";

const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
];

export default function AiChatAnalyst() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const askMutation = useMutation({
    mutationFn: askAiAnalyst,
    onSuccess: (response) => {
      const assistantMessage: AiChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toISOString(),
        data: response.data,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    },
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMessage: AiChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    askMutation.mutate(input);
  }, [input, askMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Asistente de IA</h2>
      </div>

      <Card className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Chat history */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-center text-slate-500">
              <div>
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  Inicia una conversación preguntando sobre tus datos CRM...
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-lg rounded-tr-none"
                      : "bg-white text-slate-900 rounded-lg rounded-tl-none shadow-sm border border-slate-200"
                  } p-3 text-sm`}
                >
                  <p className="mb-2">{msg.content}</p>

                  {/* Render data visualization if available */}
                  {msg.data && msg.data.length > 0 && msg.role === "assistant" && (
                    <RenderDataVisualization data={msg.data} />
                  )}

                  <div
                    className={`text-xs ${
                      msg.role === "user" ? "text-blue-100" : "text-slate-500"
                    } mt-1`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          {askMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-900 rounded-lg rounded-tl-none shadow-sm border border-slate-200 p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">IA analizando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input area */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="flex gap-2">
            <Textarea
              placeholder="Pregunta sobre tus datos... (Ctrl+Enter para enviar)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={askMutation.isPending}
              className="resize-none min-h-12"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={askMutation.isPending || !input.trim()}
              size="lg"
              className="self-end"
            >
              {askMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * RenderDataVisualization: Detecta el tipo de datos y renderiza tabla o gráfico
 */
function RenderDataVisualization({
  data,
}: {
  data: Record<string, any>[];
}) {
  const guessChartType = useCallback(() => {
    if (data.length === 0) return "table";

    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Si tiene menos de 3 campos y uno parece ser categoría, usa pie
    if (keys.length === 2) {
      const values = Object.values(firstRow);
      if (values.some((v) => typeof v === "number")) {
        return "pie";
      }
    }

    // Si tiene 1 categoría + 1-3 valores numéricos, usa bar
    const numericCount = keys.filter((k) => {
      return data.every((row) => typeof row[k] === "number");
    }).length;

    if (numericCount >= 1) {
      return numericCount === 1 ? "bar" : "bar";
    }

    // Default: tabla
    return "table";
  }, [data]);

  const chartType = useMemo(() => guessChartType(), [guessChartType]);

  if (data.length === 0) return null;

  switch (chartType) {
    case "pie": {
      const keys = Object.keys(data[0]);
      const labelKey = keys.find((k) => typeof data[0][k] === "string") || keys[0];
      const valueKey = keys.find((k) => k !== labelKey) || keys[1];

      return (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry[labelKey]}`}
                outerRadius={60}
                fill="#3b82f6"
                dataKey={valueKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => Number(value).toLocaleString("es-CO")} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case "bar": {
      const keys = Object.keys(data[0]);
      const catKey = keys.find((k) => typeof data[0][k] === "string") || keys[0];
      const numKey = keys.find((k) => k !== catKey && typeof data[0][k] === "number") || keys[1];

      return (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={catKey} />
              <YAxis />
              <Tooltip
                formatter={(value: unknown) => Number(value).toLocaleString("es-CO")}
              />
              <Bar dataKey={numKey} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    default: {
      // Table view
      const keys = Object.keys(data[0]);
      return (
        <div className="mt-3 max-h-64 overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-slate-300">
                {keys.map((key) => (
                  <TableHead key={key} className="text-slate-600">
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 5).map((row, idx) => (
                <TableRow key={idx} className="border-slate-200">
                  {keys.map((key) => (
                    <TableCell key={key} className="text-slate-700">
                      {typeof row[key] === "number"
                        ? row[key].toLocaleString("es-CO", {
                            maximumFractionDigits: 2,
                          })
                        : String(row[key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 5 && (
            <p className="text-xs text-slate-500 mt-2">
              ... y {data.length - 5} filas más
            </p>
          )}
        </div>
      );
    }
  }
}
