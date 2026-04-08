import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

import apiClient from "@/lib/api/client";
import CreateProductDialog from "@/features/inventory/components/CreateProductDialog";
import { getProducts } from "@/features/inventory/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
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
	})
	.passthrough();

const PurchaseOrderItemSchema = z
	.object({
		id: z.string().optional(),
		product_id: z.string(),
		product_name: z.string().optional(),
		quantity: z.union([z.number(), z.string()]).optional(),
		unit_cost: z.union([z.number(), z.string()]).optional(),
		received_quantity: z.union([z.number(), z.string()]).optional(),
	})
	.passthrough();

const PurchaseOrderSchema = z
	.object({
		id: z.string(),
		supplier_id: z.string().optional(),
		supplier_name: z.string().optional(),
		date: z.string().optional(),
		status: z.string(),
		total: z.union([z.number(), z.string()]).optional(),
		items: z.array(PurchaseOrderItemSchema).optional(),
	})
	.passthrough();

type PurchaseOrderDTO = z.infer<typeof PurchaseOrderSchema>;
type PurchaseOrderItemDTO = z.infer<typeof PurchaseOrderItemSchema>;

const PurchaseOrdersListSchema = z
	.object({
		items: z.array(PurchaseOrderSchema),
		total: z.number().optional(),
		page: z
			.object({
				total: z.number().optional(),
			})
			.optional(),
	})
	.passthrough();

type NewOrderItemRow = {
	id: string;
	product_id: string;
	quantity: string;
	unit_cost: string;
};

type ReceiveItemRow = {
	product_id: string;
	product_name: string;
	ordered_quantity: number;
	received_quantity: string;
};

type NewSupplierFormState = {
	name: string;
	nit: string;
	email: string;
	phone: string;
	payment_term_days: string;
	lead_time_days: string;
};

function toNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function createOrderItemRow(): NewOrderItemRow {
	return {
		id: crypto.randomUUID(),
		product_id: "",
		quantity: "",
		unit_cost: "",
	};
}

function createSupplierForm(): NewSupplierFormState {
	return {
		name: "",
		nit: "",
		email: "",
		phone: "",
		payment_term_days: "",
		lead_time_days: "",
	};
}

