import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, DollarSign, MessageSquare, LogOut, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MEETING_TYPES = [
  "IEP Meeting",
  "1:1 with Advocate",
  "Progress Update",
  "Consultation",
  "Follow-up",
] as const;

export default function ClientPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [selectedMeetingType, setSelectedMeetingType] = useState<string | null>(null);

  // Fetch client's data
  const { data: clientProjects } = trpc.projects.list.useQuery(undefined, {
    enabled: user?.role === "client",
  });

  const { data: clientInvoices } = trpc.invoices.list.useQuery(undefined, {
    enabled: user?.role === "client",
  });

  const { data: clientContracts } = trpc.contracts.list.useQuery(undefined, {
    enabled: user?.role === "client",
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLocation("/");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleScheduleMeeting = (meetingType: string) => {
    setSelectedMeetingType(meetingType);
    toast.success(`Scheduling ${meetingType}...`);
    // In production, this would open a calendar/scheduling interface
    setTimeout(() => {
      setShowMeetingScheduler(false);
      setSelectedMeetingType(null);
    }, 1500);
  };

  // Allow preview mode for admins
  const isPreviewMode = typeof window !== "undefined" && window.location.search.includes("preview=true");
  const isClientOrPreview = user?.role === "client" || (user?.role === "admin" && isPreviewMode);

  if (!user || !isClientOrPreview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-4">
            Access Denied
          </p>
          <p className="text-sm text-muted-foreground">
            This portal is for clients only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Client Portal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {user.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowMeetingScheduler(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Calendar className="h-4 w-4" />
              Schedule Meeting
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Meeting Scheduler Dialog */}
      <Dialog open={showMeetingScheduler} onOpenChange={setShowMeetingScheduler}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the type of meeting you'd like to schedule:
            </p>
            {MEETING_TYPES.map((meetingType) => (
              <Button
                key={meetingType}
                onClick={() => handleScheduleMeeting(meetingType)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{meetingType}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
            <TabsTrigger
              value="projects"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Briefcase className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger
              value="contracts"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Your Projects
              </h2>
              <p className="text-sm text-muted-foreground">
                View the status and details of your projects
              </p>
            </div>

            {clientProjects && clientProjects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground">
                          {project.name}
                        </h3>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                            project.status === "Completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : project.status === "In Progress"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : project.status === "Planning"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {project.description}
                      </p>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Budget: ${parseFloat(project.budget || "0").toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  No projects yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Your projects will appear here once assigned
                </p>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Your Invoices
              </h2>
              <p className="text-sm text-muted-foreground">
                View and download your invoices
              </p>
            </div>

            {clientInvoices && clientInvoices.length > 0 ? (
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-foreground">
                            ${parseFloat(invoice.total || "0").toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                invoice.status === "Paid"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : invoice.status === "Sent"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : invoice.status === "Overdue"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {invoice.dueDate
                              ? new Date(invoice.dueDate).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  No invoices yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Your invoices will appear here
                </p>
              </div>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Your Contracts
              </h2>
              <p className="text-sm text-muted-foreground">
                Review and sign your contracts
              </p>
            </div>

            {clientContracts && clientContracts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {clientContracts.map((contract) => (
                  <Card
                    key={contract.id}
                    className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">
                        {contract.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {contract.content}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                            contract.status === "Signed" || contract.status === "Executed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : contract.status === "Draft"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                              : contract.status === "Sent"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {contract.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  No contracts yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Your contracts will appear here
                </p>
              </div>
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Billing & Payment
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your payment information and view billing history
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Payment Information Card */}
              <Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Payment Information</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>💳 Payment method on file</p>
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                  </div>
                  <Button
                    onClick={() => {
                      toast.success("Redirecting to payment update...");
                      // In production, this would open Stripe payment update flow
                    }}
                    className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
                  >
                    Update Payment Information
                  </Button>
                </div>
              </Card>

              {/* Account Summary Card */}
              <Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Account Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Balance</span>
                      <span className="font-semibold text-foreground">$0.00</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-semibold text-foreground">$0.00</span>
                    </div>
                    <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Account Status</span>
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Billing History */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Billing History</h3>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  No billing history yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Your invoices and payments will appear here
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Messages
              </h2>
              <p className="text-sm text-muted-foreground">
                Communicate directly with your account manager
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm font-semibold text-foreground mb-2">
                Messaging coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Direct messaging with your account manager will be available soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
