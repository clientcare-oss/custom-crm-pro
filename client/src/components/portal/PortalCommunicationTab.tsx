import React, { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Send, 
  Mail, 
  Phone, 
  Calendar, 
  Folder, 
  Upload, 
  Search, 
  Check, 
  CheckCheck, 
  Paperclip, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Users, 
  Info, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  X, 
  Headphones, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Lightbulb,
  Link2,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { trpc } from "@/lib/trpc";

export interface PortalCommunicationTabProps {
  effectiveStudent?: any;
  portalUser?: any;
  user?: any;
  portalStudents?: any[];
  selectedStudentId?: number | null;
  onSelectStudent?: (studentId: number | null) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenScheduler?: () => void;
  // Backward compatibility
  messages?: any[];
  currentUserId?: number;
  onSendMessage?: (content: string) => void;
}

export function PortalCommunicationTab({
  effectiveStudent,
  portalUser,
  user,
  portalStudents = [],
  selectedStudentId,
  onSelectStudent,
  onNavigateTab,
  onOpenScheduler,
}: PortalCommunicationTabProps) {
  // ── Filters & Search State ──
  const [filterType, setFilterType] = useState<"all" | "email" | "sms" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStudentId, setFilterStudentId] = useState<number | null>(selectedStudentId ?? null);

  // ── Modals State ──
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showEmailDetailModal, setShowEmailDetailModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  // ── New Message Form State ──
  const [composerType, setComposerType] = useState<"email" | "sms">("email");
  const [composerStudentId, setComposerStudentId] = useState<number | null>(selectedStudentId ?? null);
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");

  // ── Callback Form State ──
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackTime, setCallbackTime] = useState("Morning (9am - 12pm)");
  const [callbackNote, setCallbackNote] = useState("");

  // ── tRPC Data Query ──
  const utils = trpc.useUtils();
  const parentContactId = portalUser?.contactId ?? effectiveStudent?.parentContactId ?? undefined;

  const {
    data: feedData,
    isLoading,
    isError,
    refetch,
  } = trpc.portal.getCommunicationFeed.useQuery(
    {
      studentContactId: filterStudentId,
      filterType,
      searchQuery: searchQuery.trim() || undefined,
      parentContactId: typeof parentContactId === "number" ? parentContactId : undefined,
    },
    {
      refetchInterval: 60000, // Background poll every 60s
      refetchIntervalInBackground: false,
    }
  );

  // ── Mutations ──
  const sendMutation = trpc.portal.sendCommunication.useMutation({
    onSuccess: () => {
      toast.success(composerType === "email" ? "Email dispatched to Waypoint!" : "Text message sent!");
      setShowNewMessageModal(false);
      setComposerSubject("");
      setComposerBody("");
      utils.portal.getCommunicationFeed.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message. Please try again.");
    },
  });

  const callbackMutation = trpc.portal.requestCallback.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowCallbackModal(false);
      setCallbackNote("");
      utils.portal.getCommunicationFeed.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit callback request.");
    },
  });

  const markReadMutation = trpc.portal.markCommunicationRead.useMutation({
    onSuccess: () => {
      utils.portal.getCommunicationFeed.invalidate();
    },
  });

  // Dynamic values resolved from real backend data
  const primaryContact = feedData?.primaryContact || {
    id: 0,
    name: portalUser?.name || (user?.name ? user.name : "Family Account"),
    email: portalUser?.email || user?.primaryEmailAddress?.emailAddress || null,
    phone: null,
  };

  const studentList = feedData?.students && feedData.students.length > 0 
    ? feedData.students 
    : portalStudents.length > 0 
      ? portalStudents.map((s: any) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          gradeLevel: s.gradeLevel,
        }))
      : effectiveStudent 
        ? [{
            id: effectiveStudent.id,
            firstName: effectiveStudent.firstName,
            lastName: effectiveStudent.lastName,
            fullName: `${effectiveStudent.firstName} ${effectiveStudent.lastName}`.trim(),
            gradeLevel: effectiveStudent.gradeLevel,
          }]
        : [];

  const channels = feedData?.channels || {
    emailConnected: true,
    smsConnected: true,
    primaryPhone: "+1 (770) 555-0199",
  };

  const timeline = feedData?.timeline || [];
  const recentAttachments = feedData?.recentAttachments || [];
  const unreadCount = feedData?.totalUnreadCount || 0;

  // Group timeline items into chronological date buckets
  const groupedTimeline = useMemo(() => {
    const groups: { [dateLabel: string]: typeof timeline } = {};
    for (const item of timeline) {
      const label = item.dateLabel || "Recent";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return Object.entries(groups).map(([dateLabel, items]) => ({
      dateLabel,
      items,
    }));
  }, [timeline]);

  // Handlers
  const handleOpenEmailDetail = (emailItem: any) => {
    setSelectedEmail(emailItem);
    setShowEmailDetailModal(true);
    if (!emailItem.isRead) {
      markReadMutation.mutate({ id: emailItem.id });
    }
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerBody.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    sendMutation.mutate({
      type: composerType,
      studentContactId: composerStudentId,
      subject: composerType === "email" ? (composerSubject.trim() || "Message from Parent Portal") : undefined,
      body: composerBody.trim(),
      parentContactId: typeof primaryContact.id === "number" && primaryContact.id > 0 ? primaryContact.id : undefined,
    });
  };

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    callbackMutation.mutate({
      phone: callbackPhone.trim() || primaryContact.phone || undefined,
      preferredTime: callbackTime,
      note: callbackNote.trim() || undefined,
      studentContactId: filterStudentId || (studentList[0]?.id ?? undefined),
      parentContactId: typeof primaryContact.id === "number" && primaryContact.id > 0 ? primaryContact.id : undefined,
    });
  };

  const handleOpenCallbackModal = () => {
    setCallbackPhone(primaryContact.phone || "");
    setShowCallbackModal(true);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 select-text">
      {/* ── TOP HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-sky-800/40 relative">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-normal text-white tracking-tight leading-tight">
              Communication
            </h1>
            <PageIdBadge id="PG-023-COM" name="Portal Communication" />
          </div>
          <h2 className="text-sm sm:text-base font-serif text-sky-100/90 leading-snug">
            All communication with Waypoint in one place.
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-300/85 leading-relaxed">
            Your email and text messages with Waypoint appear together in one timeline, so you never miss a thing.
          </p>
        </div>

        {/* Cursive Brand Accent */}
        <div className="hidden lg:block text-right pointer-events-none select-none -rotate-1">
          <p className="font-serif italic text-sky-200/90 text-sm leading-tight drop-shadow-md">
            More than support.<br />
            <span className="text-sky-100 font-medium">A brighter Tomorrow.</span>
          </p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-[#092247] via-[#0c2b59] to-[#092247] p-2.5 sm:p-3.5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Controls: Student Selector & Communication Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Student Selector Dropdown */}
          <div className="relative min-w-[140px] sm:min-w-[170px]">
            <select
              value={filterStudentId ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setFilterStudentId(val);
                if (onSelectStudent) onSelectStudent(val);
              }}
              className="w-full appearance-none rounded-xl bg-[#061e45] hover:bg-[#092a5e] border border-sky-500/40 text-white text-xs font-semibold py-2 pl-3 pr-8 shadow-inner cursor-pointer focus:outline-none focus:border-amber-400 transition-colors"
            >
              <option value="">All Students</option>
              {studentList.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.fullName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-sky-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#051733]/80 border border-sky-600/30 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setFilterType("email")}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "email"
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("sms")}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "sms"
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Text Messages</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("unread")}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === "unread"
                  ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${unreadCount > 0 ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Controls: Search & New Message Action */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-8 pr-8 py-1.5 h-9 bg-[#061e45] border-sky-500/40 text-white placeholder:text-sky-200/60 text-xs rounded-xl focus:border-amber-400 focus-visible:ring-0 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            onClick={() => setShowNewMessageModal(true)}
            className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>New Message</span>
          </Button>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN SECTION: TIMELINE (70%) + INFO SIDEBAR (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT COLUMN: UNIFIED COMMUNICATION TIMELINE ── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-4 sm:p-6 shadow-2xl shadow-sky-950/50 min-h-[580px] flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* Loading State */}
              {isLoading && (
                <div className="py-24 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-sky-200/80 font-mono">Retrieving encrypted communication feed...</p>
                </div>
              )}

              {/* Error State */}
              {!isLoading && isError && (
                <div className="py-16 text-center space-y-3 rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-sm font-semibold text-rose-200">Unable to load communication history</p>
                  <p className="text-xs text-rose-300/80 max-w-sm mx-auto">
                    There was a temporary issue fetching your messages. Please check your connection and retry.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="border-rose-400/40 text-rose-200 hover:bg-rose-900/30 gap-1 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </Button>
                </div>
              )}

              {/* Empty Timeline State */}
              {!isLoading && !isError && timeline.length === 0 && (
                <div className="py-20 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-[#0a2c61] border border-sky-500/50 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-sky-950/40">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base text-white">
                      {searchQuery ? "No matching messages found" : "No messages yet"}
                    </h3>
                    <p className="text-xs text-slate-300/85 leading-relaxed">
                      {searchQuery
                        ? `No conversations match "${searchQuery}". Try adjusting your search query or filter.`
                        : "When you communicate with Waypoint by email or text, your conversations will appear here."}
                    </p>
                  </div>
                  {searchQuery ? (
                    <Button
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="bg-[#092857] hover:bg-[#0d3778] border border-sky-500/50 text-white text-xs rounded-xl cursor-pointer"
                    >
                      Clear Search Filter
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setShowNewMessageModal(true)}
                      className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-400/20 gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send a Message</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Populated Timeline with Chronological Date Headers */}
              {!isLoading && !isError && timeline.length > 0 && (
                <div className="space-y-6">
                  {groupedTimeline.map(({ dateLabel, items }) => (
                    <div key={dateLabel} className="space-y-4">
                      {/* Date Separator Pill */}
                      <div className="flex items-center justify-center my-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-700/40 to-transparent" />
                        <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-bold text-sky-200 bg-[#07224d] border border-sky-500/40 shadow-xs uppercase tracking-wider mx-3">
                          {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-700/40 to-transparent" />
                      </div>

                      {/* Items under this date */}
                      <div className="space-y-4">
                        {items.map((item) => {
                          const isOutbound = item.direction === "outbound";
                          const isEmail = item.type === "email";
                          const isText = item.type === "sms" || item.type === "portal_message";

                          // ── EMAIL CARD PRESENTATION ──
                          if (isEmail) {
                            return (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-sky-500/40 bg-gradient-to-r from-[#07224d] via-[#092b5e] to-[#07224d] p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-sky-400/60 transition-all cursor-pointer"
                                onClick={() => handleOpenEmailDetail(item)}
                              >
                                <div className="flex items-start gap-3.5">
                                  {/* Left Circle Email Icon */}
                                  <div className="w-10 h-10 rounded-xl bg-[#0c316e] border border-sky-400/50 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                                    <Mail className="w-5 h-5 text-white" />
                                  </div>

                                  {/* Email Card Body */}
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    {/* Top Row: Sender, Timestamp, Badges, Action */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-white tracking-tight">
                                          {item.senderName}
                                        </span>
                                        <span className="text-[11px] font-mono text-sky-200/80">
                                          {item.timeLabel}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#0c2a5c] text-sky-200 border border-sky-500/40">
                                          Email
                                        </span>
                                        {item.studentName && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0a2f66] text-sky-200 border border-sky-400/40">
                                            <User className="w-2.5 h-2.5 text-sky-300" />
                                            <span>{item.studentName}</span>
                                          </span>
                                        )}
                                        {item.hasAttachments && (
                                          <span title="Contains attachments">
                                            <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEmailDetail(item);
                                          }}
                                          className="px-3 py-1.5 rounded-xl border border-sky-400/50 bg-[#0c316e]/70 hover:bg-[#11408e] text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                                        >
                                          <span>Open Email →</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toast.info(`Thread ID: ${item.rawThreadId || item.id}`);
                                          }}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                          title="Options"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Subject */}
                                    <h4 className="font-bold text-sm sm:text-base text-white tracking-tight">
                                      {item.subject || "Waypoint Advocates Update"}
                                    </h4>

                                    {/* Preview */}
                                    <p className="text-xs sm:text-[13px] text-slate-200/90 leading-relaxed line-clamp-2">
                                      {item.bodyPreview || item.body}
                                    </p>

                                    {/* Inline Attachment Badges */}
                                    {item.attachments && item.attachments.length > 0 && (
                                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                                        {item.attachments.map((att) => (
                                          <span
                                            key={att.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(att.url, "_blank");
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-mono bg-[#061836] border border-sky-500/40 text-sky-200 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
                                          >
                                            <Paperclip className="w-3 h-3 text-amber-400" />
                                            <span className="truncate max-w-[200px]">{att.name}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // ── TEXT MESSAGE (SMS) PRESENTATION ──
                          if (isOutbound) {
                            // Outbound from Waypoint Staff: Left-aligned
                            return (
                              <div key={item.id} className="flex items-start gap-3 max-w-2xl">
                                {/* Staff Avatar */}
                                <div className="w-9 h-9 rounded-full bg-[#0c316e] border border-sky-400/50 flex items-center justify-center text-white font-serif font-bold text-xs shrink-0 mt-1 shadow-sm">
                                  {item.senderName.charAt(0)}
                                </div>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  {/* Header info */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-white">
                                      {item.senderName}
                                    </span>
                                    <span className="text-[10px] font-mono text-sky-200/80">
                                      {item.timeLabel}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-semibold bg-[#071f45] text-sky-200 border border-sky-500/30">
                                      Text
                                    </span>
                                    {item.studentName && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0a2f66] text-sky-200 border border-sky-400/40">
                                        <User className="w-2.5 h-2.5 text-sky-300" />
                                        <span>{item.studentName}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Text Bubble */}
                                  <div className="rounded-2xl rounded-tl-sm p-3.5 bg-[#061c3d] border border-sky-600/40 text-xs sm:text-[13px] text-white/95 leading-relaxed shadow-md inline-block">
                                    <p className="whitespace-pre-wrap">{item.body}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            // Inbound from Parent: Right-aligned
                            return (
                              <div key={item.id} className="flex items-start justify-end gap-3 max-w-2xl ml-auto">
                                <div className="space-y-1.5 flex-1 min-w-0 flex flex-col items-end">
                                  {/* Header info */}
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <span className="font-bold text-xs sm:text-sm text-white">
                                      {item.senderName}
                                    </span>
                                    <span className="text-[10px] font-mono text-sky-200/80">
                                      {item.timeLabel}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-semibold bg-[#071f45] text-sky-200 border border-sky-500/30">
                                      Text
                                    </span>
                                    {item.studentName && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0a2f66] text-sky-200 border border-sky-400/40">
                                        <User className="w-2.5 h-2.5 text-sky-300" />
                                        <span>{item.studentName}</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Text Bubble */}
                                  <div className="rounded-2xl rounded-tr-sm p-3.5 bg-gradient-to-r from-[#0d4f9e] to-[#0a4185] border border-sky-400/50 text-xs sm:text-[13px] text-white font-medium leading-relaxed shadow-lg inline-block text-left">
                                    <p className="whitespace-pre-wrap">{item.body}</p>
                                  </div>

                                  {/* Delivery Status */}
                                  {item.deliveryStatus && (
                                    <div className="text-[10.5px] text-sky-300/90 font-mono flex items-center justify-end gap-1 pr-1 pt-0.5">
                                      <span>{item.deliveryStatus}</span>
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.5]" />
                                    </div>
                                  )}
                                </div>

                                {/* Parent Avatar */}
                                <div className="w-9 h-9 rounded-full bg-[#0a458f] border border-sky-400/60 flex items-center justify-center text-white font-serif font-bold text-xs shrink-0 mt-1 shadow-sm">
                                  {item.senderName.charAt(0)}
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: COMMUNICATION INFO SIDEBAR (30%) ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c2b59] via-[#081f42] to-[#061a3b] p-5 shadow-2xl shadow-sky-950/50 space-y-5 text-white relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

            {/* 1. Header with Info Icon */}
            <div className="flex items-start gap-3 pb-3 border-b border-sky-700/40 relative z-10">
              <div className="w-7 h-7 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white leading-tight">
                  Communication Info
                </h3>
                <p className="text-[11px] text-slate-300/85 leading-tight mt-0.5">
                  Everything you need to stay connected with Waypoint Advocates.
                </p>
              </div>
            </div>

            {/* 2. Primary Contact Section */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs tracking-wide">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Primary Contact</span>
              </div>
              <div className="p-3 rounded-xl bg-[#061d40] border border-sky-500/30 space-y-1.5">
                <div className="font-bold text-xs text-white">
                  {primaryContact.name}
                </div>
                {primaryContact.email && (
                  <div className="flex items-center gap-2 text-[11px] text-sky-200">
                    <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                    <a href={`mailto:${primaryContact.email}`} className="hover:underline truncate">
                      {primaryContact.email}
                    </a>
                  </div>
                )}
                {primaryContact.phone && (
                  <div className="flex items-center gap-2 text-[11px] text-sky-200">
                    <Phone className="w-3 h-3 text-sky-400 shrink-0" />
                    <a href={`tel:${primaryContact.phone}`} className="hover:underline">
                      {primaryContact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Connected Channels */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs tracking-wide">
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Connected Channels</span>
              </div>
              <div className="p-3 rounded-xl bg-[#061d40] border border-sky-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Email</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                    channels.emailConnected ? "text-emerald-400" : "text-slate-400"
                  }`}>
                    {channels.emailConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    <span>{channels.emailConnected ? "Connected" : "Not Connected"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-sky-800/30 pt-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    <span>SMS / Text</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                    channels.smsConnected ? "text-emerald-400" : "text-slate-400"
                  }`}>
                    {channels.smsConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span>{channels.smsConnected ? "• Connected" : "Not Connected"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Response Expectation */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs tracking-wide">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Response Expectation</span>
              </div>
              <div className="p-3 rounded-xl bg-[#061d40] border border-sky-500/30 space-y-1">
                <div className="font-bold text-xs text-white">
                  Usually within 1 business day
                </div>
                <p className="text-[11px] text-slate-300/80 leading-relaxed">
                  We'll do our best to reply sooner when possible.
                </p>
              </div>
            </div>

            {/* 5. Quick Help Actions */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs tracking-wide">
                <Headphones className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Help</span>
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleOpenCallbackModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#07224d] hover:bg-[#0c316e] border border-sky-500/40 text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-sky-400 group-hover:text-amber-300 transition-colors" />
                    <span>Request Callback</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenScheduler) onOpenScheduler();
                    else if (onNavigateTab) onNavigateTab("appointments");
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#07224d] hover:bg-[#0c316e] border border-sky-500/40 text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-400 group-hover:text-amber-300 transition-colors" />
                    <span>Schedule Call</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#07224d] hover:bg-[#0c316e] border border-sky-500/40 text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sky-400 group-hover:text-amber-300 transition-colors" />
                    <span>Contact Waypoint</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* 6. Recent Attachments */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs tracking-wide">
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recent Attachments</span>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("smart-docs")}
                    className="text-[11px] font-semibold text-sky-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    View All →
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {recentAttachments.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#061d40] border border-sky-500/30 text-center text-xs text-slate-400">
                    No attachments exchanged yet.
                  </div>
                ) : (
                  recentAttachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => window.open(att.url, "_blank")}
                      className="p-2.5 rounded-xl bg-[#061d40] hover:bg-[#0a2c61] border border-sky-500/30 text-white cursor-pointer transition-all flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-7 rounded bg-rose-900/40 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-300 text-[8px] font-black uppercase">
                          PDF
                        </div>
                        <span className="text-xs text-slate-200 group-hover:text-amber-300 transition-colors truncate font-medium">
                          {att.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-sky-300/80 shrink-0">
                        {att.dateLabel}, {att.timeLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 7. Quick Note Distinction Callout */}
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-1 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 font-serif font-bold text-xs">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Note</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                The Parking Lot is for shared sticky-note reminders. This page is for actual communication (email and text) with Waypoint.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* ── BOTTOM QUICK ACTION DOCK ── */}
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-r from-[#092247] via-[#0c2b59] to-[#092247] p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={handleOpenCallbackModal}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5 text-sky-400" />
            <span>Request Callback</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenScheduler) onOpenScheduler();
              else if (onNavigateTab) onNavigateTab("appointments");
            }}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Schedule Meeting</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) onNavigateTab("smart-docs");
            }}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0c2e63] hover:bg-[#103a7d] text-white border border-sky-400/45 font-semibold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Document Vault</span>
          </button>
        </div>

        {/* Right Action: Message Waypoint Gold Button + Tagline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <Button
            type="button"
            onClick={() => setShowNewMessageModal(true)}
            className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs py-2 px-5 rounded-xl shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>Message Waypoint</span>
          </Button>

          <span className="hidden sm:inline-block font-serif italic text-xs text-sky-200/80 font-light pr-1 select-none">
            Same Families. Brighter Tomorrows.
          </span>
        </div>
      </div>

      {/* ── MODAL 1: NEW MESSAGE COMPOSER ── */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="max-w-lg bg-[#06172F] border-sky-500/40 text-white rounded-2xl shadow-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-serif font-bold text-lg flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              <span>New Message to Waypoint</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Reach out directly to your advocacy team via Email or Text Message.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendMessageSubmit} className="space-y-4 pt-2">
            {/* Channel Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-200">Delivery Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setComposerType("email")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    composerType === "email"
                      ? "bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-sm"
                      : "bg-[#030e20] text-slate-300 border-sky-500/30 hover:border-sky-400"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setComposerType("sms")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    composerType === "sms"
                      ? "bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-sm"
                      : "bg-[#030e20] text-slate-300 border-sky-500/30 hover:border-sky-400"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Text (SMS)</span>
                </button>
              </div>
            </div>

            {/* Student Association Dropdown */}
            {studentList.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-sky-200">Related Student (Optional)</label>
                <select
                  value={composerStudentId ?? ""}
                  onChange={(e) => setComposerStudentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full rounded-xl bg-[#030e20] border border-sky-500/40 text-white text-xs p-2.5 focus:border-amber-400 focus:outline-none"
                >
                  <option value="">General Family / No Specific Student</option>
                  {studentList.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject (for Email) */}
            {composerType === "email" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-sky-200">Subject</label>
                <Input
                  type="text"
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  placeholder="e.g. Question regarding upcoming IEP meeting"
                  className="bg-[#030e20] border-sky-500/40 text-white placeholder:text-slate-500 text-xs rounded-xl"
                  required={composerType === "email"}
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-200">Message</label>
              <Textarea
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="bg-[#030e20] border-sky-500/40 text-white placeholder:text-slate-500 text-xs rounded-xl resize-none leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewMessageModal(false)}
                className="text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendMutation.isPending || !composerBody.trim()}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-5 rounded-xl shadow-md shadow-amber-400/20 gap-1.5"
              >
                {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send {composerType === "email" ? "Email" : "Text"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: FULL EMAIL DETAIL VIEWER ── */}
      <Dialog open={showEmailDetailModal} onOpenChange={setShowEmailDetailModal}>
        <DialogContent className="max-w-2xl bg-[#06172F] border-sky-500/40 text-white rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
          {selectedEmail && (
            <div className="space-y-4">
              <DialogHeader className="pb-3 border-b border-sky-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0a2f66] text-sky-200 border border-sky-400/40">
                    Email Thread
                  </span>
                  {selectedEmail.studentName && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#0a2f66] text-sky-200 border border-sky-400/40 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      <span>{selectedEmail.studentName}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono ml-auto">
                    {selectedEmail.dateLabel}, {selectedEmail.timeLabel}
                  </span>
                </div>
                <DialogTitle className="text-lg sm:text-xl font-serif font-bold text-white leading-snug">
                  {selectedEmail.subject || "Waypoint Advocates Update"}
                </DialogTitle>
                <div className="text-xs text-slate-300 pt-1 flex items-center gap-4 flex-wrap">
                  <div>From: <strong className="text-white">{selectedEmail.senderName}</strong></div>
                  <div>To: <strong className="text-white">{selectedEmail.recipientName}</strong></div>
                </div>
              </DialogHeader>

              {/* Email Content */}
              <div className="p-4 rounded-xl bg-[#030e20] border border-sky-500/30 text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                {selectedEmail.body}
              </div>

              {/* Attachments inside modal */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-sky-800/30">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attachments ({selectedEmail.attachments.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedEmail.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-[#082247] hover:bg-[#0c316e] border border-sky-500/40 text-xs text-white flex items-center gap-2 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate group-hover:text-amber-300 transition-colors font-medium">
                          {att.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-sky-400 ml-auto shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailDetailModal(false)}
                  className="border-sky-500/40 text-white hover:bg-white/10 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowEmailDetailModal(false);
                    setComposerType("email");
                    setComposerSubject(`Re: ${selectedEmail.subject}`);
                    setComposerStudentId(selectedEmail.studentId || null);
                    setShowNewMessageModal(true);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: REQUEST CALLBACK ── */}
      <Dialog open={showCallbackModal} onOpenChange={setShowCallbackModal}>
        <DialogContent className="max-w-md bg-[#06172F] border-sky-500/40 text-white rounded-2xl shadow-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-serif font-bold text-lg flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Request a Callback</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              Let us know the best time to reach you and we'll have an advocate call you.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCallbackSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-200">Your Phone Number</label>
              <Input
                type="tel"
                value={callbackPhone}
                onChange={(e) => setCallbackPhone(e.target.value)}
                placeholder="(704) 555-0187"
                className="bg-[#030e20] border-sky-500/40 text-white placeholder:text-slate-500 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-200">Preferred Window</label>
              <select
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                className="w-full rounded-xl bg-[#030e20] border border-sky-500/40 text-white text-xs p-2.5 focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="Morning (9am - 12pm)">Morning (9am - 12pm)</option>
                <option value="Early Afternoon (12pm - 3pm)">Early Afternoon (12pm - 3pm)</option>
                <option value="Late Afternoon (3pm - 5pm)">Late Afternoon (3pm - 5pm)</option>
                <option value="ASAP / Earliest Available">ASAP / Earliest Available</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sky-200">Brief Note / Question (Optional)</label>
              <Textarea
                value={callbackNote}
                onChange={(e) => setCallbackNote(e.target.value)}
                placeholder="What would you like to discuss? (e.g. IEP meeting follow-up)"
                rows={3}
                className="bg-[#030e20] border-sky-500/40 text-white placeholder:text-slate-500 text-xs rounded-xl resize-none leading-relaxed"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCallbackModal(false)}
                className="text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={callbackMutation.isPending || !callbackPhone.trim()}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-5 rounded-xl shadow-md shadow-amber-400/20 gap-1.5"
              >
                {callbackMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                <span>Request Call</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PortalCommunicationTab;
