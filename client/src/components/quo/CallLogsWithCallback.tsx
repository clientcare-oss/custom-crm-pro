import { useState } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  MessageSquare,
  FileText,
  Sparkles,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Check,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CallLogsWithCallbackProps {
  contactId?: number;
  studentId?: number;
  clientName?: string;
  className?: string;
}

export default function CallLogsWithCallback({
  contactId,
  studentId,
  clientName = "Client",
  className = "",
}: CallLogsWithCallbackProps) {
  const [filter, setFilter] = useState<"all" | "calls" | "missed" | "voicemails" | "sms">("all");
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<number, boolean>>({});

  const { data: logs, refetch, isLoading } = trpc.quo.listCallLogs.useQuery({
    contactId,
    studentId,
    filter,
  });

  const createCallbackMutation = trpc.quo.createCallbackTask.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to create callback: ${err.message}`);
    },
  });

  const toggleTranscript = (id: number) => {
    setExpandedTranscripts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCallback = (logId: number) => {
    createCallbackMutation.mutate({
      callLogId: logId,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background/60 border border-border/60 text-xs">
          <Button
            size="sm"
            variant={filter === "all" ? "secondary" : "ghost"}
            onClick={() => setFilter("all")}
            className="h-7 px-2.5 text-xs"
          >
            All Activity
          </Button>
          <Button
            size="sm"
            variant={filter === "calls" ? "secondary" : "ghost"}
            onClick={() => setFilter("calls")}
            className="h-7 px-2.5 text-xs gap-1"
          >
            <Phone className="h-3 w-3" />
            <span>Calls</span>
          </Button>
          <Button
            size="sm"
            variant={filter === "missed" ? "secondary" : "ghost"}
            onClick={() => setFilter("missed")}
            className="h-7 px-2.5 text-xs gap-1 text-amber-400"
          >
            <PhoneMissed className="h-3 w-3" />
            <span>Missed</span>
          </Button>
          <Button
            size="sm"
            variant={filter === "voicemails" ? "secondary" : "ghost"}
            onClick={() => setFilter("voicemails")}
            className="h-7 px-2.5 text-xs gap-1"
          >
            <Voicemail className="h-3 w-3" />
            <span>Voicemails</span>
          </Button>
          <Button
            size="sm"
            variant={filter === "sms" ? "secondary" : "ghost"}
            onClick={() => setFilter("sms")}
            className="h-7 px-2.5 text-xs gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            <span>SMS</span>
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          {logs?.length ?? 0} {logs?.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-muted-foreground">Loading call &amp; communication history...</div>
      ) : logs && logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log) => {
            const isMissed = log.isMissed || log.eventType === "call.missed";
            const isVoicemail = log.isVoicemail;
            const isSms = log.eventType === "message.received" || log.eventType === "message.delivered";
            const hasCallback = log.callbackStatus === "completed";
            const isExpanded = !!expandedTranscripts[log.id];

            return (
              <Card
                key={log.id}
                className={`border rounded-xl transition-all ${
                  isMissed
                    ? "border-amber-500/40 bg-amber-950/10"
                    : isVoicemail
                    ? "border-cyan-500/40 bg-cyan-950/10"
                    : "border-border/60 bg-[#06172F]/40"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Row: Icon, Direction, Timestamp, Actions */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg border ${
                          isMissed
                            ? "bg-amber-950/40 border-amber-800 text-amber-400"
                            : isVoicemail
                            ? "bg-cyan-950/40 border-cyan-800 text-cyan-400"
                            : isSms
                            ? "bg-blue-950/40 border-blue-800 text-blue-400"
                            : "bg-muted border-border text-foreground"
                        }`}
                      >
                        {isMissed ? (
                          <PhoneMissed className="h-4 w-4" />
                        ) : isVoicemail ? (
                          <Voicemail className="h-4 w-4" />
                        ) : isSms ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : log.direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-cyan-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">
                            {isMissed
                              ? "Missed Call"
                              : isVoicemail
                              ? "Voicemail Received"
                              : isSms
                              ? `SMS (${log.direction})`
                              : `${log.direction === "inbound" ? "Inbound" : "Outbound"} Call`}
                          </span>

                          {isMissed && (
                            <Badge variant="outline" className="text-[10px] bg-amber-950/40 text-amber-400 border-amber-800">
                              Needs Callback
                            </Badge>
                          )}

                          {isVoicemail && (
                            <Badge variant="outline" className="text-[10px] bg-cyan-950/40 text-cyan-300 border-cyan-800">
                              Voicemail
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{log.fromNumber} → {log.toNumber}</span>
                          {log.durationSeconds > 0 && (
                            <>
                              <span>•</span>
                              <span>{Math.floor(log.durationSeconds / 60)}m {log.durationSeconds % 60}s</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Callback action or status */}
                    <div className="flex items-center gap-2">
                      {isMissed && (
                        <>
                          {hasCallback ? (
                            <Badge variant="outline" className="text-xs gap-1 bg-emerald-950/40 text-emerald-400 border-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Callback Scheduled ✓</span>
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleCreateCallback(log.id)}
                              disabled={createCallbackMutation.isPending}
                              className="h-7 px-2.5 text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Create Callback Task</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* SMS Body */}
                  {log.smsBody && (
                    <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 text-xs text-foreground font-sans">
                      {log.smsBody}
                    </div>
                  )}

                  {/* Audio Recording Player */}
                  {log.recordingUrl && (
                    <div className="p-2 rounded-lg bg-background/60 border border-border/50 flex items-center gap-3">
                      <audio controls className="w-full h-8" src={log.recordingUrl}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}

                  {/* AI Summary */}
                  {log.summary && (
                    <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300">
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                        <span>AI Call Summary</span>
                      </div>
                      <p className="text-xs text-cyan-100/90 whitespace-pre-wrap">{log.summary}</p>
                    </div>
                  )}

                  {/* Voicemail or Call Transcript (Collapsible) */}
                  {(log.transcript || log.voicemailTranscript) && (
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTranscript(log.id)}
                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                      >
                        <FileText className="h-3 w-3 text-cyan-400" />
                        <span>{isVoicemail ? "Voicemail Transcript" : "Full Call Transcript"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>

                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-background/80 border border-border/60 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {log.transcript || log.voicemailTranscript}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
          No communication or call logs found for this client. When calls or texts arrive via Quo, they will appear here automatically.
        </div>
      )}
    </div>
  );
}
