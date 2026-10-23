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
  FileText,
  Volume2,
  Copy,
  Check,
  Play,
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
import { trpc } from "@/lib/trpc";

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
  const [viewingLog, setViewingLog] = useState<CallLogItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"summary" | "transcript" | "audio" | "sms" | "payload">("summary");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const generateSummaryMutation = trpc.callLogs.generateSummary.useMutation({
    onSuccess: (data) => {
      toast.success("AI Executive Summary generated!");
      if (viewingLog) {
        setViewingLog({ ...viewingLog, summary: data.summary });
      }
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate summary");
    },
  });

  const handleOpenLogModal = (log: CallLogItem, preferredTab?: "summary" | "transcript" | "audio" | "sms" | "payload") => {
    setViewingLog(log);
    if (preferredTab) {
      setActiveModalTab(preferredTab);
    } else if (log.smsBody || (log.eventType || "").startsWith("message.")) {
      setActiveModalTab("sms");
    } else if (log.summary) {
      setActiveModalTab("summary");
    } else if (log.transcript) {
      setActiveModalTab("transcript");
    } else if (log.recordingUrl || log.isVoicemail) {
      setActiveModalTab("audio");
    } else {
      setActiveModalTab("summary");
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFrom = (log.fromNumber || "").toLowerCase().includes(q);
      const matchTo = (log.toNumber || "").toLowerCase().includes(q);
      const matchBody = (log.smsBody || "").toLowerCase().includes(q);
      const matchSummary = (log.summary || "").toLowerCase().includes(q);
      const matchTranscript = (log.transcript || "").toLowerCase().includes(q);
      const matchId = String(log.id).includes(q) || (log.quoCallId || "").toLowerCase().includes(q);
      const matchEvent = (log.eventType || "").toLowerCase().includes(q);
      if (!matchFrom && !matchTo && !matchBody && !matchSummary && !matchTranscript && !matchId && !matchEvent) {
        return false;
      }
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
              Real-time inbound/outbound calls, AI meeting summaries, full transcripts, voicemails, and SMS messages.
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
            placeholder="Search transcripts, summaries, messages..."
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
                : "No calls or text messages recorded under this filter yet. Send a test SMS or make a call to your Quo business number to see it appear here in real time."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#3A2C18]/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#020A17] border-b border-[#3A2C18] text-[#C6B697] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Status & Type</th>
                <th className="py-2.5 px-3">From (Caller/Sender)</th>
                <th className="py-2.5 px-3">To (Destination)</th>
                <th className="py-2.5 px-3 min-w-[280px]">Summary, Transcript & Message</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Assignment</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A2C18]/40 bg-[#05142B]/60">
              {filteredLogs.map((log) => {
                const isRinging = log.eventType === "call.ringing";
                const isSms = Boolean(log.smsBody || (log.eventType || "").startsWith("message."));
                const hasSummary = Boolean(log.summary);
                const hasTranscript = Boolean(log.transcript);
                const hasRecording = Boolean(log.recordingUrl);
                const hasVoicemail = Boolean(log.voicemailTranscript);

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
                        {log.fromNumber || "Unknown Caller"}
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

                    {/* Message / Call Content / Transcript / Summary Preview */}
                    <td className="py-3 px-3">
                      {isSms && log.smsBody ? (
                        <div
                          onClick={() => handleOpenLogModal(log, "sms")}
                          className="bg-[#020A17] hover:bg-[#102B4E]/60 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-sm group"
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-[#FFF4D4] font-medium leading-relaxed break-words line-clamp-2">
                              "{log.smsBody}"
                            </div>
                          </div>
                          <div className="text-[10px] text-[#C5A059] group-hover:text-[#FFE394] mt-1 flex items-center gap-1 font-semibold">
                            <Eye className="w-3 h-3" />
                            <span>Click to view full message & reply</span>
                          </div>
                        </div>
                      ) : (hasSummary || hasTranscript || hasRecording || hasVoicemail) ? (
                        <div
                          onClick={() => handleOpenLogModal(log)}
                          className="bg-[#020A17] hover:bg-[#102B4E]/60 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl px-3 py-2 cursor-pointer transition-all shadow-sm group space-y-1.5"
                        >
                          {/* AI Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasSummary && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-3 h-3 text-[#FFE394]" />
                                AI Summary
                              </span>
                            )}
                            {hasTranscript && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <FileText className="w-3 h-3 text-blue-300" />
                                Full Transcript
                              </span>
                            )}
                            {hasRecording && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Volume2 className="w-3 h-3 text-emerald-300" />
                                Audio Recording
                              </span>
                            )}
                            {hasVoicemail && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                <Voicemail className="w-3 h-3 text-purple-300" />
                                Voicemail
                              </span>
                            )}
                          </div>

                          {/* Content Snippet */}
                          {hasSummary ? (
                            <p className="text-xs text-[#FFF4D4] line-clamp-2 leading-relaxed font-serif">
                              "{log.summary}"
                            </p>
                          ) : hasTranscript ? (
                            <p className="text-xs text-[#D8C7A5] line-clamp-2 italic font-mono text-[11px]">
                              "{log.transcript}"
                            </p>
                          ) : hasVoicemail ? (
                            <p className="text-xs text-purple-200 line-clamp-2 italic">
                              "{log.voicemailTranscript}"
                            </p>
                          ) : (
                            <p className="text-xs text-[#C6B697]">
                              Audio recording available ({log.durationSeconds || 0}s)
                            </p>
                          )}

                          <div className="text-[10px] text-[#C5A059] group-hover:text-[#FFE394] flex items-center gap-1 font-semibold pt-0.5">
                            <Eye className="w-3 h-3" />
                            <span>Click to view AI summary & full transcript</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#A69371]">
                          {log.durationSeconds ? `Call duration: ${log.durationSeconds}s` : "Voice Call (in progress / ringing)"}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenLogModal(log)}
                        className="h-7 px-2.5 text-xs text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#020A17] border border-[#3A2C18] rounded-lg cursor-pointer"
                        title={isSms ? "View SMS Text Details" : "View Call Summary & Transcript"}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {isSms ? "View Text" : (hasSummary || hasTranscript) ? "Transcript" : "Details"}
                      </Button>

                      {onCallNumber && log.fromNumber && !isSms && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCallNumber(log.fromNumber)}
                          className="h-7 px-2.5 text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#020A17] border border-[#3A2C18] rounded-lg cursor-pointer"
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
                          onClick={() => handleOpenLogModal(log, "payload")}
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

      {/* Comprehensive Call Intelligence, Transcript & SMS Modal */}
      {viewingLog && (
        <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl p-0 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[#3A2C18] bg-[#020A17]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <DialogTitle className="font-serif text-[#FFF4D4] text-lg flex items-center gap-2">
                  {(viewingLog.smsBody || (viewingLog.eventType || "").startsWith("message.")) ? (
                    <>
                      <MessageSquare className="w-5 h-5 text-cyan-400" />
                      <span>Text Message Intelligence</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-[#FFE394]" />
                      <span>Call Intelligence & Transcript</span>
                    </>
                  )}
                  <span className="text-xs font-mono text-[#A69371]">#{viewingLog.id}</span>
                </DialogTitle>
                {getEventBadge(viewingLog)}
              </div>
              <DialogDescription className="text-[#C6B697] text-xs mt-1">
                Recorded via Quo integration on {formatTimestamp(viewingLog.createdAt)} • Duration: {viewingLog.durationSeconds || 0}s
              </DialogDescription>

              {/* Caller & Callee Summary Pills */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-[#05142B] p-2.5 rounded-xl border border-[#3A2C18]">
                  <span className="text-[#A69371] block text-[10px] uppercase font-bold tracking-wider">Caller / Sender</span>
                  <span className="text-[#FFF4D4] font-mono font-semibold text-sm">{viewingLog.fromNumber || "Unknown"}</span>
                </div>
                <div className="bg-[#05142B] p-2.5 rounded-xl border border-[#3A2C18]">
                  <span className="text-[#A69371] block text-[10px] uppercase font-bold tracking-wider">Recipient (Business)</span>
                  <span className="text-[#FFF4D4] font-mono font-semibold text-sm">{viewingLog.toNumber || "Waypoint Practice"}</span>
                </div>
              </div>

              {/* Navigation Tabs inside modal */}
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#3A2C18]/60 overflow-x-auto">
                {Boolean(viewingLog.smsBody) && (
                  <button
                    onClick={() => setActiveModalTab("sms")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeModalTab === "sms"
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow"
                        : "bg-[#05142B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message Body</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveModalTab("summary")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeModalTab === "summary"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow"
                      : "bg-[#05142B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Executive Summary {viewingLog.summary ? "✓" : ""}</span>
                </button>

                <button
                  onClick={() => setActiveModalTab("transcript")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeModalTab === "transcript"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow"
                      : "bg-[#05142B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Full Transcript {viewingLog.transcript ? "✓" : ""}</span>
                </button>

                {(viewingLog.recordingUrl || viewingLog.isVoicemail) && (
                  <button
                    onClick={() => setActiveModalTab("audio")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeModalTab === "audio"
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow"
                        : "bg-[#05142B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio & Voicemail</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveModalTab("payload")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeModalTab === "payload"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow"
                      : "bg-[#05142B] text-[#C6B697] hover:text-[#FFF4D4] border border-[#3A2C18]"
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Raw Webhook</span>
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: SMS Message Body */}
              {activeModalTab === "sms" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider text-[11px]">
                      Text Message Body
                    </label>
                    {viewingLog.smsBody && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(viewingLog.smsBody!, "sms")}
                        className="h-6 px-2 text-[11px] text-[#C6B697] hover:text-[#FFF4D4]"
                      >
                        {copiedKey === "sms" ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                        <span>Copy Message</span>
                      </Button>
                    )}
                  </div>
                  <div className="bg-[#020A17] border-2 border-[#C5A059]/40 rounded-2xl p-4 text-[#FFF4D4] text-base leading-relaxed break-words shadow-inner">
                    {viewingLog.smsBody || "(No message body available)"}
                  </div>
                </div>
              )}

              {/* TAB 2: AI Executive Summary */}
              {activeModalTab === "summary" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFE394]" />
                      <span>Executive Call Summary</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {viewingLog.summary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(viewingLog.summary!, "summary")}
                          className="h-6 px-2 text-[11px] text-[#C6B697] hover:text-[#FFF4D4]"
                        >
                          {copiedKey === "summary" ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                          <span>Copy Summary</span>
                        </Button>
                      )}
                      {viewingLog.transcript && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => generateSummaryMutation.mutate({ callLogId: viewingLog.id })}
                          disabled={generateSummaryMutation.isPending}
                          className="h-6 px-2 text-[11px] text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#102B4E]/60 border border-[#3A2C18] rounded-md"
                          title="Synthesize fresh AI executive summary from call transcript"
                        >
                          <Sparkles className={`w-3 h-3 mr-1 text-[#FFE394] ${generateSummaryMutation.isPending ? "animate-spin" : ""}`} />
                          <span>{generateSummaryMutation.isPending ? "Synthesizing..." : viewingLog.summary ? "Regenerate" : "Generate AI Summary"}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {viewingLog.summary ? (
                    <div className="bg-[#020A17] border border-[#3A2C18] rounded-2xl p-5 text-[#FFF4D4] text-sm leading-relaxed font-serif whitespace-pre-wrap space-y-3 shadow-inner">
                      {viewingLog.summary}
                    </div>
                  ) : viewingLog.transcript ? (
                    <div className="bg-[#020A17]/90 border border-[#C5A059]/40 rounded-2xl p-6 text-center space-y-3 shadow-inner">
                      <Sparkles className="h-7 w-7 text-[#FFE394] mx-auto animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-sm text-[#FFF4D4] font-semibold">Transcript Ready for AI Synthesis</p>
                        <p className="text-xs text-[#C6B697] max-w-sm mx-auto">
                          This call has a {viewingLog.transcript.length}-character transcript available. Click below to synthesize an executive advocacy summary with key takeaways and action items.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateSummaryMutation.mutate({ callLogId: viewingLog.id })}
                        disabled={generateSummaryMutation.isPending}
                        className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl shadow-md gap-1.5 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${generateSummaryMutation.isPending ? "animate-spin" : ""}`} />
                        <span>{generateSummaryMutation.isPending ? "Synthesizing Summary..." : "Generate AI Executive Summary"}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-xl p-6 text-center space-y-2">
                      <Sparkles className="h-6 w-6 text-[#FFE394]/50 mx-auto" />
                      <p className="text-xs text-[#FFF4D4] font-medium">No AI Summary on this event yet</p>
                      <p className="text-[11px] text-[#C6B697] max-w-sm mx-auto">
                        Quo generates call summaries within 30–60 seconds after a call ends. If this call just finished, click "Refresh" above once Quo publishes the AI summary.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Full Call Transcript */}
              {activeModalTab === "transcript" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      <span>Verbatim Call Transcript</span>
                    </label>
                    {viewingLog.transcript && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(viewingLog.transcript!, "transcript")}
                        className="h-6 px-2 text-[11px] text-[#C6B697] hover:text-[#FFF4D4]"
                      >
                        {copiedKey === "transcript" ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                        <span>Copy Transcript</span>
                      </Button>
                    )}
                  </div>

                  {viewingLog.transcript ? (
                    <div className="bg-[#020A17] border border-[#3A2C18] rounded-2xl p-4 text-[#D8C7A5] text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {viewingLog.transcript}
                    </div>
                  ) : (
                    <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-xl p-6 text-center space-y-2">
                      <FileText className="h-6 w-6 text-blue-400/50 mx-auto" />
                      <p className="text-xs text-[#FFF4D4] font-medium">No verbatim transcript attached</p>
                      <p className="text-[11px] text-[#C6B697] max-w-sm mx-auto">
                        Transcripts are automatically generated by Quo for recorded calls. Make sure call recording and transcription are enabled in your Quo phone settings.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Audio Recording & Voicemail */}
              {activeModalTab === "audio" && (
                <div className="space-y-4">
                  {viewingLog.recordingUrl ? (
                    <div className="bg-[#020A17] border border-[#3A2C18] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span>Call Audio Recording</span>
                        </span>
                        <a
                          href={viewingLog.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#C5A059] hover:underline flex items-center gap-1"
                        >
                          <span>Open in New Tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <audio controls className="w-full" src={viewingLog.recordingUrl} />
                    </div>
                  ) : null}

                  {viewingLog.voicemailTranscript ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Voicemail className="w-3.5 h-3.5 text-purple-400" />
                        <span>Voicemail Transcription</span>
                      </label>
                      <div className="bg-[#020A17] border border-purple-500/30 rounded-2xl p-4 text-[#FFF4D4] text-xs leading-relaxed italic">
                        "{viewingLog.voicemailTranscript}"
                      </div>
                    </div>
                  ) : null}

                  {!viewingLog.recordingUrl && !viewingLog.voicemailTranscript && (
                    <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-xl p-6 text-center space-y-2">
                      <Volume2 className="h-6 w-6 text-[#C6B697]/40 mx-auto" />
                      <p className="text-xs text-[#FFF4D4] font-medium">No audio file or voicemail found</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Raw Webhook JSON */}
              {activeModalTab === "payload" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cryptographic Webhook Payload (JSON)</span>
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(JSON.stringify(viewingLog.rawPayload, null, 2), "payload")}
                      className="h-6 px-2 text-[11px] text-[#C6B697] hover:text-[#FFF4D4]"
                    >
                      {copiedKey === "payload" ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                      <span>Copy JSON</span>
                    </Button>
                  </div>
                  <div className="bg-[#020A17] border border-[#3A2C18] rounded-xl p-3 max-h-72 overflow-y-auto font-mono text-[11px] text-emerald-300">
                    <pre>{typeof viewingLog.rawPayload === "string" ? viewingLog.rawPayload : JSON.stringify(viewingLog.rawPayload, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-[#3A2C18] bg-[#020A17] flex items-center justify-between gap-3 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewingLog(null)}
                className="text-xs text-[#C6B697] hover:text-[#FFF4D4]"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {onCallNumber && viewingLog.fromNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onCallNumber(viewingLog.fromNumber);
                      setViewingLog(null);
                    }}
                    className="border border-[#3A2C18] bg-[#05142B] text-[#FFE394] hover:bg-[#07162B] text-xs rounded-xl"
                  >
                    <Phone className="w-3.5 h-3.5 mr-1 text-[#FFE394]" />
                    Call in Quo
                  </Button>
                )}

                {onOpenSms && viewingLog.fromNumber && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenSms(viewingLog.fromNumber);
                      setViewingLog(null);
                    }}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl shadow-md gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply via SMS
                  </Button>
                )}

                {onAssignToLead && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onAssignToLead(viewingLog);
                      setViewingLog(null);
                    }}
                    className="border border-[#C5A059]/50 bg-[#05142B] text-[#FFF4D4] hover:bg-[#07162B] text-xs rounded-xl"
                  >
                    Load into Workspace
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
