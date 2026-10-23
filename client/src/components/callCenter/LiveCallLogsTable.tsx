import React, { useState } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  MessageSquare,
  Clock,
  UserCheck,
  UserPlus,
  Radio,
  FileCode2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";
import { toast } from "sonner";

export interface CallLogItem {
  id: number;
  ownerId: number;
  studentId?: number | null;
  contactId?: number | null;
  quoCallId?: string | null;
  fromNumber: string;
  toNumber: string;
  durationSeconds?: number | null;
  direction: string;
  transcript?: string | null;
  summary?: string | null;
  isVoicemail?: boolean | number | null;
  voicemailTranscript?: string | null;
  recordingUrl?: string | null;
  smsBody?: string | null;
  status: string; // "assigned" | "unassigned"
  matchedPhone?: string | null;
  eventType?: string | null;
  rawPayload?: any;
  createdAt: string | Date;
}

interface LiveCallLogsTableProps {
  logs: CallLogItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onCallNumber?: (phone: string, name?: string) => void;
  onOpenSms?: (phone: string, name?: string) => void;
  onAssignToLead?: (log: CallLogItem) => void;
  onOpenSettings?: () => void;
}

export function LiveCallLogsTable({
  logs = [],
  isLoading = false,
  onRefresh,
  onCallNumber,
  onOpenSms,
  onAssignToLead,
  onOpenSettings,
}: LiveCallLogsTableProps) {
  const [filter, setFilter] = useState<"all" | "sms" | "inbound" | "completed" | "missed" | "voicemail">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayload, setSelectedPayload] = useState<CallLogItem | null>(null);
  const [viewingMessageLog, setViewingMessageLog] = useState<CallLogItem | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFrom = (log.fromNumber || "").toLowerCase().includes(q);
      const matchTo = (log.toNumber || "").toLowerCase().includes(q);
      const matchBody = (log.smsBody || "").toLowerCase().includes(q);
      const matchSummary = (log.summary || "").toLowerCase().includes(q);
      const matchId = String(log.id).includes(q) || (log.quoCallId || "").toLowerCase().includes(q);
      const matchEvent = (log.eventType || "").toLowerCase().includes(q);
      if (!matchFrom && !matchTo && !matchBody && !matchSummary && !matchId && !matchEvent) return false;
    }

    if (filter === "sms") {
      return (log.eventType || "").startsWith("message.") || Boolean(log.smsBody);
    }
    if (filter === "inbound") {
      return log.eventType === "call.ringing" || log.eventType === "call.started" || log.direction === "incoming" || log.direction === "inbound";
    }
    if (filter === "completed") {
      return log.eventType === "call.completed";
    }
    if (filter === "missed") {
      return log.eventType === "call.missed" || (log as any).isMissed;
    }
    if (filter === "voicemail") {
      return Boolean(log.isVoicemail);
    }
    return true;
  });

  const smsCount = logs.filter((l) => (l.eventType || "").startsWith("message.") || Boolean(l.smsBody)).length;
  const missedCount = logs.filter((l) => l.eventType === "call.missed" || (l as any).isMissed).length;
  const voicemailCount = logs.filter((l) => Boolean(l.isVoicemail)).length;

  const formatTimestamp = (dateInput: string | Date) => {
    try {
      const d = new Date(dateInput);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateInput);
    }
  };

  const getEventBadge = (log: CallLogItem) => {
    const event = log.eventType || (log.isVoicemail ? "voicemail" : "call.completed");
    if (event === "call.ringing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Ringing / Incoming
        </span>
      );
    }
    if (event === "call.completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Completed Call
        </span>
      );
    }
    if (event === "call.missed" || (log as any).isMissed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Missed Call
        </span>
      );
    }
    if (log.isVoicemail) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          <Voicemail className="w-3 h-3" />
          Voicemail
        </span>
      );
    }
    if (event === "message.received") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <MessageSquare className="w-3 h-3" />
          Inbound Text
        </span>
      );
    }
    if (event === "message.delivered") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
          <Send className="w-3 h-3" />
          Sent Text
        </span>
      );
    }
    if (event.startsWith("message.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <MessageSquare className="w-3 h-3" />
          SMS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#102B4E] text-[#C6B697] border border-[#3A2C18]">
        {event}
      </span>
    );
  };

  return (
    <div className="bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#3A2C18]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] shadow-inner">
            <Radio className="h-5 w-5 animate-pulse text-[#FFE394]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-[#FFF4D4] tracking-tight">
                Live Quo Webhook & Call Log Feed
              </h3>
              <PageIdBadge id="PG-018" variant="inline" />
              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold">
                ● Live Sync Active
              </Badge>
            </div>
            <p className="text-xs text-[#C6B697]">
              Real-time inbound/outbound calls, full SMS text messages, and voicemails captured by Waypoint CRM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] h-8 px-3 rounded-xl text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#FFE394]" : ""}`} />
              <span>Refresh</span>
            </Button>
          )}

          {onOpenSettings && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSettings}
              className="border border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] hover:text-[#FFF4D4] h-8 px-3 rounded-xl text-xs cursor-pointer shadow-sm"
            >
              Quo Settings
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "all"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setFilter("sms")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filter === "sms"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>SMS Texts ({smsCount})</span>
          </button>
          <button
            onClick={() => setFilter("inbound")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "inbound"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            Inbound / Ringing
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "completed"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            Completed Calls
          </button>
          <button
            onClick={() => setFilter("missed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "missed"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            Missed ({missedCount})
          </button>
          <button
            onClick={() => setFilter("voicemail")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "voicemail"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                : "bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]/60"
            }`}
          >
            Voicemails ({voicemailCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#C6B697]" />
          <input
            type="text"
            placeholder="Search text messages, phones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#020A17] border border-[#3A2C18] rounded-lg text-[#FFF4D4] placeholder:text-[#C6B697]/50 focus:outline-none focus:border-[#C5A059]"
          />
        </div>
      </div>

      {/* Call & Text Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-xl p-8 text-center space-y-3">
          <MessageSquare className="h-8 w-8 text-[#C6B697]/40 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-[#FFF4D4]">No Communications Found</h4>
            <p className="text-xs text-[#C6B697] max-w-md mx-auto">
              {searchQuery
                ? `No logs match "${searchQuery}". Try a different term or clear the search.`
                : "No calls or text messages recorded under this filter yet. Send a test SMS to your Quo business number to see it appear here in real time."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#3A2C18]/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#020A17] border-b border-[#3A2C18] text-[#C6B697] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Status & Type</th>
                <th className="py-2.5 px-3">From (Sender)</th>
                <th className="py-2.5 px-3">To (Recipient)</th>
                <th className="py-2.5 px-3 min-w-[260px]">Message / Call Content</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Assignment</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A2C18]/40 bg-[#05142B]/60">
              {filteredLogs.map((log) => {
                const isRinging = log.eventType === "call.ringing";
                const isSms = Boolean(log.smsBody || (log.eventType || "").startsWith("message."));
                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-[#07162B] transition-colors ${
                      isRinging ? "bg-amber-500/5 border-l-2 border-l-amber-400" : ""
                    }`}
                  >
                    {/* Event & Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEventBadge(log)}
                        <span className="text-[10px] text-[#A69371] font-mono">#{log.id}</span>
                      </div>
                    </td>

                    {/* From */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#FFF4D4] font-mono tracking-tight">
                        {log.fromNumber || "Unknown Sender"}
                      </div>
                      {log.quoCallId && (
                        <div className="text-[10px] text-[#A69371] font-mono truncate max-w-[120px]" title={log.quoCallId}>
                          {log.quoCallId}
                        </div>
                      )}
                    </td>

                    {/* To */}
                    <td className="py-3 px-3 text-[#D8C7A5] font-mono whitespace-nowrap">
                      {log.toNumber || "Waypoint Practice"}
                    </td>

                    {/* Message / Call Content (PROMINENT COLUMN) */}
                    <td className="py-3 px-3">
                      {log.smsBody ? (
                        <div
                          onClick={() => setViewingMessageLog(log)}
                          className="bg-[#020A17] hover:bg-[#102B4E]/60 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-sm group"
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-[#FFF4D4] font-medium leading-relaxed break-words line-clamp-3">
                              "{log.smsBody}"
                            </div>
                          </div>
                          <div className="text-[10px] text-[#C5A059] group-hover:text-[#FFE394] mt-1 flex items-center gap-1 font-semibold">
                            <Eye className="w-3 h-3" />
                            <span>Click to view full message & reply</span>
                          </div>
                        </div>
                      ) : log.summary ? (
                        <div className="text-xs text-[#D8C7A5] line-clamp-2 italic">
                          "{log.summary}"
                        </div>
                      ) : log.voicemailTranscript ? (
                        <div className="text-xs text-purple-300 line-clamp-2">
                          Voicemail: "{log.voicemailTranscript}"
                        </div>
                      ) : (
                        <div className="text-xs text-[#A69371]">
                          {log.durationSeconds ? `Call duration: ${log.durationSeconds}s` : "Voice Call"}
                        </div>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#C6B697]">
                      {formatTimestamp(log.createdAt)}
                    </td>

                    {/* Assignment */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {log.status === "assigned" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <UserCheck className="h-3 w-3" />
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                          <UserPlus className="h-3 w-3" />
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                      {isSms && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingMessageLog(log)}
                          className="h-7 px-2.5 text-xs text-cyan-300 hover:text-white hover:bg-[#020A17] border border-cyan-500/30 rounded-lg cursor-pointer"
                          title="View full text message"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Text
                        </Button>
                      )}

                      {onCallNumber && log.fromNumber && !isSms && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCallNumber(log.fromNumber)}
                          className="h-7 px-2.5 text-xs text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#020A17] border border-[#3A2C18] rounded-lg cursor-pointer"
                          title="Call back via Quo"
                        >
                          <Phone className="h-3 w-3 mr-1 text-[#FFE394]" />
                          Call
                        </Button>
                      )}

                      {onAssignToLead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAssignToLead(log)}
                          className="h-7 px-2.5 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#020A17] border border-[#3A2C18] rounded-lg cursor-pointer"
                          title="Open in Workspace"
                        >
                          Workspace
                        </Button>
                      )}

                      {log.rawPayload && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPayload(log)}
                          className="h-7 px-2 text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#020A17] border border-[#3A2C18] rounded-lg cursor-pointer"
                          title="Inspect raw webhook JSON payload from Quo"
                        >
                          <FileCode2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Message Viewer Dialog */}
      {viewingMessageLog && (
        <Dialog open={!!viewingMessageLog} onOpenChange={() => setViewingMessageLog(null)}>
          <DialogContent className="max-w-xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="font-serif text-[#FFF4D4] text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <span>Text Message Details</span>
                </DialogTitle>
                {getEventBadge(viewingMessageLog)}
              </div>
              <DialogDescription className="text-[#C6B697] text-xs">
                Captured via Quo SMS Webhook on {formatTimestamp(viewingMessageLog.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              {/* Sender & Receiver Card */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#020A17] p-3 rounded-xl border border-[#3A2C18]">
                  <span className="text-[#A69371] block text-[10px] uppercase font-bold tracking-wider">From (Sender)</span>
                  <span className="text-[#FFF4D4] font-mono font-semibold text-sm">{viewingMessageLog.fromNumber}</span>
                </div>
                <div className="bg-[#020A17] p-3 rounded-xl border border-[#3A2C18]">
                  <span className="text-[#A69371] block text-[10px] uppercase font-bold tracking-wider">To (Your Business)</span>
                  <span className="text-[#FFF4D4] font-mono font-semibold text-sm">{viewingMessageLog.toNumber}</span>
                </div>
              </div>

              {/* Full Text Message Body Bubble */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#FFE394] block uppercase tracking-wider text-[11px]">
                  Full Message Content:
                </label>
                <div className="bg-[#020A17] border-2 border-[#C5A059]/40 rounded-2xl p-4 text-[#FFF4D4] text-base leading-relaxed break-words shadow-inner">
                  {viewingMessageLog.smsBody || "(Empty message content)"}
                </div>
              </div>

              {/* Quo Metadata */}
              <div className="flex items-center justify-between text-xs text-[#A69371] pt-1">
                <span>Webhook Log ID: #{viewingMessageLog.id}</span>
                {viewingMessageLog.quoCallId && (
                  <span className="font-mono text-[11px]">Quo ID: {viewingMessageLog.quoCallId}</span>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#3A2C18]/60">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPayload(viewingMessageLog);
                    setViewingMessageLog(null);
                  }}
                  className="text-xs text-[#A69371] hover:text-[#FFF4D4] gap-1 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Inspect Webhook JSON</span>
                </Button>

                <div className="flex items-center gap-2">
                  {onCallNumber && viewingMessageLog.fromNumber && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onCallNumber(viewingMessageLog.fromNumber);
                        setViewingMessageLog(null);
                      }}
                      className="border border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] text-xs rounded-xl"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1 text-[#FFE394]" />
                      Call Number
                    </Button>
                  )}

                  {onOpenSms && viewingMessageLog.fromNumber && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onOpenSms(viewingMessageLog.fromNumber);
                        setViewingMessageLog(null);
                      }}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl shadow-md gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Reply via SMS
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Raw Payload Inspector Dialog */}
      {selectedPayload && (
        <Dialog open={!!selectedPayload} onOpenChange={() => setSelectedPayload(null)}>
          <DialogContent className="max-w-2xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#FFF4D4] flex items-center gap-2">
                <span>Quo Webhook Payload — Event #{selectedPayload.id}</span>
                {getEventBadge(selectedPayload)}
              </DialogTitle>
              <DialogDescription className="text-[#C6B697]">
                Raw cryptographic webhook payload received from Quo and verified by Waypoint Advocates CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#020A17] p-2.5 rounded-lg border border-[#3A2C18]/60">
                  <span className="text-[#A69371]">From:</span>{" "}
                  <span className="text-[#FFF4D4] font-mono">{selectedPayload.fromNumber}</span>
                </div>
                <div className="bg-[#020A17] p-2.5 rounded-lg border border-[#3A2C18]/60">
                  <span className="text-[#A69371]">To:</span>{" "}
                  <span className="text-[#FFF4D4] font-mono">{selectedPayload.toNumber}</span>
                </div>
              </div>

              <div className="bg-[#020A17] border border-[#3A2C18] rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-[11px] text-emerald-300">
                <pre>{typeof selectedPayload.rawPayload === "string" ? selectedPayload.rawPayload : JSON.stringify(selectedPayload.rawPayload, null, 2)}</pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedPayload(null)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
                >
                  Close Inspector
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
