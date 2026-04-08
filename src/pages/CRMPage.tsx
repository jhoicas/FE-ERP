import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getImportStatus, importCustomersFile } from "@/features/crm/services";
import CustomersTable from "@/features/crm/components/CustomersTable";

export default function CRMPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !isImporting) {
      return;
    }

    let isDisposed = false;
    const interval = window.setInterval(async () => {
      try {
        const status = await getImportStatus(jobId);
        const totalRows = status.TotalRows;
        const processedRows = status.ProcessedRows;
        const calculated =
          totalRows > 0
            ? Math.min((processedRows / totalRows) * 100, 100)
            : status.Status.toLowerCase() === "completed"
              ? 100
              : 0;

        if (!isDisposed) {
          setProgress(calculated);
        }

        const normalizedStatus = status.Status.toLowerCase();
        if (normalizedStatus === "completed" || normalizedStatus === "error") {
          window.clearInterval(interval);
          if (isDisposed) return;

          setIsImporting(false);
          setJobId(null);

          if (normalizedStatus === "completed") {
            setProgress(100);
            toast({
              title: "Importación completada",
              description: "Los clientes fueron importados correctamente.",
            });
          } else {
            toast({
              title: "La importación finalizó con error",
              description: "Revisa el archivo y vuelve a intentarlo.",
              variant: "destructive",
            });
          }

          await queryClient.invalidateQueries({ queryKey: ["customers"] });
          await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
          setImportOpen(false);
          setFile(null);
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

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);
      setProgress(0);
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

      <CustomersTable
        externalActions={
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Data
          </Button>
        }
      />

      <Dialog
        open={importOpen}
        onOpenChange={(nextOpen) => {
          if (isImporting && !nextOpen) return;
          setImportOpen(nextOpen);
          if (!nextOpen) {
            setFile(null);
            setProgress(0);
            setJobId(null);
            setIsImporting(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar clientes</DialogTitle>
            <DialogDescription>
              Carga un archivo Excel o CSV para importar clientes al CRM.
            </DialogDescription>
          </DialogHeader>

          {isImporting ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Procesando clientes... {Math.round(progress)}%</p>
              <Progress value={progress} className="w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  setFile(selectedFile);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: <code>.xlsx</code> y <code>.csv</code>.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setImportOpen(false);
                setFile(null);
              }}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            {!isImporting && (
              <Button type="button" onClick={handleImport} disabled={!file}>
                Subir archivo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
