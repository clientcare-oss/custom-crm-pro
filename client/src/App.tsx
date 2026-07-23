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
import Scheduler from "./pages/Scheduler";
import Contracts from "./pages/Contracts";
import BookingPage from "./pages/BookingPage";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Settings from "./pages/Settings";
import CaseCompassAdmin from "./pages/CaseCompassAdmin";
import ContactDetail from "./pages/ContactDetail";
import Students from "./pages/Students";
import Tasks from "./pages/Tasks";
import Tools from "./pages/Tools";
import Templates from "./pages/Templates";
import LeadForms from "./pages/LeadForms";
import Automations from "./pages/Automations";
import Integrations from "./pages/Integrations";
import Workflows from "./pages/Workflows";
import KnowledgeBase from "./pages/KnowledgeBase";
import Walkthroughs from "./pages/Walkthroughs";
import UnassignedCallLogs from "./pages/UnassignedCallLogs";
import Team from "./pages/Team";
import StateComplaintBuilder from "./pages/StateComplaintBuilder";
import BrainDump from "./pages/BrainDump";
import IntakeForm from "./pages/IntakeForm";
import DynamicForm from "./pages/DynamicForm";
import AiConnections from "./pages/AiConnections";
import BillGuardian from "./pages/BillGuardian";
import Sponsors from "./pages/Sponsors";
import Services from "./pages/Services";
import PageIdShowcase from "./pages/PageIdShowcase";
import PortalBook from "./pages/PortalBook";
import SmartFiles from "./pages/SmartFiles";
import SmartFileEditor from "./pages/SmartFileEditor";
import SmartFileAssignments from "./pages/SmartFileAssignments";
import SmartFilePortalViewer from "./pages/SmartFilePortalViewer";
import TechTasks from "./pages/TechTasks";
import DiscoveryCallPage from "./pages/DiscoveryCallPage";
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
    // Public pages accessible even when logged in (no dashboard layout)
    if (
      window.location.pathname === '/portal/book' ||
      window.location.pathname === '/portal' ||
      window.location.pathname.startsWith('/portal?') ||
      window.location.pathname === '/client-portal' ||
      window.location.pathname.startsWith('/smart-files/response/')
    ) {
      return (
        <Switch>
          <Route path="/portal/book" component={PortalBook} />
          <Route path="/portal" component={ClientPortal} />
          <Route path="/client-portal" component={ClientPortal} />
          <Route path="/smart-files/response/:id" component={SmartFilePortalViewer} />
        </Switch>
      );
    }

    if (window.location.pathname === '/intake' || window.location.pathname.startsWith('/form/')) {
      // Redirect /intake to /form/public-intake-form so it uses DynamicForm with the inline scheduler
      if (window.location.pathname === '/intake') {
        const search = window.location.search;
        window.location.replace('/form/public-intake' + search);
        return null;
      }
      return (
        <Switch>
          <Route path="/form/:slug" component={DynamicForm} />
        </Switch>
      );
    }
    return (
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/contacts/:id" component={ContactDetail} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/leads/:leadId/discovery" component={DiscoveryCallPage} />
          <Route path="/leads" component={Leads} />
          <Route path="/projects" component={Students} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/smart-files" component={SmartFiles} />
          <Route path="/smart-files/:id/assignments" component={SmartFileAssignments} />
          <Route path="/smart-files/:id" component={SmartFileEditor} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/calendar" component={Appointments} />
          <Route path="/scheduler" component={Scheduler} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/tech-tasks" component={TechTasks} />
          <Route path="/tools" component={Tools} />
          <Route path="/templates" component={Templates} />
          <Route path="/lead-forms" component={LeadForms} />
          <Route path="/automations" component={Automations} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/workflows" component={Workflows} />
          <Route path="/knowledge-base" component={KnowledgeBase} />
          <Route path="/walkthroughs" component={Walkthroughs} />
          <Route path="/call-logs" component={UnassignedCallLogs} />
          <Route path="/team" component={Team} />
          <Route path="/state-complaint-builder" component={StateComplaintBuilder} />
          <Route path="/brain-dump" component={BrainDump} />
          <Route path="/ai-connections" component={AiConnections} />
              <Route path="/services" component={Services} />
              <Route path="/sponsors" component={Sponsors} />
              <Route path="/bill-guardian" component={BillGuardian} />
          <Route path="/page-id-showcase" component={PageIdShowcase} />
          <Route path="/portal/book" component={PortalBook} />
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
      <Route path="/intake">{() => { window.location.replace('/form/public-intake' + window.location.search); return null; }}</Route>
      <Route path="/form/:slug" component={DynamicForm} />
      <Route path="/book" component={BookingPage} />
      <Route path="/portal/book" component={PortalBook} />
      {/* Portal is public so email links work for unauthenticated clients */}
      <Route path="/portal" component={ClientPortal} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/smart-files/response/:id" component={SmartFilePortalViewer} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="navy" switchable={true}>
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
