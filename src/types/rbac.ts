// Tipos para RBAC Screens y roles
// Rol especial global: 'superadmin' (o 'super_admin' para compatibilidad)
export interface ScreenResponse {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  frontend_route: string;
  icon?: string;
  module_key?: string; // Nuevo campo opcional para clasificación por módulo
  module_name?: string; // Nuevo campo opcional para clasificación por módulo
}