import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Send, Upload, Sparkles } from "lucide-react";
import { importCrmExcel, sendBulkCampaign } from "@/features/crm/services";
import apiClient from "@/lib/api/client";

type Segment = "VIP" | "Premium" | "Recurrente" | "Ocasional";
type Category = "Aceites" | "Cremas" | "Infusiones" | "Jabones" | "Capilar";

interface RemarketingClient {
  id: string;
  name: string;
  email: string;
  segment: Segment;
  lastPurchase: string;
  ltv: string;
  category: Category;
  aiMessage: string;
}

const segmentClasses: Record<Segment, string> = {
  VIP: "badge-gold",
  Premium: "bg-primary/15 text-primary border-primary/30",
  Recurrente: "bg-info/15 text-info border-info/30",
  Ocasional: "bg-muted text-muted-foreground border-border",
};

const segments: Segment[] = ["VIP", "Premium", "Recurrente", "Ocasional"];
const categories: Category[] = ["Aceites", "Cremas", "Infusiones", "Jabones", "Capilar"];

export default function CRMRemarketingTab() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [clients, setClients] = useState<RemarketingClient[]>([]);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const loadRemarketingTargets = async () => {
    setLoadingData(true);
    try {
      const { data } = await apiClient.get<RemarketingClient[]>("/api/crm/remarketing-targets");
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setClients([]);
      toast({
        title: "Error",
        description: "No fue posible cargar los targets de remarketing.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadRemarketingTargets();
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      return true;
    });
  }, [clients, segmentFilter, categoryFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({
      title: "Importando...",
      description: "Se está procesando el archivo Excel.",
    });

    try {
      await importCrmExcel(file);
      toast({
        title: "Importación completada",
        description: "Los datos fueron importados exitosamente.",
      });
      await loadRemarketingTargets();
    } catch {
      toast({
        title: "Error en importación",
        description: "No se pudo importar el archivo Excel.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleSendBulkCampaign = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setLoadingCampaign(true);
    try {
      await sendBulkCampaign(ids);
      toast({
        title: "Campaña enviada",
        description: `Se envió la campaña a ${ids.length} cliente(s).`,
      });
    } catch {
      toast({
        title: "Error",
        description: "No fue posible enviar la campaña masiva.",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaign(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Filtrar por Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Segmentos</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Filtrar por Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 sm:ml-auto">
          <label>
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Importar Excel
              </span>
            </Button>
          </label>

          <Button
            size="sm"
            className="gap-2"
            disabled={selected.size === 0 || loadingCampaign}
            onClick={handleSendBulkCampaign}
          >
            <Send className="h-4 w-4" />
            {loadingCampaign
              ? "Enviando..."
              : selected.size > 0
                ? `Enviar Campaña (${selected.size})`
                : "Enviar Campaña Masiva"}
          </Button>
        </div>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Segmento</TableHead>
                <TableHead className="text-xs">Última Compra</TableHead>
                <TableHead className="text-xs text-right">LTV</TableHead>
                <TableHead className="text-xs">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Mensaje IA
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  data-state={selected.has(c.id) ? "selected" : undefined}
                  className="group"
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${segmentClasses[c.segment]}`}>
                      {c.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.lastPurchase}</TableCell>
                  <TableCell className="text-sm font-semibold text-right">{c.ltv}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.aiMessage}</p>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingData && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No se encontraron clientes con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
              {loadingData && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Cargando targets de remarketing...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
