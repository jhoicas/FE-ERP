import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { importCustomersFile } from "@/features/crm/services";
import CustomersTable from "@/features/crm/components/CustomersTable";

export default function CRMPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const importMutation = useMutation({
    mutationFn: importCustomersFile,
    onSuccess: async () => {
      toast({
        title: "Importación completada",
        description: "Los clientes fueron importados correctamente.",
      });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      setImportOpen(false);
      setFile(null);
    },
    onError: (error) => {
      toast({
        title: "No se pudo importar la data",
        description: getApiErrorMessage(error, "CRM / Importación"),
        variant: "destructive",
      });
    },
  });

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx o .csv para continuar.",
        variant: "destructive",
      });
      return;
    }

    const loadingToast = toast({
      title: "Importando data...",
      description: "Estamos procesando el archivo, esto puede tardar unos segundos.",
    });

    try {
      await importMutation.mutateAsync(file);
    } finally {
      loadingToast.dismiss();
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
          setImportOpen(nextOpen);
          if (!nextOpen) {
            setFile(null);
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

          <div className="space-y-2">
            <Input
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setFile(selectedFile);
              }}
              disabled={importMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Formatos permitidos: <code>.xlsx</code> y <code>.csv</code>.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setImportOpen(false);
                setFile(null);
              }}
              disabled={importMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleImport} disabled={importMutation.isPending || !file}>
              {importMutation.isPending ? "Importando..." : "Subir archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
