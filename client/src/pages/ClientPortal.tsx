import { useClerk, SignIn } from "@clerk/react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import {
  FileText, DollarSign, MessageSquare, LogOut, Calendar, Clock,
  Upload, Trash2, File, Shield, PenTool, Compass, CheckSquare,
  FolderOpen, Info, Briefcase, Sun, Moon, Wrench, GitCompare, Lock, ScrollText,
  ChevronDown, ChevronRight, CheckCircle2, Circle, StickyNote, Menu, X, Link2, Scale, Loader2, Pencil, BookOpen, Home,
  Video, Play, Volume2, Maximize, Search, MoreVertical, Download, Sparkles, Clapperboard, CreditCard,
  GraduationCap, User, Mail, Phone, Building, ShieldCheck, ArrowRight
} from "lucide-react";
import { VaultSafeIcon } from "@/components/ui/VaultSafeIcon";
import { ActionCenterIcon } from "@/components/ui/ActionCenterIcon";
import { IepDocumentBlocks } from "@/components/IepDocumentBlocks";
import { useTheme } from "@/contexts/ThemeContext";
import CaseCompassCard from "@/components/CaseCompassCard";
import ClientPortalDashboard from "@/components/ClientPortalDashboard";
import { ClientPortalSidebar } from "@/components/ClientPortalSidebar";
import { ClientPortalHeader } from "@/components/ClientPortalHeader";
import PortalCommunicationTab from "@/components/portal/PortalCommunicationTab";
import PortalTasksTab from "@/components/portal/PortalTasksTab";
import PortalVoyageLogTab from "@/components/portal/PortalVoyageLogTab";
import PortalActionCenterTab from "@/components/portal/PortalActionCenterTab";
import PortalDocumentVaultTab from "@/components/portal/PortalDocumentVaultTab";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import SignaturePad from "@/components/SignaturePad";
import InlineScheduler from "@/components/InlineScheduler";
import { NotesSection } from "@/components/NotesSection";
import { DiscoveryCallExperience } from "@/components/portal/onboarding/DiscoveryCallExperience";
import { YourJourneyExperience } from "@/components/portal/onboarding/YourJourneyExperience";
import { ChooseSupportExperience } from "@/components/portal/onboarding/ChooseSupportExperience";
import { AgreementsExperience } from "@/components/portal/onboarding/AgreementsExperience";
import { StudentSetupExperience } from "@/components/portal/onboarding/StudentSetupExperience";
import { UploadRecordsExperience } from "@/components/portal/onboarding/UploadRecordsExperience";
import { AdvocacyIntakeExperience } from "@/components/portal/onboarding/AdvocacyIntakeExperience";
import { ExplorePortalExperience } from "@/components/portal/onboarding/ExplorePortalExperience";
import { TourDiscoveryCard } from "@/components/portal/onboarding/TourDiscoveryCard";
import { LockedModulePreview } from "@/components/portal/onboarding/LockedModulePreview";
import { RenewalListingExperience } from "@/components/portal/onboarding/RenewalListingExperience";
import { PortalAppointmentsTab } from "@/components/portal/PortalAppointmentsTab";
import { PortalMembershipTab } from "@/components/portal/PortalMembershipTab";
import { ClientStage, getDefaultModuleForStage, TOUR_MODULES } from "@/components/portal/portalModuleRegistry";
import { resolvePortalTabId, broadcastPageId } from "@/lib/pageIdRegistry";
import PageIdBadge from "@/components/PageIdBadge";

const LOGO_URL = "/waypoint-logo.png";

// ── Compass Rose SVG Watermark ───────────────────────────────────────────────
function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="60,8 55,55 60,50 65,55" fill="currentColor" opacity="0.6" />
      <polygon points="60,112 55,65 60,70 65,65" fill="currentColor" opacity="0.6" />
      <polygon points="8,60 55,55 50,60 55,65" fill="currentColor" opacity="0.6" />
      <polygon points="112,60 65,55 70,60 65,65" fill="currentColor" opacity="0.6" />
      <polygon points="22,22 52,55 57,50" fill="currentColor" opacity="0.35" />
      <polygon points="98,22 68,55 63,50" fill="currentColor" opacity="0.35" />
      <polygon points="22,98 52,65 57,70" fill="currentColor" opacity="0.35" />
      <polygon points="98,98 68,65 63,70" fill="currentColor" opacity="0.35" />
      <circle cx="60" cy="60" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="0.75" opacity="0.2" />
      <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.2" />
      <text x="57" y="6" fontSize="7" fill="currentColor" opacity="0.5" fontFamily="serif" fontWeight="bold">N</text>
    </svg>
  );
}

