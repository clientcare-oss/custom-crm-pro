import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckSquare, TrendingUp, FileText, Loader2, Sparkles, AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { Link } from "wouter";
import { ClientPortalPreview } from "@/components/ClientPortalPreview";
import { useTerminology } from "@/contexts/TerminologyContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { projectLabel, projectLabelPlural } = useTerminology();
  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.invoices.list.useQuery();
  const { data: allTasks, isLoading: tasksLoading } = trpc.internalTasks.list.useQuery(
    { status: "all" },
    { enabled: user?.role === "admin" }
  );

  const isLoading = leadsLoading || projectsLoading || invoicesLoading || tasksLoading;
  const { data: briefing, isLoading: briefingLoading } = trpc.ai.dailyBriefing.useQuery(undefined, { enabled: user?.role === "admin" });

  // Calculate metrics
  const openTasks = (allTasks as any[] | undefined)?.filter((t) => t.status !== "complete").length ?? 0;
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

      {/* Daily Briefing */}
      {user?.role === "admin" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">
              {briefingLoading ? "Loading your day..." : (briefing?.date ?? "Today's Briefing")}
            </h2>
          </div>
          {briefingLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching your schedule...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Today's Meetings ({briefing?.todayAppointments?.length ?? 0})
                </div>
                {!briefing?.todayAppointments?.length ? (
                  <p className="text-sm text-muted-foreground">No meetings today</p>
                ) : (
                  <div className="space-y-1">
                    {briefing.todayAppointments.slice(0, 4).map((a: any) => (
                      <div key={a.id} className="text-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate">{a.title}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{new Date(a.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  Overdue ({briefing?.overdueTasks?.length ?? 0})
                </div>
                {!briefing?.overdueTasks?.length ? (
                  <p className="text-sm text-muted-foreground">Nothing overdue ✓</p>
                ) : (
                  <div className="space-y-1">
                    {briefing.overdueTasks.slice(0, 4).map((t: any) => (
                      <div key={t.id} className="text-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                        <span className="truncate">{t.title}</span>
                        {t.linkedStudentName && <span className="text-muted-foreground text-xs shrink-0">— {t.linkedStudentName}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Due Today ({briefing?.dueTodayTasks?.length ?? 0})
                </div>
                {!briefing?.dueTodayTasks?.length ? (
                  <p className="text-sm text-muted-foreground">Nothing due today</p>
                ) : (
                  <div className="space-y-1">
                    {briefing.dueTodayTasks.slice(0, 4).map((t: any) => (
                      <div key={t.id} className="text-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{t.title}</span>
                        {t.linkedStudentName && <span className="text-muted-foreground text-xs shrink-0">— {t.linkedStudentName}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Open Tasks Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Open Tasks</p>
              <p className="text-3xl font-bold">{tasksLoading ? "-" : openTasks}</p>
              <p className="text-xs text-muted-foreground">not complete</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm font-medium text-muted-foreground">Active {projectLabelPlural}</p>
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Quick Actions</h2>
          <ClientPortalPreview />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/contacts" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            Manage Contacts
          </Link>
          <Link href="/leads" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            View Leads
          </Link>
          <Link href="/projects" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-3 font-semibold text-foreground shadow-sm transition-all hover:bg-muted">
            {projectLabelPlural}
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
