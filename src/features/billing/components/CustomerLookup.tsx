import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { lookupCustomer } from "@/features/billing/services";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ID_TYPE_OPTIONS = [
  { value: "13", label: "Cédula de ciudadanía" },
  { value: "31", label: "NIT" },
  { value: "41", label: "Pasaporte" },
] as const;

function formatFieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CustomerLookup() {
  const [idType, setIdType] = useState<string>(ID_TYPE_OPTIONS[0].value);
  const [idNumber, setIdNumber] = useState("");
  const [searchParams, setSearchParams] = useState<{ idType: string; idNumber: string } | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["billing", "customer-lookup", searchParams?.idType, searchParams?.idNumber],
    queryFn: () => lookupCustomer(searchParams!.idType, searchParams!.idNumber),
    enabled: Boolean(searchParams),
    retry: false,
  });

  const handleSearch = () => {
    const trimmedIdNumber = idNumber.trim();
    if (!trimmedIdNumber) {
      return;
    }

    setSearchParams({
      idType,
      idNumber: trimmedIdNumber,
    });
  };

  const entries = data
    ? Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "")
    : [];

  return (
    <div className="space-y-4">
      <div className="erp-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tipo documento</p>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {ID_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Número documento</p>
            <Input
              placeholder="Ingrese número"
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          <Button onClick={handleSearch} disabled={isFetching || !idNumber.trim()}>
            Buscar
          </Button>
        </div>
      </div>

      {isFetching && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      )}

      {isError && !isFetching && (
        <p className="text-sm text-destructive">{getApiErrorMessage(error, "Facturación / Lookup cliente")}</p>
      )}

      {!isFetching && !isError && searchParams && data === null && (
        <p className="text-sm text-muted-foreground">No se encontró información para el documento consultado.</p>
      )}

      {!isFetching && !isError && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{formatFieldLabel(key)}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Badge variant="secondary" className="text-xs">
                  {String(value)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
