import { useMemo, useState } from "react";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type Segment = "VIP" | "PREMIUM" | "RECURRENTE" | "OCASIONAL";
type SegmentFilter = "Todos" | Segment;

type Prospect = {
  id: string;
  segmento: Segment;
  nombre: string;
  email: string;
  totalComprado: number;
  categoria: string;
  mensajeSugerido: string;
};

const prospects: Prospect[] = [
  {
    id: "1",
    segmento: "VIP",
    nombre: "LONDONO HECTOR",
    email: "hexalope@gmail.com",
    totalComprado: 9325241,
    categoria: "Suplementos / Otros",
    mensajeSugerido: "Acceso exclusivo: nuevos productos de Suplementos / Otros. ¡Gracias por tu fidelidad!",
  },
  {
    id: "2",
    segmento: "PREMIUM",
    nombre: "OCHOA MARIA",
    email: "maria@example.com",
    totalComprado: 1500000,
    categoria: "Vitaminas",
    mensajeSugerido: "¡Aprovecha tus beneficios Premium! Descubre lo nuevo en Vitaminas.",
  },
  {
    id: "3",
    segmento: "RECURRENTE",
    nombre: "GOMEZ JUAN",
    email: "juan@example.com",
    totalComprado: 500000,
    categoria: "Minerales",
    mensajeSugerido: "Es hora de reabastecer tus Minerales favoritos con este descuento.",
  },
  {
    id: "4",
    segmento: "OCASIONAL",
    nombre: "DANIA LOZADA",
    email: "LOSADADANIA@HOTMAIL.ES",
    totalComprado: 95700,
    categoria: "Suplementos / Otros",
    mensajeSugerido: "¡Te extrañamos! Vuelve y descubre novedades en Suplementos / Otros.",
  },
  {
    id: "5",
    segmento: "VIP",
    nombre: "VALLEJO LONDONO JUAN CARLOS",
    email: "JUANCARLOSVALLEJO1958@GMAIL.COM",
    totalComprado: 6900637,
    categoria: "Suplementos / Otros",
    mensajeSugerido: "Acceso exclusivo: nuevos productos de Suplementos / Otros. ¡Gracias por tu fidelidad!",
  },
];

function segmentBadgeClass(segmento: Segment): string {
  switch (segmento) {
    case "VIP":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "PREMIUM":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case "RECURRENTE":
      return "border-blue-300 bg-blue-100 text-blue-800";
    case "OCASIONAL":
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function formatCopCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CRMRemarketingTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<SegmentFilter>("Todos");

  const filteredProspects = useMemo(() => {
    if (filter === "Todos") {
      return prospects;
    }

    return prospects.filter((prospect) => prospect.segmento === filter);
  }, [filter]);

  const handleSendEmail = (email: string) => {
    toast({
      title: "Email enviado",
      description: `Mensaje enviado a ${email}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Campañas de Remarketing</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona e impulsa recompras enviando mensajes sugeridos por segmento.
          </p>
        </div>

        <div className="w-full md:w-[240px]">
          <Select value={filter} onValueChange={(value) => setFilter(value as SegmentFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="PREMIUM">PREMIUM</SelectItem>
              <SelectItem value="RECURRENTE">RECURRENTE</SelectItem>
              <SelectItem value="OCASIONAL">OCASIONAL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="erp-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segmento</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Total Comprado</TableHead>
              <TableHead>Categoría Principal</TableHead>
              <TableHead>Mensaje Sugerido</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProspects.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell>
                  <Badge variant="outline" className={segmentBadgeClass(prospect.segmento)}>
                    {prospect.segmento}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{prospect.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{prospect.email}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCopCurrency(prospect.totalComprado)}
                </TableCell>
                <TableCell>{prospect.categoria}</TableCell>
                <TableCell>
                  <p className="max-w-[360px] text-xs text-muted-foreground">{prospect.mensajeSugerido}</p>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => handleSendEmail(prospect.email)}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Email
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
