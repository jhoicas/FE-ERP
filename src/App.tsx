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
import TasksPage from "@/pages/TasksPage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import TasksKanbanPage from "@/pages/TasksKanbanPage";
import CategoriesPage from "@/pages/CategoriesPage";
import CategoryBenefitsPage from "@/pages/CategoryBenefitsPage";
import MarketingAIPage from "@/pages/MarketingAIPage";
import AiCampaignGenerator from "@/features/crm/components/AiCampaignGenerator";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import LoyaltyPage from "@/pages/LoyaltyPage";

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
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/inventory/products" element={<InventoryProductsPage />} />
            <Route path="/inventory/warehouses" element={<WarehousesListPage />} />
            <Route path="/inventory/warehouses/:id/stock" element={<WarehouseStockPage />} />
            <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
            <Route path="/facturacion" element={<BillingPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/crm/tickets" element={<TicketsPage />} />
            <Route path="/crm/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/crm/tasks" element={<TasksPage />} />
            <Route path="/crm/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/crm/tasks/kanban" element={<TasksKanbanPage />} />
            <Route path="/crm/categories" element={<CategoriesPage />} />
            <Route path="/crm/categories/:id/benefits" element={<CategoryBenefitsPage />} />
            <Route path="/crm/loyalty" element={<LoyaltyPage />} />
            <Route path="/crm/marketing/ai" element={<MarketingAIPage />} />
            <Route path="/crm/campaigns" element={<AiCampaignGenerator />} />
            <Route path="/crm/customers/:id" element={<CustomerProfile360Page />} />
            <Route path="/crm/:id" element={<ClientDetailPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
