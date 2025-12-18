import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard-layout";

import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardIndex from "@/pages/dashboard/index";
import DashboardProducts from "@/pages/dashboard/products";
import DashboardOrders from "@/pages/dashboard/orders";
import DashboardShipping from "@/pages/dashboard/shipping";
import DashboardSettings from "@/pages/dashboard/settings";
import DashboardDomains from "@/pages/dashboard/domains";
import AdminIndex from "@/pages/admin/index";
import AdminTenants from "@/pages/admin/tenants";
import AdminPlans from "@/pages/admin/plans";
import AdminDomains from "@/pages/admin/domains";
import ProductPage from "@/pages/store/product";
import NotFound from "@/pages/not-found";

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  if (!adminOnly && user.role === "admin" && location.startsWith("/dashboard")) {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}

function TenantDashboardRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardIndex} />
          <Route path="/dashboard/products" component={DashboardProducts} />
          <Route path="/dashboard/orders" component={DashboardOrders} />
          <Route path="/dashboard/shipping" component={DashboardShipping} />
          <Route path="/dashboard/settings" component={DashboardSettings} />
          <Route path="/dashboard/domains" component={DashboardDomains} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AdminRoutes() {
  return (
    <ProtectedRoute adminOnly>
      <DashboardLayout>
        <Switch>
          <Route path="/admin" component={AdminIndex} />
          <Route path="/admin/tenants" component={AdminTenants} />
          <Route path="/admin/plans" component={AdminPlans} />
          <Route path="/admin/domains" component={AdminDomains} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/store/:storeSlug/:productSlug" component={ProductPage} />
      <Route path="/dashboard" component={TenantDashboardRoutes} />
      <Route path="/dashboard/:rest*" component={TenantDashboardRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/admin/:rest*" component={AdminRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="storebuilder-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
