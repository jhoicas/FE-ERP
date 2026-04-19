import { useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";

import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImportSales } from "@/features/crm/hooks/use-crm";
import {
  getImportStatus,
  importCustomersFile,
  previewImportCustomersFile,
  type ImportReportResponse,
} from "@/features/crm/services";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";

type ImportSummary = {
  status: string;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  processed: number;
};

const SALES_HEADERS = [
  "Numero_Orden",
  "Fecha_Venta",
  "Email_Cliente",
  "Telefono",
  "Nombre_Cliente",
  "Codigo_Producto",
  "Nombre_Producto",
  "Categoria_Producto",
  "Cantidad",
  "Precio_Unitario",
] as const;

const CUSTOMER_HEADERS = ["name", "email", "phone", "tax_id"] as const;

function normalizeSummary(report: ImportReportResponse): ImportSummary {
  return {
    status: report.Status,
    total: report.TotalRows,
    inserted: report.InsertedRows,
    updated: report.UpdatedRows,
    skipped: report.SkippedRows,
    failed: report.FailedRows,
    processed: report.ProcessedRows,
  };
}

function downloadSalesTemplate(): void {
  const rows = [
    SALES_HEADERS.join(","),
    "FAC-001,2026-04-15,ejemplo@correo.com,3180000000,Juan Perez,PROD-01,Proteina,Suplementos,2,50.00",
  ];

  const blob = new Blob([`\uFEFF${rows.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "plantilla-importacion-ventas.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadCustomersTemplate(): void {
  const rows = [
    CUSTOMER_HEADERS.join(","),
    "Juan Perez,juan.perez@correo.com,3180000000,900123456-7",
  ];

  const blob = new Blob([`\uFEFF${rows.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "plantilla-importacion-clientes.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CRMImportPage() {
  const { toast } = useToast();

  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImportingCustomers, setIsImportingCustomers] = useState(false);
  const [customersProgress, setCustomersProgress] = useState(0);
  const [customersJobId, setCustomersJobId] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState<ImportSummary | null>(null);
  const [finalSummary, setFinalSummary] = useState<ImportSummary | null>(null);

  const [salesFile, setSalesFile] = useState<File | null>(null);

  const importSalesMutation = useImportSales();

  useEffect(() => {
    if (!customersJobId || !isImportingCustomers) {
      return;
    }

    let isDisposed = false;
    const interval = window.setInterval(async () => {
      try {
        const status = await getImportStatus(customersJobId);
        const summary = normalizeSummary(status);
        const normalizedStatus = status.Status.toLowerCase();
        const progress =
          summary.total > 0
            ? Math.min((summary.processed / summary.total) * 100, 100)
            : normalizedStatus === "completed" || normalizedStatus === "completed_with_errors"
              ? 100
              : 0;

        if (!isDisposed) {
          setCustomersProgress(progress);
        }

        if (normalizedStatus === "completed" || normalizedStatus === "completed_with_errors" || normalizedStatus === "error") {
          window.clearInterval(interval);
          if (isDisposed) return;

          setIsImportingCustomers(false);
          setCustomersJobId(null);
          setFinalSummary(summary);

          if (normalizedStatus === "completed") {
            toast({ title: "Importación de clientes completada" });
          } else if (normalizedStatus === "completed_with_errors") {
            toast({
              title: "Importación completada con advertencias",
              description: `Fallidas: ${summary.failed}, Omitidas: ${summary.skipped}`,
            });
          } else {
            toast({
              title: "Importación finalizada con error",
              description: `Fallidas: ${summary.failed}, Omitidas: ${summary.skipped}`,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        window.clearInterval(interval);
        if (isDisposed) return;

        setIsImportingCustomers(false);
        setCustomersJobId(null);
        toast({
          title: "No se pudo consultar el progreso",
          description: getApiErrorMessage(error, "CRM / Importación clientes"),
          variant: "destructive",
        });
      }
    }, 1000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [customersJobId, isImportingCustomers, toast]);

  const onCustomersFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCustomersFile(file);
    setPreviewSummary(null);
    setFinalSummary(null);
    setCustomersProgress(0);
  };

  const onPreviewCustomers = async () => {
    if (!customersFile) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para previsualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPreviewing(true);
      const report = await previewImportCustomersFile(customersFile);
      setPreviewSummary(normalizeSummary(report));
      setFinalSummary(null);
      toast({ title: "Vista previa lista" });
    } catch (error) {
      toast({
        title: "No se pudo previsualizar",
        description: getApiErrorMessage(error, "CRM / Importación clientes"),
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const onImportCustomers = async () => {
    if (!customersFile) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo antes de importar.",
        variant: "destructive",
      });
      return;
    }

    if (!previewSummary) {
      toast({
        title: "Primero previsualiza",
        description: "Debes revisar la vista previa antes de importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImportingCustomers(true);
      setCustomersProgress(0);
      setFinalSummary(null);
      const response = await importCustomersFile(customersFile);
      setCustomersJobId(response.jobID);
    } catch (error) {
      setIsImportingCustomers(false);
      setCustomersJobId(null);
      toast({
        title: "No se pudo importar",
        description: getApiErrorMessage(error, "CRM / Importación clientes"),
        variant: "destructive",
      });
    }
  };

  const onSalesFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSalesFile(file);
  };

  const onImportSales = async () => {
    if (!salesFile) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo CSV o Excel para importar ventas.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await importSalesMutation.mutateAsync(salesFile);
      toast({
        title: "Importación de ventas iniciada",
        description: response.message ?? "Las ventas fueron enviadas para procesamiento.",
      });
      setSalesFile(null);
    } catch (error) {
      toast({
        title: "No se pudo importar ventas",
        description: getApiErrorMessage(error, "CRM / Importación ventas"),
        variant: "destructive",
      });
    }
  };

  const shownSummary = finalSummary ?? previewSummary;

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          <ExplainableAcronym sigla="CRM" /> · Importaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Importa datos de clientes y ventas para actualizar perfiles y analítica.
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="sales">Ventas e Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Importación de Clientes</CardTitle>
              <CardDescription>
                Sube un archivo, revisa la vista previa y confirma la importación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="file" accept=".xlsx,.csv" onChange={onCustomersFileChange} disabled={isImportingCustomers} />

              <Alert className="border-sky-200 bg-sky-50/70">
                <AlertTitle>Estructura sugerida para importación de clientes</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CUSTOMER_HEADERS.map((column) => (
                      <Badge key={column} variant="outline" className="bg-white">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>

              {isImportingCustomers && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Procesando clientes... {Math.round(customersProgress)}%</p>
                  <Progress value={customersProgress} className="w-full" />
                </div>
              )}

              {shownSummary && !isImportingCustomers && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                  <Badge variant="outline">Total: {shownSummary.total}</Badge>
                  <Badge variant="outline">Insertadas: {shownSummary.inserted}</Badge>
                  <Badge variant="outline">Actualizadas: {shownSummary.updated}</Badge>
                  <Badge variant="outline">Omitidas: {shownSummary.skipped}</Badge>
                  <Badge variant="outline">Fallidas: {shownSummary.failed}</Badge>
                  <Badge variant="outline">Estado: {shownSummary.status}</Badge>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadCustomersTemplate} disabled={isImportingCustomers || isPreviewing}>
                  Descargar Plantilla CSV
                </Button>
                <Button type="button" variant="outline" onClick={onPreviewCustomers} disabled={!customersFile || isPreviewing || isImportingCustomers}>
                  {isPreviewing ? "Previsualizando..." : "Previsualizar"}
                </Button>
                <Button type="button" onClick={onImportCustomers} disabled={!customersFile || !previewSummary || isImportingCustomers || isPreviewing}>
                  {isImportingCustomers ? "Importando..." : "Importar clientes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Importación de Ventas e Historial</CardTitle>
              <CardDescription>
                Carga ventas masivas para recalcular perfiles de clientes y comportamiento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:bg-muted/40">
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Arrastra tu archivo o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground">Formatos permitidos: .csv, .xlsx, .xls</p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={onSalesFileChange}
                  disabled={importSalesMutation.isLoading}
                />
              </label>

              {salesFile && (
                <div className="text-sm text-muted-foreground">
                  Archivo seleccionado: <span className="font-medium text-foreground">{salesFile.name}</span>
                </div>
              )}

              <Alert className="border-sky-200 bg-sky-50/70">
                <AlertTitle>Columnas obligatorias del archivo</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SALES_HEADERS.map((column) => (
                      <Badge key={column} variant="outline" className="bg-white">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadSalesTemplate}>
                  Descargar Plantilla CSV
                </Button>
                <Button type="button" onClick={onImportSales} disabled={!salesFile || importSalesMutation.isLoading}>
                  {importSalesMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando ventas y recalculando perfiles...
                    </>
                  ) : (
                    "Subir ventas"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
