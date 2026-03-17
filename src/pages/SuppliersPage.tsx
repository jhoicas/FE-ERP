import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Truck, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { deactivateSupplier } from "@/features/crm/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
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
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
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

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const SupplierSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		nit: z.string().nullish(),
		tax_id: z.string().nullish(),
		email: z.string().nullish(),
		phone: z.string().nullish(),
		payment_term_days: z.union([z.number(), z.string()]).nullish(),
		lead_time_days: z.union([z.number(), z.string()]).nullish(),
		payment_days: z.union([z.number(), z.string()]).nullish(),
		supply_days: z.union([z.number(), z.string()]).nullish(),
	})
	.passthrough();

type SupplierDTO = z.infer<typeof SupplierSchema>;

const SuppliersListSchema = z
	.object({
		items: z.array(SupplierSchema),
		total: z.number().optional(),
		page: z
			.object({
				total: z.number().optional(),
			})
			.optional(),
	})
	.passthrough();

type SupplierFormState = {
	name: string;
	tax_id: string;
	email: string;
	phone: string;
	payment_days: string;
	supply_days: string;
};

function createEmptyForm(): SupplierFormState {
	return {
		name: "",
		tax_id: "",
		email: "",
		phone: "",
		payment_days: "",
		supply_days: "",
	};
}

