import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import ScreenFormDialog from "./ScreenFormDialog";
import { createScreen, getScreens, updateScreen, type ScreenPayload } from "@/features/admin/screens.service";
import type { Screen } from "@/types/admin";

function statusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}

function statusClass(isActive: boolean): string {
  return isActive
    ? "border-success/30 bg-success/10 text-success"
    : "border-muted-foreground/30 text-muted-foreground";
}

export default function ScreensManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);

  const { data: screens = [], isLoading, isError } = useQuery({
    queryKey: ["admin-screens"],
    queryFn: getScreens,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ScreenPayload) => createScreen(values),
    onSuccess: async () => {
      toast({ title: "Pantalla creada" });
      setOpen(false);
      setEditingScreen(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-screens"] });
    },
    onError: () => {
      toast({ title: "No se pudo crear la pantalla", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ScreenPayload) => {
      if (!editingScreen) throw new Error("No hay pantalla seleccionada");
      return updateScreen(editingScreen.id, values);
    },
    onSuccess: async () => {
      toast({ title: "Pantalla actualizada" });
      setOpen(false);
      setEditingScreen(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-screens"] });
    },
    onError: () => {
      toast({ title: "No se pudo actualizar la pantalla", variant: "destructive" });
    },
  });

  const handleSubmit = async (values: ScreenPayload) => {
    if (editingScreen) {
      updateMutation.mutate(values);
      return;
    }

    createMutation.mutate(values);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Pantallas</h3>
          <p className="text-xs text-muted-foreground">Gestiona las pantallas disponibles del sistema.</p>
        </div>
        <Button
          onClick={() => {
            setEditingScreen(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Pantalla
        </Button>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Ruta Frontend</TableHead>
              <TableHead>Endpoint API</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Cargando pantallas...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-destructive">
                  No se pudieron cargar las pantallas.
                </TableCell>
              </TableRow>
            ) : screens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No hay pantallas registradas.
                </TableCell>
              </TableRow>
            ) : (
              screens.map((screen) => (
                <TableRow key={screen.id}>
                  <TableCell className="font-medium">{screen.name}</TableCell>
                  <TableCell>{screen.key}</TableCell>
                  <TableCell>{screen.frontend_route}</TableCell>
                  <TableCell>{screen.api_endpoint || "—"}</TableCell>
                  <TableCell>{screen.order}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass(screen.is_active)}>
                      {statusLabel(screen.is_active)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingScreen(screen);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ScreenFormDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setEditingScreen(null);
          }
        }}
        onSubmit={handleSubmit}
        initialScreen={editingScreen}
        loading={loading}
      />
    </div>
  );
}
