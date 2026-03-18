import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Building2, Sparkles, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getCustomers, getTickets, deactivateCustomer } from "@/features/crm/services";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAdmin = user?.roles?.includes("admin") ?? false;

  const customersQuery = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: getCustomers,
  });

  const ticketsQuery = useQuery({
    queryKey: ["crm", "tickets"],
    queryFn: getTickets,
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (id) {
        await deactivateCustomer(id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Desactivado correctamente",
        description: "El cliente ha sido desactivado.",
      });
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
      setConfirmOpen(false);
      setTimeout(() => navigate("/crm"), 500);
    },
    onError: (error: any) => {
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        toast({
          title: "Error de permisos",
          description: "No tienes permisos para desactivar este cliente.",
          variant: "destructive",
        });
      } else {
        const errorMsg = getApiErrorMessage(error, "Clientes");
        toast({
          title: "Error al desactivar",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
  });

  const client = customersQuery.data?.find((c) => c.id === id);
  const tickets = ticketsQuery.data ?? [];

  if (customersQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button onClick={() => navigate("/crm")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Volver al directorio
        </button>
        <p className="text-sm text-muted-foreground">Cargando cliente...</p>
      </div>
    );
  }

  if (customersQuery.isError) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button onClick={() => navigate("/crm")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Volver al directorio
        </button>
        <p className="text-sm text-destructive">{getApiErrorMessage(customersQuery.error, "CRM / Perfil de cliente")}</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button onClick={() => navigate("/crm")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Volver al directorio
        </button>
        <div className="text-center py-20 text-muted-foreground">Cliente no encontrado</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <button onClick={() => navigate("/crm")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Volver al directorio
      </button>

      <div className="erp-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold">{client.name}</h2>
              <Badge variant="secondary">{client.category_name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2 shadow-md">
              <Sparkles className="h-4 w-4" />
              Generar Correo con IA
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={deactivateMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Desactivar
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t">
          <InfoItem icon={Mail} label="Email" value={client.email} />
          <InfoItem icon={Phone} label="Teléfono" value={client.phone} />
          <InfoItem icon={Building2} label="Categoría" value={client.category_name} />
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="erp-card">
          <h3 className="text-sm font-semibold mb-4">
            Tickets <ExplainableAcronym sigla="PQR" />
          </h3>
          <div className="space-y-3">
            {tickets.slice(0, 10).map((t) => (
              <div key={t.id} className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                  <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                </div>
                <p className="text-sm">{t.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.sentiment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar este registro? Esta acción oculta el registro pero no lo elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
        <Icon className="h-3 w-3" />{label}
      </div>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
