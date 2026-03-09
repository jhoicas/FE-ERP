import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { getCustomers } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";

export default function LoyaltyProfiles() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: getCustomers,
  });

  const customers = (data ?? [])
    .filter((c) => typeof c.ltv === "number")
    .sort((a, b) => (b.ltv ?? 0) - (a.ltv ?? 0))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Fidelización y perfiles</h2>
            <p className="text-xs text-muted-foreground">
              Analiza el valor de vida del cliente (
              <ExplainableAcronym sigla="LTV" />
              ) y su categoría de fidelización.
            </p>
          </div>
        </div>
        <Link
          to="/crm/categories"
          className="text-xs text-primary hover:underline shrink-0"
        >
          Ver categorías
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Fidelización CRM")}</p>
      )}

      {!isLoading && !isError && (
        <div className="erp-card p-0 overflow-hidden">
          {customers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Categoría</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">
                    <ExplainableAcronym sigla="LTV" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[11px]">
                        {c.category_name}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      ${Number(c.ltv ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Aún no hay información de <ExplainableAcronym sigla="LTV" /> disponible para los clientes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