function StatusBadge({ status }: { status: string }) {
	const normalized = status.toUpperCase();

	if (normalized === "BORRADOR") {
		return <Badge variant="secondary" className="text-[10px]">Borrador</Badge>;
	}
	if (normalized === "CONFIRMADA") {
		return (
			<Badge variant="outline" className="text-[10px] border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300">
				Confirmada
			</Badge>
		);
	}
	if (normalized === "CERRADA") {
		return (
			<Badge variant="outline" className="text-[10px] border-success/40 bg-success/15 text-success">
				Cerrada
			</Badge>
		);
	}

	return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

async function listSuppliers() {
	const response = await apiClient.get("/api/suppliers", { params: { limit: 500, offset: 0 } });
	if (Array.isArray(response.data)) {
		return z.array(SupplierSchema).parse(response.data);
	}
	const parsed = z
		.object({
			items: z.array(SupplierSchema),
		})
		.passthrough()
		.parse(response.data);
	return parsed.items;
}

async function listPurchaseOrders(params: { limit: number; offset: number; search?: string }) {
	const response = await apiClient.get("/api/purchase-orders", { params });

	if (Array.isArray(response.data)) {
		const items = z.array(PurchaseOrderSchema).parse(response.data);
		return { items, total: items.length };
	}

	const parsed = PurchaseOrdersListSchema.parse(response.data);
	return {
		items: parsed.items,
		total: parsed.total ?? parsed.page?.total ?? parsed.items.length,
	};
}

export default function PurchaseOrdersPage() {
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const [searchParams, setSearchParams] = useSearchParams();

	const initialPageSize = Number(searchParams.get("pageSize")) || 5;
	const initialOffset = Number(searchParams.get("offset")) || 0;
	const initialSearch = searchParams.get("search") ?? "";

	const [pageSize, setPageSize] = useState(initialPageSize);
	const [offset, setOffset] = useState(initialOffset);
	const [search, setSearch] = useState(initialSearch);
	const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());

	const [newDialogOpen, setNewDialogOpen] = useState(false);
	const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
	const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false);
	const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);
	const [supplierId, setSupplierId] = useState("");
	const [newItems, setNewItems] = useState<NewOrderItemRow[]>([createOrderItemRow()]);
	const [newSupplierForm, setNewSupplierForm] = useState<NewSupplierFormState>(createSupplierForm());
	const [receiveOrder, setReceiveOrder] = useState<PurchaseOrderDTO | null>(null);
	const [detailOrder, setDetailOrder] = useState<PurchaseOrderDTO | null>(null);
	const [receiveItems, setReceiveItems] = useState<ReceiveItemRow[]>([]);

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

	const suppliersQuery = useQuery({
		queryKey: ["suppliers", "lookup"],
		queryFn: listSuppliers,
	});

	const productsQuery = useQuery({
		queryKey: ["inventory", "products", "po-form"],
		queryFn: getProducts,
	});

	const ordersQuery = useQuery({
		queryKey: ["purchase-orders", pageSize, offset, debouncedSearch],
		queryFn: () =>
			listPurchaseOrders({
				limit: pageSize,
				offset,
				search: debouncedSearch || undefined,
			}),
	});

	const orders = ordersQuery.data?.items ?? [];
	const total =
		typeof ordersQuery.data?.total === "number" ? ordersQuery.data.total : undefined;
	const hasMore =
		typeof total === "number" ? offset + orders.length < total : orders.length === pageSize;
	const hasPrev = offset > 0;

	const newOrderValid =
		supplierId.length > 0 &&
		newItems.length > 0 &&
		newItems.every((item) => {
			const qty = Number(item.quantity);
			const cost = Number(item.unit_cost);
			return item.product_id.length > 0 && Number.isFinite(qty) && qty > 0 && Number.isFinite(cost) && cost >= 0;
		});

	const supplierPaymentTermDays = newSupplierForm.payment_term_days.trim().length
		? Number(newSupplierForm.payment_term_days)
		: undefined;
	const supplierLeadTimeDays = newSupplierForm.lead_time_days.trim().length
		? Number(newSupplierForm.lead_time_days)
		: undefined;

	const newSupplierValid =
		newSupplierForm.name.trim().length > 0 &&
		newSupplierForm.nit.trim().length > 0 &&
		(supplierPaymentTermDays === undefined || (Number.isFinite(supplierPaymentTermDays) && supplierPaymentTermDays >= 0)) &&
		(supplierLeadTimeDays === undefined || (Number.isFinite(supplierLeadTimeDays) && supplierLeadTimeDays >= 0));

	const createMutation = useMutation({
		mutationFn: async () => {
			await apiClient.post("/api/purchase-orders", {
				supplier_id: supplierId,
				items: newItems.map((item) => ({
					product_id: item.product_id,
					quantity: Number(item.quantity),
					unit_cost: Number(item.unit_cost),
				})),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
			toast({ title: "Orden de compra creada" });
			setNewDialogOpen(false);
			setSupplierId("");
			setNewItems([createOrderItemRow()]);
		},
	});

	const createSupplierMutation = useMutation({
		mutationFn: async () => {
			const payload = {
				name: newSupplierForm.name.trim(),
				nit: newSupplierForm.nit.trim(),
				email: newSupplierForm.email.trim() || undefined,
				phone: newSupplierForm.phone.trim() || undefined,
				payment_term_days: supplierPaymentTermDays,
				lead_time_days: supplierLeadTimeDays,
			};

			const response = await apiClient.post("/api/suppliers", payload);
			return SupplierSchema.parse(response.data);
		},
		onSuccess: (createdSupplier) => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setSupplierId(createdSupplier.id);
			setNewSupplierDialogOpen(false);
			setNewSupplierForm(createSupplierForm());
			toast({
				title: "Proveedor creado",
				description: "El proveedor se creó y quedó seleccionado en la orden.",
			});
		},
	});


	const receiveMutation = useMutation({
		mutationFn: async () => {
			if (!receiveOrder) throw new Error("Orden no seleccionada");
			await apiClient.post(`/api/purchase-orders/${receiveOrder.id}/receive`, {
				items: receiveItems.map((item) => ({
					product_id: item.product_id,
					quantity_received: Number(item.received_quantity || 0),
				})),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
			queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
			queryClient.invalidateQueries({ queryKey: ["inventory-replenishment-list"] });
			toast({ title: "Recepción registrada" });
			setReceiveDialogOpen(false);
			setReceiveOrder(null);
			setReceiveItems([]);
		},
	});

	const newOrderTotal = useMemo(
		() => newItems.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_cost), 0),
		[newItems],
	);

	const openReceiveDialog = (order: PurchaseOrderDTO) => {
		const rows = (order.items ?? []).map((item: PurchaseOrderItemDTO) => {
			const orderedQty = toNumber(item.quantity);
			const alreadyReceived = toNumber(item.received_quantity);
			const remaining = Math.max(orderedQty - alreadyReceived, 0);
			return {
				product_id: item.product_id,
				product_name: item.product_name ?? item.product_id,
				ordered_quantity: orderedQty,
				received_quantity: remaining > 0 ? String(remaining) : "0",
			};
		});
		setReceiveOrder(order);
		setReceiveItems(rows);
		receiveMutation.reset();
		setReceiveDialogOpen(true);
	};

	const openDetailDialog = (order: PurchaseOrderDTO) => {
		setDetailOrder(order);
		setDetailDialogOpen(true);
	};

	const printDetailOrder = () => {
		if (!detailOrder) return;

		const supplier = detailOrder.supplier_name ?? detailOrder.supplier_id ?? "—";
		const date = detailOrder.date ? new Date(detailOrder.date).toLocaleDateString("es-CO") : "—";
		const total = toNumber(detailOrder.total).toLocaleString("es-CO", {
			style: "currency",
			currency: "COP",
			maximumFractionDigits: 2,
		});
		const rows = (detailOrder.items ?? [])
			.map((item) => {
				const qty = toNumber(item.quantity);
				const cost = toNumber(item.unit_cost);
				const lineTotal = (qty * cost).toLocaleString("es-CO", {
					style: "currency",
					currency: "COP",
					maximumFractionDigits: 2,
				});
				const unitCost = cost.toLocaleString("es-CO", {
					style: "currency",
					currency: "COP",
					maximumFractionDigits: 2,
				});
				return `<tr><td>${item.product_name ?? item.product_id}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${unitCost}</td><td style="text-align:right">${lineTotal}</td></tr>`;
			})
			.join("");

		const printWindow = window.open("", "_blank", "width=900,height=700");
		if (!printWindow) return;

		printWindow.document.write(`
			<html>
				<head>
					<title>Detalle OC</title>
					<style>
						body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
						h1 { margin: 0 0 12px; font-size: 20px; }
						.meta { margin-bottom: 16px; font-size: 14px; }
						table { width: 100%; border-collapse: collapse; margin-top: 12px; }
						th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
						th { background: #f5f5f5; text-align: left; }
					</style>
				</head>
				<body>
					<h1>Detalle de Orden de Compra</h1>
					<div class="meta"><strong>Proveedor:</strong> ${supplier}</div>
					<div class="meta"><strong>Estado:</strong> ${detailOrder.status}</div>
					<div class="meta"><strong>Fecha:</strong> ${date}</div>
					<div class="meta"><strong>Total:</strong> ${total}</div>
					<table>
						<thead>
							<tr>
								<th>Producto</th>
								<th style="text-align:right">Cantidad</th>
								<th style="text-align:right">Costo unitario</th>
								<th style="text-align:right">Total línea</th>
							</tr>
						</thead>
						<tbody>${rows || '<tr><td colspan="4" style="text-align:center">Sin productos en esta orden.</td></tr>'}</tbody>
					</table>
				</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	};

	const addItemRow = () => setNewItems((current) => [...current, createOrderItemRow()]);
	const removeItemRow = (id: string) =>
		setNewItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));

	const updateItemRow = (id: string, field: keyof Omit<NewOrderItemRow, "id">, value: string) => {
		setNewItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
	};

	const updateReceiveItem = (productId: string, value: string) => {
		setReceiveItems((current) =>
			current.map((item) => (item.product_id === productId ? { ...item, received_quantity: value } : item)),
		);
	};

	const openNewSupplierDialog = () => {
		setNewSupplierForm(createSupplierForm());
		createSupplierMutation.reset();
		setNewSupplierDialogOpen(true);
	};

	return (
		<div className="space-y-4 animate-fade-in">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Truck className="h-4 w-4 text-primary" />
					<div>
						<h1 className="text-lg font-semibold tracking-tight">Órdenes de compra</h1>
						<p className="text-sm text-muted-foreground">Gestiona compras y recepción de inventario por proveedor.</p>
					</div>
				</div>

				<Button size="sm" className="text-xs" onClick={() => setNewDialogOpen(true)}>
					<Plus className="h-3.5 w-3.5 mr-1" />
					Nueva OC
				</Button>
			</div>

			<div className="w-full sm:w-72">
				<Input
					placeholder="Buscar por proveedor o estado…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="h-8 text-xs"
				/>
			</div>

			{ordersQuery.isLoading && (
				<div className="erp-card p-4 space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			)}

			{ordersQuery.isError && !ordersQuery.isLoading && (
				<p className="text-sm text-destructive">{getApiErrorMessage(ordersQuery.error, "Inventario / Órdenes de compra")}</p>
			)}

			{!ordersQuery.isLoading && !ordersQuery.isError && (
				<div className="erp-card overflow-hidden p-0">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50 hover:bg-muted/50">
								<TableHead className="text-xs text-muted-foreground">Proveedor</TableHead>
								<TableHead className="text-xs text-muted-foreground">Fecha</TableHead>
								<TableHead className="text-xs text-muted-foreground">Estado</TableHead>
								<TableHead className="text-right text-xs text-muted-foreground">Total</TableHead>
								<TableHead className="text-right text-xs text-muted-foreground">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
										No hay órdenes de compra registradas.
									</TableCell>
								</TableRow>
							) : (
								orders.map((order) => (
									<TableRow key={order.id} className="hover:bg-muted/40">
										<TableCell className="font-medium">{order.supplier_name ?? order.supplier_id ?? "—"}</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{order.date ? new Date(order.date).toLocaleDateString("es-CO") : "—"}
										</TableCell>
										<TableCell>
											<StatusBadge status={order.status} />
										</TableCell>
										<TableCell className="text-right font-mono">
											{toNumber(order.total).toLocaleString("es-CO", {
												style: "currency",
												currency: "COP",
												maximumFractionDigits: 2,
											})}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2">
												<Button
													variant="ghost"
													size="sm"
													className="text-xs"
													onClick={() => openDetailDialog(order)}
												>
													Ver detalle
												</Button>
												<Button
													variant="outline"
													size="sm"
													className="text-xs"
													disabled={order.status.toUpperCase() === "CERRADA"}
													onClick={() => openReceiveDialog(order)}
												>
													Recibir
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{orders.length > 0 && (
						<div className="flex items-center justify-between border-t px-4 py-3 gap-4">
							<p className="text-xs text-muted-foreground">
								Mostrando {offset + 1}–{offset + orders.length}
								{typeof total === "number" && total > 0 ? ` de ${total}` : ""}
							</p>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>Filas por página</span>
									<Select
										value={String(pageSize)}
										onValueChange={(value) => {
											setOffset(0);
											setPageSize(Number(value));
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

			<Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Nueva OC</DialogTitle>
						<DialogDescription>Selecciona proveedor y agrega los productos con cantidad y costo.</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-1.5">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">Proveedor</p>
								<Button type="button" variant="ghost" size="sm" className="text-xs" onClick={openNewSupplierDialog}>
									+ Crear proveedor
								</Button>
							</div>
							<Select value={supplierId || undefined} onValueChange={setSupplierId}>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar proveedor" />
								</SelectTrigger>
								<SelectContent>
									{suppliersQuery.data?.map((supplier) => (
										<SelectItem key={supplier.id} value={supplier.id}>
											{supplier.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">Productos</p>
								<div className="flex items-center gap-2">
									<Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setCreateProductDialogOpen(true)}>
										+ Crear producto
									</Button>
									<Button type="button" variant="ghost" size="sm" className="text-xs" onClick={addItemRow}>
										+ Agregar fila
									</Button>
								</div>
							</div>

							<div className="rounded-md border overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/50 hover:bg-muted/50">
											<TableHead className="text-xs text-muted-foreground">Producto</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground w-32">Qty</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground w-40">Costo</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground w-16" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{newItems.map((row) => (
											<TableRow key={row.id}>
												<TableCell>
													<Select
														value={row.product_id || undefined}
														onValueChange={(value) => updateItemRow(row.id, "product_id", value)}
													>
														<SelectTrigger>
															<SelectValue placeholder="Producto" />
														</SelectTrigger>
														<SelectContent>
															{productsQuery.data?.map((product) => (
																<SelectItem key={product.id} value={product.id}>
																	{product.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<Input
														className="h-8 text-right"
														inputMode="decimal"
														value={row.quantity}
														onChange={(e) => updateItemRow(row.id, "quantity", e.target.value)}
													/>
												</TableCell>
												<TableCell>
													<Input
														className="h-8 text-right"
														inputMode="decimal"
														value={row.unit_cost}
														onChange={(e) => updateItemRow(row.id, "unit_cost", e.target.value)}
													/>
												</TableCell>
												<TableCell className="text-right">
													<Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(row.id)}>
														Quitar
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							<p className="text-xs text-muted-foreground text-right">
								Total estimado: {newOrderTotal.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
							</p>

							{productsQuery.isError && (
								<p className="text-xs text-destructive">
									{getApiErrorMessage(productsQuery.error, "Inventario / Productos")}
								</p>
							)}
						</div>

						{createMutation.isError && (
							<p className="text-sm text-destructive">
								{getApiErrorMessage(createMutation.error, "Inventario / Nueva orden de compra")}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button variant="ghost" type="button" onClick={() => setNewDialogOpen(false)}>
							Cancelar
						</Button>
						<Button type="button" disabled={!newOrderValid || createMutation.isPending} onClick={() => createMutation.mutate()}>
							{createMutation.isPending ? "Guardando…" : "Crear OC"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={newSupplierDialogOpen}
				onOpenChange={(open) => {
					setNewSupplierDialogOpen(open);
					if (!open) {
						createSupplierMutation.reset();
					}
				}}
			>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Crear proveedor</DialogTitle>
						<DialogDescription>
							Crea un proveedor sin salir de la orden de compra.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1.5 sm:col-span-2">
								<p className="text-sm font-medium">Nombre</p>
								<Input
									value={newSupplierForm.name}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Nombre del proveedor"
								/>
							</div>

							<div className="space-y-1.5">
								<p className="text-sm font-medium">NIT</p>
								<Input
									value={newSupplierForm.nit}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, nit: e.target.value }))}
									placeholder="900123456-7"
								/>
							</div>

							<div className="space-y-1.5">
								<p className="text-sm font-medium">Email</p>
								<Input
									type="email"
									value={newSupplierForm.email}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
									placeholder="compras@proveedor.com"
								/>
							</div>

							<div className="space-y-1.5">
								<p className="text-sm font-medium">Teléfono</p>
								<Input
									value={newSupplierForm.phone}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
									placeholder="+57 300 000 0000"
								/>
							</div>

							<div className="space-y-1.5">
								<p className="text-sm font-medium">Días de pago</p>
								<Input
									type="number"
									min="0"
									step="1"
									value={newSupplierForm.payment_term_days}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, payment_term_days: e.target.value }))}
									placeholder="30"
								/>
							</div>

							<div className="space-y-1.5">
								<p className="text-sm font-medium">Días de abastecimiento</p>
								<Input
									type="number"
									min="0"
									step="1"
									value={newSupplierForm.lead_time_days}
									onChange={(e) => setNewSupplierForm((prev) => ({ ...prev, lead_time_days: e.target.value }))}
									placeholder="7"
								/>
							</div>
						</div>

						{createSupplierMutation.isError && (
							<p className="text-sm text-destructive">
								{getApiErrorMessage(createSupplierMutation.error, "Inventario / Proveedores")}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => setNewSupplierDialogOpen(false)}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!newSupplierValid || createSupplierMutation.isPending}
							onClick={() => createSupplierMutation.mutate()}
						>
							{createSupplierMutation.isPending ? "Guardando…" : "Crear proveedor"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<CreateProductDialog
				open={createProductDialogOpen}
				onOpenChange={setCreateProductDialogOpen}
				title="Crear producto"
				description="Crea un producto sin salir de la orden de compra."
				onCreated={(createdProduct) => {
					setNewItems((current) => {
						const firstEmptyIndex = current.findIndex((item) => !item.product_id);
						if (firstEmptyIndex >= 0) {
							return current.map((item, index) =>
								index === firstEmptyIndex ? { ...item, product_id: createdProduct.id } : item,
							);
						}
						return [
							...current,
							{
								...createOrderItemRow(),
								product_id: createdProduct.id,
							},
						];
					});
					toast({
						title: "Producto creado",
						description: "El producto se creó y quedó disponible en la orden.",
					});
				}}
			/>

			<Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Recibir</DialogTitle>
						<DialogDescription>Registra la cantidad recibida por producto para esta orden.</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						{receiveItems.length === 0 ? (
							<p className="text-sm text-muted-foreground">Esta orden no tiene productos para recibir.</p>
						) : (
							<div className="rounded-md border overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/50 hover:bg-muted/50">
											<TableHead className="text-xs text-muted-foreground">Producto</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground">Qty ordenada</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground">Qty recibida</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{receiveItems.map((item) => (
											<TableRow key={item.product_id}>
												<TableCell className="font-medium text-sm">{item.product_name}</TableCell>
												<TableCell className="text-right font-mono">{item.ordered_quantity}</TableCell>
												<TableCell className="text-right">
													<Input
														className="h-8 text-right"
														inputMode="decimal"
														value={item.received_quantity}
														onChange={(e) => updateReceiveItem(item.product_id, e.target.value)}
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}

						{receiveMutation.isError && (
							<p className="text-sm text-destructive">{getApiErrorMessage(receiveMutation.error, "Inventario / Recepción")}</p>
						)}
					</div>

					<DialogFooter>
						<Button variant="ghost" type="button" onClick={() => setReceiveDialogOpen(false)}>
							Cancelar
						</Button>
						<Button type="button" disabled={receiveMutation.isPending || receiveItems.length === 0} onClick={() => receiveMutation.mutate()}>
							{receiveMutation.isPending ? "Guardando…" : "Registrar recepción"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Detalle de OC</DialogTitle>
						<DialogDescription>
							Consulta el detalle de la orden de compra.
						</DialogDescription>
					</DialogHeader>

					{detailOrder ? (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-muted-foreground">Proveedor</p>
									<p className="font-medium">{detailOrder.supplier_name ?? detailOrder.supplier_id ?? "—"}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Estado</p>
									<div className="mt-1">
										<StatusBadge status={detailOrder.status} />
									</div>
								</div>
								<div>
									<p className="text-muted-foreground">Fecha</p>
									<p className="font-medium">{detailOrder.date ? new Date(detailOrder.date).toLocaleDateString("es-CO") : "—"}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Total</p>
									<p className="font-medium">
										{toNumber(detailOrder.total).toLocaleString("es-CO", {
											style: "currency",
											currency: "COP",
											maximumFractionDigits: 2,
										})}
									</p>
								</div>
							</div>

							<div className="rounded-md border overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/50 hover:bg-muted/50">
											<TableHead className="text-xs text-muted-foreground">Producto</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground">Cantidad</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground">Costo unitario</TableHead>
											<TableHead className="text-right text-xs text-muted-foreground">Total línea</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(detailOrder.items ?? []).length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
													Sin productos en esta orden.
												</TableCell>
											</TableRow>
										) : (
											(detailOrder.items ?? []).map((item) => {
												const qty = toNumber(item.quantity);
												const cost = toNumber(item.unit_cost);
												return (
													<TableRow key={item.id ?? item.product_id}>
														<TableCell className="text-sm font-medium">{item.product_name ?? item.product_id}</TableCell>
														<TableCell className="text-right font-mono">{qty}</TableCell>
														<TableCell className="text-right font-mono">
															{cost.toLocaleString("es-CO", {
																style: "currency",
																currency: "COP",
																maximumFractionDigits: 2,
															})}
														</TableCell>
														<TableCell className="text-right font-mono">
															{(qty * cost).toLocaleString("es-CO", {
																style: "currency",
																currency: "COP",
																maximumFractionDigits: 2,
															})}
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					) : null}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={printDetailOrder} disabled={!detailOrder}>
							Imprimir
						</Button>
						<Button variant="ghost" type="button" onClick={() => setDetailDialogOpen(false)}>
							Cerrar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
