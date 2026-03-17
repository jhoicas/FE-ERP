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
  createBenefit,
  updateBenefit,
} from "@/features/crm/services";
import type { CategoryResponse, BenefitResponse } from "@/types/crm";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { isAdmin } from "@/features/auth/permissions";
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
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<BenefitResponse | null>(null);

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
      setCreateCategoryDialogOpen(false);
      createCategoryForm.reset({
        name: "",
        min_ltv: 0,
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
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                selected={cat.id === selectedCategoryId}
                onSelect={() => handleSelectCategory(cat)}
              />
            ))}
          </div>
        )}
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

          <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
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
                    <Button type="button" variant="ghost" onClick={() => setCreateCategoryDialogOpen(false)}>
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
    </div>
  );
}

