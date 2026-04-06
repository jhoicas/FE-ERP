import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { type RbacScreenDTO } from "@/features/auth/services";
import { getCompanyScreens } from "@/pages/superadmin/companies.service";

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (role: { id?: string; name: string; screenIds: string[] }) => void;
  initialRole?: { id?: string; name: string; screenIds: string[] } | null;
  companyId?: string;
  loading?: boolean;
}

export default function RoleForm({ open, onClose, onSubmit, initialRole, companyId, loading }: RoleFormProps) {
  const user = useAuthUser();
  const isSuperAdmin = user?.isSuperAdmin;
  const [name, setName] = useState(initialRole?.name || "");
  const [selectedScreens, setSelectedScreens] = useState<string[]>(initialRole?.screenIds || []);
  const { data: screensData, isLoading, isError } = useQuery({
    queryKey: ["role-form-company-screens", companyId],
    queryFn: async () => {
      if (!companyId || isSuperAdmin) return [] as RbacScreenDTO[];
      const response = await getCompanyScreens(companyId);
      return response.screens as RbacScreenDTO[];
    },
    enabled: !isSuperAdmin && Boolean(companyId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const screens = screensData ?? [];

  // Agrupar pantallas por módulo
  const groupedScreens = useMemo(() => {
    if (!screens) return {};
    return screens.reduce((acc: Record<string, RbacScreenDTO[]>, screen) => {
      const mod = screen.module_name || screen.module_key || "Otros";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(screen);
      return acc;
    }, {} as Record<string, RbacScreenDTO[]>);
  }, [screens]);

  useEffect(() => {
    if (open) {
      setName(initialRole?.name || "");
      setSelectedScreens(initialRole?.screenIds || []);
    }
  }, [open, initialRole]);

  const handleToggleScreen = (id: string) => {
    setSelectedScreens((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: initialRole?.id, name, screenIds: selectedScreens });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initialRole ? "Editar Rol" : "Crear Rol"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="role-name">Nombre del Rol</label>
          <Input
            id="role-name"
            placeholder="Ej: Supervisor, Vendedor, Soporte"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="font-semibold mb-2">Permisos (Pantallas)</div>
          {isLoading && <div className="text-xs text-muted-foreground">Cargando pantallas...</div>}
          {isError && <div className="text-xs text-destructive">Error al cargar pantallas</div>}
          {!isLoading && screens && Object.entries(groupedScreens).map(([mod, screens]) => (
            <div key={mod} className="mb-2">
              <div className="font-medium text-sm mb-1">{mod}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {screens.map((screen) => (
                  <label key={screen.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedScreens.includes(screen.id!)}
                      onCheckedChange={() => handleToggleScreen(screen.id!)}
                    />
                    <span>{screen.label || screen.name || screen.title || screen.frontend_route}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? (initialRole ? "Guardando..." : "Creando...") : (initialRole ? "Guardar Cambios" : "Crear Rol")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
