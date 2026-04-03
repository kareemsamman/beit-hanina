import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

// Pages
import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import VerifyPage from "./pages/VerifyPage";
import NotFound from "./pages/NotFound";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { ResidentLayout } from "./layouts/ResidentLayout";
import { RouteGuard } from "./components/RouteGuard";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ResidentsPage from "./pages/admin/ResidentsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import CalendarPage from "./pages/admin/CalendarPage";
import RequestsPage from "./pages/admin/RequestsPage";
import SmsPage from "./pages/admin/SmsPage";
import SettingsPage from "./pages/admin/SettingsPage";

// Resident pages
import ResidentHome from "./pages/resident/ResidentHome";
import ResidentPayments from "./pages/resident/ResidentPayments";
import ResidentRequests from "./pages/resident/ResidentRequests";
import ResidentProfile from "./pages/resident/ResidentProfile";

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuth();
  useEffect(() => { initialize(); }, [initialize]);
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public */}
            <Route path="/" element={<SplashPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify" element={<VerifyPage />} />

            {/* Admin */}
            <Route path="/admin" element={<RouteGuard allowedRole="admin"><AdminLayout /></RouteGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="residents" element={<ResidentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="sms" element={<SmsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Resident */}
            <Route path="/resident" element={<RouteGuard allowedRole="resident"><ResidentLayout /></RouteGuard>}>
              <Route index element={<ResidentHome />} />
              <Route path="payments" element={<ResidentPayments />} />
              <Route path="requests" element={<ResidentRequests />} />
              <Route path="profile" element={<ResidentProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
