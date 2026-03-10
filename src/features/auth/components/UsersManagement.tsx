import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Plus, AlertCircle } from "lucide-react";

import { getUsers, createUser, updateUser, type UserDTO } from "@/features/auth/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Checkbox,
} from "@/components/ui/checkbox";

const ALL_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Asesor Comercial" },
  { value: "support", label: "Agente de Soporte" },
  { value: "marketing", label: "Marketing" },
] as const;

const baseUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().optional(),
  roles: z.array(z.string()).min(1, "Selecciona al menos un rol"),
});

type BaseUserFormValues = z.infer<typeof baseUserSchema>;

interface UserFormValues extends BaseUserFormValues {
  // Para distinguir en runtime si estamos creando o editando
  id?: string;
}

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(baseUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roles: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      createUser({
        name: values.name,
        email: values.email,
        password: values.password || undefined,
        roles: values.roles,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset({
        name: "",
        email: "",
        password: "",
        roles: [],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: UserFormValues;
    }) => {
      if (!id || typeof id !== "string") {
        throw new Error("ID de usuario requerido para guardar cambios.");
      }
      return updateUser(id, {
        name: values.name,
        email: values.email,
        password: values.password || undefined,
        roles: values.roles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset({
        name: "",
        email: "",
        password: "",
        roles: [],
      });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      name: "",
      email: "",
      password: "",
      roles: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (user: UserDTO) => {
    setEditingUser(user);
    form.reset({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      roles: user.roles ?? [],
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: UserFormValues) => {
    // Validar manualmente que password sea obligatorio al crear
    if (!editingUser && !values.password) {
      form.setError("password", {
        type: "manual",
        message: "La contraseña es obligatoria al crear un usuario",
      });
      return;
    }

    if (editingUser) {
      const userId = editingUser.id;
      if (!userId) return;
      updateMutation.mutate({ id: userId, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="animate-fade-in space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-muted-foreground">
              Crea y asigna roles a tu equipo para controlar el acceso a los módulos del sistema.
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Crear usuario
        </Button>
      </div>

      {usersQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {usersQuery.isError && !usersQuery.isLoading && (
        <div className="erp-card p-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{getApiErrorMessage(usersQuery.error, "Gestión de usuarios")}</span>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && (
        <div className="erp-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground">Roles</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usersQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                usersQuery.data!.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => openEdit(u)}
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
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingUser(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar usuario" : "Crear usuario"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="usuario@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contraseña{" "}
                      {!editingUser && (
                        <span className="text-[11px] text-muted-foreground">
                          (obligatoria al crear)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {ALL_ROLES.map((role) => (
                        <label
                          key={role.value}
                          className="flex items-center gap-2 text-xs cursor-pointer"
                        >
                          <Checkbox
                            checked={field.value?.includes(role.value) ?? false}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              if (checked) {
                                field.onChange([...current, role.value]);
                              } else {
                                field.onChange(
                                  current.filter((r) => r !== role.value),
                                );
                              }
                            }}
                          />
                          <span>{role.label}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingUser(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!!editingUser && !editingUser.id)
                  }
                >
                  {isSubmitting
                    ? editingUser
                      ? "Guardando…"
                      : "Creando…"
                    : editingUser
                    ? "Guardar cambios"
                    : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-destructive mt-2">
              {getApiErrorMessage(
                (createMutation.error || updateMutation.error) as Error,
                "Gestión de usuarios",
              )}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

