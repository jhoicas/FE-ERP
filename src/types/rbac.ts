// Tipos para RBAC Screens
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