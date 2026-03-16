import { type ChangeEvent, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Bell, Palette, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ExplainableAcronym from "@/components/shared/ExplainableAcronym";
import ResolutionsManager from "@/features/auth/components/ResolutionsManager";
import { type DianEnvironment, useDianEnvironment } from "@/hooks/use-dian-environment";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

const DIAN_SETTINGS_ENDPOINTS = ["/api/settings/dian", "/api/dian/settings", "/api/dian/configuration"] as const;

interface DianConfigurationDTO {
  environment?: string;
  has_certificate?: boolean;
  certificate_name?: string | null;
  certificate_filename?: string | null;
  updated_at?: string;
}

async function getDianConfiguration(environment: DianEnvironment): Promise<DianConfigurationDTO | null> {
  try {
    const response = await apiClient.get("/api/settings/dian", {
      params: { environment },
    });

    if (!response.data || typeof response.data !== "object") {
      return null;
    }

    return response.data as DianConfigurationDTO;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

function resolveCertificateLabel(config: DianConfigurationDTO | null | undefined): string {
  if (!config) {
    return "";
  }

  if (config.certificate_name && config.certificate_name.trim()) {
    return config.certificate_name;
  }

  if (config.certificate_filename && config.certificate_filename.trim()) {
    return config.certificate_filename;
  }

  if (config.has_certificate) {
    return "Certificado configurado";
  }

  return "";
}

function formatUpdatedAt(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function saveDianConfiguration(payload: FormData): Promise<void> {
  let lastError: unknown;

  for (const endpoint of DIAN_SETTINGS_ENDPOINTS) {
    try {
      // Do NOT set Content-Type manually — axios must auto-generate it
      // with the correct multipart boundary, otherwise the server cannot
      // parse the fields (equivalent to curl -F).
      await apiClient.put(endpoint, payload);
      return;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("No se encontró endpoint para guardar la configuración DIAN.");
}

export default function SettingsPage() {
  const { environment, setEnvironment } = useDianEnvironment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmProductionOpen, setConfirmProductionOpen] = useState(false);
  const [pendingEnvironment, setPendingEnvironment] = useState<DianEnvironment | null>(null);

  const [testingCertificateFile, setTestingCertificateFile] = useState<File | null>(null);
  const [testingCertificateName, setTestingCertificateName] = useState("");
  const [productionCertificateFile, setProductionCertificateFile] = useState<File | null>(null);
  const [productionCertificateName, setProductionCertificateName] = useState("");
  const [testingCertificatePassword, setTestingCertificatePassword] = useState("");
  const [productionCertificatePassword, setProductionCertificatePassword] = useState("");

  const testingConfigQuery = useQuery({
    queryKey: ["settings", "dian", "testing"],
    queryFn: () => getDianConfiguration("testing"),
    retry: false,
  });

  const productionConfigQuery = useQuery({
    queryKey: ["settings", "dian", "production"],
    queryFn: () => getDianConfiguration("production"),
    retry: false,
  });

  const testingConfiguredCertificateName = useMemo(
    () => resolveCertificateLabel(testingConfigQuery.data),
    [testingConfigQuery.data],
  );

  const productionConfiguredCertificateName = useMemo(
    () => resolveCertificateLabel(productionConfigQuery.data),
    [productionConfigQuery.data],
  );

  const testingUpdatedAt = useMemo(
    () => formatUpdatedAt(testingConfigQuery.data?.updated_at),
    [testingConfigQuery.data?.updated_at],
  );

  const productionUpdatedAt = useMemo(
    () => formatUpdatedAt(productionConfigQuery.data?.updated_at),
    [productionConfigQuery.data?.updated_at],
  );

  const handleEnvironmentChange = (value: string) => {
    const nextEnvironment: DianEnvironment = value === "production" ? "production" : "testing";

    if (nextEnvironment === "production" && environment !== "production") {
      setPendingEnvironment(nextEnvironment);
      setConfirmProductionOpen(true);
      return;
    }

    setEnvironment(nextEnvironment);
  };

  const handleTestingCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setTestingCertificateFile(file ?? null);
    setTestingCertificateName(file?.name ?? "");
  };

  const handleProductionCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setProductionCertificateFile(file ?? null);
    setProductionCertificateName(file?.name ?? "");
  };

  const saveDianMutation = useMutation({
    mutationFn: saveDianConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "dian"] });
      toast({
        title: "Configuración DIAN guardada",
        description: "Los cambios se guardaron correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo guardar la configuración DIAN",
        description: getApiErrorMessage(error, "DIAN"),
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    const selectedCertificateFile = environment === "production" ? productionCertificateFile : testingCertificateFile;
    const selectedPassword = environment === "production" ? productionCertificatePassword : testingCertificatePassword;

    if (!selectedCertificateFile) {
      toast({
        title: "Falta el certificado",
        description: "Selecciona el archivo .p12 del ambiente activo antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPassword.trim()) {
      toast({
        title: "Falta la contraseña",
        description: "Ingresa la contraseña del certificado antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    const payload = new FormData();
    payload.append("environment", environment);
    // Equivalent to curl -F 'certificate=@file;type=application/x-pkcs12'
    // Wrapping in a Blob forces the correct MIME type so the server parses
    // the part as a .p12 file, not as application/octet-stream.
    payload.append(
      "certificate",
      new Blob([selectedCertificateFile], { type: "application/x-pkcs12" }),
      selectedCertificateFile.name,
    );
    payload.append("certificate_password", selectedPassword);

    saveDianMutation.mutate(payload);
  };

  return (
    <>
      <div className="animate-fade-in max-w-5xl space-y-6">
        <div>
          <h2 className="text-lg font-bold">Ajustes</h2>
          <p className="text-sm text-muted-foreground">Configura las preferencias de tu cuenta y empresa.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="dian_resolutions">Resoluciones DIAN</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 max-w-4xl">
            <section className="erp-card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Información de la Empresa</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
                  <Input defaultValue="NaturERP S.A.S" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    <ExplainableAcronym sigla="NIT" />
                  </label>
                  <Input defaultValue="900.123.456-7" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <Input defaultValue="admin@naturerp.co" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Teléfono</label>
                  <Input defaultValue="+57 601 234 5678" className="h-9 text-sm" />
                </div>
              </div>
            </section>

            <section className="erp-card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Configuración DIAN</h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ambiente</label>
                <Select value={environment} onValueChange={handleEnvironmentChange}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">Habilitación (pruebas)</SelectItem>
                    <SelectItem value="production">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Habilitación (pruebas)</p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Certificado (.p12)</label>
                    <Input type="file" accept=".p12" onChange={handleTestingCertificateChange} />
                    {testingCertificateName && (
                      <p className="text-xs text-muted-foreground">Archivo: {testingCertificateName}</p>
                    )}
                    {!testingCertificateName && testingConfiguredCertificateName && (
                      <p className="text-xs text-muted-foreground">Configurado: {testingConfiguredCertificateName}</p>
                    )}
                    {testingUpdatedAt && (
                      <p className="text-xs text-muted-foreground">Última actualización: {testingUpdatedAt}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña del certificado</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={testingCertificatePassword}
                      onChange={(event) => setTestingCertificatePassword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Producción</p>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Certificado (.p12)</label>
                    <Input type="file" accept=".p12" onChange={handleProductionCertificateChange} />
                    {productionCertificateName && (
                      <p className="text-xs text-muted-foreground">Archivo: {productionCertificateName}</p>
                    )}
                    {!productionCertificateName && productionConfiguredCertificateName && (
                      <p className="text-xs text-muted-foreground">Configurado: {productionConfiguredCertificateName}</p>
                    )}
                    {productionUpdatedAt && (
                      <p className="text-xs text-muted-foreground">Última actualización: {productionUpdatedAt}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña del certificado</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={productionCertificatePassword}
                      onChange={(event) => setProductionCertificatePassword(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="erp-card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Notificaciones</h3>
              </div>
              <SettingRow label="Alertas de inventario bajo" description="Recibir notificaciones cuando el stock sea crítico" defaultChecked />
              <Separator />
              <SettingRow label="Resumen diario por email" description="Recibir un resumen de ventas y actividad cada mañana" defaultChecked />
              <Separator />
              <SettingRow
                label={`Nuevos tickets PQR`}
                description="Notificar cuando se abra un nuevo caso de soporte"
                defaultChecked={false}
              />
            </section>

            <section className="erp-card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Preferencias</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Idioma</label>
                  <Input defaultValue="Español (CO)" className="h-9 text-sm" readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Zona horaria</label>
                  <Input defaultValue="America/Bogota (UTC-5)" className="h-9 text-sm" readOnly />
                </div>
              </div>
            </section>

            <Button onClick={handleSaveChanges} disabled={saveDianMutation.isPending}>
              {saveDianMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </TabsContent>

          <TabsContent value="dian_resolutions">
            <ResolutionsManager />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={confirmProductionOpen} onOpenChange={setConfirmProductionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas cambiar a ambiente de producción?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas cambiar a ambiente de producción? Las facturas se enviarán a la DIAN real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingEnvironment(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingEnvironment === "production") {
                  setEnvironment("production");
                }
                setPendingEnvironment(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SettingRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
