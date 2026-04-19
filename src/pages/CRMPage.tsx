import { useEffect, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";

import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import CustomersTable from "@/features/crm/components/CustomersTable";
import {
  getImportStatus,
  importCustomersFile,
  previewImportCustomersFile,
  type ImportReportResponse,
} from "@/features/crm/services";

type ImportRowAction =
  | "inserted"
  | "updated"
  | "skipped"
  | "failed"
  | "invalid"
  | "warning"
  | "processed";

interface ImportRowView {
  row?: number;
  email?: string;
  action: ImportRowAction;
  errors: string[];
  warnings: string[];
}

interface ImportReportView {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  processedRows: number;
  warningRows: number;
  missingEmailRows: number;
  status: string;
  rows: ImportRowView[];
  rawPayload?: Record<string, unknown>;
}

const actionLabel: Record<ImportRowAction, string> = {
  inserted: "Insertado",
  updated: "Actualizado",
  skipped: "Omitido",
  failed: "Fallido",
  invalid: "Inválido",
  warning: "Advertencia",
  processed: "Procesado",
};

const actionBadgeClass: Record<ImportRowAction, string> = {
  inserted: "border-emerald-300 bg-emerald-50 text-emerald-700",
  updated: "border-sky-300 bg-sky-50 text-sky-700",
  skipped: "border-slate-300 bg-slate-100 text-slate-700",
  failed: "border-red-300 bg-red-50 text-red-700",
  invalid: "border-red-300 bg-red-50 text-red-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  processed: "border-violet-300 bg-violet-50 text-violet-700",
};

function toImportRowAction(value: string | undefined): ImportRowAction {
  const normalized = (value ?? "processed").toLowerCase();

  if (normalized === "inserted" || normalized === "created" || normalized === "new" || normalized === "success") {
    return "inserted";
  }

  if (normalized === "updated" || normalized === "reused") {
    return "updated";
  }

  if (normalized === "skipped" || normalized === "ignored" || normalized === "duplicate") {
    return "skipped";
  }

  if (normalized === "failed" || normalized === "error") {
    return "failed";
  }

  if (normalized === "invalid") {
    return "invalid";
  }

  if (normalized === "warning") {
    return "warning";
  }

  return "processed";
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/[;,|]/g).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function asImportRowView(item: unknown): ImportRowView | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const row = Number(record.row ?? record.rowNumber ?? record.line ?? record.index ?? NaN);
  const email = String(
    record.email ??
      record.identifier ??
      record.nit ??
      record.name ??
      record.customer ??
      "",
  ).trim();
  const action = toImportRowAction(String(record.action ?? record.status ?? record.result ?? record.state ?? "processed"));
  const errors = normalizeList(record.errors ?? record.errorMessages ?? record.error ?? record.message);
  const warnings = normalizeList(record.warnings ?? record.warningMessages ?? record.warning);

  return {
    row: Number.isFinite(row) ? row : undefined,
    email: email || undefined,
    action,
    errors,
    warnings,
  };
}

