import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneIncoming, PhoneOutgoing, Loader2, Trash2, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function UnassignedCallLogs() {
  const utils = trpc.useUtils();
  const { data: logs = [], isLoading } = trpc.callLogs.listUnassigned.useQuery();
  const { data: studentsData } = trpc.contacts.list.useQuery();
  const students = (studentsData || []).filter((c: any) => c.jobTitle === "Student");

  const assignMutation = trpc.callLogs.assign.useMutation({
    onSuccess: () => {
      toast.success("Call log assigned to student");
      utils.callLogs.listUnassigned.invalidate();
      utils.callLogs.unassignedCount.invalidate();
    },
    onError: (e) => toast.error("Failed to assign: " + e.message),
  });

  const deleteMutation = trpc.callLogs.delete.useMutation({
    onSuccess: () => {
      toast.success("Call log deleted");
      utils.callLogs.listUnassigned.invalidate();
      utils.callLogs.unassignedCount.invalidate();
    },
    onError: (e) => toast.error("Failed to delete: " + e.message),
  });

  const [selectedStudent, setSelectedStudent] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function formatDuration(secs: number) {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Phone className="h-7 w-7 text-accent" />
            Unassigned Call Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calls from Quo (OpenPhone) that couldn't be auto-matched to a student. Assign each one to the correct student.
          </p>
        </div>
        {logs.length > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{logs.length} unassigned</span>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 p-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No unassigned call logs. New calls from Quo will appear here when they can't be auto-matched.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <Card key={log.id} className="p-5 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Direction icon */}
                <div className={`flex-shrink-0 rounded-full p-2.5 ${log.direction === "inbound" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600"}`}>
                  {log.direction === "inbound" ? <PhoneIncoming className="h-5 w-5" /> : <PhoneOutgoing className="h-5 w-5" />}
                </div>

                {/* Call info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {log.direction === "inbound" ? "Incoming" : "Outgoing"} Call
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDuration(log.durationSeconds)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {log.fromNumber && <span>From: <span className="font-mono">{log.fromNumber}</span></span>}
                    {log.toNumber && <span>To: <span className="font-mono">{log.toNumber}</span></span>}
                  </div>

                  {/* AI Summary */}
                  {log.summary && (
                    <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 px-3 py-2">
                      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">AI Summary</p>
                      <p className="text-sm text-foreground leading-relaxed">{log.summary}</p>
                    </div>
                  )}

                  {/* Transcript toggle */}
                  {log.transcript && (
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="mt-2 text-xs text-accent hover:underline"
                    >
                      {expandedId === log.id ? "Hide transcript" : "View full transcript"}
                    </button>
                  )}
                  {expandedId === log.id && log.transcript && (
                    <div className="mt-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                      <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{log.transcript}</pre>
                    </div>
                  )}
                </div>

                {/* Assign controls */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <Select
                    value={selectedStudent[log.id] || ""}
                    onValueChange={(v) => setSelectedStudent(prev => ({ ...prev, [log.id]: v }))}
                  >
                    <SelectTrigger className="w-48 h-9 text-sm">
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
                  <button
                    onClick={() => { if (confirm("Delete this call log?")) deleteMutation.mutate({ id: log.id }); }}
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

      {/* Setup instructions */}
      <Card className="p-5 rounded-xl border border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground mb-2">Quo Webhook Setup</h3>
        <p className="text-xs text-muted-foreground mb-3">
          To enable automatic call transcript import, configure a webhook in your Quo (OpenPhone) account:
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Go to Quo Settings → Integrations → Webhooks</li>
          <li>Add a new webhook pointing to: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">/api/quo/webhook</code></li>
          <li>Select events: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">call.transcript.completed</code> and <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">call.summary.completed</code></li>
          <li>Copy the signing secret and add it as <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">QUO_WEBHOOK_SECRET</code> in Settings → Secrets</li>
        </ol>
      </Card>
    </div>
  );
}
