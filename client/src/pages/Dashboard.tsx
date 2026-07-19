import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckSquare, TrendingUp, FileText, Loader2, Sparkles, AlertTriangle, CalendarClock, Clock, MessageSquare, Banknote, ArrowRight } from "lucide-react";
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
  const { data: unreadMessages } = trpc.messages.unread.useQuery(undefined, { enabled: !!user });
  const { data: billAlert } = trpc.billGuardian.getAlertSummary.useQuery(undefined, { enabled: user?.role === "admin", refetchInterval: 5 * 60 * 1000 });

  // Calculate metrics
  const openTasks = (allTasks as any[] | undefined)?.filter((t) => t.status !== "complete").length ?? 0;
  const newLeads = leads?.filter((l) => l.status === "New").length || 0;
  const qualifiedLeads = leads?.filter((l) => l.status === "Qualified").length || 0;
  const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
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

      {/* Bill Guardian Alert Banner */}
      {billAlert?.needsAttention && (
        <Link href="/bill-guardian">
          <div className={`group relative overflow-hidden rounded-xl border px-5 py-4 cursor-pointer transition-all hover:shadow-md ${
            billAlert.severity === "critical"
              ? "border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/50 dark:border-rose-800/50 dark:from-rose-950/40 dark:to-rose-900/20"
              : "border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:border-amber-800/50 dark:from-amber-950/40 dark:to-amber-900/20"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  billAlert.severity === "critical"
                    ? "bg-rose-100 dark:bg-rose-900/50"
                    : "bg-amber-100 dark:bg-amber-900/50"
                }`}>
                  <Banknote className={`h-5 w-5 ${
                    billAlert.severity === "critical"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    billAlert.severity === "critical"
                      ? "text-rose-900 dark:text-rose-200"
                      : "text-amber-900 dark:text-amber-200"
                  }`}>
                    Bill Guardian needs your attention
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    billAlert.severity === "critical"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {billAlert.severity === "critical"
                      ? "One or more recurring items may be overdue"
                      : "Some items are due soon or need review"}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-transform group-hover:translate-x-0.5 ${
                billAlert.severity === "critical"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}>
                Review <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </Link>
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

        {/* Unread Messages Card */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Unread Messages</p>
              <p className="text-3xl font-bold">{unreadMessages === undefined ? "-" : (unreadMessages as any[]).length}</p>
              <p className="text-xs text-muted-foreground">from clients</p>
            </div>
            <div className="rounded-lg bg-rose-100 p-3 dark:bg-rose-900/30">
              <MessageSquare className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${invoicesLoading ? "-" : totalRevenue.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{paidInvoices} paid invoice{paidInvoices !== 1 ? "s" : ""}</p>
            <Link href="/invoices" className="text-xs text-accent hover:underline">View all invoices →</Link>
          </div>
        </div>
      </Card>

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
