import { Settings, Bell, Globe, Shield, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">Ajustes</h2>
        <p className="text-sm text-muted-foreground">Configura las preferencias de tu cuenta y empresa.</p>
      </div>

      {/* Company Info */}
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
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">NIT</label>
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

      {/* Notifications */}
      <section className="erp-card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Notificaciones</h3>
        </div>
        <SettingRow label="Alertas de inventario bajo" description="Recibir notificaciones cuando el stock sea crítico" defaultChecked />
        <Separator />
        <SettingRow label="Resumen diario por email" description="Recibir un resumen de ventas y actividad cada mañana" defaultChecked />
        <Separator />
        <SettingRow label="Nuevos tickets PQR" description="Notificar cuando se abra un nuevo caso de soporte" defaultChecked={false} />
      </section>

      {/* Preferences */}
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
    </div>
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
