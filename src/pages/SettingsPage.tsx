import { type ChangeEvent, useState } from "react";
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

export default function SettingsPage() {
  const { environment, setEnvironment } = useDianEnvironment();
  const [confirmProductionOpen, setConfirmProductionOpen] = useState(false);
  const [pendingEnvironment, setPendingEnvironment] = useState<DianEnvironment | null>(null);

  const [testingCertificateName, setTestingCertificateName] = useState("");
  const [productionCertificateName, setProductionCertificateName] = useState("");
  const [testingCertificatePassword, setTestingCertificatePassword] = useState("");
  const [productionCertificatePassword, setProductionCertificatePassword] = useState("");

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
    setTestingCertificateName(file?.name ?? "");
  };

  const handleProductionCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setProductionCertificateName(file?.name ?? "");
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

            <Button>Guardar Cambios</Button>
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
