import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Gift, FileText, Plus, Pencil, Trash2 } from "lucide-react";

import { listCategories, listBenefitsByCategory, createBenefit, updateBenefit, deleteBenefit } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CategoryResponse, BenefitResponse } from "@/types/crm";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
import { useToast } from "@/hooks/use-toast";
import {
  createBenefitSchema,
  updateBenefitSchema,
  type CreateBenefitRequest,
  type UpdateBenefitRequest,
} from "@/lib/validations/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const PAGE_SIZE = 50;

function BenefitForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  mode: "create" | "edit";
  defaultValues: { name: string; description: string };
  onSubmit: (values: CreateBenefitRequest | UpdateBenefitRequest) => void;
  isSubmitting: boolean;
}) {
  const schema = mode === "create" ? createBenefitSchema : updateBenefitSchema;
  const form = useForm<CreateBenefitRequest | UpdateBenefitRequest>({
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <input
                  {...field}
                  className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background text-sm"
                  placeholder="Nombre del beneficio"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  placeholder="Describe claramente el beneficio para el cliente"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function CategoryBenefitsPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthUser();
  const { toast } = useToast();

  const canManage = isAdmin(user);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<BenefitResponse | null>(null);
  const [benefitToDelete, setBenefitToDelete] = useState<BenefitResponse | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", 200, 0],
    queryFn: () => listCategories({ limit: 200, offset: 0 }),
    enabled: !!categoryId,
  });

  const benefitsQuery = useQuery({
    queryKey: ["crm-benefits", categoryId, PAGE_SIZE, 0],
    queryFn: () =>
      listBenefitsByCategory(categoryId!, {
        limit: PAGE_SIZE,
        offset: 0,
      }),
    enabled: !!categoryId,
  });

  const category = categoriesQuery.data?.find(
    (c: CategoryResponse) => c.id === categoryId
  );
  const benefits = benefitsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: CreateBenefitRequest) => createBenefit(categoryId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crm-benefits", categoryId, PAGE_SIZE, 0],
      });
      setCreateDialogOpen(false);
      toast({ title: "Beneficio creado" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear beneficio",
        description: getApiErrorMessage(error, "Beneficios"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: UpdateBenefitRequest) => updateBenefit(editingBenefit!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crm-benefits", categoryId, PAGE_SIZE, 0],
      });
      setEditingBenefit(null);
      toast({ title: "Beneficio actualizado" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar beneficio",
        description: getApiErrorMessage(error, "Beneficios"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (benefitId: string) => deleteBenefit(benefitId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crm-benefits", categoryId, PAGE_SIZE, 0],
      });
      setBenefitToDelete(null);
      toast({ title: "Beneficio eliminado" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar beneficio",
        description: getApiErrorMessage(error, "Beneficios"),
        variant: "destructive",
      });
    },
  });

  if (!categoryId) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/categories")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a categorías
        </button>
        <p className="text-sm text-destructive">ID de categoría no válido.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/crm" className="hover:text-foreground">
          CRM
        </Link>
        <span>/</span>
        <Link to="/crm/categories" className="hover:text-foreground">
          Categorías
        </Link>
        <span>/</span>
        {category ? (
          <>
            <span className="text-foreground font-medium">{category.name}</span>
            <span>/</span>
          </>
        ) : null}
        <span className="text-foreground">Beneficios</span>
      </nav>

      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Beneficios
            {category ? ` · ${category.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Listado de beneficios asociados a esta categoría.
          </p>
        </div>
        {canManage && (
          <Button
            className="ml-auto"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar beneficio
          </Button>
        )}
      </div>

      {categoriesQuery.isLoading && !category && (
        <Skeleton className="h-8 w-48" />
      )}

      {benefitsQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {benefitsQuery.isError && !benefitsQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(benefitsQuery.error, "Beneficios")}
        </p>
      )}

      {!benefitsQuery.isLoading && !benefitsQuery.isError && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {benefits.length === 0
                ? "Sin beneficios"
                : `${benefits.length} beneficio${benefits.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {benefits.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No hay beneficios definidos para esta categoría.
                {canManage ? " Usa el botón \"Agregar beneficio\" para crear el primero." : ""}
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs text-muted-foreground">
                        Nombre
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground">
                        Descripción
                      </TableHead>
                          {canManage && (
                            <TableHead className="text-xs text-muted-foreground text-right">
                              Acciones
                            </TableHead>
                          )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benefits.map((b: BenefitResponse) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.description || "—"}
                        </TableCell>
                            {canManage && (
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => setEditingBenefit(b)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-destructive hover:text-destructive"
                                  onClick={() => setBenefitToDelete(b)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Quitar
                                </Button>
                              </TableCell>
                            )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/crm/categories")}
        className="mt-2"
      >
        Volver a categorías
      </Button>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar beneficio</DialogTitle>
          </DialogHeader>
          <BenefitForm
            mode="create"
            defaultValues={{ name: "", description: "" }}
            onSubmit={(values) => createMutation.mutate(values as CreateBenefitRequest)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingBenefit != null} onOpenChange={(open) => !open && setEditingBenefit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar beneficio</DialogTitle>
          </DialogHeader>
          {editingBenefit && (
            <BenefitForm
              mode="edit"
              defaultValues={{
                name: editingBenefit.name,
                description: editingBenefit.description ?? "",
              }}
              onSubmit={(values) => updateMutation.mutate(values as UpdateBenefitRequest)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={benefitToDelete != null} onOpenChange={(open) => !open && setBenefitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar beneficio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas quitar este beneficio de la categoría? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (benefitToDelete) {
                  deleteMutation.mutate(benefitToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Quitando…" : "Quitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
