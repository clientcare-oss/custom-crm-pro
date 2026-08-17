import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bug,
  Lightbulb,
  Zap,
  HelpCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  Terminal,
  Radio,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getRecentLogs, LogEntry } from "@/lib/consoleLogger";

interface IssueReporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ISSUE_TYPES = [
  { id: "bug", label: "Bug / Error", icon: Bug, color: "text-rose-500 bg-rose-500/10 border-rose-500/30" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  { id: "improvement", label: "Improvement", icon: Zap, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  { id: "question", label: "Question", icon: HelpCircle, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
] as const;

const PRIORITIES = [
  { value: 1, label: "Urgent", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  { value: 2, label: "High", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { value: 3, label: "Medium", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { value: 4, label: "Low", color: "bg-muted text-muted-foreground border-border" },
];

export function IssueReporterModal({ open, onOpenChange }: IssueReporterModalProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [tab, setTab] = useState<"new" | "recent">("new");

  const [issueType, setIssueType] = useState<"bug" | "feature" | "improvement" | "question">("bug");
  const [priority, setPriority] = useState<number>(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [capturedLogs, setCapturedLogs] = useState<LogEntry[]>([]);
  const [createdIssue, setCreatedIssue] = useState<{ identifier: string; url: string; title: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: recentIssues = [], isLoading: isLoadingRecent } = trpc.feedback.listRecentIssues.useQuery(undefined, {
    enabled: open && tab === "recent",
  });

  // Capture logs when dialog opens
  useEffect(() => {
    if (open) {
      setCapturedLogs(getRecentLogs());
      setCreatedIssue(null);
    }
  }, [open]);

  const submitMutation = trpc.feedback.submitIssue.useMutation({
    onSuccess: (data) => {
      toast.success(`Issue ${data.issue.identifier} submitted to Linear backlog!`);
      setCreatedIssue({
        identifier: data.issue.identifier,
        url: data.issue.url,
        title: data.issue.title,
      });
      setTitle("");
      setDescription("");
      utils.feedback.listRecentIssues.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit issue");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both title and description");
      return;
    }

    submitMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      issueType,
      priority,
      routeContext: {
        url: typeof window !== "undefined" ? window.location.href : undefined,
        pathname: location,
        search: typeof window !== "undefined" ? window.location.search : undefined,
      },
      browserContext: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        platform: typeof navigator !== "undefined" ? (navigator as any).userAgentData?.platform || navigator.platform : undefined,
        screenWidth: typeof window !== "undefined" ? window.innerWidth : undefined,
        screenHeight: typeof window !== "undefined" ? window.innerHeight : undefined,
      },
      consoleLogs: capturedLogs,
    });
  };

  const errorCount = capturedLogs.filter((l) => l.type === "error" || l.type === "exception").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-card border border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Waypoint Advocates Issue & Feedback
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submits directly into the Veritas Linear Backlog with automated diagnostics.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full bg-muted/40 p-1 border border-border/60 rounded-lg">
            <TabsTrigger value="new" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
              New Report
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Recent Backlog
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NEW ISSUE FORM */}
          <TabsContent value="new" className="space-y-4 mt-4">
            {createdIssue ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-foreground">Issue Filed in Linear!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Your ticket <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{createdIssue.identifier}</span> has been logged to the Waypoint Advocates project backlog.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={createdIssue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    View in Linear <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Button variant="outline" size="sm" onClick={() => setCreatedIssue(null)} className="text-xs">
                    Submit Another Report
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ISSUE_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = issueType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setIssueType(t.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? `${t.color} border-current shadow-xs`
                              : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                          priority === p.value
                            ? `${p.color} border-current font-bold shadow-xs`
                            : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="issue-title" className="text-xs font-semibold text-foreground">
                    Title / Summary *
                  </Label>
                  <Input
                    id="issue-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Voyage meeting log summary not updating"
                    required
                    className="text-sm bg-muted/20 border-border/70 focus:border-accent"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="issue-desc" className="text-xs font-semibold text-foreground">
                    Details & Steps to Reproduce *
                  </Label>
                  <Textarea
                    id="issue-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened, what you expected, or the feature you'd like to see..."
                    rows={4}
                    required
                    className="text-sm bg-muted/20 border-border/70 focus:border-accent"
                  />
                </div>

                {/* Diagnostics Preview Accordion */}
                <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-accent" />
                      Auto-Captured Context & Diagnostics
                      {errorCount > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500 border-rose-500/30 px-1.5 py-0">
                          {errorCount} error{errorCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </span>
                    {showDiagnostics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showDiagnostics && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/40 text-[11px] font-mono space-y-1.5 text-muted-foreground bg-background/50">
                      <p><span className="text-foreground font-semibold">Route:</span> {location}</p>
                      <p><span className="text-foreground font-semibold">User:</span> {user?.name || "Anonymous"} ({user?.email})</p>
                      <p><span className="text-foreground font-semibold">Viewport:</span> {typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}</p>
                      <div className="mt-2 pt-2 border-t border-border/40">
                        <p className="font-semibold text-foreground mb-1">Recent Console Activity ({capturedLogs.length}):</p>
                        {capturedLogs.length === 0 ? (
                          <p className="italic text-muted-foreground">No recent errors logged.</p>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1 bg-black/30 p-2 rounded border border-border/50 text-[10px]">
                            {capturedLogs.map((log, idx) => (
                              <div key={idx} className={`leading-tight ${log.type === "error" || log.type === "exception" ? "text-rose-400" : "text-amber-400"}`}>
                                [{log.type.toUpperCase()}] {log.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitMutation.isPending || !title.trim() || !description.trim()}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Submit to Linear Backlog
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* TAB 2: RECENT ISSUES */}
          <TabsContent value="recent" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                Latest issues submitted for Waypoint Advocates:
              </p>
              <a
                href="https://linear.app/veritas-technology-solutions/project/waypoint-advocates-custom-crm-pro-6f1c872aa4b2"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
              >
                Open in Linear <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {isLoadingRecent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentIssues.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No recent issues found in project backlog.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {recentIssues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3 flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-accent">{issue.identifier}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            issue.stateType === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                              : issue.stateType === "started"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {issue.stateName}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground font-medium mt-1 leading-snug">{issue.title}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {new Date(issue.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-accent flex-shrink-0 transition-colors"
                      title="Open in Linear"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