// ── Portal Task Row ──────────────────────────────────────────────────────────
function PortalTaskRow({ task, studentContactId }: { task: any; studentContactId: number }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const inv = () => utils.portal.getAssignedTasks.invalidate({ studentContactId });

  const stepCount = (task.steps ?? []).length;
  const doneCount = (task.steps ?? []).filter((s: any) => s.isComplete).length;
  const isDone = (task.status ?? "Todo") === "Done";
  const prevDone = useRef(isDone);

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
            <span className={`font-medium text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </span>
            {!task.seenByClient && !isDone && (
              <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">New</span>
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
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((doneCount / stepCount) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{doneCount}/{stepCount}</span>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-2">
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
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
              <span className={`text-xs ${step.isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Portal Login Form ────────────────────────────────────────────────────────
function PortalLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const clerk = useClerk();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent" | "reset" | "reset-done">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token") ? "reset" : "login";
  });
  const resetToken = new URLSearchParams(window.location.search).get("reset_token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { data: tokenStatus } = trpc.portalAuth.validateResetToken.useQuery(
    { token: resetToken },
    { enabled: !!resetToken }
  );
  const login = trpc.portalAuth.portalLogin.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => toast.error(err.message || "Invalid email or password"),
  });

  const handlePortalSignIn = async () => {
    if (!email || !password) return;
    setIsSigningIn(true);

    if (clerk && clerk.client) {
      try {
        const result = await clerk.client.signIn.create({
          identifier: email,
          password: password,
        });
        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
          toast.success("Signed in to Client Portal!");
          onSuccess();
          setIsSigningIn(false);
          return;
        } else {
          toast.error(`Sign in status: ${result.status}`);
          setIsSigningIn(false);
          return;
        }
      } catch (clerkErr: any) {
        console.warn("[Clerk Sign In error]", clerkErr);
        const msg = clerkErr.errors?.[0]?.message || clerkErr.message;
        toast.error(msg || "Invalid email or password");
        setIsSigningIn(false);
        return;
      }
    }

    login.mutate({ email, password });
    setIsSigningIn(false);
  };

  const requestReset = trpc.portalAuth.requestPasswordReset.useMutation({
    onSuccess: () => setView("forgot-sent"),
    onError: (err) => toast.error(err.message || "Failed to send reset email"),
  });
  const doReset = trpc.portalAuth.resetPassword.useMutation({
    onSuccess: () => setView("reset-done"),
    onError: (err) => toast.error(err.message || "Reset failed. The link may have expired."),
  });

  const portalUrl = (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined) || window.location.origin;

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

  return (
    <div className="flex min-h-screen bg-[#0d1b2a]">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col items-center justify-between w-72 shrink-0 bg-[#0a1520] px-8 py-10 relative overflow-hidden">
        <CompassRose className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-48 text-white/10 pointer-events-none" />
        <div className="flex flex-col items-center gap-3">
          <img src={LOGO_URL} alt="Waypoint Advocates" className="w-20 h-20 object-contain" />
          <div className="text-center">
            <p className="text-sm font-bold tracking-widest text-white uppercase">Waypoint</p>
            <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Advocates</p>
          </div>
        </div>
        <div className="text-center relative z-10">
          <p className="text-sm text-white/50 leading-relaxed">No one should have to navigate special education alone.</p>
          <p className="text-sm font-semibold text-amber-400 mt-1">We're here for you.</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-white/15 rounded-xl px-8 py-6 bg-white/[0.02]">
          <div className="lg:hidden text-center mb-8">
            <img src={LOGO_URL} alt="Waypoint Advocates" className="w-16 h-16 object-contain mx-auto mb-3" />
            <p className="text-sm font-bold tracking-widest text-white uppercase">Waypoint Advocates</p>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Client Portal</h1>
            <p className="text-sm text-white/50">
              {view === "login" && "Sign in to access your portal"}
              {view === "forgot" && "Set up or reset your password"}
              {view === "forgot-sent" && "Check your email"}
              {view === "reset" && "Set a new password"}
              {view === "reset-done" && "Password updated"}
            </p>
          </div>

          {view === "login" && (
            <div className="space-y-4">
              {clerk && clerk.loaded ? (
                <SignIn
                  forceRedirectUrl="/portal"
                  appearance={{
                    variables: {
                      colorPrimary: "#f59e0b",
                      colorBackground: "transparent",
                      colorForeground: "#ffffff",
                      colorMutedForeground: "rgba(255,255,255,0.6)",
                      colorNeutral: "white",
                      colorInput: "rgba(255,255,255,0.08)",
                      colorInputForeground: "#ffffff",
                      colorBorder: "rgba(255,255,255,0.15)",
                    },
                    elements: {
                      rootBox: { width: "100%" },
                      card: { backgroundColor: "transparent", boxShadow: "none", border: "none", padding: 0, width: "100%" },
                      headerTitle: { display: "none" },
                      headerSubtitle: { display: "none" },
                      socialButtonsBlockButton: { backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.25)" },
                      socialButtonsBlockButtonText: { color: "#ffffff" },
                      formButtonPrimary: { backgroundColor: "#f59e0b", color: "#0d1b2a", fontWeight: 700, border: "none", boxShadow: "0 2px 8px rgba(245,158,11,0.3)" },
                      formFieldLabel: { color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
                      formFieldInput: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#ffffff" },
                      formFieldAction: { color: "#fbbf24" },
                      formFieldHintText: { color: "rgba(255,255,255,0.5)" },
                      formFieldErrorText: { color: "#f87171" },
                      formFieldSuccessText: { color: "#4ade80" },
                      formHeaderTitle: { color: "#ffffff" },
                      formHeaderSubtitle: { color: "rgba(255,255,255,0.6)" },
                      dividerLine: { backgroundColor: "rgba(255,255,255,0.15)" },
                      dividerText: { color: "rgba(255,255,255,0.4)" },
                      alternativeMethodsBlockButton: { color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.15)" },
                      identityPreviewText: { color: "#ffffff", fontWeight: 500 },
                      identityPreviewEditButton: { color: "#fbbf24" },
                      otpCodeFieldInput: { color: "#ffffff", borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)" },
                      footer: { backgroundColor: "transparent", border: "none" },
                      footerAction: { display: "none" },
                      footerActionText: { display: "none" },
                      footerActionLink: { display: "none" },
                      footerPages: { color: "rgba(255,255,255,0.4)" },
                      footerPagesLink: { color: "rgba(255,255,255,0.5)" },
                      alert: { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5" },
                      alertText: { color: "#fca5a5" },
                    },
                  }}
                />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="portal-email" className="text-white/70">Email</Label>
                    <Input id="portal-email" type="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handlePortalSignIn(); }}
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="portal-password" className="text-white/70">Password</Label>
                      <button type="button" onClick={() => setView("forgot")} className="text-xs text-amber-400 hover:text-amber-300">Forgot password?</button>
                    </div>
                    <Input id="portal-password" type="password" placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handlePortalSignIn(); }}
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400" />
                  </div>
                  <Button type="button" className="w-full bg-amber-500 hover:bg-amber-400 text-[#0d1b2a] font-bold"
                    onClick={handlePortalSignIn}
                    disabled={isSigningIn || login.isPending || !email || !password}>
                    {isSigningIn || login.isPending ? "Signing in…" : "Sign In"}
                  </Button>
                  <div className="text-center space-y-1">
                    <p className="text-xs text-white/40">First time here?{" "}
                      <button type="button" onClick={() => setView("forgot")} className="text-amber-400 hover:text-amber-300 font-medium">Set up your password</button>
                    </p>
                    <p className="text-xs text-white/30">Don't have access? Contact your advocate.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {view === "forgot" && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">Enter your email and we'll send a link to set or reset your password.</p>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-white/70">Email</Label>
                <Input id="forgot-email" type="email" placeholder="you@example.com"
                  value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && requestReset.mutate({ email: forgotEmail, portalUrl })}
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400" />
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-400 text-[#0d1b2a] font-bold"
                onClick={() => requestReset.mutate({ email: forgotEmail, portalUrl })}
                disabled={requestReset.isPending || !forgotEmail}>
                {requestReset.isPending ? "Sending…" : "Send Reset Link"}
              </Button>
              <button type="button" onClick={() => setView("login")} className="text-xs text-white/40 hover:text-white/70 w-full text-center">← Back to sign in</button>
            </div>
          )}

          {view === "forgot-sent" && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm text-white/50">If an account exists for <strong className="text-white">{forgotEmail}</strong>, you'll receive a reset link shortly.</p>
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" onClick={() => setView("login")}>Back to Sign In</Button>
            </div>
          )}

          {view === "reset" && (
            <div className="space-y-4">
              {tokenStatus?.valid === false && (
                <div className="rounded-md bg-red-900/30 border border-red-700 p-3 text-sm text-red-300">This reset link is invalid or has expired.</div>
              )}
              {tokenStatus?.valid !== false && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-white/70">New Password</Label>
                    <Input id="new-password" type="password" placeholder="At least 8 characters"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-white/70">Confirm Password</Label>
                    <Input id="confirm-password" type="password" placeholder="Repeat password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400" />
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400">Passwords don't match</p>
                  )}
                  <Button className="w-full bg-amber-500 hover:bg-amber-400 text-[#0d1b2a] font-bold"
                    onClick={() => doReset.mutate({ token: resetToken, newPassword })}
                    disabled={doReset.isPending || newPassword.length < 8 || newPassword !== confirmPassword}>
                    {doReset.isPending ? "Saving…" : "Set New Password"}
                  </Button>
                </>
              )}
              <button type="button" onClick={() => setView("forgot")} className="text-xs text-white/40 hover:text-white/70 w-full text-center">Request a new reset link</button>
            </div>
          )}

          {view === "reset-done" && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm text-white/50">Your password has been updated. You can now sign in.</p>
              <Button className="w-full bg-amber-500 hover:bg-amber-400 text-[#0d1b2a] font-bold"
                onClick={() => { window.history.replaceState({}, "", "/portal"); setView("login"); }}>
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Portal Tools Tab Content ─────────────────────────────────────────────────
function PortalToolsContent({ contactId }: { contactId: number }) {
  const { data: iepDoc } = trpc.iep.get.useQuery({ contactId }, { enabled: !!contactId });
  const hasBothVersions = !!(iepDoc?.currentFileKey && iepDoc?.previousFileKey);

  return (
    <div className="space-y-4">
      <Card className={`p-5 rounded-xl border flex flex-col gap-3 ${hasBothVersions ? "border-emerald-200 dark:border-emerald-800" : "border-border"}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${hasBothVersions ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"}`}>
            <GitCompare className={`h-5 w-5 ${hasBothVersions ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">IEP/504 Comparison</p>
              {hasBothVersions
                ? <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">Ready</span>
                : <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground font-semibold flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasBothVersions
                ? "Compare your current and previous IEP/504 side by side to see what changed."
                : "Upload two versions of the IEP/504 in the Files tab to unlock this tool."}
            </p>
          </div>
        </div>
        <Button size="sm" variant={hasBothVersions ? "default" : "outline"} disabled={!hasBothVersions}
          className="self-start inline-flex items-center gap-1.5 text-xs"
          onClick={() => hasBothVersions && (window.location.href = `/portal?tab=tools&contactId=${contactId}`)}>
          <GitCompare className="h-3.5 w-3.5" />
          {hasBothVersions ? "Compare IEP/504 — Coming Soon" : "Locked — Upload 2 IEP versions first"}
        </Button>
      </Card>
      <Card className="p-5 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 py-8">
        <Wrench className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground">More tools coming soon</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">Additional AI-powered advocacy tools will appear here as they are developed.</p>
      </Card>
    </div>
  );
}

// ── Contracts Tab Content ────────────────────────────────────────────────────
function ContractsTabContent({ contracts, isPreview }: { contracts: any[]; isPreview: boolean }) {
  const [signingContractId, setSigningContractId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const signMutation = trpc.contracts.sign.useMutation({
    onSuccess: () => { toast.success("Contract signed successfully!"); setSigningContractId(null); utils.portal.getStudentBilling.invalidate(); },
    onError: (err: any) => toast.error(err.message || "Failed to sign contract"),
  });

  return (
    <div className="space-y-3">
      {contracts.map((contract: any) => (
        <Card key={contract.id} className="rounded-2xl border border-blue-900/40 bg-[#06172F] p-5 shadow-xl hover:border-blue-700/60 transition-all">
          <div className="space-y-3">
            <h3 className="font-bold text-white text-base">{contract.title}</h3>
            <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">{contract.content}</p>
            <div className="flex items-center justify-between pt-3 border-t border-blue-900/30">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                contract.status === "Signed" || contract.status === "Executed" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : contract.status === "Draft" ? "bg-white/10 text-white/70 border border-white/10"
                : contract.status === "Sent" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>{contract.status}</span>
              {contract.status === "Sent" && !isPreview && (
                <Button size="sm" onClick={() => setSigningContractId(contract.id)} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl gap-1.5 shadow-[0_0_12px_rgba(245,181,68,0.25)]">
                  <PenTool className="h-3.5 w-3.5" /> Sign Contract
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      <Dialog open={signingContractId !== null} onOpenChange={(open) => { if (!open) setSigningContractId(null); }}>
        <DialogContent className="max-w-lg bg-[#06172F] border-blue-900/40 text-white rounded-2xl shadow-2xl p-6">
          <DialogHeader><DialogTitle className="text-white font-bold text-lg">Sign Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-white/70">Draw your signature below to sign this contract.</p>
            <div className="p-2 rounded-xl bg-[#030C22] border border-blue-900/40">
              <SignaturePad
                onSave={(dataUrl) => { if (signingContractId !== null) signMutation.mutate({ id: signingContractId, signatureData: dataUrl }); }}
                onCancel={() => setSigningContractId(null)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Nav items config ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "appointments",  icon: Calendar,       label: "Appointments" },
  { id: "compass",       icon: Compass,        label: "Compass" },
  { id: "communication", icon: MessageSquare,  label: "Communication" },
  { id: "tasks",         icon: CheckSquare,    label: "Tasks" },
  { id: "smart-docs",    icon: VaultSafeIcon,    label: "Document Vault" },
  { id: "files",         icon: ActionCenterIcon, label: "Action Center" },
  { id: "tools",         icon: Wrench,           label: "Tools" },
  { id: "cases",         icon: Briefcase,      label: "Cases" },
  { id: "financials",    icon: CreditCard,     label: "Membership" },
  { id: "voyage-log",    icon: Video,          label: "Voyage Log" },
  { id: "notes",         icon: StickyNote,     label: "Notes" },
  { id: "attorney",      icon: Scale,          label: "Legal Counsel" },
  { id: "details",       icon: Info,           label: "Details" },
  { id: "renewal",       icon: Sparkles,       label: "Plan Renewal" },
] as const;

type NavId = typeof NAV_ITEMS[number]["id"] | string;

// ── Main ClientPortal Component ──────────────────────────────────────────────
export default function ClientPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [schedulerSessionTypeId, setSchedulerSessionTypeId] = useState<number | null>(null);
  const [schedulerSessionTypeName, setSchedulerSessionTypeName] = useState<string>("");
  const [schedulerBooked, setSchedulerBooked] = useState(false);

  // URL Stage & Tab Resolution
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const stageFromUrl = urlParams?.get("stage") as ClientStage | null;
  const tabFromUrl = urlParams?.get("tab");

  const [clientStage, setClientStage] = useState<ClientStage>(() => {
    if (stageFromUrl) return stageFromUrl;
    return "DISCOVERY_SCHEDULED";
  });

  const [completedOnboardingSteps, setCompletedOnboardingSteps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("waypoint_onboarding_steps");
      return saved ? JSON.parse(saved) : ["discovery-call"];
    } catch {
      return ["discovery-call"];
    }
  });

  const addCompletedStep = (stepId: string) => {
    setCompletedOnboardingSteps((prev) => {
      const next = Array.from(new Set([...prev, stepId]));
      localStorage.setItem("waypoint_onboarding_steps", JSON.stringify(next));
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<NavId>(() => {
    if (tabFromUrl) return tabFromUrl;
    if (stageFromUrl) return getDefaultModuleForStage(stageFromUrl);
    return "discovery-call";
  });

  // Portal Tour & Exploration State: Auto-start for new clients + initialize with ["explore-portal"]
  const [isExplorationActive, setIsExplorationActive] = useState<boolean>(() => {
    try {
      const active = localStorage.getItem("waypoint_portal_exploration_active");
      if (active !== null) return active === "true";
      return true; // Auto-starts on first load!
    } catch {
      return true;
    }
  });

  const [exploredTourIds, setExploredTourIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("waypoint_portal_explored_modules");
      return saved ? JSON.parse(saved) : ["explore-portal"];
    } catch {
      return ["explore-portal"];
    }
  });

  const [acknowledgedTourIntros, setAcknowledgedTourIntros] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("waypoint_portal_acknowledged_intros");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // When exploring, automatically mark current module as explored if in TOUR_MODULES
  useEffect(() => {
    if (isExplorationActive) {
      const isTourModule = TOUR_MODULES.some((m) => m.id === activeTab);
      if (isTourModule && !exploredTourIds.includes(activeTab)) {
        const next = [...exploredTourIds, activeTab];
        setExploredTourIds(next);
        localStorage.setItem("waypoint_portal_explored_modules", JSON.stringify(next));
      }
    }
  }, [activeTab, isExplorationActive, exploredTourIds]);

  // Broadcast specific sub-page ID whenever the portal tab switches (e.g. PG-023-ACT, PG-023-VAULT)
  useEffect(() => {
    const tabInfo = resolvePortalTabId(activeTab);
    if (tabInfo) {
      broadcastPageId(tabInfo);
    } else {
      broadcastPageId({ id: "PG-023", name: "Client Portal" });
    }
  }, [activeTab]);

  const handleDismissTourIntro = (moduleId: string) => {
    setAcknowledgedTourIntros((prev) => {
      const next = Array.from(new Set([...prev, moduleId]));
      localStorage.setItem("waypoint_portal_acknowledged_intros", JSON.stringify(next));
      return next;
    });
  };

  const handleStartTour = () => {
    setIsExplorationActive(true);
    localStorage.setItem("waypoint_portal_exploration_active", "true");
    setActiveTab("explore-portal");
  };

  const handleEndExploration = () => {
    setIsExplorationActive(false);
    localStorage.setItem("waypoint_portal_exploration_active", "false");
  };

  const handleResetTour = () => {
    setExploredTourIds([]);
    setAcknowledgedTourIntros([]);
    localStorage.removeItem("waypoint_portal_explored_modules");
    localStorage.removeItem("waypoint_portal_acknowledged_intros");
    setIsExplorationActive(true);
    localStorage.setItem("waypoint_portal_exploration_active", "true");
    setActiveTab("explore-portal");
    toast.info("Portal tour progress reset! Start exploring again.");
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Workspace Mode (Admin Editing)
  const params = useParams<{ studentId?: string }>();
  const routeStudentId = params.studentId ? parseInt(params.studentId, 10) : null;
  const isWorkspaceMode = !!routeStudentId;
  const [isAdminView, setIsAdminView] = useState(isWorkspaceMode);

  useEffect(() => {
    setIsAdminView(isWorkspaceMode);
  }, [isWorkspaceMode]);

  // Compass edit state in Workspace Mode
  const [editingCompass, setEditingCompass] = useState(false);
  const [compassForm, setCompassForm] = useState({
    currentStatus: "",
    lastMeetingSummary: "",
    nextStep: "",
    whoHasBall: "",
  });
  const { data: publicSessionTypes } = trpc.sessionTypes.listAll.useQuery(undefined, { retry: false });

  // Attorney edit state in Workspace Mode
  const [editingAttorney, setEditingAttorney] = useState(false);
  const [attorneyForm, setAttorneyForm] = useState({
    attorneyName: "",
    attorneyFirm: "",
    attorneyPhone: "",
    attorneyEmail: "",
    attorneyAddress: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showIepLinkDialog, setShowIepLinkDialog] = useState(false);
  const [iepLinkUrl, setIepLinkUrl] = useState("");
  const [iepLinkApptId, setIepLinkApptId] = useState<number | null>(null);
  const [iepLinkStudentName, setIepLinkStudentName] = useState("");
  const [iepLinkStudentId, setIepLinkStudentId] = useState<number | null>(null);
  const [confirmStudent, setConfirmStudent] = useState(false);

  const submitMeetingLink = trpc.portal.submitMeetingLink.useMutation({
    onSuccess: () => {
      toast.success("Meeting link sent to your advocate!");
      setShowIepLinkDialog(false);
      setIepLinkUrl("");
      setIepLinkApptId(null);
      setIepLinkStudentName("");
      setIepLinkStudentId(null);
      setConfirmStudent(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: portalUser, refetch: refetchPortalMe } = trpc.portalAuth.portalMe.useQuery();
  const portalLogout = trpc.portalAuth.portalLogout.useMutation({
    onSuccess: () => { localStorage.removeItem("portal_token"); refetchPortalMe(); },
  });

  const isPreviewMode = (typeof window !== "undefined" && window.location.search.includes("preview=true")) || isWorkspaceMode;
  const isOnPortalRoute = typeof window !== "undefined" && (window.location.pathname === "/portal" || window.location.pathname === "/client-portal" || window.location.pathname.startsWith("/project-workspace/"));
  const isClientOrPreview = (user?.role === "admin" && isPreviewMode) || !!portalUser || user?.role === "client" || (!!user && isOnPortalRoute);

  const { data: myStudents = [] } = trpc.portal.getMyStudents.useQuery(undefined, { enabled: !!portalUser || user?.role === "client" });

  const previewStudentContactId = routeStudentId || (() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("contactId");
    return v ? parseInt(v, 10) : null;
  })();

  const { data: studentDetail } = trpc.contacts.detail.useQuery(
    { id: previewStudentContactId! },
    { enabled: isPreviewMode && !!previewStudentContactId }
  );

  const { data: allContacts = [] } = trpc.contacts.list.useQuery(undefined, {
    enabled: isPreviewMode && typeof window !== "undefined" && !new URLSearchParams(window.location.search).get("parentContactId") && !studentDetail?.contact?.parentContactId,
  });

  const previewParentContactId = (() => {
    if (typeof window === "undefined") return null;
    const parentId = new URLSearchParams(window.location.search).get("parentContactId");
    if (parentId) return parseInt(parentId, 10);
    if (studentDetail?.contact?.parentContactId) return studentDetail.contact.parentContactId;
    
    // Fallback to the first parent contact in the system if no ID was provided
    const parent = allContacts.find((c: any) => c.type === "parent" || c.type === "contact");
    return parent?.id || null;
  })();

  const { data: previewStudents = [] } = trpc.portal.getStudentsForParent.useQuery(
    { parentContactId: previewParentContactId! },
    { enabled: isPreviewMode && !!previewParentContactId }
  );

  // Workspace Student payload reconstruction
  const workspaceStudents = studentDetail?.contact
    ? [{
        id: studentDetail.contact.id,
        firstName: studentDetail.contact.firstName,
        lastName: studentDetail.contact.lastName,
        email: studentDetail.contact.email,
        phone: studentDetail.contact.phone,
        company: studentDetail.contact.company,
        caseId: studentDetail.contact.caseId,
        parentContactId: studentDetail.contact.parentContactId,
        attorneyName: studentDetail.contact.attorneyName,
        attorneyFirm: studentDetail.contact.attorneyFirm,
        attorneyPhone: studentDetail.contact.attorneyPhone,
        attorneyEmail: studentDetail.contact.attorneyEmail,
        attorneyAddress: studentDetail.contact.attorneyAddress,
      }]
    : [];

  const portalStudents = isWorkspaceMode 
    ? workspaceStudents 
    : isPreviewMode 
      ? previewStudents 
      : myStudents;

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (isWorkspaceMode && previewStudentContactId) {
      setSelectedStudentId(previewStudentContactId);
    }
  }, [isWorkspaceMode, previewStudentContactId]);

  const fallbackStudent = {
    id: 101,
    firstName: "Liam",
    lastName: "Jenkins",
    gradeLevel: "4th Grade",
    caseId: 1,
    parentContactId: 1
  };

  const effectiveStudent = (selectedStudentId
    ? portalStudents.find((s) => s.id === selectedStudentId) ?? portalStudents[0]
    : portalStudents[0]) ?? fallbackStudent;
  const effectiveCaseId = effectiveStudent?.caseId ?? null;
  const effectiveStudentContactId = effectiveStudent?.id ?? null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus === "success") { toast.success("Payment successful! Your invoice has been updated."); window.history.replaceState({}, "", window.location.pathname); }
    else if (paymentStatus === "cancelled") { toast.error("Payment was cancelled. You can try again anytime."); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  const { data: studentAppointments = [], refetch: refetchStudentAppointments } = trpc.portal.getStudentAppointments.useQuery(
    { studentContactId: effectiveStudentContactId! }, { enabled: !!effectiveStudentContactId }
  );
  const { data: allMyAppointments = [], refetch: refetchAllMyAppointments } = trpc.portal.getAllMyAppointments.useQuery(
    undefined, { enabled: !!portalUser || isPreviewMode }
  );
  const { data: studentFiles = [], refetch: refetchFiles } = trpc.portal.getStudentFiles.useQuery(
    { studentContactId: effectiveStudentContactId! }, { enabled: !!effectiveStudentContactId }
  );
  const { data: smartFileAssignments = [] } = trpc.smartFiles.portalListAssignments.useQuery();
  const { data: studentBilling } = trpc.portal.getStudentBilling.useQuery(
    { studentContactId: effectiveStudentContactId! }, { enabled: !!effectiveStudentContactId }
  );
  const { data: vaultSubscription } = trpc.vault.getSubscription.useQuery(undefined, { enabled: !!portalUser || isPreviewMode });
  const { data: studentTasks = [], refetch: refetchTasks } = trpc.portal.getAssignedTasks.useQuery(
    { studentContactId: effectiveStudentContactId! }, { enabled: !!effectiveStudentContactId }
  );
  const updateTaskStatusMutation = trpc.portal.updateTaskStatus.useMutation({
    onSuccess: () => { refetchTasks(); },
    onError: (err) => toast.error(err.message || "Failed to update task status"),
  });
  const { data: studentProjects = [] } = trpc.portal.getStudentProjects.useQuery(
    { studentContactId: effectiveStudentContactId! }, { enabled: !!effectiveStudentContactId }
  );
  const { data: studentCompass } = trpc.portal.getStudentCompass.useQuery(
    { caseId: effectiveCaseId! }, { enabled: !!effectiveCaseId }
  );
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();

  const filteredNavItems = NAV_ITEMS.filter(({ id }) => {
    if (id === "attorney" && !effectiveStudent?.attorneyName && (!isWorkspaceMode || !isAdminView)) return false;
    const isInternalTab = id === "notes" || id === "tools" || id === "cases";
    if (isInternalTab && (!isWorkspaceMode || !isAdminView)) return false;
    return true;
  });

  const utils = trpc.useUtils();

  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      if (previewStudentContactId) {
        utils.contacts.detail.invalidate({ id: previewStudentContactId });
      }
      utils.portal.getMyStudents.invalidate();
      toast.success("Legal counsel details updated successfully.");
      setEditingAttorney(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save attorney details.");
    }
  });

  const handleSaveAttorney = () => {
    if (!effectiveStudentContactId) return;
    updateContactMutation.mutate({
      id: effectiveStudentContactId,
      ...attorneyForm,
    });
  };

  useEffect(() => {
    if (effectiveStudent) {
      setAttorneyForm({
        attorneyName: effectiveStudent.attorneyName || "",
        attorneyFirm: effectiveStudent.attorneyFirm || "",
        attorneyPhone: effectiveStudent.attorneyPhone || "",
        attorneyEmail: effectiveStudent.attorneyEmail || "",
        attorneyAddress: effectiveStudent.attorneyAddress || "",
      });
    }
  }, [effectiveStudent]);

  useEffect(() => {
    if (studentCompass) {
      setCompassForm({
        currentStatus: studentCompass.currentStatus || "",
        lastMeetingSummary: studentCompass.lastMeetingSummary || "",
        nextStep: studentCompass.nextStep || "",
        whoHasBall: studentCompass.whoHasBall || "",
      });
    }
  }, [studentCompass]);

  const compassUpsert = trpc.caseCompass.upsert.useMutation({
    onSuccess: () => {
      toast.success("Case Compass updated successfully");
      setEditingCompass(false);
      utils.portal.getStudentCompass.invalidate({ caseId: effectiveCaseId! });
    },
    onError: (err) => {
      toast.error("Failed to update Compass: " + err.message);
    }
  });

  const handleSaveCompass = () => {
    if (!effectiveCaseId) return;
    compassUpsert.mutate({
      caseId: effectiveCaseId,
      ...compassForm,
    });
  };

  // Developer Rules state & queries
  const [isDevRulesOpen, setIsDevRulesOpen] = useState(false);
  const [devRuleText, setDevRuleText] = useState("");

  const { data: devRules = [], refetch: refetchDevRules } = trpc.portal.getDevRules.useQuery(undefined, {
    enabled: isAdminView
  });

  const saveDevRulesMutation = trpc.portal.saveDevRules.useMutation({
    onSuccess: () => {
      toast.success("Developer guidelines saved");
      refetchDevRules();
      setIsDevRulesOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save developer rules");
    }
  });

  const handleSaveDevRules = () => {
    saveDevRulesMutation.mutate({
      tabKey: activeTab,
      content: devRuleText
    });
  };

  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: ownerUser } = trpc.auth.getOwner.useQuery();
  const { data: messages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: ownerUser?.id ?? 0 },
    { enabled: (user?.role === "client" || isPreviewMode) && !!ownerUser?.id }
  );
  const sendMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => { setNewMessage(""); refetchMessages(); },
    onError: (err) => toast.error(err.message),
  });
  const markReadMutation = trpc.messages.markAsRead.useMutation({ onSuccess: () => refetchMessages() });
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (messages.length > 0 && ownerUser?.id) {
      messages.forEach((msg: any) => { if (!msg.isRead && msg.senderId === ownerUser.id) markReadMutation.mutate({ id: msg.id }); });
    }
  }, [messages, ownerUser]);
  const handleSendMessage = () => {
    if (!newMessage.trim() || !ownerUser?.id) return;
    sendMessageMutation.mutate({ recipientId: ownerUser.id, content: newMessage.trim() });
  };

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
      const presignRes = await fetch("/api/files/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileSize: file.size }) });
      if (!presignRes.ok) throw new Error((await presignRes.json()).error || "Failed to get upload URL");
      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();
      const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
      const confirmRes = await fetch("/api/files/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: effectiveStudentContactId, fileName: file.name, fileKey, fileUrl, fileSize: file.size }) });
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
  const parentDisplayName = portalUser?.name ?? (studentDetail?.parentContact ? `${studentDetail.parentContact.firstName} ${studentDetail.parentContact.lastName}` : "Client");
  const advocateDisplayName = user?.name ? (user.name.toLowerCase().includes("byron") ? "Master IEP Coach Byron Honea" : `Advocate ${user.name}`) : "Advocate";
  const displayName = isAdminView ? advocateDisplayName : parentDisplayName;
  const parentContactId = isAdminView ? null : (studentDetail?.contact?.parentContactId ?? effectiveStudent?.parentContactId);

  const handleOpenScheduler = (sessionTypeId: number, sessionTypeName: string) => { setSchedulerSessionTypeId(sessionTypeId); setSchedulerSessionTypeName(sessionTypeName); setSchedulerBooked(false); };
  const handleSchedulerBooked = (date: string, time: string) => {
    setSchedulerBooked(true);
    toast.success(`Session booked for ${date} at ${time}!`);
    setTimeout(() => setShowMeetingScheduler(false), 2000);
  };

  if (!isClientOrPreview) return <PortalLoginForm onSuccess={refetchPortalMe} />;

  // ── Sidebar component ──
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-[#0d1b2a] ${mobile ? "w-72" : "w-64 shrink-0"}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-white/8">
        <img src={LOGO_URL} alt="Waypoint Advocates" className="h-10 w-10 object-contain shrink-0" />
        <div>
          <p className="text-sm font-bold tracking-widest text-white uppercase leading-tight">Waypoint</p>
          <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Advocates</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Student selector removed from sidebar - shown in main content area */}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(({ id }) => id !== "attorney" || !!effectiveStudent?.attorneyName).map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm font-normal
                ${isActive
                  ? "border border-amber-400/70 text-amber-300 bg-amber-400/10"
                  : "border border-transparent text-white/70 hover:text-white hover:bg-white/8"
                }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : "text-white/40"}`} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/8 space-y-3">
        {/* Theme + logout row */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={toggleTheme} title={theme === 'navy' ? 'Light mode' : 'Dark mode'}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70 text-xs">
            {theme === 'navy' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-300" />}
            <span>{theme === 'navy' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            onClick={() => { if (portalUser) portalLogout.mutate(); else logoutMutation.mutate(); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-red-400 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* User info */}
        <div className="px-1">
          <p className="text-xs font-medium text-white/60 truncate">{displayName}</p>
        </div>
      </div>
    </div>
  );

  // ── Active tab content ──
  const renderContent = () => {
    const onboardingModuleIds = [
      "discovery-call",
      "your-journey",
      "choose-support",
      "agreements",
      "student-setup",
      "upload-records",
      "advocacy-intake"
    ];

    if (!effectiveStudent && !onboardingModuleIds.includes(activeTab) && activeTab !== "compass" && activeTab !== "communication" && activeTab !== "files" && activeTab !== "smart-docs") {
      return (
        <LockedModulePreview
          moduleId={activeTab}
          moduleName={activeTab}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
        />
      );
    }

    switch (activeTab) {
      // ── Onboarding Experience Modules ──
      case "discovery-call":
        return (
          <DiscoveryCallExperience
            displayName={displayName}
            upcomingAppointment={allMyAppointments?.[0] || studentAppointments?.[0]}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onOpenScheduler={() => setShowMeetingScheduler(true)}
          />
        );

      case "your-journey":
        return (
          <YourJourneyExperience
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "choose-support":
        return (
          <ChooseSupportExperience
            onPaymentSuccess={() => {
              setClientStage("ONBOARDING");
              addCompletedStep("choose-support");
              setActiveTab("agreements");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "agreements":
        return (
          <AgreementsExperience
            onComplete={() => {
              addCompletedStep("agreements");
              setActiveTab("student-setup");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "student-setup":
        return (
          <StudentSetupExperience
            onComplete={() => {
              addCompletedStep("student-setup");
              setActiveTab("upload-records");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "upload-records":
        return (
          <UploadRecordsExperience
            onComplete={() => {
              addCompletedStep("upload-records");
              setActiveTab("advocacy-intake");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "advocacy-intake":
        return (
          <AdvocacyIntakeExperience
            onComplete={() => {
              addCompletedStep("advocacy-intake");
              setClientStage("ACTIVE");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        );

      case "explore-portal":
        return (
          <ExplorePortalExperience
            onContinueExploring={() => {
              setActiveTab("compass");
            }}
            onFinishTour={() => {
              setIsExplorationActive(false);
              localStorage.setItem("waypoint_portal_exploration_active", "false");
              toast.info("Exploration mode ended.");
            }}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            exploredModuleIds={exploredTourIds}
          />
        );

      case "compass":
        return (
          <div className="space-y-6">
            <ClientPortalDashboard
              displayName={displayName}
              effectiveStudent={effectiveStudent}
              isAdminView={isAdminView}
              studentAppointments={studentAppointments}
              messages={messages}
              studentTasks={studentTasks}
              studentFiles={studentFiles}
              studentCompass={studentCompass}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onOpenScheduler={() => setShowMeetingScheduler(true)}
              onUploadClick={() => fileInputRef.current?.click()}
              portalStudents={portalStudents}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              onOpenIepLinkDialog={(studentId, studentName) => {
                setIepLinkStudentId(studentId);
                setIepLinkStudentName(studentName);
                setConfirmStudent(false);
                setShowIepLinkDialog(true);
              }}
              allMyAppointments={allMyAppointments}
            />

            {/* Admin Compass Edit Form */}
            {isWorkspaceMode && isAdminView && (
              <div className="px-5 pb-6">
                <Card className="rounded-2xl border border-blue-900/40 p-6 bg-[#06172F] text-white shadow-xl space-y-4 max-w-4xl">
                  <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Compass className="h-5 w-5 text-amber-400" />
                      Edit Case Compass (Advocate Controls)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-white/80">Current Status / Phase</Label>
                      <Input
                        value={compassForm.currentStatus}
                        onChange={(e) => setCompassForm({ ...compassForm, currentStatus: e.target.value })}
                        placeholder="e.g. Preparing for IEP Review"
                        className="bg-[#030C22] border-blue-900/40 text-white rounded-xl focus:border-amber-400/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-white/80">Who Has the Ball?</Label>
                      <Input
                        value={compassForm.whoHasBall}
                        onChange={(e) => setCompassForm({ ...compassForm, whoHasBall: e.target.value })}
                        placeholder="e.g. Waypoint Advocates"
                        className="bg-[#030C22] border-blue-900/40 text-white rounded-xl focus:border-amber-400/60"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-white/80">Next Action / Step</Label>
                    <Input
                      value={compassForm.nextStep}
                      onChange={(e) => setCompassForm({ ...compassForm, nextStep: e.target.value })}
                      placeholder="e.g. Schedule IEP meeting with school"
                      className="bg-[#030C22] border-blue-900/40 text-white rounded-xl focus:border-amber-400/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-white/80">Meeting Summary Notes</Label>
                    <Textarea
                      value={compassForm.lastMeetingSummary}
                      onChange={(e) => setCompassForm({ ...compassForm, lastMeetingSummary: e.target.value })}
                      placeholder="Enter a brief summary of the last meeting or status updates for the client portal..."
                      rows={3}
                      className="bg-[#030C22] border-blue-900/40 text-white rounded-xl focus:border-amber-400/60"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveCompass}
                      disabled={compassUpsert.isPending}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl px-5 py-2 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
                    >
                      {compassUpsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Update Compass
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        );

      case "communication":
        return (
          <PortalCommunicationTab
            messages={messages}
            currentUserId={user?.id ? Number(user.id) : undefined}
            onSendMessage={(msgText) => {
              setNewMessage(msgText);
              handleSendMessage();
            }}
          />
        );

      case "tasks":
        return (
          <PortalTasksTab
            tasks={studentTasks}
            studentContactId={effectiveStudentContactId}
            projectId={studentProjects[0]?.id || 0}
            isAdminView={isAdminView}
            refetchTasks={refetchTasks}
          />
        );

      case "smart-docs":
        return (
          <PortalDocumentVaultTab
            effectiveStudent={effectiveStudent}
            displayName={displayName}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            isLight={theme === "blue"}
          />
        );

      case "files":
        return (
          <PortalActionCenterTab
            effectiveStudent={effectiveStudent}
            displayName={displayName}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            isLight={theme === "blue"}
          />
        );

      case "tools":
        return isAdminView ? (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Advocacy Tools</h2>
              <p className="text-sm text-muted-foreground mt-0.5">IEP comparison and state complaint builders.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">IEP/504 Comparison</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Compare two versions of the student's IEP or 504 plan to highlight all additions, deletions, and updates.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setLocation(`/tools?contactId=${effectiveStudentContactId}`)}
                      className="mt-3 text-xs font-semibold"
                    >
                      Open Comparison Tool
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <PenTool className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">State Complaint Builder</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Draft legal special education state complaints using historical notes, case timeline records, and templates.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setLocation("/tools/state-complaint-builder")}
                      className="mt-3 text-xs font-semibold"
                    >
                      Open Complaint Builder
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Tools</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Advocacy tools for {effectiveStudent.firstName}'s case</p>
            </div>
            {effectiveStudentContactId && <PortalToolsContent contactId={effectiveStudentContactId} />}
          </div>
        );

      case "cases":
        return (
          <div className="p-5 space-y-6">
            <CaseCompassCard caseId={effectiveCaseId ?? undefined} isAdminView={isAdminView} />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Cases & Projects</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Active cases and projects for {effectiveStudent.firstName}</p>
            </div>
            {studentProjects.length > 0 ? (
              <div className="space-y-3">
                {studentProjects.map((proj: any) => (
                  <Card key={proj.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{proj.name}</p>
                          {proj.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{proj.description}</p>}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {proj.startDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Started {new Date(proj.startDate).toLocaleDateString()}</span>}
                            {proj.endDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Ends {new Date(proj.endDate).toLocaleDateString()}</span>}
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
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20 px-5 py-4 flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                  <ScrollText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Formal Escalation Files</p>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5 leading-relaxed">This is where state complaints, resolution orders, MDR documents, tribunal records, findings, and federal case files are stored. Our goal is to keep this section empty — but when formal action is necessary, every document lives here.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["State Complaint", "Resolution Order", "MDR", "Tribunal Docs", "Findings", "Federal Case File"].map((tag) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "notes":
        return (
          <div className="p-5">
            {studentProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
                <StickyNote className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold text-foreground">No cases on file yet</p>
                <p className="text-xs text-muted-foreground mt-1">Notes will appear here once your advocate creates a case.</p>
              </div>
            ) : studentProjects.length === 1 ? (
              <NotesSection projectId={studentProjects[0].id} studentName={effectiveStudent.firstName} isClientView={!isAdminView} />
            ) : (
              <div className="space-y-6">
                {studentProjects.map((proj: any) => (
                  <div key={proj.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">{proj.name}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <NotesSection projectId={proj.id} studentName={effectiveStudent.firstName} isClientView={!isAdminView} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "financials":
      case "membership":
        return (
          <PortalMembershipTab
            displayName={displayName}
            effectiveStudent={effectiveStudent}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );

      case "appointments":
        return (
          <PortalAppointmentsTab
            displayName={displayName}
            effectiveStudent={effectiveStudent}
            studentAppointments={studentAppointments}
            allMyAppointments={allMyAppointments}
            phoneNumber={effectiveStudent?.phone || "(404) 555-0198"}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onOpenScheduler={() => setShowMeetingScheduler(true)}
            onUpdatePhone={(newPhone) => {
              if (effectiveStudentContactId) {
                updateContactMutation.mutate({
                  id: effectiveStudentContactId,
                  phone: newPhone,
                });
              }
            }}
            refetchAppointments={() => {
              refetchStudentAppointments();
              refetchAllMyAppointments();
            }}
            isAdminView={isAdminView}
          />
        );

      case "voyage-log":
        return (
          <ScopedErrorBoundary>
            <PortalVoyageLogTab isAdminView={isAdminView} isLight={isLight} />
          </ScopedErrorBoundary>
        );

      case "attorney":
        return (
          <div className="p-5 space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Scale className="h-6 w-6 text-red-500" />
                Legal Representation (Attorney)
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Assigned attorney and contact info for {effectiveStudent?.firstName || "the student"}'s case.
              </p>
            </div>

            <Card className="rounded-xl border border-border p-6 max-w-2xl bg-card shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                    {effectiveStudent?.attorneyName?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{effectiveStudent?.attorneyName || "No attorney assigned"}</h3>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                      {effectiveStudent?.attorneyFirm || "—"}
                    </p>
                  </div>
                </div>
                {isWorkspaceMode && isAdminView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAttorney(!editingAttorney)}
                    className="h-8 w-8 p-0"
                  >
                    {editingAttorney ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {editingAttorney ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80">Attorney Name</Label>
                      <Input
                        value={attorneyForm.attorneyName}
                        onChange={(e) => setAttorneyForm({ ...attorneyForm, attorneyName: e.target.value })}
                        placeholder="Jane Doe, Esq."
                        className="bg-[#0d1e33] border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Law Firm / Business</Label>
                      <Input
                        value={attorneyForm.attorneyFirm}
                        onChange={(e) => setAttorneyForm({ ...attorneyForm, attorneyFirm: e.target.value })}
                        placeholder="Doe Legal Group"
                        className="bg-[#0d1e33] border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Phone Number</Label>
                      <Input
                        value={attorneyForm.attorneyPhone}
                        onChange={(e) => setAttorneyForm({ ...attorneyForm, attorneyPhone: e.target.value })}
                        placeholder="(555) 019-2834"
                        className="bg-[#0d1e33] border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Email Address</Label>
                      <Input
                        value={attorneyForm.attorneyEmail}
                        onChange={(e) => setAttorneyForm({ ...attorneyForm, attorneyEmail: e.target.value })}
                        placeholder="jane.doe@lawfirm.com"
                        className="bg-[#0d1e33] border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Office Address</Label>
                    <Textarea
                      value={attorneyForm.attorneyAddress}
                      onChange={(e) => setAttorneyForm({ ...attorneyForm, attorneyAddress: e.target.value })}
                      placeholder="123 Law Lane, Suite 400, Atlanta GA 30303"
                      rows={3}
                      className="bg-[#0d1e33] border-white/10 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingAttorney(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAttorney} disabled={updateContactMutation.isPending} className="bg-amber-500 hover:bg-amber-400 text-background font-bold">
                      {updateContactMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-white/45 uppercase">Phone Number</span>
                      {effectiveStudent?.attorneyPhone ? (
                        <a href={`tel:${effectiveStudent.attorneyPhone}`} className="block text-sm font-semibold text-amber-400 hover:underline">
                          {effectiveStudent.attorneyPhone}
                        </a>
                      ) : (
                        <p className="text-sm text-white/30">—</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-white/45 uppercase">Email Address</span>
                      {effectiveStudent?.attorneyEmail ? (
                        <a href={`mailto:${effectiveStudent.attorneyEmail}`} className="block text-sm font-semibold text-amber-400 hover:underline">
                          {effectiveStudent.attorneyEmail}
                        </a>
                      ) : (
                        <p className="text-sm text-white/30">—</p>
                      )}
                    </div>
                  </div>

                  {effectiveStudent?.attorneyAddress ? (
                    <div className="space-y-1 border-t border-white/10 pt-4">
                      <span className="text-xs font-semibold text-white/45 uppercase">Office Address</span>
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        {effectiveStudent.attorneyAddress}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 border-t border-white/10 pt-4">
                      <span className="text-xs font-semibold text-white/45 uppercase">Office Address</span>
                      <p className="text-sm text-white/30">—</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        );


      case "details":
        const detailsList = [
          { label: "Student Legal Name", value: `${effectiveStudent.firstName} ${effectiveStudent.lastName || ""}`.trim(), icon: User },
          { label: "Case ID / Student Identifier", value: effectiveCaseId || "WP-STU-2026", icon: ShieldCheck },
          { label: "School District & Campus", value: effectiveStudent.company || "Fulton County Schools", icon: Building },
          { label: "Student Email", value: effectiveStudent.email || "Protected on file", icon: Mail },
          { label: "Student Phone", value: effectiveStudent.phone || "Protected on file", icon: Phone },
        ];

        if (studentDetail?.parentContact) {
          const parent = studentDetail.parentContact;
          detailsList.push({
            label: "Parent / Guardian",
            value: `${parent.firstName} ${parent.lastName}${parent.email ? ` (${parent.email})` : ""}`,
            icon: User
          });
        }

        return (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        Student Workspace
                      </h1>
                      <PageIdBadge id="PG-023-STU" name="Student Workspace" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                      Student educational profile, district records, and IEP case details for {effectiveStudent.firstName}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── STUDENT ADVOCACY HERO CARD ── */}
            <div className="rounded-2xl border border-amber-400/60 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 shadow-[0_4px_30px_rgba(11,37,83,0.35)] relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-950/80 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-2xl shadow-xl shrink-0">
                    {effectiveStudent.firstName?.charAt(0) || "S"}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {effectiveStudent.firstName} {effectiveStudent.lastName || ""}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Active Case Workspace
                      </span>
                    </div>
                    <p className="text-xs text-white/70">
                      School: <span className="text-amber-300 font-semibold">{effectiveStudent.company || "Fulton County Schools"}</span> &bull; Advocate: <span className="text-white font-semibold">Byron Honea (Master IEP Coach®)</span>
                    </p>
                    <p className="text-[11px] text-white/50">
                      FERPA Protected & Encrypted with AES-256 Storage
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                  <Button
                    onClick={() => setActiveTab("smart-docs")}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,181,68,0.25)] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <VaultSafeIcon className="h-4 w-4" />
                    Open Document Vault
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("files")}
                    className="border-blue-900/40 bg-blue-950/30 hover:bg-blue-900/40 text-white text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <ActionCenterIcon className="h-4 w-4" />
                    View Action Center
                  </Button>
                </div>
              </div>
            </div>

            {/* ── EDUCATIONAL & DEMOGRAPHIC DETAILS ── */}
            <div className="rounded-2xl border border-blue-900/40 bg-[#06172F] p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-400" />
                Student Profile & Case Records
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {detailsList.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-white/40 block font-mono">{label}</span>
                      <span className="text-xs font-semibold text-white truncate block">{value}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-950/50 text-amber-300 border border-blue-900/40 shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ADVOCACY MODULE SHORTCUTS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveTab("compass")}
                className="p-4 rounded-2xl border border-blue-900/40 bg-[#06172F] hover:bg-[#081B36] hover:border-amber-400/50 transition-all cursor-pointer shadow-xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Case Compass</h4>
                    <p className="text-[10px] text-white/50">IEP Goals & Journey</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div 
                onClick={() => setActiveTab("voyage-log")}
                className="p-4 rounded-2xl border border-blue-900/40 bg-[#06172F] hover:bg-[#081B36] hover:border-amber-400/50 transition-all cursor-pointer shadow-xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Voyage Log</h4>
                    <p className="text-[10px] text-white/50">Meeting Recordings</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div 
                onClick={() => setActiveTab("communication")}
                className="p-4 rounded-2xl border border-blue-900/40 bg-[#06172F] hover:bg-[#081B36] hover:border-amber-400/50 transition-all cursor-pointer shadow-xl flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Communication</h4>
                    <p className="text-[10px] text-white/50">Direct Advocate Chat</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        );

      case "renewal":
      case "renewals":
        return (
          <div className="p-5">
            <RenewalListingExperience
              studentName={effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName}`.trim() : "Liam Jenkins"}
              studentGrade={effectiveStudent?.grade || "5th Grade → 6th Grade"}
              currentTierName="Full IEP Representation (2025–2026)"
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleLogout = () => {
    if (portalUser) portalLogout.mutate();
    else logoutMutation.mutate();
  };

    const isLight = theme === "blue";
    return (
      <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-[3000ms] ease-in-out ${isLight ? "bg-[#f0f4f8] text-slate-900" : "bg-[#000821] text-white"}`}>
        {/* Workspace Admin Bar with downward yellow neon glow */}
        {isWorkspaceMode && (
          <div 
            className={`border-b-2 px-5 py-2.5 flex items-center justify-between gap-4 shrink-0 select-none z-10 transition-colors duration-[3000ms] ease-in-out ${
              isLight ? "bg-slate-100 text-slate-800" : "bg-slate-900 text-white"
            }`}
            style={{
              borderBottomColor: 'rgba(250, 204, 21, 0.75)',
              boxShadow: '0 4px 20px rgba(250, 204, 21, 0.45), 0 1px 5px rgba(250, 204, 21, 0.3)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)]"></span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>Project Workspace (Admin)</span>
              <span className={`text-xs ${isLight ? "text-slate-300" : "text-white/40"}`}>|</span>
              <span className={`text-xs font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{effectiveStudent?.firstName} {effectiveStudent?.lastName}</span>
            </div>
  
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAdminView(true)}
                className={`text-xs h-7 px-3 rounded-md font-medium transition-all duration-200 cursor-pointer border ${
                  isAdminView
                    ? isLight
                      ? "bg-white border-amber-500 text-amber-800 shadow-[0_0_6px_rgba(245,158,11,0.25)] opacity-100"
                      : "bg-[#061A33] border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] opacity-100"
                    : isLight
                      ? "bg-transparent border-amber-500/25 text-slate-600 hover:bg-[#ebf3fc] hover:border-amber-500/50 hover:text-amber-700"
                      : "bg-transparent border-amber-500/30 text-slate-300 hover:bg-[#061A33] hover:border-amber-400/50 hover:text-amber-300"
                }`}
              >
                💼 Advocate Master View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAdminView(false)}
                className={`text-xs h-7 px-3 rounded-md font-medium transition-all duration-200 cursor-pointer border ${
                  !isAdminView
                    ? isLight
                      ? "bg-white border-amber-500 text-amber-800 shadow-[0_0_6px_rgba(245,158,11,0.25)] opacity-100"
                      : "bg-[#061A33] border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] opacity-100"
                    : isLight
                      ? "bg-transparent border-amber-500/25 text-slate-600 hover:bg-[#ebf3fc] hover:border-amber-500/50 hover:text-amber-700"
                      : "bg-transparent border-amber-500/30 text-slate-300 hover:bg-[#061A33] hover:border-amber-400/50 hover:text-amber-300"
                }`}
              >
                👀 Client Master View
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/projects")}
                className="text-xs h-7 px-3.5 rounded-md font-medium bg-yellow-400 hover:bg-yellow-500 text-slate-950 border border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.35)] flex items-center gap-1 cursor-pointer transition-all duration-200"
              >
                <Home className="h-3 w-3 shrink-0" />
                <span>Back to CRM</span>
              </Button>
            </div>
          </div>
        )}

      <div className="flex-1 flex overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full shrink-0">
        <ClientPortalSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          displayName={displayName}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          logoUrl={logoData?.logoUrl}
          hasAttorney={!!effectiveStudent?.attorneyName}
          navItems={filteredNavItems}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          clientStage={stageFromUrl || clientStage}
          completedOnboardingSteps={completedOnboardingSteps}
          isExplorationActive={isExplorationActive}
          exploredTourIds={exploredTourIds}
          onStartTour={handleStartTour}
          onEndExploration={handleEndExploration}
          onResetTour={handleResetTour}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex flex-col h-full">
            <ClientPortalSidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              mobile
              onCloseMobile={() => setSidebarOpen(false)}
              displayName={displayName}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
              logoUrl={logoData?.logoUrl}
              hasAttorney={!!effectiveStudent?.attorneyName}
              navItems={filteredNavItems}
              clientStage={stageFromUrl || clientStage}
              completedOnboardingSteps={completedOnboardingSteps}
              isExplorationActive={isExplorationActive}
              exploredTourIds={exploredTourIds}
              onStartTour={handleStartTour}
              onEndExploration={handleEndExploration}
              onResetTour={handleResetTour}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile hamburger bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2 bg-[#161B22] shrink-0 border-b border-white/8">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-xs text-white/50 capitalize flex-1 text-center">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</span>
          <button onClick={toggleTheme} className="text-white/50 hover:text-white">
            {theme === 'navy' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Modular Header */}
        <ClientPortalHeader
          displayName={displayName}
          studentName={effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName}`.trim() : undefined}
          parentContactId={parentContactId}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenIepLinkDialog={() => setShowIepLinkDialog(true)}
          onOpenScheduler={() => setShowMeetingScheduler(true)}
          onLogout={handleLogout}
        />



        {/* Red Alert Attorney banner */}
        {effectiveStudent?.attorneyName && (
          <div className={`shrink-0 px-5 py-2.5 border-b flex items-center justify-between gap-3 text-xs transition-colors duration-[3000ms] ease-in-out ${
            isLight
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-red-500/10 border-red-500/25 text-red-200"
          }`}>
            <div className="flex items-center gap-2">
              <Scale className={`h-4 w-4 animate-pulse shrink-0 ${isLight ? "text-red-700" : "text-red-500"}`} />
              <span>
                <strong>Legal representation assigned:</strong> An attorney ({effectiveStudent.attorneyName}) is active on this case.
              </span>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => setActiveTab("attorney")}
              className={`p-0 h-auto text-xs font-semibold shrink-0 transition-colors duration-[3000ms] ease-in-out ${
                isLight ? "text-red-700 hover:text-red-800" : "text-red-400 hover:text-red-300"
              }`}
            >
              View Counsel Info →
            </Button>
          </div>
        )}

        {/* Scrollable content area */}
        <div className={`flex-1 overflow-y-auto relative ${isLight ? "bg-[#f8fafc]" : "bg-[#000821] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,35,64,0.35),rgba(0,8,33,1))]"}`}>
          <ScopedErrorBoundary moduleName={NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Portal Tab"}>
            {renderContent()}
          </ScopedErrorBoundary>

          {/* Golden Developer Guidelines Floating Button */}
          {isAdminView && (
            <div className="absolute top-4 right-4 z-20">
              <Button
                onClick={() => {
                  const rule = devRules.find((r: any) => r.tabKey === activeTab);
                  setDevRuleText(rule?.content || "");
                  setIsDevRulesOpen(true);
                }}
                className="h-8 px-2.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-lg text-xs font-bold gap-1 shadow-lg shadow-amber-500/5 transition-all"
                title="Developer Guidelines & Page Rules"
              >
                <BookOpen className="w-3.5 h-3.5" /> Dev Info
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Scheduler Dialog */}
      <Dialog open={showMeetingScheduler} onOpenChange={(open) => { setShowMeetingScheduler(open); if (!open) { setSchedulerSessionTypeId(null); setSchedulerSessionTypeName(""); setSchedulerBooked(false); } }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader><DialogTitle>Schedule a Meeting</DialogTitle></DialogHeader>
          {!schedulerSessionTypeId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select the type of meeting you'd like to schedule:</p>
              {(publicSessionTypes ?? []).length === 0 && <p className="text-sm text-muted-foreground italic">No session types available. Please contact us directly.</p>}
              {(publicSessionTypes ?? []).map((st: any) => (
                <Button key={st.id} onClick={() => handleOpenScheduler(st.id, st.name)} variant="outline" className="w-full justify-start gap-3 px-4 py-3 font-semibold">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{st.name}</span>
                  <span className="text-xs text-muted-foreground">{st.duration} {st.durationUnit === 'hours' ? (st.duration === 1 ? 'hour' : 'hours') : 'min'}</span>
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
              <InlineScheduler sessionTypeId={schedulerSessionTypeId} sessionTypeName={schedulerSessionTypeName} parentName={portalUser?.name ?? user?.name ?? ""} parentEmail={portalUser?.email ?? user?.email ?? ""} clientId={effectiveStudentContactId} studentName={effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName}`.trim() : ""} onBooked={handleSchedulerBooked} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showIepLinkDialog} onOpenChange={(open) => { setShowIepLinkDialog(open); if (!open) { setIepLinkUrl(""); setIepLinkApptId(null); setIepLinkStudentName(""); setIepLinkStudentId(null); setConfirmStudent(false); } }}>
        <DialogContent className="bg-[#0d1b2a] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-400" />
              Send Advocate My IEP Meeting Link
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm">
              Paste the meeting link your school sent you. Your advocate will receive it attached to your appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Meeting Link input — first */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Meeting Link</label>
              <input
                type="url"
                placeholder="https://meet.google.com/... or https://zoom.us/..."
                value={iepLinkUrl}
                onChange={(e) => setIepLinkUrl(e.target.value)}
                className="w-full bg-[#071422] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50"
              />
            </div>
            {/* IEP/504 appointment selector — always visible below */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Attach to Scheduled IEP/504 Meeting</label>
              {(() => {
                const iepAppts = studentAppointments.filter((a: any) =>
                  a.status !== 'Cancelled' &&
                  (a.meetingType?.toLowerCase().includes('iep') ||
                   a.meetingType?.toLowerCase().includes('504') ||
                   a.title?.toLowerCase().includes('iep') ||
                   a.title?.toLowerCase().includes('504'))
                );
                if (iepAppts.length === 0) {
                  return (
                    <p className="text-sm text-white/40 italic px-1">No scheduled IEP or 504 meetings found. Please schedule your IEP or 504 meeting first, then return here to attach the link.</p>
                  );
                }
                return (
                  <select
                    value={iepLinkApptId ?? ""}
                    onChange={(e) => setIepLinkApptId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#071422] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="">Select your IEP/504 meeting...</option>
                    {iepAppts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} — {new Date(a.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="confirm-iep-student"
                checked={confirmStudent}
                onChange={(e) => setConfirmStudent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/15 bg-[#071422] text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="confirm-iep-student" className="text-xs text-white/80 cursor-pointer select-none leading-normal">
                I confirm this is for <span className="font-bold text-amber-400">{iepLinkStudentName || (effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName}` : "")}</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => { setShowIepLinkDialog(false); setIepLinkUrl(""); setIepLinkApptId(null); setIepLinkStudentName(""); setIepLinkStudentId(null); setConfirmStudent(false); }}
              className="px-4 py-2 rounded-lg border border-white/15 text-white/60 hover:text-white text-sm transition-all"
            >
              Cancel
            </button>
            <button
              disabled={!iepLinkUrl.trim() || !iepLinkApptId || !confirmStudent || submitMeetingLink.isPending}
              onClick={() => {
                const targetStudentId = iepLinkStudentId || effectiveStudentContactId;
                if (!iepLinkApptId || !targetStudentId) return;
                submitMeetingLink.mutate({ appointmentId: iepLinkApptId, studentContactId: targetStudentId, meetingLink: iepLinkUrl.trim() });
              }}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#071422] font-semibold text-sm transition-all"
            >
              {submitMeetingLink.isPending ? "Sending..." : "Send to Advocate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Developer Guidelines Editor Dialog */}
      <Dialog open={isDevRulesOpen} onOpenChange={setIsDevRulesOpen}>
        <DialogContent className="bg-[#0A1628] border border-slate-800 text-white rounded-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Developer Guidelines: <span className="capitalize text-amber-300 font-semibold">{activeTab}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Use this space to store guidelines, ideas, or constraints for this tab. This popup is visible **only to advocates/developers** in Advocate View, not to clients.
            </p>
            <div className="space-y-2">
              <Label htmlFor="dev-rules" className="text-xs font-semibold text-slate-350">Guidelines & Ideas</Label>
              <Textarea
                id="dev-rules"
                value={devRuleText}
                onChange={(e) => setDevRuleText(e.target.value)}
                placeholder="Write rules or details for this page here..."
                rows={8}
                className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg text-xs leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-800/80 pt-4">
            <Button 
              onClick={() => setIsDevRulesOpen(false)} 
              className="bg-transparent hover:bg-slate-850 text-slate-400 rounded-lg px-4 py-1.5 text-xs border border-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDevRules}
              disabled={saveDevRulesMutation.isPending}
              className="bg-amber-400 hover:bg-amber-500 text-[#07111E] font-bold rounded-lg px-4 py-1.5 text-xs gap-1.5 shadow-lg shadow-amber-400/10"
            >
              {saveDevRulesMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Guidelines
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}
