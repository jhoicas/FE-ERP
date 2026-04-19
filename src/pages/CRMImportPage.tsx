import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  previewCrmImport,
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

const CUSTOMER_HEADERS = ["nombre", "email", "telefono", "documento", "fecha_nacimiento", "categoria"] as const;

function assignFileToInput(input: HTMLInputElement | null, file: File | null): void {
  if (!input) return;
  if (!file) {
    input.value = "";
    return;
  }
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function normalizeSummary(report: ImportReportResponse): ImportSummary {
  const rows = report.Rows ?? [];
  const insertedFromRows = rows.filter((row) => row.action === "inserted").length;
  const updatedFromRows = rows.filter((row) => row.action === "updated").length;
  const skippedFromRows = rows.filter((row) => row.action === "skipped").length;
  const failedFromRows = rows.filter((row) => row.action === "failed" || row.action === "invalid").length;
  const processedFromRows = Math.max(rows.length - failedFromRows, 0);

  return {
    status: report.Status,
    total: report.TotalRows > 0 ? report.TotalRows : rows.length,
    inserted: report.InsertedRows > 0 ? report.InsertedRows : insertedFromRows,
    updated: report.UpdatedRows > 0 ? report.UpdatedRows : updatedFromRows,
    skipped: report.SkippedRows > 0 ? report.SkippedRows : skippedFromRows,
    failed: report.FailedRows > 0 ? report.FailedRows : failedFromRows,
    processed: report.ProcessedRows > 0 ? report.ProcessedRows : processedFromRows,
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
    "Yoiner Castillo,jhoicas@gmail.com,3183838417,1143948208,1992-07-06,VIP",
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
  const [salesPreviewSummary, setSalesPreviewSummary] = useState<ImportSummary | null>(null);

  const [salesFile, setSalesFile] = useState<File | null>(null);

  const customersFileInputRef = useRef<HTMLInputElement>(null);
  const salesFileInputRef = useRef<HTMLInputElement>(null);
  const [isSalesDropTargetActive, setIsSalesDropTargetActive] = useState(false);

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

  const onCustomersFileSelect = (file: File | null) => {
    setCustomersFile(file);
    setPreviewSummary(null);
    setFinalSummary(null);
    setCustomersProgress(0);
  };

  const onCustomersDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const onCustomersDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const onCustomersDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isImportingCustomers) return;

    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    onCustomersFileSelect(droppedFile);
    assignFileToInput(customersFileInputRef.current, droppedFile);
  };

  const onCustomersDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
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
    setSalesPreviewSummary(null);
  };

  const onSalesFileSelect = (file: File | null) => {
    setSalesFile(file);
    setSalesPreviewSummary(null);
  };

  const onSalesDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const onSalesDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    const { currentTarget, relatedTarget } = event;
    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsSalesDropTargetActive(true);
  };

  const onSalesDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const { currentTarget, relatedTarget } = event;
    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsSalesDropTargetActive(false);
  };

  const onSalesDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSalesDropTargetActive(false);
    if (importSalesMutation.isLoading) return;

    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    onSalesFileSelect(droppedFile);
    assignFileToInput(salesFileInputRef.current, droppedFile);
  };

  const onPreviewSales = async () => {
    if (!salesFile) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para previsualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPreviewing(true);
      const report = await previewCrmImport(salesFile, { importType: "sales" });
      setSalesPreviewSummary(normalizeSummary(report));
      toast({ title: "Vista previa lista" });
    } catch (error) {
      toast({
        title: "No se pudo previsualizar",
        description: getApiErrorMessage(error, "CRM / Importación ventas"),
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
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

    if (!salesPreviewSummary) {
      toast({
        title: "Primero previsualiza",
        description: "Debes revisar la vista previa antes de importar ventas.",
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
      setSalesPreviewSummary(null);
      assignFileToInput(salesFileInputRef.current, null);
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
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:bg-muted/40"
                onDragEnter={onCustomersDragEnter}
                onDragOver={onCustomersDragOver}
                onDragLeave={onCustomersDragLeave}
                onDrop={onCustomersDrop}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Arrastra tu archivo o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground">Formatos permitidos: .csv, .xlsx, .xls</p>
                <Input
                  ref={customersFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={onCustomersFileChange}
                  disabled={isImportingCustomers}
                />
              </label>

              {customersFile && (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: <span className="font-medium text-foreground">{customersFile.name}</span>
                </p>
              )}

              <Alert className="border-sky-200 bg-sky-50/70">
                <AlertTitle>Estructura sugerida para importación de clientes</AlertTitle>
                <AlertDescription>
                  <p className="text-sm text-muted-foreground">
                    Columnas requeridas: nombre, email, telefono, documento, fecha_nacimiento, categoria.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CUSTOMER_HEADERS.map((column) => (
                      <Badge key={column} variant="outline" className="bg-white">
                        {column}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    El archivo debe conservar exactamente estos encabezados para que el backend lo procese correctamente.
                  </p>
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
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:bg-muted/40${isSalesDropTargetActive ? " border-primary bg-primary/5" : ""}`}
                onDragEnter={onSalesDragEnter}
                onDragOver={onSalesDragOver}
                onDragLeave={onSalesDragLeave}
                onDrop={onSalesDrop}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Arrastra tu archivo o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground">Formatos permitidos: .csv, .xlsx, .xls</p>
                <Input
                  ref={salesFileInputRef}
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

              {salesPreviewSummary && !importSalesMutation.isLoading && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                  <Badge variant="outline">Total: {salesPreviewSummary.total}</Badge>
                  <Badge variant="outline">Insertadas: {salesPreviewSummary.inserted}</Badge>
                  <Badge variant="outline">Actualizadas: {salesPreviewSummary.updated}</Badge>
                  <Badge variant="outline">Omitidas: {salesPreviewSummary.skipped}</Badge>
                  <Badge variant="outline">Fallidas: {salesPreviewSummary.failed}</Badge>
                  <Badge variant="outline">Estado: {salesPreviewSummary.status}</Badge>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadSalesTemplate} disabled={isPreviewing || importSalesMutation.isLoading}>
                  Descargar Plantilla CSV
                </Button>
                <Button type="button" variant="outline" onClick={onPreviewSales} disabled={!salesFile || isPreviewing || importSalesMutation.isLoading}>
                  {isPreviewing ? "Previsualizando..." : "Previsualizar"}
                </Button>
                <Button type="button" onClick={onImportSales} disabled={!salesFile || !salesPreviewSummary || importSalesMutation.isLoading || isPreviewing}>
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
