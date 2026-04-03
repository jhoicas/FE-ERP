import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// Servicios y tipos
import { useCompanies, createCompany } from "./companies.service";
import CompanyDetailsSheet from "./CompanyDetailsSheet";

export default function CompaniesListPage() {
  const { toast } = useToast();
  const { companies, refresh } = useCompanies();
  const [openNew, setOpenNew] = useState(false);
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nit: "", email: "" });
  const [loading, setLoading] = useState(false);

  const handleNew = async () => {
    setLoading(true);
    try {
      await createCompany(form);
      setOpenNew(false);
      setForm({ name: "", nit: "", email: "" });
      refresh();
      toast({ title: "Empresa creada" });
    } catch (e) {
      toast({ title: "Error al crear empresa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Empresas</h1>
        <Button onClick={() => setOpenNew(true)}>Nueva Empresa</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>NIT</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenSheet(c.id)}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.nit}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="NIT" value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Button onClick={handleNew} disabled={loading} className={loading ? "w-full opacity-50" : "w-full"}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <CompanyDetailsSheet
        open={!!openSheet}
        companyId={openSheet}
        onOpenChange={() => setOpenSheet(null)}
        onUpdated={refresh}
      />
    </div>
  );
}
