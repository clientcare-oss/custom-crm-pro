import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, DollarSign, MessageSquare, LogOut, Calendar, Clock,
  Upload, Trash2, File, Shield, PenTool, Compass, CheckSquare,
  FolderOpen, Info, Briefcase, Sun, Moon, Droplets, Wrench, GitCompare, Lock, ScrollText,
  ChevronDown, ChevronRight, CheckCircle2, Circle, StickyNote
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { IepDocumentBlocks } from "@/components/IepDocumentBlocks";
import { useTheme } from "@/contexts/ThemeContext";
import CaseCompassCard from "@/components/CaseCompassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import InlineScheduler from "@/components/InlineScheduler";
import { NotesSection } from "@/components/NotesSection";

// ── Portal Task Row ──────────────────────────────────────────────────────────
function PortalTaskRow({ task, studentContactId }: { task: any; studentContactId: number }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const inv = () => utils.portal.getAssignedTasks.invalidate({ studentContactId });

  const stepCount = (task.steps ?? []).length;
  const doneCount = (task.steps ?? []).filter((s: any) => s.isComplete).length;
  const progress = stepCount > 0 ? Math.round((doneCount / stepCount) * 100) : 0;
  const isDone = (task.status ?? "Todo") === "Done";
  const prevDone = useRef(isDone);

  // Fire confetti when task transitions to Done (with or without steps)
  useEffect(() => {
    if (isDone && !prevDone.current) {
      const end = Date.now() + 1200;
      const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
      (function frame() {
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    prevDone.current = isDone;
  }, [isDone]);

  const markSeen = trpc.portal.markTaskSeen.useMutation({ onSuccess: inv });
  const updateStatus = trpc.portal.updateTaskStatus.useMutation({ onSuccess: inv });
  const toggleStep = trpc.portal.toggleTaskStep.useMutation({
    onSuccess: (_data, vars) => {
      inv().then(() => {
        const updatedSteps = (task.steps ?? []).map((s: any) =>
          s.id === vars.stepId ? { ...s, isComplete: vars.isComplete } : s
        );
        const allDone = updatedSteps.length > 0 && updatedSteps.every((s: any) => s.isComplete);
        if (allDone && !isDone) {
          updateStatus.mutate({ taskId: task.id, status: "Done", studentContactId });
        }
      });
    },
  });

  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${
      isDone ? "border-green-200 bg-green-50/30" : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Complete toggle button */}
        <button
          onClick={() => updateStatus.mutate({ taskId: task.id, status: isDone ? "In Progress" : "Done", studentContactId })}
          className="flex-shrink-0 transition-transform hover:scale-110"
          title={isDone ? "Mark as In Progress" : "Mark as Done"}
        >
          {isDone
            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
            : <Circle className="h-4 w-4 text-muted-foreground hover:text-green-500" />}
        </button>
        <button
          onClick={() => {
            const opening = !expanded;
            setExpanded(opening);
            if (opening && !task.seenByClient && !isDone) {
              markSeen.mutate({ taskId: task.id, studentContactId });
            }
          }}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}>{task.title}</span>
            {!task.seenByClient && !isDone && (
              <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                New
              </span>
            )}
            {task.priority && (
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                task.priority === "High" ? "bg-red-100 text-red-700"
                : task.priority === "Medium" ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
              }`}>{task.priority}</span>
            )}
            {task.dueDate && (
              <span className="text-[10px] text-muted-foreground">
                Due {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {stepCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className={`h-1.5 flex-1 max-w-[200px] transition-all duration-700 ${
                  progress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">{doneCount}/{stepCount}</span>
            </div>
          )}
        </div>
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
          isDone ? "bg-emerald-100 text-emerald-700"
          : task.status === "In Progress" ? "bg-blue-100 text-blue-700"
          : "bg-slate-100 text-slate-600"
        }`}>{isDone ? "Done" : task.status ?? "Todo"}</span>
      </div>
      {expanded && stepCount > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
          {(task.steps ?? []).map((step: any) => (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => toggleStep.mutate({ stepId: step.id, isComplete: !step.isComplete, studentContactId })}
                className="flex-shrink-0"
              >
                {step.isComplete
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <span className={`text-xs ${
                step.isComplete ? "line-through text-muted-foreground" : "text-foreground"
              }`}>{step.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ── Portal Login Form ───────────────────────────────────────────────────────
function PortalLoginForm({ onSuccess }: { onSuccess: () => void }) {
  // Detect reset token in URL: /portal?reset=TOKEN
  const resetToken = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("reset") ?? ""
    : "";

  // view: "login" | "forgot" | "forgot-sent" | "reset" | "reset-done"
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent" | "reset" | "reset-done">(
    resetToken ? "reset" : "login"
  );

  // ── Login state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.portalAuth.portalLogin.useMutation({
    onSuccess: (data) => {
      // Store token in localStorage as fallback for environments where httpOnly cookies don't persist
      if (data?.token) localStorage.setItem("portal_token", data.token);
      toast.success("Welcome back!");
      onSuccess();
    },
    onError: (err) => { toast.error(err.message || "Invalid email or password"); },
  });

  // ── Forgot password state ──
  const [forgotEmail, setForgotEmail] = useState("");
  const requestReset = trpc.portalAuth.requestPasswordReset.useMutation({
    onSuccess: () => setView("forgot-sent"),
    onError: () => setView("forgot-sent"), // always show sent to avoid enumeration
  });

  // ── Reset password state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { data: tokenStatus } = trpc.portalAuth.validateResetToken.useQuery(
    { token: resetToken },
    { enabled: !!resetToken }
  );
  const doReset = trpc.portalAuth.resetPassword.useMutation({
    onSuccess: () => setView("reset-done"),
    onError: (err) => toast.error(err.message || "Reset failed. The link may have expired."),
  });

  const portalUrl = (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)
    || window.location.origin;

  // Force navy theme on the html element while the login/reset screen is shown
  useEffect(() => {
    const root = document.documentElement;
    const prev = Array.from(root.classList).filter(c => ['light','dark','blue','navy'].includes(c));
    root.classList.remove('light', 'dark', 'blue', 'navy');
    root.classList.add('navy');
    return () => {
      root.classList.remove('navy');
      prev.forEach(c => root.classList.add(c));
    };
  }, []);

  // ── Shared wrapper ──
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Client Portal</h1>
          <p className="text-sm text-muted-foreground">
            {view === "login" && "Sign in to access your portal"}
            {view === "forgot" && "Set up or reset your password"}
            {view === "forgot-sent" && "Check your email"}
            {view === "reset" && "Set a new password"}
            {view === "reset-done" && "Password updated"}
          </p>
        </div>

        {/* ── Login view ── */}
        {view === "login" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="portal-email">Email</Label>
              <Input id="portal-email" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); login.mutate({ email, password }); } }} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="portal-password">Password</Label>
                <button type="button" onClick={() => setView("forgot")}
                  className="text-xs text-primary hover:underline" style={{cursor: "pointer"}}>
                  Forgot password?
                </button>
              </div>
              <Input id="portal-password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); login.mutate({ email, password }); } }} />
            </div>
            <Button type="button" className="w-full" onClick={() => login.mutate({ email, password })}
              disabled={login.isPending || !email || !password}>
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                First time here?{" "}
                <button type="button" onClick={() => setView("forgot")}
                  className="text-primary hover:underline font-medium" style={{cursor: "pointer"}}>
                  Set up your password
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Don't have access? Contact your advocate.
              </p>
            </div>
          </div>
        )}

        {/* ── Forgot password view ── */}
        {view === "forgot" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to set or reset your password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input id="forgot-email" type="email" placeholder="you@example.com"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && requestReset.mutate({ email: forgotEmail, portalUrl })} />
            </div>
            <Button className="w-full"
              onClick={() => requestReset.mutate({ email: forgotEmail, portalUrl })}
              disabled={requestReset.isPending || !forgotEmail}>
              {requestReset.isPending ? "Sending…" : "Send Reset Link"}
            </Button>
            <button type="button" onClick={() => setView("login")}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot sent view ── */}
        {view === "forgot-sent" && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{forgotEmail}</strong>, you'll receive a reset link shortly.
              Check your inbox (and spam folder).
            </p>
            <Button variant="outline" className="w-full" onClick={() => setView("login")}>
              Back to Sign In
            </Button>
          </div>
        )}

        {/* ── Reset password view ── */}
        {view === "reset" && (
          <div className="space-y-4">
            {tokenStatus?.valid === false && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                This reset link is invalid or has expired. Please request a new one.
              </div>
            )}
            {tokenStatus?.valid !== false && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="At least 8 characters"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Repeat password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPassword === confirmPassword && newPassword.length >= 8)
                        doReset.mutate({ token: resetToken, newPassword });
                    }} />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords don't match</p>
                )}
                <Button className="w-full"
                  onClick={() => doReset.mutate({ token: resetToken, newPassword })}
                  disabled={doReset.isPending || newPassword.length < 8 || newPassword !== confirmPassword}>
                  {doReset.isPending ? "Saving…" : "Set New Password"}
                </Button>
              </>
            )}
            <button type="button" onClick={() => setView("forgot")}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
              Request a new reset link
            </button>
          </div>
        )}

        {/* ── Reset done view ── */}
        {view === "reset-done" && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Button className="w-full" onClick={() => {
              // Clear the reset token from the URL
              window.history.replaceState({}, "", "/portal");
              setView("login");
            }}>
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [schedulerSessionTypeId, setSchedulerSessionTypeId] = useState<number | null>(null);
  const [schedulerBooked, setSchedulerBooked] = useState(false);
  const { data: publicSessionTypes } = trpc.sessionTypes.listAll.useQuery(undefined, { retry: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Portal-specific session (separate from Manus OAuth)
  const { data: portalUser, refetch: refetchPortalMe } = trpc.portalAuth.portalMe.useQuery();
  const portalLogout = trpc.portalAuth.portalLogout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("portal_token");
      refetchPortalMe();
    },
  });

  // Allow preview mode for admins
  const isPreviewMode = typeof window !== "undefined" && window.location.search.includes("preview=true");
  // isClientOrPreview: admin preview OR logged-in via portal session
  const isClientOrPreview = (user?.role === "admin" && isPreviewMode) || !!portalUser;

  // Multi-student: fetch students linked to this parent portal account
  // Uses portal session auth — enabled when logged in via portal session OR admin preview
  const { data: myStudents = [] } = trpc.portal.getMyStudents.useQuery(undefined, {
    enabled: !!portalUser,
  });

  // Admin preview mode: read parentContactId from URL
  const previewParentContactId = (() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("parentContactId");
    return v ? parseInt(v, 10) : null;
  })();
  const { data: previewStudents = [] } = trpc.portal.getStudentsForParent.useQuery(
    { parentContactId: previewParentContactId! },
    { enabled: isPreviewMode && !!previewParentContactId }
  );

  const portalStudents = isPreviewMode ? previewStudents : myStudents;

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Default to first student once loaded
  const effectiveStudent = selectedStudentId
    ? portalStudents.find((s) => s.id === selectedStudentId) ?? portalStudents[0]
    : portalStudents[0];

  const effectiveCaseId = effectiveStudent?.caseId ?? null;
  const effectiveStudentContactId = effectiveStudent?.id ?? null;

  // Handle payment confirmation from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful! Your invoice has been updated.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (paymentStatus === "cancelled") {
      toast.error("Payment was cancelled. You can try again anytime.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Per-student data — scoped to selected student
  const { data: studentAppointments = [] } = trpc.portal.getStudentAppointments.useQuery(
    { studentContactId: effectiveStudentContactId! },
    { enabled: !!effectiveStudentContactId }
  );

  const { data: studentFiles = [], refetch: refetchFiles } = trpc.portal.getStudentFiles.useQuery(
    { studentContactId: effectiveStudentContactId! },
    { enabled: !!effectiveStudentContactId }
  );

  const { data: smartFileAssignments = [] } = trpc.smartFiles.portalListAssignments.useQuery();
  const { data: studentBilling } = trpc.portal.getStudentBilling.useQuery(
    { studentContactId: effectiveStudentContactId! },
    { enabled: !!effectiveStudentContactId }
  );

  const { data: vaultSubscription } = trpc.vault.getSubscription.useQuery(undefined, {
    enabled: !!portalUser || isPreviewMode,
  });

  // Tasks explicitly assigned to this student (client-facing — not all project tasks)
  const { data: studentTasks = [] } = trpc.portal.getAssignedTasks.useQuery(
    { studentContactId: effectiveStudentContactId! },
    { enabled: !!effectiveStudentContactId }
  );

  // Projects/cases linked to this student
  const { data: studentProjects = [] } = trpc.portal.getStudentProjects.useQuery(
    { studentContactId: effectiveStudentContactId! },
    { enabled: !!effectiveStudentContactId }
  );

  // Messaging (shared parent-level thread)
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // getOwner is now public, always fetch so portal clients can see owner name
  const { data: ownerUser } = trpc.auth.getOwner.useQuery();
  // Messages require Manus auth (portal messaging not yet supported)
  const { data: messages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: ownerUser?.id ?? 0 },
    { enabled: (user?.role === "client" || isPreviewMode) && !!ownerUser?.id }
  );
  const sendMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => { setNewMessage(""); refetchMessages(); },
    onError: (err) => toast.error(err.message),
  });
  const markReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => refetchMessages(),
  });
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (messages.length > 0 && ownerUser?.id) {
      messages.forEach((msg: any) => {
        if (!msg.isRead && msg.senderId === ownerUser.id) {
          markReadMutation.mutate({ id: msg.id });
        }
      });
    }
  }, [messages, ownerUser]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ownerUser?.id) return;
    sendMessageMutation.mutate({ recipientId: ownerUser.id, content: newMessage.trim() });
  };

  // File upload
  const deleteMutation = trpc.clientFiles.delete.useMutation({
    onSuccess: () => { toast.success("File deleted"); refetchFiles(); },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Only PDF files are accepted."); return; }
    if (file.size > 1024 * 1024 * 1024) { toast.error("File size exceeds 1GB limit."); return; }
    if (!effectiveStudentContactId) { toast.error("No student selected."); return; }

    setUploading(true);
    try {
      const presignRes = await fetch("/api/files/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      if (!presignRes.ok) throw new Error((await presignRes.json()).error || "Failed to get upload URL");
      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

      const confirmRes = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: effectiveStudentContactId, fileName: file.name, fileKey, fileUrl, fileSize: file.size }),
      });
      if (!confirmRes.ok) throw new Error("Failed to confirm upload");

      toast.success("File uploaded successfully!");
      refetchFiles();
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => setLocation("/") });
  // Display name: portal session user name or Manus OAuth user name
  const displayName = portalUser?.name ?? user?.name ?? "Client";

  const handleOpenScheduler = (sessionTypeId: number) => {
    setSchedulerSessionTypeId(sessionTypeId);
    setSchedulerBooked(false);
  };
  const handleSchedulerBooked = (date: string, time: string) => {
    setSchedulerBooked(true);
    toast.success(`Session booked for ${date} at ${time}!`);
    setTimeout(() => setShowMeetingScheduler(false), 2000);
  };

  if (!isClientOrPreview) {
    return <PortalLoginForm onSuccess={refetchPortalMe} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome, {displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle — sun (Blue/light) or moon (Navy/dark) */}
            <button
              onClick={toggleTheme}
              type="button"
              title={theme === 'navy' ? 'Switch to Blue (light) mode' : 'Switch to Navy (dark) mode'}
              className="flex items-center justify-center rounded-lg border border-border bg-background p-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Toggle theme"
            >
              {theme === 'navy'
                ? <Sun className="h-4 w-4 text-amber-400" />
                : <Moon className="h-4 w-4 text-indigo-400" />}
            </button>
            <Button
              onClick={() => setLocation("/portal/book")}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Calendar className="h-4 w-4" />
              Schedule Meeting
            </Button>
            {(portalUser || user?.role !== "admin") && (
              <Button
                onClick={() => {
                  if (portalUser) {
                    portalLogout.mutate();
                  } else {
                    logoutMutation.mutate();
                  }
                }}
                variant="outline"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Scheduler Dialog */}
      <Dialog open={showMeetingScheduler} onOpenChange={(open) => { setShowMeetingScheduler(open); if (!open) { setSchedulerSessionTypeId(null); setSchedulerBooked(false); } }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
          </DialogHeader>
          {!schedulerSessionTypeId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select the type of meeting you'd like to schedule:</p>
              {(publicSessionTypes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No session types available. Please contact us directly.</p>
              )}
              {(publicSessionTypes ?? []).map((st: any) => (
                <Button
                  key={st.id}
                  onClick={() => handleOpenScheduler(st.id)}
                  variant="outline"
                  className="w-full justify-start gap-3 px-4 py-3 font-semibold"
                >
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{st.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {st.duration} {st.durationUnit === 'hours' ? (st.duration === 1 ? 'hour' : 'hours') : 'min'}
                  </span>
                </Button>
              ))}
            </div>
          ) : schedulerBooked ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-lg font-semibold">Session Booked!</p>
              <p className="text-sm text-muted-foreground">We'll send you a confirmation shortly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setSchedulerSessionTypeId(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-90" /> Back to meeting types
              </button>
              <InlineScheduler
                sessionTypeId={schedulerSessionTypeId}
                parentName={user?.name ?? ""}
                parentEmail={user?.email ?? ""}
                clientId={effectiveStudentContactId}
                onBooked={handleSchedulerBooked}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Student selector cards ── */}
        {portalStudents.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {portalStudents.length > 1 ? "Select a Student" : "Your Student"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portalStudents.map((student: any) => {
                const isSelected = effectiveStudent?.id === student.id;
                const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`;
                const pendingTasks = student.pendingTaskCount ?? 0;
                const nextMeeting = student.nextMeeting ? new Date(student.nextMeeting) : null;

                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`group w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-accent bg-accent/5 shadow-md"
                        : "border-border bg-card hover:border-accent/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground group-hover:bg-accent/20"
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isSelected ? "text-accent" : "text-foreground"}`}>
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{student.caseId}</p>
                      </div>
                      {pendingTasks > 0 && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          ⚠️ {pendingTasks} task{pendingTasks !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {nextMeeting
                        ? nextMeeting.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : "No upcoming meeting"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Per-student content ── */}
        {effectiveStudent ? (
          <Tabs defaultValue="compass" className="space-y-0">

            {/* ── Student header + Tab bar ── */}
            <div className="rounded-t-xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Student identity strip */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {effectiveStudent.firstName.charAt(0)}{effectiveStudent.lastName.charAt(0)}
                </div>
                <span className="font-semibold text-foreground">{effectiveStudent.firstName} {effectiveStudent.lastName}</span>
                <span className="text-xs text-muted-foreground font-mono">{effectiveCaseId}</span>
              </div>

              {/* Tab bar — matches the reference design */}
              <TabsList className="flex w-full flex-wrap gap-0 rounded-none border-0 bg-card p-0 h-auto overflow-x-auto">
                {[
                  { value: "compass", icon: Compass, label: "Compass" },
                  { value: "communication", icon: MessageSquare, label: "Communication" },
                  { value: "tasks", icon: CheckSquare, label: "Tasks" },
                  { value: "smart-docs", icon: FileText, label: "Documents" },
                  { value: "files", icon: FolderOpen, label: "Files" },
                  { value: "tools", icon: Wrench, label: "Tools" },
                  { value: "cases", icon: Briefcase, label: "Cases" },
                  { value: "financials", icon: DollarSign, label: "Billing" },
                  { value: "appointments", icon: Calendar, label: "Appointments" },
                  { value: "notes", icon: StickyNote, label: "Notes" },
                  { value: "details", icon: Info, label: "Details" },
                ].map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="inline-flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground whitespace-nowrap"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Compass Tab ── */}
            <TabsContent value="compass" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background p-0 overflow-hidden">
              <CaseCompassCard caseId={effectiveCaseId ?? undefined} />
            </TabsContent>

            {/* ── Communication Tab ── */}
            <TabsContent value="communication" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Communication</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Communicate directly with your advocate</p>
                </div>
                <div className="rounded-xl border border-border bg-card">
                  <div className="h-[380px] overflow-y-auto p-4 space-y-3">
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
                              isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
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
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessageMutation.isPending} size="sm" className="px-4">
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Tasks Tab ── */}
            <TabsContent value="tasks" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Tasks</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Action items for {effectiveStudent.firstName}'s case</p>
                </div>
                {studentTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
                    <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground mb-1">No tasks assigned</p>
                    <p className="text-xs text-muted-foreground">Your advocate will assign tasks here when there are action items</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentTasks.map((task: any) => (
                      <PortalTaskRow key={task.id} task={task} studentContactId={effectiveStudentContactId!} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Smart Documents Tab ── */}
            <TabsContent value="smart-docs" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Documents</h2>
                  <p className="text-sm text-muted-foreground">Review and sign documents sent by your advocate.</p>
                </div>
                {smartFileAssignments.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No documents to review yet.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {smartFileAssignments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-4 p-4 border rounded-xl bg-card">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{a.templateName ?? "Document"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.status}</p>
                      </div>
                      <a
                        href={`/smart-files/response/${a.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                      >
                        {a.status === "payment_completed" ? "View" : "Open"}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            {/* ── Files Tab ── */}
            <TabsContent value="files" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-5">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Files</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Documents for {effectiveStudent.firstName}'s case.
                  </p>
                </div>

                {/* IEP Document Blocks */}
                {effectiveStudentContactId && (
                  <IepDocumentBlocks contactId={effectiveStudentContactId} />
                )}

                {/* Upload */}
                <Card className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Upload Document</h3>
                      <span className="text-xs text-muted-foreground">PDF only, max 1GB</span>
                    </div>
                    <div
                      onClick={() => !isPreviewMode && fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-all hover:border-accent hover:bg-muted/50 ${isPreviewMode ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {uploading ? "Uploading..." : isPreviewMode ? "Upload (preview mode)" : "Click to upload a PDF"}
                      </p>
                      <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
                  </div>
                </Card>

                {/* File list */}
                {studentFiles.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground text-sm">Uploaded Files</h3>
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      {studentFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <File className="h-7 w-7 text-red-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"} · {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                              View
                            </a>
                            {!isPreviewMode && (
                              <button onClick={() => deleteMutation.mutate({ id: file.id })}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                    <File className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground mb-1">No files yet</p>
                    <p className="text-xs text-muted-foreground">Upload PDFs to share with your advocate</p>
                  </div>
                )}

                {/* Vault */}
                <Card className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-accent" />
                      <div>
                        <h3 className="font-semibold text-foreground">Document Vault</h3>
                        <p className="text-xs text-muted-foreground">Secure cloud storage — keep access even after services end</p>
                      </div>
                    </div>
                    {vaultSubscription ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-semibold text-foreground capitalize">{vaultSubscription.tier}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Storage Used</span>
                          <span className="font-semibold text-foreground">
                            {((vaultSubscription.storageUsed || 0) / 1024 / 1024 / 1024).toFixed(2)} GB / {((vaultSubscription.storageLimit || 0) / 1024 / 1024 / 1024).toFixed(0)} GB
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">{vaultSubscription.status}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Choose a vault plan to keep your documents safe after services end:</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {[
                            { tier: "basic", price: "$9", storage: "50 GB" },
                            { tier: "pro", price: "$19", storage: "500 GB", popular: true },
                            { tier: "enterprise", price: "$29", storage: "2 TB" },
                          ].map(({ tier, price, storage, popular }) => (
                            <div key={tier} className={`rounded-xl border ${popular ? "border-2 border-accent" : "border-border"} bg-background p-4 text-center relative`}>
                              {popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Popular</span>}
                              <p className="text-lg font-bold text-foreground">{price}</p>
                              <p className="text-xs text-muted-foreground">per month</p>
                              <p className="text-sm font-semibold text-foreground mt-2 capitalize">{tier}</p>
                              <p className="text-xs text-muted-foreground">{storage} Storage</p>
                              <Button
                                onClick={async () => {
                                  if (isPreviewMode) { toast.info("Preview: This would start a Stripe subscription checkout."); return; }
                                  try {
                                    const res = await fetch("/api/stripe/vault-subscription", {
                                      method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ tier, customerEmail: user?.email, customerName: user?.name }),
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
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tools Tab ── */}
            <TabsContent value="tools" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Tools</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Advocacy tools for {effectiveStudent.firstName}'s case</p>
                </div>

                {/* IEP Comparison Tool */}
                {effectiveStudentContactId && (
                  <PortalToolsContent contactId={effectiveStudentContactId} />
                )}
              </div>
            </TabsContent>

            {/* ── Cases Tab ── */}
            <TabsContent value="cases" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Cases</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Active cases and projects for {effectiveStudent.firstName}</p>
                </div>

                {/* Active projects/cases */}
                {studentProjects.length > 0 ? (
                  <div className="space-y-3">
                    {studentProjects.map((proj: any) => (
                      <Card key={proj.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-accent" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{proj.name}</p>
                                {proj.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{proj.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  {proj.startDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Started {new Date(proj.startDate).toLocaleDateString()}
                                    </span>
                                  )}
                                  {proj.endDate && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Ends {new Date(proj.endDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`flex-shrink-0 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                              proj.status === "Completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : proj.status === "In Progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : proj.status === "On Hold" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}>{proj.status}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground mb-1">No active cases</p>
                    <p className="text-xs text-muted-foreground">Your advocate will create a case for {effectiveStudent.firstName} when work begins</p>
                  </div>
                )}

                {/* Formal Escalation Files banner */}
                <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 px-5 py-4 flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                      <ScrollText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Formal Escalation Files</p>
                    <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5 leading-relaxed">
                      This is where state complaints, resolution orders, MDR documents, tribunal records, findings, and federal case files are stored. Our goal is to keep this section empty — but when formal action is necessary, every document lives here.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["State Complaint", "Resolution Order", "MDR", "Tribunal Docs", "Findings", "Federal Case File"].map((tag) => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Notes Tab ── */}
            <TabsContent value="notes" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5">
                {studentProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
                    <StickyNote className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground">No cases on file yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Notes will appear here once your advocate creates a case.</p>
                  </div>
                ) : studentProjects.length === 1 ? (
                  <NotesSection projectId={studentProjects[0].id} studentName={effectiveStudent.firstName} isClientView={true} />
                ) : (
                  <div className="space-y-6">
                    {studentProjects.map((proj: any) => (
                      <div key={proj.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">{proj.name}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <NotesSection projectId={proj.id} studentName={effectiveStudent.firstName} isClientView={true} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Billing Tab ── */}
            <TabsContent value="financials" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-5">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Billing</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Billing and invoices for {effectiveStudent.firstName}'s case</p>
                </div>

                {/* Invoices */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Invoices</h3>
                  {studentBilling?.invoices && studentBilling.invoices.length > 0 ? (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">Invoice</th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">Amount</th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">Status</th>
                              <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">Due</th>
                              <th className="px-5 py-3 text-right text-xs font-semibold text-foreground">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentBilling.invoices.map((invoice: any) => (
                              <tr key={invoice.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{invoice.invoiceNumber}</td>
                                <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                                  ${parseFloat(invoice.total || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    invoice.status === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : invoice.status === "Sent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : invoice.status === "Overdue" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                                  }`}>{invoice.status}</span>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-muted-foreground">
                                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  {invoice.status !== "Paid" && invoice.status !== "Cancelled" && invoice.status !== "Draft" ? (
                                    <Button size="sm"
                                      onClick={async () => {
                                        if (isPreviewMode) { toast.info("Preview: This would redirect to Stripe checkout."); return; }
                                        try {
                                          toast.info("Redirecting to payment...");
                                          const res = await fetch("/api/stripe/create-checkout", {
                                            method: "POST", headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ invoiceId: invoice.id, amount: parseFloat(invoice.total || "0"), customerEmail: user?.email, customerName: user?.name }),
                                          });
                                          const data = await res.json();
                                          if (data.url) window.open(data.url, "_blank");
                                          else toast.error("Unable to start checkout.");
                                        } catch { toast.error("Payment service unavailable."); }
                                      }}
                                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                    >Pay Now</Button>
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
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                      <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                      <p className="text-sm font-semibold text-foreground mb-1">No invoices yet</p>
                      <p className="text-xs text-muted-foreground">Invoices for {effectiveStudent.firstName} will appear here</p>
                    </div>
                  )}
                </div>

                {/* Contracts */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Contracts</h3>
                  {studentBilling?.contracts && studentBilling.contracts.length > 0 ? (
                    <ContractsTabContent contracts={studentBilling.contracts} isPreview={isPreviewMode} />
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                      <p className="text-sm font-semibold text-foreground mb-1">No contracts yet</p>
                      <p className="text-xs text-muted-foreground">Contracts for {effectiveStudent.firstName} will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Appointments Tab ── */}
            <TabsContent value="appointments" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Appointments</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Upcoming and past meetings for {effectiveStudent.firstName}
                  </p>
                </div>
                {studentAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {studentAppointments.map((appt: any) => (
                      <Card key={appt.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{appt.title}</p>
                              {appt.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{appt.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(appt.startTime).toLocaleDateString("en-US", {
                                  weekday: "short", month: "short", day: "numeric",
                                  hour: "numeric", minute: "2-digit",
                                })}
                                {appt.location && ` · ${appt.location}`}
                              </p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            appt.status === "Confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : appt.status === "Completed" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : appt.status === "Cancelled" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground mb-1">No appointments yet</p>
                    <p className="text-xs text-muted-foreground">Appointments for {effectiveStudent.firstName} will appear here</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="mt-0 border border-t-0 border-border rounded-b-xl bg-background">
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Details</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Student information on file</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
                  {[
                    { label: "Full Name", value: `${effectiveStudent.firstName} ${effectiveStudent.lastName}` },
                    { label: "Case ID", value: effectiveCaseId },
                    { label: "School / District", value: effectiveStudent.company || "—" },
                    { label: "Email", value: effectiveStudent.email || "—" },
                    { label: "Phone", value: effectiveStudent.phone || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-16 text-center">
            <Compass className="h-14 w-14 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-base font-semibold text-foreground mb-2">No students linked yet</p>
            <p className="text-sm text-muted-foreground">Your advocate will link your student's case to this portal.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Portal Tools Tab Content
function PortalToolsContent({ contactId }: { contactId: number }) {
  const { data: iepDoc } = trpc.iep.get.useQuery({ contactId }, { enabled: !!contactId });
  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);

  return (
    <div className="space-y-4">
      {/* IEP Comparison Tool */}
      <Card className={`p-5 rounded-xl border flex flex-col gap-3 ${
        hasBothVersions ? "border-emerald-200 dark:border-emerald-800" : "border-border"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            hasBothVersions ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"
          }`}>
            <GitCompare className={`h-5 w-5 ${
              hasBothVersions ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">IEP/504 Comparison</p>
              {hasBothVersions ? (
                <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">Ready</span>
              ) : (
                <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasBothVersions
                ? "Compare your current and previous IEP/504 side by side to see what changed."
                : "Upload two versions of the IEP/504 in the Files tab to unlock this tool."}
            </p>
            {hasBothVersions && (
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <p>Current: <span className="font-medium text-foreground">{iepDoc!.currentFileName}</span></p>
                <p>Previous: <span className="font-medium text-foreground">{iepDoc!.previousFileName}</span></p>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={hasBothVersions ? "default" : "outline"}
          disabled={!hasBothVersions}
          className="self-start inline-flex items-center gap-1.5 text-xs"
          onClick={() => hasBothVersions && (window.location.href = `/portal?tab=tools&contactId=${contactId}`)}
        >
          <GitCompare className="h-3.5 w-3.5" />
          {hasBothVersions ? "Compare IEP/504 — Coming Soon" : "Locked — Upload 2 IEP versions first"}
        </Button>
      </Card>

      {/* More tools coming soon */}
      <Card className="p-5 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 py-8">
        <Wrench className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground">More tools coming soon</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Additional AI-powered advocacy tools will appear here as they are developed.
        </p>
      </Card>
    </div>
  );
}

// Contracts inline component
function ContractsTabContent({ contracts, isPreview }: { contracts: any[]; isPreview: boolean }) {
  const [signingContractId, setSigningContractId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const signMutation = trpc.contracts.sign.useMutation({
    onSuccess: () => {
      toast.success("Contract signed successfully!");
      setSigningContractId(null);
      utils.portal.getStudentBilling.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign contract"),
  });

  return (
    <div className="space-y-3">
      {contracts.map((contract: any) => (
        <Card key={contract.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">{contract.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-3">{contract.content}</p>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                contract.status === "Signed" || contract.status === "Executed" ? "bg-emerald-100 text-emerald-700"
                : contract.status === "Draft" ? "bg-slate-100 text-slate-700"
                : contract.status === "Sent" ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-700"
              }`}>{contract.status}</span>
              {contract.status === "Sent" && !isPreview && (
                <Button size="sm" variant="default" onClick={() => setSigningContractId(contract.id)} className="gap-1.5">
                  <PenTool className="h-3.5 w-3.5" />
                  Sign Contract
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Signature Dialog */}
      <Dialog open={signingContractId !== null} onOpenChange={(open) => { if (!open) setSigningContractId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Draw your signature below to sign this contract.</p>
            <SignaturePad
              onSave={(dataUrl) => {
                if (signingContractId !== null) {
                  signMutation.mutate({ id: signingContractId, signatureData: dataUrl });
                }
              }}
              onCancel={() => setSigningContractId(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
