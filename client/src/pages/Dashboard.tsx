import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, TrendingUp, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.invoices.list.useQuery();

  const isLoading = contactsLoading || leadsLoading || projectsLoading || invoicesLoading;

  // Calculate metrics
  const newLeads = leads?.filter((l) => l.status === "New").length || 0;
  const qualifiedLeads = leads?.filter((l) => l.status === "Qualified").length || 0;
  const totalRevenue = invoices?.reduce((sum, inv) => sum + parseFloat(inv.total || "0"), 0) || 0;
  const paidInvoices = invoices?.filter((inv) => inv.status === "Paid").length || 0;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Welcome back, {user?.name || "User"}</h1>
        <p className="text-lg text-muted-foreground">Here's your business overview</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Contacts Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
              <p className="text-3xl font-bold">{contactsLoading ? "-" : contacts?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Leads Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">New Leads</p>
              <p className="text-3xl font-bold">{leadsLoading ? "-" : newLeads}</p>
              <p className="text-xs text-muted-foreground">{qualifiedLeads} qualified</p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        {/* Projects Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              <p className="text-3xl font-bold">
                {projectsLoading ? "-" : projects?.filter((p) => p.status !== "Completed").length || 0}
              </p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Revenue Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">${invoicesLoading ? "-" : totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{paidInvoices} paid</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/contacts" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            Manage Contacts
          </Link>
          <Link href="/leads" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            View Leads
          </Link>
          <Link href="/projects" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            Projects
          </Link>
          <Link href="/invoices" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            Invoices
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}
    </div>
  );
}
