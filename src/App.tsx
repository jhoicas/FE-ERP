import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import InventoryPage from "@/pages/InventoryPage";
import BillingPage from "@/pages/BillingPage";
import CRMPage from "@/pages/CRMPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import CustomerProfile360Page from "@/pages/CustomerProfile360Page";
import TicketsPage from "@/pages/TicketsPage";
import TicketDetailPage from "@/pages/TicketDetailPage";
import InventoryProductsPage from "@/pages/InventoryProductsPage";
import WarehousesListPage from "@/pages/WarehousesListPage";
import WarehouseStockPage from "@/pages/WarehouseStockPage";
import InventoryMovementsPage from "@/pages/InventoryMovementsPage";
import StocktakePage from "@/pages/StocktakePage";
import SuppliersPage from "@/pages/SuppliersPage";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import TasksPage from "@/pages/TasksPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import TasksKanbanPage from "@/pages/TasksKanbanPage";
import CategoriesPage from "@/pages/CategoriesPage";
import CategoryBenefitsPage from "@/pages/CategoryBenefitsPage";
import MarketingAIPage from "@/pages/MarketingAIPage";
import AiCampaignGenerator from "@/features/crm/components/AiCampaignGenerator";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import UsersManagement from "@/features/auth/components/UsersManagement";
import NotFound from "./pages/NotFound";
import LoyaltyPage from "@/pages/LoyaltyPage";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import { InboxPage } from "@/features/email/components/InboxPage";
import { EmailSettings } from "@/features/email/components/EmailSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Inventario y facturación: solo admin */}
            <Route
              path="/inventario"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/products"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <InventoryProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/warehouses"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <WarehousesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/warehouses/:id/stock"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <WarehouseStockPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/movements"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <InventoryMovementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/stocktake"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StocktakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario/conteo"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StocktakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario/proveedores"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario/ordenes-compra"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PurchaseOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/facturacion"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <BillingPage />
                </ProtectedRoute>
              }
            />
            {/* CRM */}
            <Route
              path="/crm"
              element={
                <ProtectedRoute allowedRoles={["crm", "sales", "support", "marketing", "admin"]}>
                  <CRMPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/customers"
              element={
                <ProtectedRoute allowedRoles={["crm", "sales", "support", "marketing", "admin"]}>
                  <CRMPage />
                </ProtectedRoute>
              }
            />
            {/* Tickets: soporte y admin */}
            <Route
              path="/crm/tickets"
              element={
                <ProtectedRoute allowedRoles={["support", "admin"]}>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/tickets/:id"
              element={
                <ProtectedRoute allowedRoles={["support", "admin"]}>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Email / Inbox: soporte y admin */}
            <Route
              path="/crm/inbox"
              element={
                <ProtectedRoute allowedRoles={["support", "admin"]}>
                  <InboxPage />
                </ProtectedRoute>
              }
            />
            {/* Tareas: ventas y admin */}
            <Route
              path="/crm/tasks"
              element={
                <ProtectedRoute allowedRoles={["sales", "admin"]}>
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/tasks/:id"
              element={
                <ProtectedRoute allowedRoles={["sales", "admin"]}>
                  <TaskDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/tasks/kanban"
              element={
                <ProtectedRoute allowedRoles={["sales", "admin"]}>
                  <TasksKanbanPage />
                </ProtectedRoute>
              }
            />
            {/* Configuración de fidelización: solo admin */}
            <Route
              path="/crm/categories"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/categories/:id/benefits"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CategoryBenefitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/loyalty"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <LoyaltyPage />
                </ProtectedRoute>
              }
            />
            {/* Marketing / campañas IA */}
            <Route
              path="/crm/marketing/ai"
              element={
                <ProtectedRoute allowedRoles={["marketing", "admin"]}>
                  <MarketingAIPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/campaigns"
              element={
                <ProtectedRoute allowedRoles={["marketing", "admin"]}>
                  <AiCampaignGenerator />
                </ProtectedRoute>
              }
            />
            {/* Oportunidades */}
            <Route
              path="/crm/oportunidades"
              element={
                <ProtectedRoute allowedRoles={["sales", "admin"]}>
                  <OpportunitiesPage />
                </ProtectedRoute>
              }
            />
            {/* Perfil de clientes: ventas, soporte, marketing y admin */}
            <Route
              path="/crm/customers/:id"
              element={
                <ProtectedRoute allowedRoles={["crm", "sales", "support", "marketing", "admin"]}>
                  <CustomerProfile360Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm/:id"
              element={
                <ProtectedRoute allowedRoles={["crm", "sales", "support", "marketing", "admin"]}>
                  <ClientDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Ajustes solo admin */}
            <Route
              path="/ajustes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/email"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <EmailSettings />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
