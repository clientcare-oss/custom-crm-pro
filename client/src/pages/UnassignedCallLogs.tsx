import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone, PhoneIncoming, PhoneOutgoing, Loader2, Trash2, UserCheck,
  CheckCircle2, Settings2, MessageSquare, Voicemail, Eye, EyeOff,
  Copy, RefreshCw, Shield, ShieldCheck, ShieldAlert, ChevronDown, ChevronRight,
  Mic, Radio, Info
} from "lucide-react";
import { toast } from "sonner";

type FilterType = "all" | "unassigned" | "calls" | "voicemails" | "sms";

export default function UnassignedCallLogs() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rawExpandedId, setRawExpandedId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // Data queries
  const { data: logs = [], isLoading, refetch } = trpc.callLogs.listAll.useQuery({ filter, limit: 100 });
  const { data: studentsData } = trpc.contacts.list.useQuery();
  const { data: quoStatus } = trpc.system.getQuoStatus.useQuery();
  const students = (studentsData || []).filter((c: any) => c.jobTitle === "Student");

  // Mutations
  const assignMutation = trpc.callLogs.assign.useMutation({
    onSuccess: () => {
      toast.success("Call log assigned to student");
      utils.callLogs.listAll.invalidate();
      utils.callLogs.listUnassigned.invalidate();
      utils.callLogs.unassignedCount.invalidate();
    },
    onError: (e) => toast.error("Failed to assign: " + e.message),
  });

  const deleteMutation = trpc.callLogs.delete.useMutation({
    onSuccess: () => {
      toast.success("Call log deleted");
      utils.callLogs.listAll.invalidate();
      utils.callLogs.listUnassigned.invalidate();
      utils.callLogs.unassignedCount.invalidate();
    },
    onError: (e) => toast.error("Failed to delete: " + e.message),
  });

  const saveSecretMutation = trpc.system.setQuoSecret.useMutation({
    onSuccess: () => {
      toast.success("Signing secret saved");
      setSecretInput("");
      utils.system.getQuoStatus.invalidate();
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  function formatDuration(secs: number) {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function getLogIcon(log: any) {
    if (log.isVoicemail) return <Voicemail className="h-5 w-5 text-purple-500" />;
    if (log.eventType === "message.received" || log.eventType === "message.delivered") {
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    }
    if (log.direction === "inbound") return <PhoneIncoming className="h-5 w-5 text-emerald-500" />;
    return <PhoneOutgoing className="h-5 w-5 text-sky-500" />;
  }

  function getLogIconBg(log: any) {
    if (log.isVoicemail) return "bg-purple-50 dark:bg-purple-900/20";
    if (log.eventType === "message.received" || log.eventType === "message.delivered") return "bg-blue-50 dark:bg-blue-900/20";
    if (log.direction === "inbound") return "bg-emerald-50 dark:bg-emerald-900/20";
    return "bg-sky-50 dark:bg-sky-900/20";
  }

  function getLogLabel(log: any) {
    if (log.isVoicemail) return "Voicemail";
    if (log.eventType === "message.received") return "SMS Received";
    if (log.eventType === "message.delivered") return "SMS Sent";
    if (log.direction === "inbound") return "Incoming Call";
    return "Outgoing Call";
  }

  function getEventTypeBadge(eventType: string | null) {
    if (!eventType) return null;
    const map: Record<string, { label: string; className: string }> = {
      "call.completed": { label: "call.completed", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
      "call.transcript.completed": { label: "transcript", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
      "call.summary.completed": { label: "summary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
      "call.recording.completed": { label: "recording", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
      "message.received": { label: "message.received", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
      "message.delivered": { label: "message.delivered", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
    };
    const info = map[eventType];
    if (!info) return <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{eventType}</span>;
    return <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${info.className}`}>{info.label}</span>;
  }

  const webhookUrl = `${window.location.origin}/api/quo/webhook`;
  const isConfigured = quoStatus?.configured;

  const filterTabs: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Radio className="h-3.5 w-3.5" /> },
    { key: "unassigned", label: "Unassigned", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { key: "calls", label: "Calls", icon: <Phone className="h-3.5 w-3.5" /> },
    { key: "voicemails", label: "Voicemails", icon: <Voicemail className="h-3.5 w-3.5" /> },
    { key: "sms", label: "SMS", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Phone className="h-7 w-7 text-accent" />
            Call Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calls, voicemails, and messages from Quo (OpenPhone) — auto-matched to students when possible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Quo Settings
            {isConfigured ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            )}
          </Button>
        </div>
      </div>

      {/* Quo Settings Panel */}
      {showSettings && (
        <Card className="p-6 rounded-xl border border-accent/20 bg-accent/5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-accent" />
              Quo Integration Settings
            </h2>
            {isConfigured ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 gap-1">
                <ShieldCheck className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 gap-1">
                <ShieldAlert className="h-3 w-3" /> Setup Required
              </Badge>
            )}
          </div>

          {/* Webhook URL */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Your Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted border border-border rounded px-3 py-2 font-mono text-foreground truncate">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied!"); }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Signing Secret */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Signing Secret {isConfigured && <span className="text-emerald-600 normal-case font-normal">(saved)</span>}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={isConfigured ? "Enter new secret to update…" : "Paste signing secret from Quo…"}
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                disabled={!secretInput.trim() || saveSecretMutation.isPending}
                onClick={() => saveSecretMutation.mutate({ secret: secretInput.trim() })}
                className="flex-shrink-0 gap-1.5"
              >
                {saveSecretMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                Save Secret
              </Button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-accent" />
              Setup Instructions
            </p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>In Quo, go to <strong className="text-foreground">Settings → Integrations → Webhooks</strong> → Create webhook</li>
              <li>Paste the <strong className="text-foreground">Webhook URL</strong> above into the URL field</li>
              <li>Select these event types:
                <div className="flex flex-wrap gap-1 mt-1 ml-4">
                  {["call.completed", "call.transcript.completed", "call.summary.completed", "call.recording.completed", "message.received", "message.delivered"].map(e => (
                    <code key={e} className="bg-muted border border-border px-1.5 py-0.5 rounded text-foreground font-mono">{e}</code>
                  ))}
                </div>
              </li>
              <li>Click <strong className="text-foreground">⋯ → Reveal Signing Secret</strong> and copy it</li>
              <li>Paste the signing secret in the field above and click <strong className="text-foreground">Save Secret</strong></li>
            </ol>
          </div>

          {/* Event type guide */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">What Each Event Does</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { event: "call.completed", desc: "Logs every call (answered, missed, voicemail). Voicemail transcript included if available.", icon: <Phone className="h-3.5 w-3.5 text-slate-500" /> },
                { event: "call.transcript.completed", desc: "AI-generated full transcript of the call conversation.", icon: <Mic className="h-3.5 w-3.5 text-emerald-500" /> },
                { event: "call.summary.completed", desc: "AI-generated summary of key points from the call.", icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> },
                { event: "call.recording.completed", desc: "Recording URL for the call audio.", icon: <Radio className="h-3.5 w-3.5 text-orange-500" /> },
                { event: "message.received", desc: "Inbound SMS/MMS from a contact.", icon: <MessageSquare className="h-3.5 w-3.5 text-violet-500" /> },
                { event: "message.delivered", desc: "Outbound SMS/MMS successfully delivered.", icon: <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> },
              ].map(({ event, desc, icon }) => (
                <div key={event} className="flex items-start gap-2 rounded-lg bg-background border border-border p-2.5">
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <code className="text-xs font-mono text-foreground">{event}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{logs.length} records</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-full bg-muted p-6">
            <Phone className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">No logs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "all"
                ? "Call logs from Quo will appear here once the webhook is configured."
                : `No ${filter} logs found.`}
            </p>
            {!isConfigured && (
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowSettings(true)}>
                <Settings2 className="h-3.5 w-3.5" />
                Configure Quo Webhook
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => (
            <Card
              key={log.id}
              className={`p-5 rounded-xl border transition-colors ${
                log.status === "unassigned"
                  ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-4 flex-wrap">
                {/* Icon */}
                <div className={`flex-shrink-0 rounded-full p-2.5 ${getLogIconBg(log)}`}>
                  {getLogIcon(log)}
                </div>

                {/* Log info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{getLogLabel(log)}</span>
                    {log.eventType && getEventTypeBadge(log.eventType)}
                    {log.status === "unassigned" && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                        Unassigned
                      </span>
                    )}
                    {log.status === "assigned" && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">
                        Assigned
                      </span>
                    )}
                    {log.durationSeconds > 0 && (
                      <span className="text-xs text-muted-foreground">{formatDuration(log.durationSeconds)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {log.fromNumber && <span>From: <span className="font-mono">{log.fromNumber}</span></span>}
                    {log.toNumber && <span>To: <span className="font-mono">{log.toNumber}</span></span>}
                  </div>

                  {/* SMS body */}
                  {log.smsBody && (
                    <div className="mt-2 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50 px-3 py-2">
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">Message</p>
                      <p className="text-sm text-foreground">{log.smsBody}</p>
                    </div>
                  )}

                  {/* Voicemail transcript */}
                  {log.voicemailTranscript && (
                    <div className="mt-2 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 px-3 py-2">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                        <Voicemail className="h-3 w-3" /> Voicemail Transcript
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{log.voicemailTranscript}</p>
                    </div>
                  )}

                  {/* AI Summary */}
                  {log.summary && (
                    <div className="mt-2 rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
                      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">AI Summary</p>
                      <p className="text-sm text-foreground leading-relaxed">{log.summary}</p>
                    </div>
                  )}

                  {/* Recording URL */}
                  {log.recordingUrl && (
                    <div className="mt-2">
                      <a
                        href={log.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Radio className="h-3 w-3" /> Listen to recording
                      </a>
                    </div>
                  )}

                  {/* Transcript toggle */}
                  {log.transcript && (
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="mt-2 text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      {expandedId === log.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {expandedId === log.id ? "Hide transcript" : "View full transcript"}
                    </button>
                  )}
                  {expandedId === log.id && log.transcript && (
                    <div className="mt-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                      <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{log.transcript}</pre>
                    </div>
                  )}

                  {/* Raw event toggle (debug) */}
                  {log.rawPayload && (
                    <button
                      onClick={() => setRawExpandedId(rawExpandedId === log.id ? null : log.id)}
                      className="mt-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {rawExpandedId === log.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {rawExpandedId === log.id ? "Hide raw event" : "View raw event"}
                    </button>
                  )}
                  {rawExpandedId === log.id && log.rawPayload && (
                    <div className="mt-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2">
                      <pre className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                        {JSON.stringify(log.rawPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Assign controls */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {log.status === "unassigned" && (
                    <>
                      <Select
                        value={selectedStudent[log.id] || ""}
                        onValueChange={(v) => setSelectedStudent(prev => ({ ...prev, [log.id]: v }))}
                      >
                        <SelectTrigger className="w-44 h-9 text-sm">
                          <SelectValue placeholder="Select student…" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.firstName} {s.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!selectedStudent[log.id] || assignMutation.isPending}
                        onClick={() => {
                          const sid = parseInt(selectedStudent[log.id]);
                          if (sid) assignMutation.mutate({ callLogId: log.id, studentId: sid });
                        }}
                        className="gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </>
                  )}
                  <button
                    onClick={() => { if (confirm("Delete this log?")) deleteMutation.mutate({ id: log.id }); }}
                    className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
