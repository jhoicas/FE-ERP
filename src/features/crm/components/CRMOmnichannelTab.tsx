import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";

import apiClient from "@/lib/api/client";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";

type Channel = "email" | "whatsapp" | "sms";

export interface AudienceRow {
	id: string;
	name: string;
	email: string;
	segment: string;
	category: string;
	totalPurchased: number;
	variables: Record<string, unknown>;
}

interface CRMOmnichannelTabProps {
	companyId?: string;
}

function toNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function getFirstString(record: Record<string, unknown>, keys: string[]): string {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	return "";
}

function getFirstValue(record: Record<string, unknown>, keys: string[]): unknown {
	for (const key of keys) {
		if (record[key] !== undefined && record[key] !== null) {
			return record[key];
		}
	}
	return undefined;
}

function normalizeAudience(data: unknown): AudienceRow[] {
	const payload = data as {
		items?: unknown;
		rows?: unknown;
		data?: unknown;
	};

	const source = Array.isArray(data)
		? data
		: Array.isArray(payload?.items)
			? payload.items
			: Array.isArray(payload?.rows)
				? payload.rows
				: Array.isArray(payload?.data)
					? payload.data
					: [];

	return source
		.map((item): AudienceRow | null => {
			if (!item || typeof item !== "object") {
				return null;
			}

			const record = item as Record<string, unknown>;
			const id = getFirstString(record, ["id", "customer_id", "customerId"]);
			const email = getFirstString(record, ["email", "customer_email", "mail"]);
			const name = getFirstString(record, ["name", "nombre", "customer_name"]);
			const segment = getFirstString(record, ["segment", "segmento"]) || "SIN_SEGMENTO";
			const category = getFirstString(record, ["category", "categoria", "category_name"]) || "Sin categoría";
			const totalPurchased = toNumber(
				getFirstValue(record, ["totalPurchased", "total_purchased", "totalComprado", "ltv"]),
			);

			if (!id) {
				return null;
			}

			return {
				id,
				name,
				email,
				segment,
				category,
				totalPurchased,
				variables: record,
			};
		})
		.filter((row): row is AudienceRow => Boolean(row));
}

function formatCopCurrency(value: number): string {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0,
	}).format(value);
}

