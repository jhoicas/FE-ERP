import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, Search } from "lucide-react";

import { getCustomers } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: getCustomers,
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(search) ||
        (c.tax_id ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o NIT…"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "CRM / Clientes")}</p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Contacto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">NIT / Tax ID</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.category_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span>{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                    {c.tax_id ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`/crm/${c.id}`)}
                    >
                      Ver detalle
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center text-sm text-muted-foreground">
                    No se encontraron clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

