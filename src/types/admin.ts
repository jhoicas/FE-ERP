export interface Tenant {
  id: string;
  name: string;
  nit: string;
  status: "Activo" | "Suspendido" | "Prueba";
  plan: string;
  modules: Record<string, boolean>;
}

export interface Module {
  id: string;
  key: string;
  name: string;
}

export interface Screen {
  id: string;
  module_id: string;
  key: string;
  name: string;
  frontend_route: string;
  api_endpoint: string;
  order: number;
  is_active: boolean;
}
