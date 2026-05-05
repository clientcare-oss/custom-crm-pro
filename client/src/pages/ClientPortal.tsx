import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, DollarSign, MessageSquare, LogOut, Calendar, Clock, Upload, Trash2, File, Shield, PenTool } from "lucide-react";
import { useTerminology } from "@/contexts/TerminologyContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignaturePad from "@/components/SignaturePad";

const MEETING_TYPES = [
  "IEP Meeting",
  "1:1 with Advocate",
  "Progress Update",
  "Consultation",
  "Follow-up",
] as const;

export default function ClientPortal() {
  const { user } = useAuth();
  const { projectLabel, projectLabelPlural } = useTerminology();
  const [, setLocation] = useLocation();
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [selectedMeetingType, setSelectedMeetingType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Allow preview mode for admins
  const isPreviewMode = typeof window !== "undefined" && window.location.search.includes("preview=true");
  const isClientOrPreview = user?.role === "client" || (user?.role === "admin" && isPreviewMode);

  // Handle payment confirmation from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful! Your invoice has been updated.");
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (paymentStatus === "cancelled") {
      toast.error("Payment was cancelled. You can try again anytime.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch client's data
  const { data: clientProjects } = trpc.projects.list.useQuery(undefined, {
    enabled: user?.role === "client",
  });

  const { data: clientInvoices, refetch: refetchInvoices } = trpc.invoices.list.useQuery(undefined, {
    enabled: user?.role === "client",
    refetchOnWindowFocus: true,
  });

  const { data: clientContracts } = trpc.contracts.clientList.useQuery(undefined, {
    enabled: user?.role === "client",
  });

  const { data: clientFiles, refetch: refetchFiles } = trpc.clientFiles.listByClient.useQuery(undefined, {
    enabled: user?.role === "client" || isPreviewMode,
  });

  const { data: vaultSubscription } = trpc.vault.getSubscription.useQuery(undefined, {
    enabled: user?.role === "client" || isPreviewMode,
  });

  // Messaging state
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the owner/admin user for messaging
  const { data: ownerUser } = trpc.auth.getOwner.useQuery(undefined, {
    enabled: user?.role === "client" || isPreviewMode,
  });

  // Get messages (client messages to/from admin)
  const { data: messages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: ownerUser?.id ?? 0 },
    { enabled: (user?.role === "client" || isPreviewMode) && !!ownerUser?.id }
  );

  const { data: unreadMessages = [] } = trpc.messages.unread.useQuery(undefined, {
    enabled: user?.role === "client" || isPreviewMode,
  });

  const sendMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
    },
    onError: (err) => toast.error(err.message),
  });

  const markReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => refetchMessages(),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ownerUser?.id) return;
    sendMessageMutation.mutate({
      recipientId: ownerUser.id,
      content: newMessage.trim(),
    });
  };

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && ownerUser?.id) {
      messages.forEach((msg: any) => {
        if (!msg.isRead && msg.senderId === ownerUser.id) {
          markReadMutation.mutate({ id: msg.id });
        }
      });
    }
  }, [messages, ownerUser]);

  const uploadMutation = trpc.clientFiles.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully!");
      refetchFiles();
      setUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Upload failed");
      setUploading(false);
    },
  });

  const deleteMutation = trpc.clientFiles.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      refetchFiles();
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted.");
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      toast.error("File size exceeds 1GB limit.");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch("/api/files/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();

      // Step 2: Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Step 3: Confirm upload and save metadata
      const confirmRes = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: user?.id,
          fileName: file.name,
          fileKey,
          fileUrl,
          fileSize: file.size,
        }),
      });

      if (!confirmRes.ok) {
        throw new Error("Failed to confirm upload");
      }

      toast.success("File uploaded successfully!");
      refetchFiles();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
              {projectLabelPlural}
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
              value="files"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Upload className="h-4 w-4" />
              Files
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
                Your {projectLabelPlural}
              </h2>
              <p className="text-sm text-muted-foreground">
                View the status and details of your {projectLabel.toLowerCase()}s
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
                        <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                          Action
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
                          <td className="px-6 py-4 text-right">
                            {invoice.status !== "Paid" && invoice.status !== "Cancelled" && invoice.status !== "Draft" ? (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (isPreviewMode) {
                                    toast.info("Preview: This would redirect to Stripe checkout for payment.");
                                    return;
                                  }
                                  try {
                                    toast.info("Redirecting to payment...");
                                    const res = await fetch("/api/stripe/create-checkout", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        invoiceId: invoice.id,
                                        amount: parseFloat(invoice.total || "0"),
                                        customerEmail: user?.email,
                                        customerName: user?.name,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (data.url) {
                                      window.open(data.url, "_blank");
                                    } else {
                                      toast.error("Unable to start checkout.");
                                    }
                                  } catch {
                                    toast.error("Payment service unavailable.");
                                  }
                                }}
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Pay Now
                              </Button>
                            ) : invoice.status === "Paid" ? (
                              <span className="text-xs text-emerald-600 font-semibold">✓ Paid</span>
                            ) : null}
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
            <ContractsTabContent contracts={clientContracts} isPreview={isPreviewMode} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Your Files
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload and manage your documents. Only PDF files are accepted (max 1GB).
              </p>
            </div>

            {/* Upload Section */}
            <Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Upload Document</h3>
                  <span className="text-xs text-muted-foreground">PDF only, max 1GB</span>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-all hover:border-accent hover:bg-muted/50"
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {uploading ? "Uploading..." : "Click to upload a PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to browse
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </Card>

            {/* File List */}
            {clientFiles && clientFiles.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Uploaded Files</h3>
                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                  {clientFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between px-6 py-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"} &middot; Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          View
                        </a>
                        <button
                          onClick={() => deleteMutation.mutate({ id: file.id })}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground mb-2">
                  No files uploaded yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload PDF documents to share with your account manager
                </p>
              </div>
            )}

            {/* Vault Section */}
            <Card className="rounded-lg border border-border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-accent" />
                  <div>
                    <h3 className="font-semibold text-foreground">Document Vault</h3>
                    <p className="text-xs text-muted-foreground">
                      Secure cloud storage for your important documents
                    </p>
                  </div>
                </div>

                {vaultSubscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-semibold text-foreground capitalize">{vaultSubscription.tier}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Storage Used</span>
                      <span className="font-semibold text-foreground">
                        {((vaultSubscription.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB / {((vaultSubscription.storageLimit || 0) / 1024 / 1024 / 1024).toFixed(0)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                        {vaultSubscription.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Keep your documents safe and accessible even after your services end. Choose a vault plan:
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-lg font-bold text-foreground">$9</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <p className="text-sm font-semibold text-foreground mt-2">Basic</p>
                        <p className="text-xs text-muted-foreground">50 GB Storage</p>
                        <Button
                          onClick={async () => {
                            if (isPreviewMode) { toast.info("Preview: This would start a Stripe subscription checkout."); return; }
                            try {
                              const res = await fetch("/api/stripe/vault-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tier: "basic", customerEmail: user?.email, customerName: user?.name }),
                              });
                              const data = await res.json();
                              if (data.url) window.open(data.url, "_blank");
                              else toast.error("Unable to start checkout.");
                            } catch { toast.error("Payment service unavailable."); }
                          }}
                          className="w-full mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                        >
                          Subscribe
                        </Button>
                      </div>
                      <div className="rounded-lg border-2 border-accent bg-background p-4 text-center relative">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Popular</span>
                        <p className="text-lg font-bold text-foreground">$19</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <p className="text-sm font-semibold text-foreground mt-2">Pro</p>
                        <p className="text-xs text-muted-foreground">500 GB Storage</p>
                        <Button
                          onClick={async () => {
                            if (isPreviewMode) { toast.info("Preview: This would start a Stripe subscription checkout."); return; }
                            try {
                              const res = await fetch("/api/stripe/vault-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tier: "pro", customerEmail: user?.email, customerName: user?.name }),
                              });
                              const data = await res.json();
                              if (data.url) window.open(data.url, "_blank");
                              else toast.error("Unable to start checkout.");
                            } catch { toast.error("Payment service unavailable."); }
                          }}
                          className="w-full mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                        >
                          Subscribe
                        </Button>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-lg font-bold text-foreground">$29</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <p className="text-sm font-semibold text-foreground mt-2">Enterprise</p>
                        <p className="text-xs text-muted-foreground">2 TB Storage</p>
                        <Button
                          onClick={async () => {
                            if (isPreviewMode) { toast.info("Preview: This would start a Stripe subscription checkout."); return; }
                            try {
                              const res = await fetch("/api/stripe/vault-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tier: "enterprise", customerEmail: user?.email, customerName: user?.name }),
                              });
                              const data = await res.json();
                              if (data.url) window.open(data.url, "_blank");
                              else toast.error("Unable to start checkout.");
                            } catch { toast.error("Payment service unavailable."); }
                          }}
                          className="w-full mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                        >
                          Subscribe
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
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
                    onClick={async () => {
                      if (isPreviewMode) {
                        toast.info("Preview mode: This would open the Stripe billing portal for clients.");
                        return;
                      }
                      try {
                        toast.info("Redirecting to payment portal...");
                        const res = await fetch("/api/stripe/billing-portal", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ customerEmail: user?.email }),
                        });
                        const data = await res.json();
                        if (data.url) {
                          window.open(data.url, "_blank");
                        } else {
                          toast.error("Unable to open billing portal.");
                        }
                      } catch {
                        toast.error("Failed to connect to payment service.");
                      }
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

            {/* Message Thread */}
            <div className="rounded-lg border border-border bg-card">
              <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">No messages yet. Start a conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="px-4"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Contracts Tab with E-Signature Support
function ContractsTabContent({ contracts, isPreview }: { contracts: any[] | undefined; isPreview: boolean }) {
  const [signingContractId, setSigningContractId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const signMutation = trpc.contracts.sign.useMutation({
    onSuccess: () => {
      toast.success("Contract signed successfully!");
      setSigningContractId(null);
      utils.contracts.clientList.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign contract"),
  });

  const handleSign = (signatureDataUrl: string) => {
    if (signingContractId === null) return;
    signMutation.mutate({ id: signingContractId, signatureData: signatureDataUrl });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Your Contracts</h2>
        <p className="text-sm text-muted-foreground">Review and sign your contracts</p>
      </div>

      {contracts && contracts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map((contract: any) => (
            <Card
              key={contract.id}
              className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">{contract.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{contract.content}</p>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      contract.status === "Signed" || contract.status === "Executed"
                        ? "bg-emerald-100 text-emerald-700"
                        : contract.status === "Draft"
                        ? "bg-slate-100 text-slate-700"
                        : contract.status === "Sent"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {contract.status}
                  </span>
                  {contract.status === "Sent" && !isPreview && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setSigningContractId(contract.id)}
                      className="gap-1.5"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      Sign Contract
                    </Button>
                  )}
                  {contract.status === "Sent" && isPreview && (
                    <Button size="sm" variant="default" className="gap-1.5" disabled>
                      <PenTool className="h-3.5 w-3.5" />
                      Sign Contract
                    </Button>
                  )}
                  {(contract.status === "Signed" || contract.status === "Executed") && contract.signatureUrl && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <PenTool className="h-3 w-3" />
                      Signed {contract.signedDate ? new Date(contract.signedDate).toLocaleDateString() : ""}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-sm font-semibold text-foreground mb-2">No contracts yet</p>
          <p className="text-xs text-muted-foreground">Your contracts will appear here</p>
        </div>
      )}

      {/* Signature Dialog */}
      <Dialog open={signingContractId !== null} onOpenChange={(open) => !open && setSigningContractId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Draw your signature below to digitally sign this contract. This is legally binding.
          </p>
          <SignaturePad
            onSave={handleSign}
            onCancel={() => setSigningContractId(null)}
            disabled={signMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
