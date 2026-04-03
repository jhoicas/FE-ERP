
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoles, createRole, updateRole, RoleDTO } from "@/features/auth/roles.service";
import { toast } from "@/components/ui/sonner";
import RoleForm from "./RoleForm.tsx";


export default function RolesManagement() {
  const user = useAuthUser();
  const companyId = user?.company_id;
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDTO | null>(null);
  const queryClient = useQueryClient();

  const {
    data: roles,
    isLoading: rolesLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["roles", companyId],
    queryFn: () => getRoles(companyId!),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (role: { name: string; screenIds: string[] }) => {
      if (!companyId) throw new Error("No hay empresa activa");
      return createRole({
        name: role.name,
        company_id: companyId,
        screen_ids: role.screenIds,
      });
    },
    onSuccess: () => {
      toast.success("Rol creado correctamente");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles", companyId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al crear el rol");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (role: { id: string; name: string; screenIds: string[] }) => {
      if (!companyId) throw new Error("No hay empresa activa");
      return updateRole(role.id, {
        name: role.name,
        company_id: companyId,
        screen_ids: role.screenIds,
      });
    },
    onSuccess: () => {
      toast.success("Rol actualizado correctamente");
      setEditingRole(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles", companyId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al actualizar el rol");
    },
  });

  const handleCreate = (role: { name: string; screenIds: string[] }) => {
    createMutation.mutate(role);
  };

  const handleEdit = (role: RoleDTO) => {
    setEditingRole(role);
    setOpen(true);
  };

  const handleUpdate = (role: { id: string; name: string; screenIds: string[] }) => {
    updateMutation.mutate(role as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Roles de la Empresa</h2>
        <Button onClick={() => { setEditingRole(null); setOpen(true); }}>Crear Rol</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Pantallas Asignadas</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rolesLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">Cargando...</TableCell>
            </TableRow>
          ) : rolesError ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-destructive">Error al cargar roles</TableCell>
            </TableRow>
          ) : !roles || roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">No hay roles registrados.</TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                <TableCell>{role.screen_ids.length}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(role)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <RoleForm
          open={open}
          onClose={() => { setOpen(false); setEditingRole(null); }}
          onSubmit={editingRole ? handleUpdate : handleCreate}
          initialRole={editingRole ? { id: editingRole.id, name: editingRole.name, screenIds: editingRole.screen_ids } : undefined}
          companyId={companyId}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Dialog>
    </div>
  );
}
