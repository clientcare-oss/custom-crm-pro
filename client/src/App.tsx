import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Leads from "./pages/Leads";
import Projects from "./pages/Projects";
import Invoices from "./pages/Invoices";
import ClientPortal from "./pages/ClientPortal";
import ClientFiles from "./pages/ClientFiles";
import Messages from "./pages/Messages";
import Appointments from "./pages/Appointments";
import Contracts from "./pages/Contracts";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Authenticated routes
  if (user) {
    return (
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/leads" component={Leads} />
          <Route path="/projects" component={Projects} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/messages" component={Messages} />
          <Route path="/client-portal" component={ClientPortal} />
          <Route path="/client-files" component={ClientFiles} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    );
  }

  // Public routes
  return (
    <Switch>
      <Route path={"/ "} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
