
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
  const user = useAuthUser();
  const queryClient = useQueryClient();
// (Eliminado import duplicado de useQueryClient)
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { getRoles, createRole, updateRole, deleteRole, RoleDTO } from "@/features/auth/roles.service";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDTO | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (role: RoleDTO) => {
      const companyId = user?.company_id;
      if (!companyId) throw new Error("No hay empresa activa");
      return deleteRole(companyId, role.id);
    },
    onSuccess: () => {
      toast.success("Rol eliminado correctamente");
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      const companyId = user?.company_id;
      if (companyId) queryClient.invalidateQueries({ queryKey: ["roles", companyId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Error al eliminar el rol");
    },
  });
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
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(role)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRoleToDelete(role); setDeleteDialogOpen(true); }} title="Eliminar" aria-label="Eliminar">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="py-2 text-sm">
                          ¿Estás seguro de que deseas eliminar el rol <b>{roleToDelete?.name}</b>? Esta acción no se puede deshacer.
                        </div>
                        <AlertDialogFooter>
                          <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>Cancelar</Button>
                          <Button variant="destructive" onClick={() => roleToDelete && deleteMutation.mutate(roleToDelete)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
