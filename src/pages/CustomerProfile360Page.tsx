import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, Phone, FileText, Gift, User } from "lucide-react";

import { getProfile360, assignCategory, listCategories } from "@/features/crm/services";
import { assignCategorySchema, type AssignCategoryRequest } from "@/lib/validations/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomerProfile360Page() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["crm-profile360", customerId],
    queryFn: () => getProfile360(customerId!),
    enabled: !!customerId,
  });

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories"],
    queryFn: () => listCategories({ limit: 100 }),
    enabled: assignDialogOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (body: AssignCategoryRequest) =>
      assignCategory(customerId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-profile360", customerId] });
      setAssignDialogOpen(false);
    },
  });

  const form = useForm<AssignCategoryRequest>({
    resolver: zodResolver(assignCategorySchema),
    defaultValues: { category_id: "", ltv: 0 },
  });

  const openAssignDialog = () => {
    setAssignDialogOpen(true);
    const currentLtv = profileQuery.data?.ltv;
    form.reset({
      category_id: profileQuery.data?.category_id ?? "",
      ltv: currentLtv ? parseFloat(String(currentLtv)) : 0,
    });
  };

  const onSubmitAssign = (values: AssignCategoryRequest) => {
    assignMutation.mutate(values);
  };

  if (!customerId) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <p className="text-sm text-destructive">ID de cliente no válido.</p>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (profileQuery.isError) {
    const err = profileQuery.error as Error & { code?: string };
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al CRM
        </button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">
            {err.code ? `[${err.code}] ` : ""}
            {err.message}
          </p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data!;
  const { customer, category_name, ltv, benefits } = profile;

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <button
        onClick={() => navigate("/crm")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al CRM
      </button>

      {/* Datos del cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Datos del cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Nombre</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">NIT / Tax ID</p>
              <p className="font-mono">{customer.tax_id ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{customer.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{customer.phone ?? "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fidelización */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" /> Fidelización
          </CardTitle>
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={openAssignDialog}>
                Asignar categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar categoría al cliente</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitAssign)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={categoriesQuery.isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesQuery.data?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name} (min LTV: {cat.min_ltv})
                              </SelectItem>
                            ))}
                            {categoriesQuery.data?.length === 0 && !categoriesQuery.isLoading && (
                              <SelectItem value="_none" disabled>
                                No hay categorías
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ltv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LTV (valor de vida)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAssignDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={assignMutation.isPending}>
                      {assignMutation.isPending ? "Guardando…" : "Guardar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
              {assignMutation.isError && (
                <p className="text-sm text-destructive mt-2">
                  {(assignMutation.error as Error).message}
                </p>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Categoría:</span>
            <Badge variant="secondary">
              {category_name ?? "Sin categoría"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">LTV</p>
            <p className="text-lg font-semibold font-mono">
              ${typeof ltv === "string" ? parseFloat(ltv).toLocaleString() : Number(ltv).toLocaleString()}
            </p>
          </div>
          {benefits && benefits.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Beneficios de la categoría
              </p>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm">{b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
