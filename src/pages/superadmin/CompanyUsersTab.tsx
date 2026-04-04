import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CompanyUserFormSchema,
  type CompanyUserDTO,
  type UserPayload,
  createCompanyUser,
  getCompanyUsers,
  updateCompanyUser,
} from "./admin-users.service";

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "suspended":
      return "Suspendido";
    default:
      return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "border-success/30 bg-success/10 text-success";
    case "inactive":
      return "border-muted-foreground/30 text-muted-foreground";
    case "suspended":
      return "border-warning/30 bg-warning/10 text-warning";
    default:
      return "";
  }
}

function emptyValues(): UserPayload {
  return { name: "", email: "", password: "", status: "active" };
}

function UserDialog({
  open,
  companyId,
  user,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  companyId: string;
  user: CompanyUserDTO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<UserPayload>({
    resolver: zodResolver(CompanyUserFormSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(
        user
          ? {
              name: user.name,
              email: user.email,
              password: "",
              status: user.status,
            }
          : emptyValues(),
      );
    }
  }, [form, open, user]);

  const mutation = useMutation({
    mutationFn: async (values: UserPayload) => {
      if (user) {
        return updateCompanyUser(companyId, user.id, values);
      }
      return createCompanyUser(companyId, values);
    },
    onSuccess: async () => {
      toast({ title: user ? "Usuario actualizado" : "Usuario creado" });
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-company-users", companyId] });
      onSaved();
    },
    onError: () => {
      toast({
        title: user ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: UserPayload) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuario admin" : "Añadir usuario admin"}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="admin-user-name">Nombre</Label>
            <Input id="admin-user-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-user-email">Email</Label>
            <Input id="admin-user-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-user-password">
              Contraseña {user ? "(dejar vacía si no desea cambiarla)" : ""}
            </Label>
            <Input id="admin-user-password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as UserPayload["status"]) }>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanyUsersTab({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUserDTO | null>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["admin-company-users", companyId],
    queryFn: () => getCompanyUsers(companyId),
    enabled: Boolean(companyId),
  });

  const openCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEdit = (user: CompanyUserDTO) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Usuarios Admin</h3>
          <p className="text-xs text-muted-foreground">Crea y administra usuarios asociados a esta empresa.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Añadir Usuario
        </Button>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Cargando usuarios...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-destructive">
                  No se pudieron cargar los usuarios.
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No hay usuarios administradores para esta empresa.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(user.status)}>
                      {statusLabel(user.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        open={dialogOpen}
        companyId={companyId}
        user={editingUser}
        onOpenChange={setDialogOpen}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ["admin-company-users", companyId] })}
      />
    </div>
  );
}
