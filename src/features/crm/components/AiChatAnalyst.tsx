import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquare, Send } from "lucide-react";

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type RowData = Record<string, unknown>;

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

function AssistantDataPanel({
  data,
  sql,
}: {
  data?: RowData[];
  sql?: string;
}) {
  if (!data || data.length === 0) {
    if (!sql) return null;
    return (
      <div className="mt-3">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Ver SQL ejecutado
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <pre className="rounded-md bg-slate-950 p-3 text-xs text-slate-100 overflow-x-auto">
              <code>{sql}</code>
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="mt-3 space-y-3">
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
            {data.map((row, rowIdx) => (
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

        {sql && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="text-xs">
                Ver SQL ejecutado
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <pre className="rounded-md bg-slate-950 p-3 text-xs text-slate-100 overflow-x-auto">
                <code>{sql}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export default function AiChatAnalyst() {
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
        sql: response.sql,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: AiChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content:
          "Hubo un error al consultar la base de datos o generar el SQL. Por favor intenta de nuevo.",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    const question = input.trim();
    if (!question || askMutation.isPending) return;

    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    askMutation.mutate(question);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
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
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Inicia el chat preguntando por tus datos del CRM.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const bubbleClass = message.isError
                  ? "bg-red-50 text-red-900 border-red-200"
                  : isUser
                    ? "bg-primary text-primary-foreground border-primary/30"
                    : "bg-card text-card-foreground border-border";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl border px-3 py-2 text-sm shadow-sm sm:max-w-[80%] ${bubbleClass}`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {!isUser && !message.isError && (
                        <AssistantDataPanel data={message.data} sql={message.sql} />
                      )}
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
            onKeyDown={handleKeyDown}
            disabled={askMutation.isPending}
            className="min-h-16 resize-none"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={askMutation.isPending || !input.trim()}
            size="icon"
          >
            {askMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
