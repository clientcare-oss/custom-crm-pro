import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare, Phone, PhoneCall, Headphones, Clock, Calendar,
  ExternalLink, Send, User, ShieldCheck, ChevronDown, Mail,
  Reply, AlertTriangle, Trash2, CheckCircle2, ChevronRight,
  Info, Sparkles, Filter, X, Copy, MoreVertical, SendHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CallLogsWithCallback from "@/components/quo/CallLogsWithCallback";
import { StudentEmailComposer } from "./StudentEmailComposer";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentCommunicationWorkspaceProps {
  studentId: number;
  fullName: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  caseId?: string;
  parentContactId?: number | null;
  onReturnToOverview: () => void;
}

interface ThreadCard {
  id: string;
  sender: string;
  recipients: string;
  date: string;
  subject?: string;
  body?: string;
  appointment?: {
    title: string;
    duration: string;
    timezone: string;
    slots: { date: string; times: string[] }[];
  };
}

export function StudentCommunicationWorkspace({
  studentId,
  fullName,
  parentName = "Sample Parent",
  parentPhone,
  parentEmail,
  caseId,
  parentContactId,
  onReturnToOverview,
}: StudentCommunicationWorkspaceProps) {
  const [, setLocation] = useLocation();
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "calls">("feed");
  const [isComposing, setIsComposing] = useState(false);
  const [composerSubject, setComposerSubject] = useState("Re: ");
  const [composerDefaultBody, setComposerDefaultBody] = useState("");
  const [selectedTimeZone, setSelectedTimeZone] = useState("EDT");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [showPortalMenu, setShowPortalMenu] = useState(false);

  // Client Portal direct URL
  const portalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/portal?studentId=${studentId}`
    : `https://waypointadvocates.com/portal/${studentId}`;

  const handleCopyPortalLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(portalUrl);
      setCopiedPortal(true);
      toast.success("Client portal link copied to clipboard!");
      setTimeout(() => setCopiedPortal(false), 2000);
    } else {
      toast.success("Portal link: " + portalUrl);
    }
  };

  const handleSendPortalLink = () => {
    toast.success(`Client portal invite dispatched to ${parentEmail || parentName || "parent"}`);
  };

  const handlePreviewPortal = () => {
    window.open(`/portal?studentId=${studentId}&preview=true`, "_blank");
  };

  // Additional sent messages state for instant reactivity
  const [localSentCards, setLocalSentCards] = useState<ThreadCard[]>([]);

  // Fetch real messages between advocate and parent contact if available
  const effectiveRecipientId = parentContactId || studentId;
  const { data: dbMessages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: effectiveRecipientId },
    { enabled: !!effectiveRecipientId, retry: false }
  );

  const sendMessageMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
    onError: (err) => {
      console.warn("Failed to record message in backend:", err.message);
    },
  });

  const handleOpenComposer = (subject = "Re: ", body = "") => {
    setComposerSubject(subject);
    setComposerDefaultBody(body);
    setIsComposing(true);
    setDropdownOpen(false);
  };

  const handleSendSuccess = (sentData: { subject: string; content: string; recipients: string[] }) => {
    // Record to database
    sendMessageMutation.mutate({
      recipientId: effectiveRecipientId,
      content: `[Subject: ${sentData.subject}]\n\n${sentData.content}`,
    });

    // Add to local state feed
    const newCard: ThreadCard = {
      id: "card-" + Date.now(),
      sender: "Waypoint Advocates",
      recipients: sentData.recipients.join(", "),
      date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
      subject: sentData.subject,
      body: sentData.content,
    };
    setLocalSentCards([newCard, ...localSentCards]);
  };

  // Seed reference cards from legacy CRM (Picture 1)
  const legacySeedCards: ThreadCard[] = [
    {
      id: "seed-1",
      sender: "Waypoint Advocates",
      recipients: parentName || "Sample Parent",
      date: "Wed, Aug 12, 2026",
      appointment: {
        title: "1:1 CLIENT AND ADVOCATE ONLY [NON IEP] [CLIENT TOOL]",
        duration: "60 minutes",
        timezone: selectedTimeZone,
        slots: [
          {
            date: "Mon, Aug 31",
            times: ["09:00 am", "10:00 am", "11:00 am"],
          },
        ],
      },
    },
    {
      id: "seed-2",
      sender: "Waypoint Advocates",
      recipients: `${parentName || "Sample Parent"}, Abby Honea`,
      date: "Wed, Aug 12, 2026",
      subject: "troublwe shoot availible times",
      body: "look for 0730 and 300 slot here",
      appointment: {
        title: "[EXT] IEP MEETING WITH SCHOOL & ADVOCATE",
        duration: "3 hours",
        timezone: selectedTimeZone,
        slots: [
          {
            date: "Fri, Aug 28",
            times: ["03:00 pm"],
          },
          {
            date: "Mon, Aug 31",
            times: ["07:30 am", "07:45 am"],
          },
        ],
      },
    },
  ];

  return (
    <div className="w-full min-h-[600px] p-4 sm:p-6 md:p-8 flex flex-col justify-between space-y-6">
      <div className="space-y-5">
        {/* Top Header & Client Portal: Located ABOVE the divider */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-[#3A2C18] gap-4">
          {/* Left Column: Title, Subtitle, Sub-tab Pills & Case Badge */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102B4E] to-[#07162B] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] shadow-md shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold text-[#FFF4D4] tracking-wide flex items-center"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Communication Hub
              </h3>
            </div>

            {/* Sub-tab Switcher: Feed vs Calls + Case Badge (Centered under the text) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <div className="flex items-center gap-1 bg-[#020A17] p-1 rounded-xl border border-[#3A2C18] shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("feed")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                    activeSubTab === "feed"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Communication Feed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("calls")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                    activeSubTab === "calls"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Quo Telephony Logs</span>
                </button>
              </div>

              <Badge className="bg-[#0E274A] text-[#FFE394] border border-[#C5A059]/40 text-xs px-3 py-1.5 rounded-lg shadow-sm">
                Case #{caseId || studentId} · {fullName}
              </Badge>
            </div>
          </div>

          {/* Top Right: Client Portal Box (ABOVE THE DIVIDER) */}
          <div className="w-full lg:w-96 bg-[#05142B]/95 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-3.5 shadow-lg transition-all space-y-2.5 shrink-0">
            {/* Header: Title + 3 dots menu */}
            <div className="flex items-center justify-between">
              <h4
                className="text-sm font-bold text-[#FFF4D4] tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Client portal
              </h4>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPortalMenu(!showPortalMenu)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Portal options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showPortalMenu && (
                  <div className="absolute right-0 top-7 z-30 w-52 p-1.5 bg-[#07162B] border border-[#C5A059]/70 rounded-xl shadow-2xl space-y-1">
                    <button
                      onClick={() => {
                        setShowPortalMenu(false);
                        handleCopyPortalLink();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                    >
                      📋 Copy Direct URL
                    </button>
                    <button
                      onClick={() => {
                        setShowPortalMenu(false);
                        toast.success("Regenerated client portal access token");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                    >
                      🔄 Refresh Access Token
                    </button>
                    <button
                      onClick={() => {
                        setShowPortalMenu(false);
                        setLocation("/portal-management");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                    >
                      ⚙️ Portal Experience Settings
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* URL Field + Copy Button + Send Button */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0 bg-[#020A17] border border-[#3A2C18] rounded-lg px-2.5 py-1.5 flex items-center">
                <span className="text-[11px] font-mono text-[#FFE394] truncate select-all">
                  {portalUrl}
                </span>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyPortalLink}
                className="w-8 h-8 rounded-lg bg-[#0E274A] hover:bg-[#163866] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] hover:text-[#FFF4D4] transition-colors shrink-0 cursor-pointer shadow-sm"
                title="Copy Portal Link"
              >
                {copiedPortal ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Send/Share Invite Button */}
              <button
                type="button"
                onClick={handleSendPortalLink}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 flex items-center justify-center text-[#07162B] transition-all shrink-0 cursor-pointer shadow-sm"
                title="Send Portal Link to Parent"
              >
                <SendHorizontal className="w-4 h-4 font-bold" />
              </button>
            </div>

            {/* Preview as client */}
            <button
              type="button"
              onClick={handlePreviewPortal}
              className="inline-flex items-center gap-1.5 text-xs text-[#64B5F6] hover:text-[#90CAF9] hover:underline font-semibold cursor-pointer transition-colors pt-0.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview as client</span>
            </button>
          </div>
        </div>

        {/* FEED SUB-TAB (BELOW THE DIVIDER) */}
        {activeSubTab === "feed" && (
          <div className="space-y-4">
            {/* Top User Action Bar ("You" + "Send a message ▾") */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#9E7D3B] to-[#FFE394] p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full bg-[#07162B] flex items-center justify-center text-[#FFE394] font-bold text-xs">
                    W
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#FFF4D4] block">You</span>
                  <span className="text-[11px] text-[#A69371] block">Advocate Case Lead · Ready to message</span>
                </div>
              </div>

              {/* "Send a message ▾" Dropdown Button */}
              <div className="relative">
                <Button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="bg-[#07162B] hover:bg-[#0E274A] text-[#FFF4D4] border border-[#3A2C18] hover:border-[#C5A059]/60 font-semibold text-xs sm:text-sm h-9 px-4 rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <span>Send a message</span>
                  <ChevronDown className="w-4 h-4 text-[#FFE394]" />
                </Button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-11 z-30 w-56 p-1.5 bg-[#07162B] border border-[#C5A059]/70 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.9)] space-y-1">
                    <button
                      onClick={() => handleOpenComposer("New Case Email", "")}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Send New Email</span>
                    </button>
                    <button
                      onClick={() => handleOpenComposer("1:1 Strategy Session Availability", "Please see our open availability for our upcoming strategy call:\n\n")}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Send Availability & Booking</span>
                    </button>
                    <button
                      onClick={() => handleOpenComposer("Prior Written Notice (PWN) Follow-Up", "")}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Formal PWN Demand</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIVE EMAIL COMPOSER (When Activated) */}
            {isComposing && (
              <div className="my-3">
                <StudentEmailComposer
                  studentId={studentId}
                  fullName={fullName}
                  parentName={parentName}
                  parentEmail={parentEmail}
                  caseId={caseId}
                  defaultSubject={composerSubject}
                  defaultBody={composerDefaultBody}
                  onClose={() => setIsComposing(false)}
                  onSendSuccess={handleSendSuccess}
                />
              </div>
            )}

            {/* CASE COMMUNICATION FEED CARDS */}
            <div className="space-y-4 pt-1">
              {/* Local Realtime Sent Cards */}
              {localSentCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#05142B] border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-5 shadow-lg space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#9E7D3B] to-[#FFE394] p-0.5 shadow-sm">
                        <div className="w-full h-full rounded-full bg-[#07162B] flex items-center justify-center text-[#FFE394] font-bold text-xs">
                          W
                        </div>
                      </div>
                      <div className="text-xs">
                        <p className="text-[#FFF4D4] font-semibold">
                          From: <span className="text-[#FFE394]">{card.sender}</span>
                        </p>
                        <p className="text-[#C6B697]">To: {card.recipients}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <button
                        type="button"
                        onClick={() => handleOpenComposer(`Re: ${card.subject || "Case Thread"}`, "")}
                        className="hover:text-[#FFE394] transition-colors p-1 cursor-pointer"
                        title="Reply to this thread"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      <span>{card.date}</span>
                    </div>
                  </div>

                  {card.subject && (
                    <h4 className="text-sm font-bold text-[#FFF4D4]">{card.subject}</h4>
                  )}
                  {card.body && (
                    <p className="text-xs sm:text-sm text-[#FFF4D4]/90 whitespace-pre-wrap leading-relaxed">
                      {card.body}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <Mail className="w-4 h-4 text-white/40" />
                  </div>
                </div>
              ))}

              {/* Seed Reference Cards (from Picture 1) */}
              {legacySeedCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#05142B] border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-5 shadow-lg space-y-4 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#9E7D3B] to-[#FFE394] p-0.5 shadow-sm">
                        <div className="w-full h-full rounded-full bg-[#07162B] flex items-center justify-center text-[#FFE394] font-bold text-xs">
                          W
                        </div>
                      </div>
                      <div className="text-xs">
                        <p className="text-[#FFF4D4] font-semibold">
                          From: <span className="text-[#FFE394]">{card.sender}</span>
                        </p>
                        <p className="text-[#C6B697]">To: {card.recipients}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenComposer(
                            `Re: ${card.subject || card.appointment?.title || "Scheduling"}`,
                            ""
                          )
                        }
                        className="hover:text-[#FFE394] transition-colors p-1 cursor-pointer"
                        title="Reply to this thread"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      <span>{card.date}</span>
                    </div>
                  </div>

                  {/* Card Subject & Body Text if present */}
                  {card.subject && (
                    <h4 className="text-xs sm:text-sm font-bold text-[#FFF4D4] tracking-wide">
                      {card.subject}
                    </h4>
                  )}
                  {card.body && (
                    <p className="text-xs text-[#FFF4D4]/80 whitespace-pre-wrap">{card.body}</p>
                  )}

                  {/* Embedded Meeting / Availability Block (Matching Picture 1) */}
                  {card.appointment && (
                    <div className="space-y-3 pt-1">
                      <div className="text-xs sm:text-sm font-bold text-[#FFE394] tracking-wide">
                        <span>{card.appointment.title}</span>
                        <span className="text-[#C6B697] font-normal"> | {card.appointment.duration}</span>
                      </div>

                      <div className="text-xs text-[#C6B697] flex items-center gap-2">
                        <span>Time zone: {card.appointment.timezone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTz = prompt("Enter Timezone (EDT, CDT, MDT, PDT):", selectedTimeZone);
                            if (newTz) setSelectedTimeZone(newTz.toUpperCase());
                          }}
                          className="text-[#64B5F6] hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {/* Clickable slot chips */}
                      <div className="space-y-2 pt-1 text-xs">
                        {card.appointment.slots.map((slot, sIdx) => (
                          <div key={sIdx} className="flex items-center flex-wrap gap-2 text-[#FFF4D4]">
                            <span className="font-semibold text-[#FFE394]">{slot.date} |</span>
                            {slot.times.map((time, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() => {
                                  toast.success(`Selected time slot: ${slot.date} at ${time}`);
                                  handleOpenComposer(`Confirmed: ${slot.date} at ${time}`, `Hi ${parentName},\n\nConfirming our strategy session for ${slot.date} at ${time} ${selectedTimeZone}.\n\nBest regards,\nByron Honea`);
                                }}
                                className="text-[#64B5F6] hover:text-[#90CAF9] hover:underline font-medium cursor-pointer"
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setLocation("/calendar?tab=session-types")}
                          className="text-xs text-[#64B5F6] hover:underline font-semibold cursor-pointer"
                        >
                          View all availability
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Right Envelope Icon */}
                  <div className="flex justify-end pt-1">
                    <Mail className="w-4 h-4 text-white/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUO TELEPHONY SUB-TAB */}
        {activeSubTab === "calls" && (
          <div className="bg-[#05142B] rounded-2xl border border-[#3A2C18] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#FFE394]">
                <Headphones className="w-4 h-4" />
                <span>Quo Telephony Softphone & Call Recordings</span>
              </div>
              {parentPhone && (
                <a
                  href={`tel:${parentPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Dial {parentPhone}</span>
                </a>
              )}
            </div>

            <CallLogsWithCallback
              studentId={studentId}
              contactId={parentContactId || studentId}
              clientName={fullName}
            />
          </div>
        )}
      </div>

      {/* Footer Return Button */}
      <div className="pt-4 flex items-center justify-between border-t border-[#3A2C18] text-xs text-[#A69371]">
        <span>Waypoint Advocates · Case #{caseId || studentId}</span>
        <Button
          onClick={onReturnToOverview}
          variant="outline"
          size="sm"
          className="bg-transparent hover:bg-white/10 border-[#3A2C18] hover:border-[#C5A059]/40 text-[#FFF4D4] text-xs h-8 px-3 rounded-lg cursor-pointer"
        >
          Return to Overview Desk
        </Button>
      </div>
    </div>
  );
}
