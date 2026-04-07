import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import ScreenFormDialog from "./ScreenFormDialog";
import { createScreen, getModules, getScreens, updateScreen, type ScreenPayload } from "@/features/admin/screens.service";
import type { Module, Screen } from "@/types/admin";

function statusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}

function statusClass(isActive: boolean): string {
  return isActive
    ? "border-success/30 bg-success/10 text-success"
    : "border-muted-foreground/30 text-muted-foreground";
}

function formatModuleLabel(module?: Module | null): string {
  if (!module) return "Módulo inactivo/desconocido";
  const name = module.name?.trim() || "Módulo";
  const key = module.key?.trim() || "sin-key";
  return `${name} (${key})`;
}

export default function ScreensManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);

  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: screens = [], isLoading, isError } = useQuery({
    queryKey: ["admin-screens"],
    queryFn: getScreens,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: getModules,
  });

  const modulesById = useMemo(
    () => new Map(modules.map((module) => [module.id, module] as const)),
    [modules],
  );

  // Lógica de filtrado
  const filteredScreens = useMemo(() => {
    return screens.filter((screen) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        screen.name.toLowerCase().includes(searchLower) ||
        screen.key.toLowerCase().includes(searchLower) ||
        screen.frontend_route.toLowerCase().includes(searchLower);
      
      const matchesModule = moduleFilter === "all" || screen.module_id === moduleFilter;
      
      return matchesSearch && matchesModule;
    }).sort((a, b) => a.order - b.order); // Opcional: ordenar por el campo 'order'
  }, [screens, searchTerm, moduleFilter]);

  // Resetear a la primera página si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter]);

  // Lógica de paginación
  const totalPages = Math.ceil(filteredScreens.length / itemsPerPage);
  const paginatedScreens = filteredScreens.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, key o ruta..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtrar por módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los módulos</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Módulo</TableHead>
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
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Cargando pantallas...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-destructive">
                  No se pudieron cargar las pantallas.
                </TableCell>
              </TableRow>
            ) : filteredScreens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No se encontraron pantallas con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              paginatedScreens.map((screen) => (
                <TableRow key={screen.id}>
                  <TableCell className="font-medium">{screen.name}</TableCell>
                  <TableCell>{screen.key}</TableCell>
                  <TableCell>
                    {formatModuleLabel(modulesById.get(screen.module_id))}
                  </TableCell>
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

        {/* Paginación */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredScreens.length)} de {filteredScreens.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
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