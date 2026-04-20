import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createCrmCategoryHub,
  deleteCrmCategoryHub,
  listCrmCategoriesHub,
  updateCrmCategoryHub,
} from "@/features/crm/crm-categories.api";
import type { CrmCategoryProductHub } from "@/features/crm/crm-hub.types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";

const CRM_CATEGORIES_HUB_QK = ["crm-categories-hub"] as const;
const CRM_PRODUCTS_HUB_QK = ["crm-products-hub"] as const;

const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function CrmAnalyticsProductCategoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CrmCategoryProductHub | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: CRM_CATEGORIES_HUB_QK,
    queryFn: () => listCrmCategoriesHub({ limit: 500, offset: 0 }),
  });

  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      createCrmCategoryHub({ name: values.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      toast({ title: "Categoría creada" });
      setCreateOpen(false);
      createForm.reset({ name: "" });
    },
    onError: (e) => {
      toast({
        title: "No se pudo crear",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
      updateCrmCategoryHub(id, { name: values.name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      toast({ title: "Categoría actualizada" });
      setEditCategory(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo guardar",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCrmCategoryHub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_CATEGORIES_HUB_QK });
      queryClient.invalidateQueries({ queryKey: CRM_PRODUCTS_HUB_QK });
      toast({ title: "Categoría eliminada" });
      setDeleteId(null);
    },
    onError: (e) => {
      toast({
        title: "No se pudo eliminar",
        description: getApiErrorMessage(e, "CRM / Hub categorías"),
        variant: "destructive",
      });
    },
  });

  const items = listQuery.data ?? [];

  const openEdit = (c: CrmCategoryProductHub) => {
    setEditCategory(c);
    editForm.reset({ name: c.name });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          Categorías (Hub CRM)
        </CardTitle>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent>
        {listQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(listQuery.error, "CRM / Hub categorías")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha de creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No hay categorías en el Hub.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatCreatedAt(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría (Hub)</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) => {
                if (!editCategory) return;
                updateMutation.mutate({ id: editCategory.id, values: v });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditCategory(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productos del Hub que usen esta categoría pueden
              quedar sin referencia válida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
