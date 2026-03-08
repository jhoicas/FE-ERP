import { useState } from "react";
import { invoiceClients, invoiceProducts } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getInvoices } from "@/features/billing/services";

interface InvoiceItem {
  product: string;
  qty: number;
  price: number;
}

function DianStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const variant =
    normalized === "EXITOSO" ? "default" : normalized === "RECHAZADO" ? "destructive" : "secondary";
  const label = normalized === "EXITOSO" ? "EXITOSO" : normalized === "RECHAZADO" ? "RECHAZADO" : "DRAFT";
  return <Badge variant={variant} className="text-[10px] mt-1">{label}</Badge>;
}

export default function BillingPage() {
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { product: "Aceite Esencial de Lavanda 30ml", qty: 10, price: 15000 },
  ]);

  const invoicesQuery = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: getInvoices,
  });

  const addItem = () => setItems([...items, { product: "", qty: 1, price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
      {/* Invoice List */}
      <div className="lg:col-span-2 erp-card p-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-sm font-semibold">Facturas Recientes</h2>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />Nueva
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {invoicesQuery.isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Cargando facturas...</div>
          )}
          {invoicesQuery.isError && !invoicesQuery.isLoading && (
            <div className="p-4 text-sm text-destructive">
              {getApiErrorMessage(invoicesQuery.error, "Facturación")}
            </div>
          )}
          {!invoicesQuery.isLoading && !invoicesQuery.isError && invoicesQuery.data && (
            <>
              {invoicesQuery.data.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No hay facturas aún.</div>
              )}
              {invoicesQuery.data.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.number} · {inv.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${inv.grand_total.toLocaleString()}</p>
                    <DianStatusBadge status={inv.dian_status} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Create Invoice Form */}
      <div className="lg:col-span-3 erp-card flex flex-col">
        {!showForm ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <FileText className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">Selecciona una factura o crea una nueva</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">Crear Factura</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cliente</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {invoiceClients.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Items</label>
                  <Button variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs h-7">
                    <Plus className="h-3 w-3" />Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                      <Select
                        value={item.product}
                        onValueChange={(v) => {
                          const found = invoiceProducts.find((p) => p.name === v);
                          const updated = [...items];
                          updated[i] = { ...updated[i], product: v, price: found?.price ?? 0 };
                          setItems(updated);
                        }}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>
                          {invoiceProducts.map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[i] = { ...updated[i], qty: +e.target.value };
                          setItems(updated);
                        }}
                        className="text-xs"
                      />
                      <span className="text-xs font-mono text-right">
                        ${(item.qty * item.price).toLocaleString()}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 mt-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="font-mono">${iva.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t">
                <span>Total</span>
                <span className="font-mono">${total.toLocaleString()}</span>
              </div>
              <Button className="w-full mt-3">Guardar Factura</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
