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
import Appointments from "./pages/Appointments";
import Contracts from "./pages/Contracts";
import BookingPage from "./pages/BookingPage";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Settings from "./pages/Settings";
import CaseCompassAdmin from "./pages/CaseCompassAdmin";
import ContactDetail from "./pages/ContactDetail";
import Students from "./pages/Students";
import Tasks from "./pages/Tasks";
// Students page replaces Projects page
import { TerminologyProvider } from "./contexts/TerminologyContext";

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
          <Route path="/contacts/:id" component={ContactDetail} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/leads" component={Leads} />
          <Route path="/projects" component={Students} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/client-portal" component={ClientPortal} />
          <Route path="/portal" component={ClientPortal} />
          <Route path="/settings" component={Settings} />
          <Route path="/case-compass" component={CaseCompassAdmin} />
          <Route path="/book" component={BookingPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    );
  }

  // Public routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book" component={BookingPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TerminologyProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </TerminologyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
