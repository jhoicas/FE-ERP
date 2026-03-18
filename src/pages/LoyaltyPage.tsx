import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Gift, Pencil } from "lucide-react";

import {
  listCategories,
  listBenefitsByCategory,
  createCategory,
  updateCategory,
  deactivateCrmCategory,
  createBenefit,
  updateBenefit,
} from "@/features/crm/services";
import type { CategoryResponse, BenefitResponse } from "@/types/crm";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
import { useToast } from "@/hooks/use-toast";
import {
  createBenefitSchema,
  createCategorySchema,
  updateBenefitSchema,
  type CreateCategoryRequest,
  type CreateBenefitRequest,
  type UpdateBenefitRequest,
} from "@/lib/validations/crm";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: CategoryResponse;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "border-primary shadow-sm" : "border-border"
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2 flex items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm">{category.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Programa de fidelización nivel <span className="font-medium">{category.name}</span>.
        </p>
      </CardContent>
    </Card>
  );
}

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
                <Input placeholder="Nombre del beneficio" {...field} />
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
                <Textarea
                  rows={4}
                  placeholder="Describe claramente el beneficio para el cliente"
                  {...field}
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

export default function LoyaltyPage() {
  const user = useAuthUser();
  const canManageLoyalty = isAdmin(user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<BenefitResponse | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [deactivatingCategory, setDeactivatingCategory] = useState<CategoryResponse | null>(null);

  const createCategoryForm = useForm<CreateCategoryRequest>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      min_ltv: 0,
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", "loyalty"],
    queryFn: () => listCategories({ limit: 100, offset: 0 }),
  });

  const benefitsQuery = useQuery({
    queryKey: ["crm-benefits", selectedCategoryId],
    queryFn: () =>
      listBenefitsByCategory(selectedCategoryId!, { limit: 100, offset: 0 }),
    enabled: !!selectedCategoryId,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateBenefitRequest) =>
      createBenefit(selectedCategoryId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crm-benefits", selectedCategoryId],
      });
      setCreateDialogOpen(false);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({
        queryKey: ["crm-categories", "loyalty"],
      });
      setSelectedCategoryId(newCategory.id);
      resetCategorySearch();
      setCreateCategoryDialogOpen(false);
      createCategoryForm.reset({
        name: "",
        min_ltv: 0,
      });
      toast({ title: "Categoría creada" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear categoría",
        description: getApiErrorMessage(error, "Fidelización / Categorías"),
        variant: "destructive",
      });
    },
  });

  const editCategoryForm = useForm<CreateCategoryRequest>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      min_ltv: 0,
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (body: CreateCategoryRequest) =>
      updateCategory(editingCategory!.id, body),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({
        queryKey: ["crm-categories", "loyalty"],
      });
      resetCategorySearch();
      setEditingCategory(null);
      if (selectedCategoryId === updatedCategory.id) {
        setSelectedCategoryId(updatedCategory.id);
      }
      toast({ title: "Categoría actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar categoría",
        description: getApiErrorMessage(error, "Fidelización / Categorías"),
        variant: "destructive",
      });
    },
  });

  const deactivateCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deactivateCrmCategory(categoryId),
    onSuccess: () => {
      const deactivatedId = deactivatingCategory?.id;
      queryClient.invalidateQueries({
        queryKey: ["crm-categories", "loyalty"],
      });
      if (deactivatedId && selectedCategoryId === deactivatedId) {
        setSelectedCategoryId(null);
      }
      resetCategorySearch();
      setDeactivatingCategory(null);
      toast({ title: "Desactivado correctamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al desactivar categoría",
        description: getApiErrorMessage(error, "Fidelización / Categorías"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: UpdateBenefitRequest) =>
      updateBenefit(editingBenefit!.id, body),
    onSuccess: () => {
      if (selectedCategoryId) {
        queryClient.invalidateQueries({
          queryKey: ["crm-benefits", selectedCategoryId],
        });
      }
      setEditingBenefit(null);
    },
  });

  const categories = categoriesQuery.data ?? [];
  const normalizedCategorySearch = categorySearch.trim().toLowerCase();
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(normalizedCategorySearch),
  );

  const resetCategorySearch = () => {
    setCategorySearch("");
  };

  const handleSelectCategory = (cat: CategoryResponse) => {
    setSelectedCategoryId(cat.id);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  return (
    <div className="animate-fade-in space-y-4 max-w-6xl">
      <Link
        to="/crm"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Volver al CRM
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Fidelización de clientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Diseña y comunica los niveles de fidelización y sus beneficios sin mostrar datos financieros.
            </p>
          </div>
        </div>
        {canManageLoyalty && (
          <Button variant="outline" size="sm" onClick={() => setCreateCategoryDialogOpen(true)}>
            Crear categoría
          </Button>
        )}
      </div>

      {/* Grid de categorías */}
      <div className="space-y-3">
        <div className="max-w-sm">
          <Input
            placeholder="Buscar categoría por nombre…"
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Categorías de fidelización
        </p>
        {categoriesQuery.isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(categoriesQuery.error, "Fidelización / Categorías")}
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.length === 0 ? (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardContent className="py-6">
                  <p className="text-sm text-muted-foreground">
                    {categories.length === 0
                      ? "No hay categorías de fidelización configuradas."
                      : "No hay categorías que coincidan con la búsqueda."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  selected={cat.id === selectedCategoryId}
                  onSelect={() => handleSelectCategory(cat)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Administrar categorías</p>
          {canManageLoyalty && (
            <Button variant="outline" size="sm" onClick={() => setCreateCategoryDialogOpen(true)}>
              Crear categoría
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="py-4">
            {categoriesQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : categoriesQuery.isError ? (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(categoriesQuery.error, "Fidelización / Categorías")}
              </p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {categories.length === 0
                  ? "No hay categorías para administrar."
                  : "No hay categorías que coincidan con la búsqueda."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredCategories.map((cat) => {
                  const activeStatus =
                    typeof cat.is_active === "boolean" ? cat.is_active : undefined;

                  return (
                    <li
                      key={cat.id}
                      className="border rounded-md px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          LTV mínimo: {Number(cat.min_ltv).toLocaleString("es-CO")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeStatus !== undefined && (
                          <Badge variant={activeStatus ? "secondary" : "outline"}>
                            {activeStatus ? "Activa" : "Inactiva"}
                          </Badge>
                        )}

                        {canManageLoyalty && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEditingCategory(cat);
                              editCategoryForm.reset({
                                name: cat.name,
                                min_ltv: Number(cat.min_ltv),
                              });
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}

                        {canManageLoyalty && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeactivatingCategory(cat)}
                          >
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de beneficios de la categoría seleccionada */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              Beneficios de la categoría{" "}
              {selectedCategory ? (
                <span className="font-bold">{selectedCategory.name}</span>
              ) : (
                <span className="text-muted-foreground"> (selecciona una categoría)</span>
              )}
            </p>
          </div>
          {canManageLoyalty && selectedCategory && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
            >
              Crear beneficio
            </Button>
          )}
        </div>

        {!selectedCategoryId ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                Selecciona una categoría para ver y gestionar sus beneficios.
              </p>
            </CardContent>
          </Card>
        ) : benefitsQuery.isLoading ? (
          <Card>
            <CardContent className="py-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-8/12" />
            </CardContent>
          </Card>
        ) : benefitsQuery.isError ? (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-destructive">
                {getApiErrorMessage(benefitsQuery.error, "Fidelización / Beneficios")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4 space-y-3">
              {(benefitsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Esta categoría aún no tiene beneficios configurados.
                </p>
              ) : (
                <ul className="space-y-2">
                  {benefitsQuery.data!.map((b) => (
                    <li
                      key={b.id}
                      className="border rounded-md px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {b.description}
                        </p>
                      </div>
                      {canManageLoyalty && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setEditingBenefit(b)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Crear beneficio (solo admin) */}
      {canManageLoyalty && selectedCategory && (
        <>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo beneficio para {selectedCategory.name}</DialogTitle>
              </DialogHeader>
              <BenefitForm
                mode="create"
                defaultValues={{ name: "", description: "" }}
                onSubmit={(values) => createMutation.mutate(values as CreateBenefitRequest)}
                isSubmitting={createMutation.isPending}
              />
              {createMutation.isError && (
                <p className="text-sm text-destructive mt-2">
                  {(createMutation.error as Error).message}
                </p>
              )}
            </DialogContent>
          </Dialog>

          <Dialog
            open={createCategoryDialogOpen}
            onOpenChange={(open) => {
              setCreateCategoryDialogOpen(open);
              if (!open) {
                resetCategorySearch();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva categoría de fidelización</DialogTitle>
              </DialogHeader>
              <Form {...createCategoryForm}>
                <form
                  onSubmit={createCategoryForm.handleSubmit((values) => createCategoryMutation.mutate(values))}
                  className="space-y-4"
                >
                  <FormField
                    control={createCategoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Gold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createCategoryForm.control}
                    name="min_ltv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LTV mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {createCategoryMutation.isError && (
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(createCategoryMutation.error, "Fidelización / Categorías")}
                    </p>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCreateCategoryDialogOpen(false);
                        resetCategorySearch();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createCategoryMutation.isPending}>
                      {createCategoryMutation.isPending ? "Guardando…" : "Crear categoría"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editingCategory}
            onOpenChange={(open) => {
              if (!open) {
                setEditingCategory(null);
                resetCategorySearch();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar categoría de fidelización</DialogTitle>
              </DialogHeader>

              <Form {...editCategoryForm}>
                <form
                  onSubmit={editCategoryForm.handleSubmit((values) => updateCategoryMutation.mutate(values))}
                  className="space-y-4"
                >
                  <FormField
                    control={editCategoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Gold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editCategoryForm.control}
                    name="min_ltv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LTV mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {updateCategoryMutation.isError && (
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(updateCategoryMutation.error, "Fidelización / Categorías")}
                    </p>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingCategory(null);
                        resetCategorySearch();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateCategoryMutation.isPending}>
                      {updateCategoryMutation.isPending ? "Guardando…" : "Guardar cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Dialog Editar beneficio (solo admin) */}
      {canManageLoyalty && editingBenefit && (
        <Dialog open={!!editingBenefit} onOpenChange={(open) => !open && setEditingBenefit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar beneficio</DialogTitle>
            </DialogHeader>
            <BenefitForm
              mode="edit"
              defaultValues={{
                name: editingBenefit.name,
                description: editingBenefit.description,
              }}
              onSubmit={(values) =>
                updateMutation.mutate(values as UpdateBenefitRequest)
              }
              isSubmitting={updateMutation.isPending}
            />
            {updateMutation.isError && (
              <p className="text-sm text-destructive mt-2">
                {(updateMutation.error as Error).message}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={!!deactivatingCategory}
        onOpenChange={(open) => {
          if (!open) setDeactivatingCategory(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas desactivar este registro? Esta acción oculta el registro pero no lo elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivatingCategory) {
                  deactivateCategoryMutation.mutate(deactivatingCategory.id);
                }
              }}
              disabled={deactivateCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateCategoryMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

