import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileUp, AlertCircle, CheckCircle2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { uploadSalesFile } from "../services";
import type { ColumnMapping } from "../crm.types";

const VALID_FIELDS = [
  { value: "nombre", label: "Nombre del Producto" },
  { value: "precio", label: "Precio" },
  { value: "cantidad", label: "Cantidad" },
  { value: "sku", label: "SKU" },
  { value: "categoria", label: "Categoría" },
  { value: "cliente", label: "Cliente" },
  { value: "correo", label: "Email" },
  { value: "telefono", label: "Teléfono" },
  { value: "fecha", label: "Fecha" },
  { value: "total", label: "Total" },
  { value: "estado", label: "Estado" },
   { value: "precioVenta", label: "Precio Venta" },
   { value: "costoUnitario", label: "Costo Unitario" },
];

interface DetectedColumn {
  index: number;
  header: string;
}

interface ColumnMapRow {
  sourceIndex: number;
  sourceHeader: string;
  targetField: string;
}

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;

  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";

    if (char === '"') {
      // Handle escaped quotes "" within quoted values.
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

      if (char === delimiter && !inQuotes) {
        result.push(current.trim().normalize("NFC"));
      current = "";
      continue;
    }

    current += char;
  }

    result.push(current.trim().normalize("NFC"));
  return result;
}

export default function SalesImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapRow[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    status: "success" | "partial" | "error";
    message: string;
    rowsProcessed: number;
    rowsSuccess: number;
    rowsFailed: number;
  } | null>(null);

  const detectColumns = useCallback(async (csvFile: File) => {
    try {
      // Lectura de texto para detectar delimitador y encabezados de CSV.
      const text = await csvFile.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        setDetectedColumns([]);
        setColumnMappings([]);
        setPreviewData([]);
        return [];
      }

      const delimiter = detectDelimiter(text);
      const headers = parseCsvLine(lines[0], delimiter).map((h, idx) => {
        const clean = h.replace(/^\uFEFF/, "").trim();
        return clean.length > 0 ? clean : `Columna ${idx + 1}`;
      });

      const detected: DetectedColumn[] = headers.map((header, index) => ({
        index,
        header,
      }));

      const previewRows = lines.slice(1, 6).map((line) => {
        const parsed = parseCsvLine(line, delimiter);
        return headers.map((_, index) => parsed[index] ?? "");
      });

      setDetectedColumns(detected);
      setPreviewData(previewRows);

      // Inicializar mappings con campos sugeridos
      const initialMappings: ColumnMapRow[] = detected.map((col) => ({
        sourceIndex: col.index,
        sourceHeader: col.header,
        targetField: "", // Usuario debe elegir
      }));

      setColumnMappings(initialMappings);
      return detected;
    } catch (error) {
      console.error("Error detectando columnas:", error);
      return [];
    }
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      alert("Por favor, sube un archivo CSV o Excel");
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    await detectColumns(selectedFile);
    setShowMappingDialog(true);
  }, [detectColumns]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      // Filtrar mappings vacías
      const validMappings = columnMappings.filter((m) => m.targetField);

      return uploadSalesFile(file, validMappings);
    },
    onSuccess: (response) => {
      setUploadResult({
        status: response.status,
        message: response.message,
        rowsProcessed: response.rowsProcessed,
        rowsSuccess: response.rowsSuccess,
        rowsFailed: response.rowsFailed,
      });
      setShowMappingDialog(false);

      // Reset after 3 seconds
      if (response.status === "success") {
        setTimeout(() => {
          setFile(null);
          setColumnMappings([]);
          setDetectedColumns([]);
          setPreviewData([]);
          setUploadResult(null);
        }, 2000);
      }
    },
    onError: (error) => {
      setUploadResult({
        status: "error",
        message: error instanceof Error ? error.message : "Error en la carga",
        rowsProcessed: 0,
        rowsSuccess: 0,
        rowsFailed: 0,
      });
    },
  });

  const isReadyToUpload = useMemo(() => {
    return columnMappings.some((m) => m.targetField);
  }, [columnMappings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileUp className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Importador de Ventas</h2>
      </div>

      {/* Upload Area */}
      <Card
        className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition cursor-pointer bg-gradient-to-br from-white to-slate-50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div
            className="text-center"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-slate-400" />
            <h3 className="font-semibold text-slate-900 mb-1">
              Arrastra tu archivo aquí
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              o haz clic para seleccionar un archivo CSV, Excel
            </p>
            <Badge variant="outline">CSV, XLSX, XLS</Badge>

            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
          </div>

          {file && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
              <div className="text-sm">
                <p className="font-medium text-emerald-900">{file.name}</p>
                <p className="text-emerald-700">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setColumnMappings([]);
                  setDetectedColumns([]);
                  setPreviewData([]);
                  setUploadResult(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card
          className={
            uploadResult.status === "success"
              ? "border-emerald-200 bg-emerald-50"
              : uploadResult.status === "partial"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
          }
        >
          <CardContent className="p-4 flex items-start gap-3">
            {uploadResult.status === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  uploadResult.status === "success"
                    ? "text-emerald-900"
                    : "text-red-900"
                }`}
              >
                {uploadResult.message}
              </p>
              <p
                className={`text-sm mt-1 ${
                  uploadResult.status === "success"
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                Procesadas: {uploadResult.rowsProcessed} | Exitosas:{" "}
                {uploadResult.rowsSuccess} | Fallidas: {uploadResult.rowsFailed}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mapeo de Columnas</DialogTitle>
            <DialogDescription>
              Vincula cada columna de tu archivo con el campo correspondiente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Columna Origen</TableHead>
                    <TableHead>Campo Destino</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnMappings.map((mapping, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {mapping.sourceHeader}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(value) => {
                            setColumnMappings((prev) => {
                              const updated = [...prev];
                              updated[idx].targetField = value;
                              return updated;
                            });
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecciona campo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {VALID_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewData.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">Vista previa detectada (primeras filas):</p>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        {detectedColumns.map((column) => (
                          <TableHead key={column.index}>{column.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow key={`preview-${rowIndex}`}>
                          {row.map((cell, colIndex) => (
                            <TableCell key={`preview-${rowIndex}-${colIndex}`}>{cell || "-"}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!isReadyToUpload && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Mapea al menos una columna antes de continuar
                </p>
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cargando...</span>
                  <span className="text-slate-500">
                    {Math.round(Math.random() * 100)}%
                  </span>
                </div>
                <Progress value={Math.random() * 100} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMappingDialog(false)}
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!isReadyToUpload || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Cargando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
