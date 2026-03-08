import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, ArrowRight, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/errors";
import { getCustomers, getTickets } from "@/features/crm/services";

export default function CRMPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const customersQuery = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: getCustomers,
  });

  const ticketsQuery = useQuery({
    queryKey: ["crm", "tickets"],
    queryFn: getTickets,
  });

  const filtered = useMemo(() => {
    const data = customersQuery.data ?? [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(search)
    );
  }, [customersQuery.data, search]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes…"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {customersQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando clientes...</p>
      )}
      {customersQuery.isError && !customersQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(customersQuery.error, "CRM")}
        </p>
      )}

      {!customersQuery.isLoading && !customersQuery.isError && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div
            className={
              ticketsQuery.data?.length
                ? "lg:col-span-3 space-y-4"
                : "lg:col-span-5 space-y-4"
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/crm/${c.id}`)}
                  className="erp-card cursor-pointer group hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <Badge variant="secondary">{c.category_name}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</div>
                  </div>
                  <div className="flex items-center justify-end mt-4 pt-3 border-t">
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay clientes que coincidan con la búsqueda.</p>
            )}
          </div>

          {!ticketsQuery.isLoading && !ticketsQuery.isError && ticketsQuery.data && ticketsQuery.data.length > 0 && (
            <div className="lg:col-span-2 erp-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Tickets recientes
              </h3>
              <ul className="space-y-2">
                {ticketsQuery.data.slice(0, 5).map((t) => (
                  <li key={t.id} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <p className="font-medium truncate">{t.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{t.sentiment}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
