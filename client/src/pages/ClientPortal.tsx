import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, DollarSign, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ClientPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  if (!user || user.role !== "client") {
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
