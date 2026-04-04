import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  CompanyFormSchema,
  type CompanyDTO,
  type CompanyFormValues,
  createCompany,
  getCompanies,
} from "./companies.service";
import { CompanyDetailsSheet } from "./CompanyDetailsSheet.tsx";

const DEFAULT_VALUES: CompanyFormValues = {
  name: "",
  nit: "",
  email: "",
  address: "",
  phone: "",
  status: "Activo",
};

function CompanyCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: async () => {
      toast({ title: "Empresa creada" });
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      onCreated();
    },
    onError: () => {
      toast({ title: "Error al crear la empresa", variant: "destructive" });
    },
  });

  const handleSubmit = (values: CompanyFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company-name">Nombre</Label>
            <Input id="company-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-nit">NIT</Label>
            <Input id="company-nit" {...form.register("nit")} />
            {form.formState.errors.nit && (
              <p className="text-xs text-destructive">{form.formState.errors.nit.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-email">Email</Label>
            <Input id="company-email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company-address">Dirección</Label>
            <Input id="company-address" {...form.register("address")} />
            {form.formState.errors.address && (
              <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-phone">Teléfono</Label>
            <Input id="company-phone" {...form.register("phone")} />
            {form.formState.errors.phone && (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as CompanyFormValues["status"]) }>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>

          <DialogFooter className="md:col-span-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Guardando..." : "Crear empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanyStatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const active = normalized === "activo" || normalized === "active";

  return (
    <Badge
      variant="outline"
      className={active ? "border-success/30 bg-success/10 text-success" : "border-muted-foreground/30 text-muted-foreground"}
    >
      {status || (active ? "Activo" : "Inactivo")}
    </Badge>
  );
}

export default function CompaniesListPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: companies = [], isLoading, isError } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: getCompanies,
  });

  const openDetails = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Administración de empresas</h1>
          <p className="text-sm text-muted-foreground">Gestiona tenants, datos básicos y accesos del sistema.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva empresa
        </Button>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Cargando empresas...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  No se pudieron cargar las empresas.
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay empresas registradas.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company: CompanyDTO) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(company.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </div>
                  </TableCell>
                  <TableCell>{company.nit}</TableCell>
                  <TableCell>{company.email || "—"}</TableCell>
                  <TableCell>{company.phone || "—"}</TableCell>
                  <TableCell>
                    <CompanyStatusBadge status={company.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetails(company.id);
                      }}
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

      <CompanyCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["admin-companies"] })}
      />

      <CompanyDetailsSheet
        open={detailsOpen}
        companyId={selectedCompanyId}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedCompanyId(null);
          }
        }}
        onUpdated={() => void queryClient.invalidateQueries({ queryKey: ["admin-companies"] })}
      />
    </div>
  );
}