function buildImportReport(report: ImportReportResponse): ImportReportView {
  return {
    totalRows: report.TotalRows,
    validRows: report.ValidRows,
    invalidRows: report.InvalidRows,
    duplicateRows: report.DuplicateRows,
    insertedRows: report.InsertedRows,
    updatedRows: report.UpdatedRows,
    skippedRows: report.SkippedRows,
    failedRows: report.FailedRows,
    processedRows: report.ProcessedRows,
    warningRows: report.WarningRows,
    missingEmailRows: report.MissingEmailRows,
    status: report.Status,
    rows: (report.Rows ?? []).map((row) => ({
      row: row.row,
      email: row.email,
      action: row.action,
      errors: row.errors ?? [],
      warnings: row.warnings ?? [],
    })),
    rawPayload: report.RawPayload,
  };
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/\r?\n|\r/g, " ").replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, header: string[], rows: string[][]): void {
  const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildFailedRowsCsvRows(report: ImportReportView): string[][] {
  return report.rows
    .filter((row) => row.action === "failed" || row.action === "invalid")
    .map((row) => [
      String(row.row ?? ""),
      String(row.email ?? ""),
      actionLabel[row.action],
      row.errors.join(" | ") || row.warnings.join(" | ") || "Sin detalle",
    ]);
}

function buildFullRowsCsvRows(report: ImportReportView): string[][] {
  return report.rows.map((row) => [
    String(row.row ?? ""),
    String(row.email ?? ""),
    row.action,
    actionLabel[row.action],
    row.errors.join(" | "),
    row.warnings.join(" | "),
  ]);
}

async function copyFailedRowsToClipboard(report: ImportReportView): Promise<boolean> {
  const lines = report.rows
    .filter((row) => row.action === "failed" || row.action === "invalid")
    .map((row) => {
      const rowText = row.row ? `Fila ${row.row}` : "Fila -";
      const emailText = row.email ? `Email: ${row.email}` : "Email: -";
      const reason = row.errors.join(" | ") || row.warnings.join(" | ") || "Sin detalle";
      return `${rowText} | ${emailText} | Motivo: ${reason}`;
    });

  if (lines.length === 0) {
    return false;
  }

  await navigator.clipboard.writeText(lines.join("\n"));
  return true;
}

type ToastFn = ReturnType<typeof useToast>["toast"];

function ReportBanner({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (normalized === "completed_with_errors") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Importación completada con advertencias. Revisa las filas fallidas o omitidas.
      </div>
    );
  }

  if (normalized === "error") {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        La importación terminó con error. Revisa el detalle de filas para ver el motivo exacto.
      </div>
    );
  }

  if (normalized === "completed") {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Importación completada correctamente.
      </div>
    );
  }

  return null;
}

