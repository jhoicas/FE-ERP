import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Gift, FileText } from "lucide-react";

import { listCategories, listBenefitsByCategory } from "@/features/crm/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CategoryResponse, BenefitResponse } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
const PAGE_SIZE = 50;

export default function CategoryBenefitsPage() {
  const { id: categoryId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const categoriesQuery = useQuery({
    queryKey: ["crm-categories", 200, 0],
    queryFn: () => listCategories({ limit: 200, offset: 0 }),
    enabled: !!categoryId,
  });

  const benefitsQuery = useQuery({
    queryKey: ["crm-benefits", categoryId, PAGE_SIZE, 0],
    queryFn: () =>
      listBenefitsByCategory(categoryId!, {
        limit: PAGE_SIZE,
        offset: 0,
      }),
    enabled: !!categoryId,
  });

  const category = categoriesQuery.data?.find(
    (c: CategoryResponse) => c.id === categoryId
  );
  const benefits = benefitsQuery.data ?? [];

  if (!categoryId) {
    return (
      <div className="animate-fade-in space-y-6 max-w-4xl">
        <button
          onClick={() => navigate("/crm/categories")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a categorías
        </button>
        <p className="text-sm text-destructive">ID de categoría no válido.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/crm" className="hover:text-foreground">
          CRM
        </Link>
        <span>/</span>
        <Link to="/crm/categories" className="hover:text-foreground">
          Categorías
        </Link>
        <span>/</span>
        {category ? (
          <>
            <span className="text-foreground font-medium">{category.name}</span>
            <span>/</span>
          </>
        ) : null}
        <span className="text-foreground">Beneficios</span>
      </nav>

      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Beneficios
            {category ? ` · ${category.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Listado de beneficios asociados a esta categoría (solo lectura).
          </p>
        </div>
      </div>

      {categoriesQuery.isLoading && !category && (
        <Skeleton className="h-8 w-48" />
      )}

      {benefitsQuery.isLoading && (
        <div className="erp-card p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {benefitsQuery.isError && !benefitsQuery.isLoading && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(benefitsQuery.error, "Beneficios")}
        </p>
      )}

      {!benefitsQuery.isLoading && !benefitsQuery.isError && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {benefits.length === 0
                ? "Sin beneficios"
                : `${benefits.length} beneficio${benefits.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {benefits.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No hay beneficios definidos para esta categoría.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs text-muted-foreground">
                        Nombre
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground">
                        Descripción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benefits.map((b: BenefitResponse) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/crm/categories")}
        className="mt-2"
      >
        Volver a categorías
      </Button>
    </div>
  );
}
