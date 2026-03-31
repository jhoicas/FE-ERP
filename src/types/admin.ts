export interface Tenant {
  id: string;
  name: string;
  nit: string;
  status: "Activo" | "Suspendido" | "Prueba";
  plan: string;
  modules: Record<string, boolean>;
}
