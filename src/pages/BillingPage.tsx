import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoicesTable from "@/features/billing/components/InvoicesTable";
import CreditNotesList from "@/features/billing/components/CreditNotesList";
import DebitNotesList from "@/features/billing/components/DebitNotesList";
import DianTransmission from "@/features/billing/components/DianTransmission";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

export default function BillingPage() {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Facturación Electrónica</h1>
        <p className="text-sm text-muted-foreground">
          Administra las ventas, notas de crédito, notas débito y el estado de la transmisión a la{" "}
          <ExplainableAcronym sigla="DIAN" />.
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Historial de Facturas</TabsTrigger>
          <TabsTrigger value="credit_notes">Notas Crédito</TabsTrigger>
          <TabsTrigger value="debit_notes">Notas Débito</TabsTrigger>
          <TabsTrigger value="dian_status">Transmisión DIAN</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="credit_notes">
          <CreditNotesList />
        </TabsContent>

        <TabsContent value="debit_notes">
          <DebitNotesList />
        </TabsContent>

        <TabsContent value="dian_status">
          <DianTransmission />
        </TabsContent>
      </Tabs>
    </div>
  );
}