function segmentBadgeClass(segment: string): string {
	const normalized = segment.toUpperCase();
	if (normalized === "VIP") return "border-amber-300 bg-amber-100 text-amber-800";
	if (normalized === "PREMIUM") return "border-emerald-300 bg-emerald-100 text-emerald-800";
	if (normalized === "RECURRENTE") return "border-blue-300 bg-blue-100 text-blue-800";
	return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function CRMOmnichannelTab({ companyId }: CRMOmnichannelTabProps) {
	const { toast } = useToast();
	const user = useAuthUser();
	const resolvedCompanyId =
		companyId ?? (typeof user?.company_id === "string" ? user.company_id : "");

	const [audience, setAudience] = useState<AudienceRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);

	const [segmentFilter, setSegmentFilter] = useState<string>("Todos");
	const [search, setSearch] = useState("");
	const [channel, setChannel] = useState<Channel>("email");
	const [message, setMessage] = useState(
		"Hola {{name}}, tenemos una oferta especial para tu segmento {{segment}}.",
	);

	useEffect(() => {
		let cancelled = false;

		async function loadAudience() {
			if (!resolvedCompanyId) {
				setAudience([]);
				return;
			}

			setIsLoading(true);
			try {
				const { data } = await apiClient.get("/api/crm/remarketing/audience", {
					params: { company_id: resolvedCompanyId },
				});

				if (!cancelled) {
					setAudience(normalizeAudience(data));
				}
			} catch {
				if (!cancelled) {
					setAudience([]);
					toast({
						title: "No se pudo cargar la audiencia",
						description: "Verifica la conexión con el backend e inténtalo de nuevo.",
						variant: "destructive",
					});
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}

		loadAudience();

		return () => {
			cancelled = true;
		};
	}, [resolvedCompanyId, toast]);

	const segmentOptions = useMemo(() => {
		return [
			"Todos",
			...Array.from(new Set(audience.map((row) => row.segment))).sort((a, b) =>
				a.localeCompare(b, "es"),
			),
		];
	}, [audience]);

	const filtered = useMemo(() => {
		return audience.filter((row) => {
			const matchesSegment = segmentFilter === "Todos" ? true : row.segment === segmentFilter;
			const query = search.trim().toLowerCase();
			const matchesSearch =
				query.length === 0
					? true
					: row.name.toLowerCase().includes(query) ||
						row.email.toLowerCase().includes(query) ||
						row.category.toLowerCase().includes(query);

			return matchesSegment && matchesSearch;
		});
	}, [audience, segmentFilter, search]);

	const previewRow = filtered.length > 0 ? filtered[0] : null;

	const replaceVars = (text: string, row: AudienceRow | null): string => {
		if (!row) {
			return text;
		}

		return text.replace(/{{\s*([^}]+)\s*}}/g, (_, rawKey: string) => {
			const key = rawKey.trim();
			const value =
				row.variables[key] ??
				(key === "name"
					? row.name
					: key === "email"
						? row.email
						: key === "segment"
							? row.segment
							: key === "category"
								? row.category
								: key === "totalPurchased"
									? row.totalPurchased
									: undefined);

			if (value === undefined || value === null || value === "") {
				return `{{${key}}}`;
			}

			return String(value);
		});
	};

	const handleSendBatch = async () => {
		if (!resolvedCompanyId) {
			toast({
				title: "Company ID requerido",
				description: "No fue posible resolver la compañía actual para enviar la campaña.",
				variant: "destructive",
			});
			return;
		}

		if (filtered.length === 0) {
			toast({
				title: "Sin destinatarios",
				description: "No hay contactos filtrados para enviar la campaña.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsSending(true);
			await apiClient.post("/api/crm/remarketing/send-batch", {
				company_id: resolvedCompanyId,
				channel,
				template_text: message,
				customer_ids: filtered.map((row) => row.id),
			});

			toast({
				title: "Campaña en envío",
				description: `Se inició el envío para ${filtered.length} contactos por ${channel}.`,
			});

			setSearch("");
			setSegmentFilter("Todos");
		} catch {
			toast({
				title: "No se pudo iniciar el envío",
				description: "Valida el payload y la disponibilidad del endpoint send-batch.",
				variant: "destructive",
			});
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Buscar por nombre, email o categoría"
					className="lg:col-span-2"
				/>

				<Select value={segmentFilter} onValueChange={setSegmentFilter}>
					<SelectTrigger>
						<SelectValue placeholder="Segmento" />
					</SelectTrigger>
					<SelectContent>
						{segmentOptions.map((segment) => (
							<SelectItem key={segment} value={segment}>
								{segment}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
					<SelectTrigger>
						<SelectValue placeholder="Canal" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="email">Email</SelectItem>
						<SelectItem value="whatsapp">WhatsApp</SelectItem>
						<SelectItem value="sms">SMS</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Textarea
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					rows={4}
					placeholder="Escribe el template de campaña..."
				/>
				<p className="text-xs text-muted-foreground">
					Variables disponibles: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{segment}}"}</code>, etc.
				</p>
			</div>

			<div className="rounded-md border p-3">
				<p className="text-xs font-medium text-muted-foreground">Vista previa en tiempo real</p>
				<p className="mt-2 text-sm">{replaceVars(message, previewRow)}</p>
			</div>

			<div className="flex justify-end">
				<Button onClick={handleSendBatch} disabled={isSending || filtered.length === 0}>
					<Send className="mr-2 h-4 w-4" />
					{isSending ? "Enviando..." : `Enviar a ${filtered.length} contactos`}
				</Button>
			</div>

			<div className="erp-card overflow-hidden p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Segmento</TableHead>
							<TableHead>Nombre</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Categoría</TableHead>
							<TableHead className="text-right">Total Comprado</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, index) => (
								<TableRow key={`loading-${index}`}>
									<TableCell colSpan={5}>
										<Skeleton className="h-8 w-full" />
									</TableCell>
								</TableRow>
							))
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
									No hay audiencia para los filtros seleccionados.
								</TableCell>
							</TableRow>
						) : (
							filtered.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										<Badge variant="outline" className={segmentBadgeClass(row.segment)}>
											{row.segment}
										</Badge>
									</TableCell>
									<TableCell className="font-medium">{row.name || "-"}</TableCell>
									<TableCell className="text-muted-foreground">{row.email || "-"}</TableCell>
									<TableCell>{row.category || "-"}</TableCell>
									<TableCell className="text-right">{formatCopCurrency(row.totalPurchased)}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