function toNumericOrUndefined(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function getSupplierNit(supplier: SupplierDTO): string | null | undefined {
	return supplier.nit ?? supplier.tax_id;
}

function getSupplierPaymentDays(supplier: SupplierDTO): string | number | null | undefined {
	return supplier.payment_term_days ?? supplier.payment_days;
}

function getSupplierSupplyDays(supplier: SupplierDTO): string | number | null | undefined {
	return supplier.lead_time_days ?? supplier.supply_days;
}

async function listSuppliers(params: { limit: number; offset: number; search?: string }) {
	const response = await apiClient.get("/api/suppliers", { params });

	if (Array.isArray(response.data)) {
		const items = z.array(SupplierSchema).parse(response.data);
		return { items, total: items.length };
	}

	const parsed = SuppliersListSchema.parse(response.data);
	return {
		items: parsed.items,
		total: parsed.total ?? parsed.page?.total ?? parsed.items.length,
	};
}

export default function SuppliersPage() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const user = useAuthUser();
	const [searchParams, setSearchParams] = useSearchParams();

	const isAdmin = user?.roles?.includes("admin") ?? false;

	const initialPageSize = Number(searchParams.get("pageSize")) || 5;
	const initialOffset = Number(searchParams.get("offset")) || 0;
	const initialSearch = searchParams.get("search") ?? "";

	const [pageSize, setPageSize] = useState(initialPageSize);
	const [offset, setOffset] = useState(initialOffset);
	const [search, setSearch] = useState(initialSearch);
	const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());

	const [openDialog, setOpenDialog] = useState(false);
	const [editSupplier, setEditSupplier] = useState<SupplierDTO | null>(null);
	const [form, setForm] = useState<SupplierFormState>(createEmptyForm());
	const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedSearch(search.trim());
			setOffset(0);
		}, 400);
		return () => clearTimeout(handle);
	}, [search]);

	useEffect(() => {
		const nextParams = new URLSearchParams();

		if (search.trim()) {
			nextParams.set("search", search.trim());
		}
		if (offset > 0) {
			nextParams.set("offset", String(offset));
		}
		if (pageSize !== 5) {
			nextParams.set("pageSize", String(pageSize));
		}

		setSearchParams(nextParams, { replace: true });
	}, [search, offset, pageSize, setSearchParams]);

	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["suppliers", pageSize, offset, debouncedSearch],
		queryFn: () =>
			listSuppliers({
				limit: pageSize,
				offset,
				search: debouncedSearch || undefined,
			}),
	});

	const items = data?.items ?? [];
	const total = data?.total ?? items.length;
	const hasMore = offset + items.length < total || items.length === pageSize;
	const hasPrev = offset > 0;

	const paymentDaysNumber = toNumericOrUndefined(form.payment_days);
	const supplyDaysNumber = toNumericOrUndefined(form.supply_days);
	const formIsValid =
		form.name.trim().length > 0 &&
		(paymentDaysNumber === undefined || paymentDaysNumber >= 0) &&
		(supplyDaysNumber === undefined || supplyDaysNumber >= 0);

	const mutation = useMutation({
		mutationFn: async () => {
			const payload = {
				name: form.name.trim(),
				nit: form.tax_id.trim() || undefined,
				email: form.email.trim() || undefined,
				phone: form.phone.trim() || undefined,
				payment_term_days: paymentDaysNumber,
				lead_time_days: supplyDaysNumber,
			};

			if (editSupplier) {
				await apiClient.put(`/api/suppliers/${editSupplier.id}`, payload);
			} else {
				await apiClient.post("/api/suppliers", payload);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			toast({
				title: editSupplier ? "Proveedor actualizado" : "Proveedor creado",
				description: "La información del proveedor se guardó correctamente.",
			});
			setOpenDialog(false);
			setEditSupplier(null);
			setForm(createEmptyForm());
		},
	});

	const deactivateMutation = useMutation({
		mutationFn: async (supplierId: string) => {
			await deactivateSupplier(supplierId);
		},
		onSuccess: () => {
			toast({
				title: "Desactivado correctamente",
				description: "El proveedor ha sido desactivado.",
			});
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setConfirmOpen(false);
			setDeactivatingId(null);
		},
		onError: (error: any) => {
			const statusCode = error.response?.status;
			if (statusCode === 401 || statusCode === 403) {
				toast({
					title: "Error de permisos",
					description: "No tienes permisos para desactivar este proveedor.",
					variant: "destructive",
				});
			} else {
				const errorMsg = getApiErrorMessage(error, "Proveedores");
				toast({
					title: "Error al desactivar",
					description: errorMsg,
					variant: "destructive",
				});
			}
			setDeactivatingId(null);
		},
	});

	const handleDeactivateClick = (supplierId: string) => {
		setDeactivatingId(supplierId);
		setConfirmOpen(true);
	};

	const handleConfirmDeactivate = () => {
		if (deactivatingId) {
			deactivateMutation.mutate(deactivatingId);
		}
	};

	const openCreateDialog = () => {
		setEditSupplier(null);
		setForm(createEmptyForm());
		mutation.reset();
		setOpenDialog(true);
	};

	const openEditDialog = (supplier: SupplierDTO) => {
		setEditSupplier(supplier);
		setForm({
			name: supplier.name ?? "",
			tax_id: getSupplierNit(supplier) ?? "",
			email: supplier.email ?? "",
			phone: supplier.phone ?? "",
			payment_days:
				getSupplierPaymentDays(supplier) !== undefined && getSupplierPaymentDays(supplier) !== null
					? String(getSupplierPaymentDays(supplier))
					: "",
			supply_days:
				getSupplierSupplyDays(supplier) !== undefined && getSupplierSupplyDays(supplier) !== null
					? String(getSupplierSupplyDays(supplier))
					: "",
		});
		mutation.reset();
		setOpenDialog(true);
	};

	return (
		<div className="space-y-4 animate-fade-in">
			<div className="flex items-center gap-2">
				<Truck className="h-4 w-4 text-primary" />
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Proveedores</h1>
					<p className="text-sm text-muted-foreground">
						Gestiona proveedores, términos de pago y tiempos de abastecimiento.
					</p>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
				<div className="w-full sm:w-72">
					<Input
						placeholder="Buscar por nombre, NIT, email o teléfono…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 text-xs"
					/>
				</div>
				<div className="sm:ml-auto">
					<Button size="sm" className="text-xs" onClick={openCreateDialog}>
						<Plus className="h-3.5 w-3.5 mr-1" />
						Nuevo proveedor
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className="erp-card p-4 space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			)}

			{isError && !isLoading && (
				<p className="text-sm text-destructive">
					{getApiErrorMessage(error, "Inventario / Proveedores")}
				</p>
			)}

			{!isLoading && !isError && (
				<div className="erp-card overflow-hidden p-0">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50 hover:bg-muted/50">
								<TableHead className="text-xs text-muted-foreground">Nombre</TableHead>
								<TableHead className="text-xs text-muted-foreground">NIT</TableHead>
								<TableHead className="text-xs text-muted-foreground">Email</TableHead>
								<TableHead className="text-xs text-muted-foreground">Teléfono</TableHead>
								<TableHead className="text-xs text-muted-foreground">Días pago</TableHead>
								<TableHead className="text-xs text-muted-foreground">Días abast.</TableHead>
								<TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
										No hay proveedores registrados.
									</TableCell>
								</TableRow>
							) : (
								items.map((supplier) => (
									<TableRow key={supplier.id} className="hover:bg-muted/40">
										<TableCell className="font-medium">{supplier.name}</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{getSupplierNit(supplier) ?? "—"}
										</TableCell>
										<TableCell className="text-muted-foreground">{supplier.email ?? "—"}</TableCell>
										<TableCell className="text-muted-foreground">{supplier.phone ?? "—"}</TableCell>
										<TableCell className="text-muted-foreground">
											{getSupplierPaymentDays(supplier) ?? "—"}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{getSupplierSupplyDays(supplier) ?? "—"}
										</TableCell>
										<TableCell className="text-right space-x-2 flex items-center justify-end">
											<Button
												variant="ghost"
												size="sm"
												className="text-xs"
												onClick={() => openEditDialog(supplier)}
											>
												<Pencil className="h-3 w-3 mr-1" />
												Editar
											</Button>
											{isAdmin && (
												<Button
													variant="outline"
													size="sm"
													className="text-xs text-destructive hover:text-destructive"
													onClick={() => handleDeactivateClick(supplier.id)}
													disabled={deactivateMutation.isPending}
												>
													<Trash2 className="h-3.5 w-3.5 mr-1" />
													Desactivar
												</Button>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{items.length > 0 && (
						<div className="flex items-center justify-between border-t px-4 py-3 gap-4">
							<p className="text-xs text-muted-foreground">
								Mostrando {offset + 1}–{offset + items.length}
								{typeof total === "number" && total > 0 ? ` de ${total}` : ""}
							</p>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>Filas por página</span>
									<Select
										value={String(pageSize)}
										onValueChange={(value) => {
											const size = Number(value);
											setOffset(0);
											setPageSize(size);
										}}
									>
										<SelectTrigger className="h-8 w-16 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PAGE_SIZE_OPTIONS.map((size) => (
												<SelectItem key={size} value={String(size)}>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<Pagination>
									<PaginationContent>
										<PaginationItem>
											<PaginationPrevious
												href="#"
												onClick={(e) => {
													e.preventDefault();
													if (hasPrev) setOffset((o) => Math.max(0, o - pageSize));
												}}
												className={!hasPrev ? "pointer-events-none opacity-50" : ""}
											/>
										</PaginationItem>
										<PaginationItem>
											<PaginationNext
												href="#"
												onClick={(e) => {
													e.preventDefault();
													if (hasMore) setOffset((o) => o + pageSize);
												}}
												className={!hasMore ? "pointer-events-none opacity-50" : ""}
											/>
										</PaginationItem>
									</PaginationContent>
								</Pagination>
							</div>
						</div>
					)}
				</div>
			)}

			<Dialog
				open={openDialog}
				onOpenChange={(open) => {
					setOpenDialog(open);
					if (!open) {
						setEditSupplier(null);
						mutation.reset();
					}
				}}
			>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>{editSupplier ? "Editar proveedor" : "Crear proveedor"}</DialogTitle>
						<DialogDescription>
							Completa la información comercial y logística del proveedor.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1.5 sm:col-span-2">
								<Label>Nombre</Label>
								<Input
									value={form.name}
									onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Nombre del proveedor"
								/>
							</div>

							<div className="space-y-1.5">
								<Label>NIT</Label>
								<Input
									value={form.tax_id}
									onChange={(e) => setForm((prev) => ({ ...prev, tax_id: e.target.value }))}
									placeholder="900123456-7"
								/>
							</div>

							<div className="space-y-1.5">
								<Label>Email</Label>
								<Input
									type="email"
									value={form.email}
									onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
									placeholder="compras@proveedor.com"
								/>
							</div>

							<div className="space-y-1.5">
								<Label>Teléfono</Label>
								<Input
									value={form.phone}
									onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
									placeholder="+57 300 000 0000"
								/>
							</div>

							<div className="space-y-1.5">
								<Label>Días de pago</Label>
								<Input
									type="number"
									min="0"
									step="1"
									value={form.payment_days}
									onChange={(e) => setForm((prev) => ({ ...prev, payment_days: e.target.value }))}
									placeholder="30"
								/>
							</div>

							<div className="space-y-1.5">
								<Label>Días de abastecimiento</Label>
								<Input
									type="number"
									min="0"
									step="1"
									value={form.supply_days}
									onChange={(e) => setForm((prev) => ({ ...prev, supply_days: e.target.value }))}
									placeholder="7"
								/>
							</div>
						</div>

						{mutation.isError && (
							<p className="text-sm text-destructive">
								{getApiErrorMessage(mutation.error, "Inventario / Proveedores")}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => setOpenDialog(false)}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!formIsValid || mutation.isPending}
							onClick={() => mutation.mutate()}
						>
							{mutation.isPending ? "Guardando…" : editSupplier ? "Guardar cambios" : "Crear proveedor"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Desactivar proveedor</AlertDialogTitle>
						<AlertDialogDescription>
							¿Seguro que deseas desactivar este registro? Esta acción oculta el registro pero no lo elimina.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDeactivate}
							disabled={deactivateMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deactivateMutation.isPending ? "Desactivando..." : "Desactivar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
