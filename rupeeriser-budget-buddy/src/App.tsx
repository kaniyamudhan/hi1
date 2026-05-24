import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { PlannerProvider } from "@/contexts/PlannerContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { Code2 } from "lucide-react";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import CalendarPage from "./pages/CalendarPage";
import MonthlyPlanner from "./pages/MonthlyPlanner";
import Settings from "./pages/Settings";
import FinancialSetup from "./pages/FinancialSetup";
import Profile from "./pages/Profile";
import Habits from "./pages/Habits";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ✅ Loading Screen
const LoadingScreen = () => {
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-background relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="z-10 flex flex-col items-center">

        {/* Logo */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>

          <div className="absolute inset-0 bg-white rounded-full shadow-xl flex items-center justify-center p-4 z-10 border border-blue-50">
            <img
              src="/logo-512.png"
              alt="Logo"
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500 mb-2">
          RupeeRiser
        </h1>

        {/* Loading Dots */}
        <div className="flex gap-2 mb-8">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex items-center gap-2 text-muted-foreground opacity-60">
        <Code2 className="w-4 h-4" />
        <span className="text-xs font-medium tracking-wide">
          POWERED BY RAPTILE DATAWORKS
        </span>
      </div>
    </div>
  );
};

const ADMIN_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const isAdminAccount = (email?: string) => {
  if (!email) return false;

  return ADMIN_MONTHS.some(
    (m) => email === `rupeeraiser${m}@gmail.com`
  );
};

const AppRoutes = () => {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isAdmin = isAdminAccount(user?.email);
  const defaultRoute = isAdmin ? "/admin" : "/dashboard";

  return (
    <Routes>

      {/* Login */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={defaultRoute} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          user && isAdmin ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          user ? (
            <AppLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/planner" element={<MonthlyPlanner />} />
        <Route path="/setup" element={<FinancialSetup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/habits" element={<Habits />} />
      </Route>

      {/* Default Redirect */}
      <Route
        path="/"
        element={
          <Navigate
            to={user ? defaultRoute : "/login"}
            replace
          />
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      defaultTheme="system"
      storageKey="vite-ui-theme"
    >
      <AppProvider>

        {/* ✅ Planner Provider Added */}
        <PlannerProvider>

          <TooltipProvider>

            <Toaster />

            <Sonner
              duration={2000}
              closeButton={true}
              position="top-center"
              className="mt-4"
              toastOptions={{
                classNames: {
                  success:
                    "bg-blue-600 text-white border-blue-700 shadow-lg",
                  error:
                    "bg-red-600 text-white border-red-700 shadow-lg",
                  info:
                    "bg-gray-800 text-white border-gray-900",
                  closeButton:
                    "bg-white/20 text-white hover:bg-white/30",
                },
              }}
            />

            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>

          </TooltipProvider>

        </PlannerProvider>

      </AppProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;