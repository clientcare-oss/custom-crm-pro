import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing,
  Clock, Calendar, ExternalLink, Send, User, ShieldCheck,
  Headphones, Voicemail, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CallLogsWithCallback from "@/components/quo/CallLogsWithCallback";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentCommunicationWorkspaceProps {
  studentId: number;
  fullName: string;
  parentName?: string;
  parentPhone?: string;
  caseId?: string;
  parentContactId?: number | null;
  onReturnToOverview: () => void;
}

export function StudentCommunicationWorkspace({
  studentId,
  fullName,
  parentName,
  parentPhone,
  caseId,
  parentContactId,
  onReturnToOverview,
}: StudentCommunicationWorkspaceProps) {
  const [, setLocation] = useLocation();
  const [activeSubTab, setActiveSubTab] = useState<"calls" | "messages">("calls");
  const [quickMessageText, setQuickMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Fetch direct messages between advocate and parent contact if available
  const effectiveRecipientId = parentContactId || studentId;
  const { data: messages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: effectiveRecipientId },
    { enabled: !!effectiveRecipientId }
  );

  const sendMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      toast.success("Message recorded in case thread");
      setQuickMessageText("");
      refetchMessages();
      setSendingMsg(false);
    },
    onError: (err) => {
      toast.error("Failed to send message: " + err.message);
      setSendingMsg(false);
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessageText.trim()) return;
    setSendingMsg(true);
    sendMessageMutation.mutate({
      recipientId: effectiveRecipientId,
      content: quickMessageText.trim(),
    });
  };

  return (
    <div className="w-full min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/15 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 
                className="text-xl sm:text-2xl font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span>Telephony & Client Communications Hub</span>
              </h3>
              <p className="text-xs sm:text-sm text-white/65 mt-0.5">
                Quo telephony call logs, audio playback, parent text threads, and touchpoint tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Badge className="bg-[#0e274a]/90 text-amber-300 border border-amber-400/35 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
              Case #{caseId || studentId} · {fullName}
            </Badge>
          </div>
        </div>

        {/* Quick Action Dialing & Contact Plaque */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-[#020b18]/70 border border-white/15 rounded-xl p-3.5 flex items-center justify-between shadow-md">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-white/50 block">Primary Contact</span>
              <p className="text-sm font-bold text-white truncate mt-0.5">{parentName || "Parent/Guardian"}</p>
              <p className="text-xs text-amber-300 font-mono mt-0.5">{parentPhone || "(404) 555-0199"}</p>
            </div>
            {parentPhone && (
              <a
                href={`tel:${parentPhone}`}
                className="w-9 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 transition-colors shrink-0 cursor-pointer shadow-sm"
                title="Dial parent phone"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="bg-[#020b18]/70 border border-white/15 rounded-xl p-3.5 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-white/50 block">Quo Telephony Status</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-300">Carrier Connected</span>
              </div>
              <span className="text-[11px] text-white/40 block mt-0.5">Automated transcription enabled</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#020b18]/70 border border-white/15 rounded-xl p-3.5 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-white/50 block">Quo Call Center</span>
              <p className="text-xs font-semibold text-white/90 mt-1">Full Inbound/Outbound Switchboard</p>
              <span className="text-[11px] text-white/40 block mt-0.5">Access enterprise softphone console</span>
            </div>
            <Button
              onClick={() => setLocation("/call-center")}
              size="sm"
              variant="outline"
              className="bg-white/5 hover:bg-white/10 border-white/20 text-white text-xs h-8 px-2.5 gap-1 shrink-0 cursor-pointer"
            >
              <span>Console</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* View Toggle: Quo Call Logs vs Message History */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveSubTab("calls")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                activeSubTab === "calls" ? "bg-amber-400 text-slate-950 font-bold" : "text-white/70 hover:text-white"
              )}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Quo Telephony Logs</span>
            </button>
            <button
              onClick={() => setActiveSubTab("messages")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                activeSubTab === "messages" ? "bg-amber-400 text-slate-950 font-bold" : "text-white/70 hover:text-white"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Portal Messages ({messages.length})</span>
            </button>
          </div>
        </div>

        {/* Sub-tab 1: Quo Call Logs & Audio Player */}
        {activeSubTab === "calls" && (
          <div className="bg-[#020b18]/80 rounded-xl border border-white/15 p-4 sm:p-5 shadow-xl backdrop-blur-xs">
            <CallLogsWithCallback
              studentId={studentId}
              contactId={parentContactId || studentId}
              clientName={fullName}
            />
          </div>
        )}

        {/* Sub-tab 2: Direct Portal Messages */}
        {activeSubTab === "messages" && (
          <div className="bg-[#020b18]/80 rounded-xl border border-white/15 p-4 sm:p-6 shadow-xl backdrop-blur-xs space-y-4">
            {/* Quick Composer */}
            <form onSubmit={handleSendMessage} className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                Post Case Note / Portal Message to Parent
              </span>
              <Textarea
                value={quickMessageText}
                onChange={(e) => setQuickMessageText(e.target.value)}
                placeholder={`Type a note or message to ${parentName || fullName}…`}
                className="bg-black/40 border-white/20 text-white text-xs min-h-[75px] rounded-lg"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sendingMsg || !quickMessageText.trim()}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-8 px-4 gap-1.5 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{sendingMsg ? "Posting…" : "Send Message"}</span>
                </Button>
              </div>
            </form>

            {/* Message Thread */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
                Recent Message Log
              </span>
              {messages.length === 0 ? (
                <div className="p-8 text-center bg-black/20 rounded-lg border border-white/10 text-xs text-white/50">
                  No messages recorded in this student thread yet. Use the composer above to log notes or parent updates.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-lg bg-black/30 border border-white/10 text-xs space-y-1 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between text-white/60 text-[11px]">
                        <span className="font-semibold text-amber-300">
                          {msg.senderId === studentId || msg.senderId === parentContactId ? (parentName || fullName) : "Advocate Office"}
                        </span>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Return Button */}
      <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-6 text-xs text-white/50">
        <span>Waypoint Advocates · Case #{caseId || studentId}</span>
        <Button
          onClick={onReturnToOverview}
          variant="outline"
          size="sm"
          className="bg-transparent hover:bg-white/10 border-white/20 text-white text-xs h-8 px-3 rounded-lg cursor-pointer"
        >
          Return to Overview Desk
        </Button>
      </div>
    </div>
  );
}
