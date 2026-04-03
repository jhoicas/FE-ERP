
import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

// Interfaz para las pantallas de la empresa
export interface CompanyScreen {
  id: string;
  name?: string;
  label?: string;
  title?: string;
  frontend_route?: string;
  module_id?: string;
  module_name?: string;
  module_key?: string;
  is_active?: boolean;
}

interface Props {
  open: boolean;
  companyId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function CompanyDetailsSheet({ open, companyId, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState("data");
  const [company, setCompany] = useState<any>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [screens, setScreens] = useState<CompanyScreen[]>([]);
  const [activeScreens, setActiveScreens] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      axios.get(`/api/admin/companies/${companyId}`).then(r => setCompany(r.data));
      axios.get(`/api/admin/companies/${companyId}/screens`).then(r => {
        setScreens(r.data.screens || []);
        setActiveScreens((r.data.active_screens || []).map((s: any) => s.id || s.screen_id));
      });
    }
  }, [open, companyId]);

  const handleResetAdmin = async () => {
    setLoadingAdmin(true);
    try {
      await axios.post(`/api/admin/companies/${companyId}/reset-admin`, { email: adminEmail });
      toast({ title: "Contraseña de admin creada/resetada" });
    } catch {
      toast({ title: "Error al crear/resetear admin", variant: "destructive" });
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handlePermsSave = async () => {
    setSavingPerms(true);
    try {
      await axios.post(`/api/admin/companies/${companyId}/screens`, { screen_ids: activeScreens });
      toast({ title: "Permisos actualizados" });
      onUpdated();
    } catch {
      toast({ title: "Error al guardar permisos", variant: "destructive" });
    } finally {
      setSavingPerms(false);
    }
  };

  // Agrupar pantallas por módulo
  const grouped = screens.reduce((acc: Record<string, CompanyScreen[]>, s) => {
    const mod = s.module_name || s.module_key || "Otros";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(s);
    return acc;
  }, {} as Record<string, CompanyScreen[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="data">Datos & Admin</TabsTrigger>
            <TabsTrigger value="perms">Módulos y Permisos</TabsTrigger>
          </TabsList>
          <TabsContent value="data">
            {company && (
              <div className="space-y-4">
                <div>
                  <div className="font-semibold">Nombre</div>
                  <div>{company.name}</div>
                </div>
                <div>
                  <div className="font-semibold">NIT</div>
                  <div>{company.nit}</div>
                </div>
                <div>
                  <div className="font-semibold">Email</div>
                  <div>{company.email}</div>
                </div>
                <div className="mt-4">
                  <div className="font-semibold mb-1">Crear/Resetear Admin</div>
                  <Input placeholder="Email del admin" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                  <Button onClick={handleResetAdmin} disabled={loadingAdmin || !adminEmail} className={loadingAdmin ? "mt-2 opacity-50" : "mt-2"}>Crear/Resetear</Button>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="perms">
            <div className="space-y-4">
              {Object.entries(grouped).map(([mod, screens]) => (
                <div key={mod}>
                  <div className="font-semibold mb-2">{mod}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {screens.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Switch
                          checked={activeScreens.includes(s.id)}
                          onCheckedChange={checked => {
                            setActiveScreens(prev => checked
                              ? [...prev, s.id]
                              : prev.filter(id => id !== s.id)
                            );
                          }}
                        />
                        <span>{s.label || s.name || s.title || s.frontend_route}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={handlePermsSave} disabled={savingPerms} className={savingPerms ? "opacity-50" : undefined}>Guardar Permisos</Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