function metricCard({ title, value, tone }: { title: string; value: number; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-300 bg-red-50 text-red-700"
          : tone === "info"
            ? "border-sky-300 bg-sky-50 text-sky-700"
            : "border-border bg-background text-foreground";

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function ImportReportViewSection({
  report,
  stage,
  toast,
}: {
  report: ImportReportView;
  stage: "preview" | "status";
  toast: ToastFn;
}) {
  const failedRows = report.rows.filter((row) => row.action === "failed" || row.action === "invalid");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          <p>Procesadas = filas válidas analizadas/persistidas.</p>
          <p>Insertadas = clientes nuevos creados. Actualizadas = clientes existentes reutilizados por email.</p>
          <p>Omitidas = filas inválidas o duplicadas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={failedRows.length === 0}
            onClick={() => downloadCsv(`crm-import-fallidos-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.csv`, ["fila", "email", "estado", "motivo"], buildFailedRowsCsvRows(report))}
          >
            Exportar fallidos CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={report.rows.length === 0}
            onClick={() => downloadCsv(`crm-import-completo-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.csv`, ["fila", "email", "estado", "acción", "errores", "advertencias"], buildFullRowsCsvRows(report))}
          >
            Exportar completo CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={failedRows.length === 0}
            onClick={async () => {
              try {
                const copied = await copyFailedRowsToClipboard(report);
                if (copied) {
                  const verb = stage === "preview" ? "previsualización" : "importación";
                  toast({
                    title: "Errores copiados",
                    description: `El detalle de filas fallidas de la ${verb} fue copiado al portapapeles.`,
                  });
                }
              } catch {
                toast({
                  title: "No se pudo copiar",
                  description: "Tu navegador bloqueó el acceso al portapapeles.",
                  variant: "destructive",
                });
              }
            }}
          >
            Copiar errores
          </Button>
        </div>
      </div>

      {stage === "preview" ? (
        <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Esta es la vista previa. Revisa el detalle antes de ejecutar la importación.
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {metricCard({ title: "Total de filas", value: report.totalRows })}
        {metricCard({ title: "Válidas", value: report.validRows, tone: "success" })}
        {metricCard({ title: "Inválidas", value: report.invalidRows, tone: "danger" })}
        {metricCard({ title: "Duplicadas", value: report.duplicateRows, tone: "warning" })}
        {metricCard({ title: "Insertadas", value: report.insertedRows, tone: "success" })}
        {metricCard({ title: "Actualizadas", value: report.updatedRows, tone: "info" })}
        {metricCard({ title: "Omitidas", value: report.skippedRows })}
        {metricCard({ title: "Fallidas", value: report.failedRows, tone: "danger" })}
        {metricCard({ title: "Procesadas", value: report.processedRows, tone: "warning" })}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
        <p>Procesadas = filas válidas analizadas/persistidas.</p>
        <p>Insertadas = clientes nuevos creados.</p>
        <p>Actualizadas = clientes existentes reutilizados por email.</p>
        <p>Omitidas = filas inválidas o duplicadas.</p>
      </div>

      <div className="rounded-md border p-3">
        <h3 className="text-sm font-medium mb-2">Filas procesadas</h3>
        {report.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">El backend aún no devolvió detalle por fila.</p>
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Fila</th>
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Email</th>
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Estado</th>
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Acción</th>
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Errores</th>
                  <th className="px-2 py-2 text-left text-xs text-muted-foreground">Advertencias</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={`${row.row ?? "na"}-${row.email ?? "email"}-${index}`} className="border-b last:border-0 align-top hover:bg-muted/30">
                    <td className="px-2 py-2">{row.row ?? "-"}</td>
                    <td className="px-2 py-2 break-all">{row.email ?? "-"}</td>
                    <td className="px-2 py-2">
                      <Badge className={`border ${actionBadgeClass[row.action]}`} variant="outline">
                        {actionLabel[row.action]}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 capitalize text-muted-foreground">{actionLabel[row.action]}</td>
                    <td className="px-2 py-2 text-red-700">{row.errors.length > 0 ? row.errors.join(" | ") : "-"}</td>
                    <td className="px-2 py-2 text-amber-700">{row.warnings.length > 0 ? row.warnings.join(" | ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-md border p-3">
        <details>
          <summary className="cursor-pointer text-sm font-medium">Diagnóstico backend (payload crudo)</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Úsalo para comparar exactamente lo que devuelve el endpoint contra el resumen mostrado.
          </p>
          <pre className="mt-2 max-h-56 overflow-auto rounded bg-muted p-2 text-[11px] leading-4">
            {JSON.stringify(report.rawPayload ?? {}, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const toastHook = useToast();
  const toast = toastHook.toast;
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<ImportReportView | null>(null);
  const [statusReport, setStatusReport] = useState<ImportReportView | null>(null);

  useEffect(() => {
    if (!jobId || !isImporting) {
      return;
    }

    let isDisposed = false;
    const interval = window.setInterval(async () => {
      try {
        const status = await getImportStatus(jobId);
        const report = buildImportReport(status);
        const normalizedStatus = status.Status.toLowerCase();
        const totalRows = report.totalRows;
        const processedRows = report.processedRows;
        const calculated =
          totalRows > 0
            ? Math.min((processedRows / totalRows) * 100, 100)
            : normalizedStatus === "completed" || normalizedStatus === "completed_with_errors"
              ? 100
              : 0;

        if (!isDisposed) {
          setProgress(calculated);
        }

        if (normalizedStatus === "completed" || normalizedStatus === "completed_with_errors" || normalizedStatus === "error") {
          window.clearInterval(interval);
          if (isDisposed) return;

          setIsImporting(false);
          setJobId(null);
          setStatusReport(report);
          setPreviewReport(null);

          if (normalizedStatus === "completed") {
            setProgress(100);
            toast({
              title: "Importación completada",
              description: `Insertadas: ${report.insertedRows}. Actualizadas: ${report.updatedRows}. Omitidas: ${report.skippedRows}. Fallidas: ${report.failedRows}.`,
            });
          } else if (normalizedStatus === "completed_with_errors") {
            setProgress(100);
            toast({
              title: "Importación completada con advertencias",
              description: `Insertadas: ${report.insertedRows}. Actualizadas: ${report.updatedRows}. Omitidas: ${report.skippedRows}. Fallidas: ${report.failedRows}.`,
            });
          } else {
            toast({
              title: "La importación finalizó con error",
              description: `Insertadas: ${report.insertedRows}. Actualizadas: ${report.updatedRows}. Omitidas: ${report.skippedRows}. Fallidas: ${report.failedRows}.`,
              variant: "destructive",
            });
          }

          await queryClient.invalidateQueries({ queryKey: ["customers"] });
          await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
        }
      } catch (error) {
        window.clearInterval(interval);
        if (isDisposed) return;

        setIsImporting(false);
        setJobId(null);
        toast({
          title: "No se pudo consultar el progreso",
          description: getApiErrorMessage(error, "CRM / Importación"),
          variant: "destructive",
        });
      }
    }, 1000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [jobId, isImporting, queryClient, toast]);

  const activeReport = statusReport ?? previewReport;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreviewReport(null);
    setStatusReport(null);
    setProgress(0);
    setJobId(null);
  };

  const handlePreview = async () => {
    if (!file) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para previsualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPreviewing(true);
      setPreviewReport(null);
      setStatusReport(null);
      const report = await previewImportCustomersFile(file);
      setPreviewReport(buildImportReport(report));
      toast({
        title: "Vista previa cargada",
        description: "Revisa las métricas y el detalle por fila antes de importar.",
      });
    } catch (error) {
      toast({
        title: "No se pudo obtener la vista previa",
        description: getApiErrorMessage(error, "CRM / Importación"),
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!previewReport) {
      toast({
        title: "Primero previsualiza",
        description: "Debes revisar la vista previa antes de importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);
      setProgress(0);
      setStatusReport(null);
      const response = await importCustomersFile(file);
      setJobId(response.jobID);
    } catch (error) {
      setIsImporting(false);
      setJobId(null);
      toast({
        title: "No se pudo importar la data",
        description: getApiErrorMessage(error, "CRM / Importación"),
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setFile(null);
    setIsPreviewing(false);
    setIsImporting(false);
    setProgress(0);
    setJobId(null);
    setPreviewReport(null);
    setStatusReport(null);
  };

  const importStatus = statusReport?.status.toLowerCase();
  const finalStage = Boolean(statusReport);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" />
        </h1>
        <p className="text-sm text-muted-foreground">
          Directorio de clientes con búsqueda, filtros y paginación.
        </p>
      </div>

      <CustomersTable />

      <Dialog
        open={importOpen}
        onOpenChange={(nextOpen) => {
          setImportOpen(nextOpen);
          if (!nextOpen && !isImporting) {
            resetDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Importar clientes</DialogTitle>
            <DialogDescription>
              Carga un archivo Excel o CSV para importar clientes al CRM.
            </DialogDescription>
          </DialogHeader>

          {isImporting ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Procesando clientes... {Math.round(progress)}%
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          ) : activeReport ? (
            <div className="space-y-4">
              <ReportBanner status={finalStage ? importStatus ?? activeReport.status : "preview"} />
              <ImportReportViewSection report={activeReport} stage={finalStage ? "status" : "preview"} toast={toast} />
            </div>
          ) : (
            <div className="space-y-2">
              <Input type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: <code>.xlsx</code> y <code>.csv</code>.
              </p>
            </div>
          )}

          <DialogFooter>
            {isImporting ? (
              <Button type="button" variant="ghost" onClick={() => setImportOpen(false)}>
                Ocultar en segundo plano
              </Button>
            ) : finalStage ? (
              <>
                <Button type="button" variant="ghost" onClick={() => setImportOpen(false)}>
                  Cerrar
                </Button>
                <Button type="button" onClick={resetDialog}>
                  Importar otro archivo
                </Button>
              </>
            ) : previewReport ? (
              <>
                <Button type="button" variant="ghost" onClick={resetDialog}>
                  Reiniciar
                </Button>
                <Button type="button" variant="outline" onClick={handlePreview} disabled={isPreviewing || !file}>
                  {isPreviewing ? "Actualizando vista previa…" : "Actualizar vista previa"}
                </Button>
                <Button type="button" onClick={handleImport} disabled={isPreviewing || !file || !previewReport}>
                  Importar clientes
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={resetDialog}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline" onClick={handlePreview} disabled={!file || isPreviewing}>
                  {isPreviewing ? "Previsualizando…" : "Previsualizar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
