/**
 * PG-045: Client Communication Hub (Gmail-Connected Client Communication Hub)
 * WAP 1B.1 — Two-Way Gmail Sync, Automatic Client/Student Filing, Needs Review Queue & Thread Console
 */

import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  Plus,
  Paperclip,
  Reply,
  Eye,
  EyeOff,
  UserCheck,
  MessageSquare,
  Loader2,
  Settings,
  ExternalLink,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import {
  GmailComposeModal,
  GmailThreadViewerModal,
} from "@/components/contact/GmailComposerAndThreadModals";

export default function Messages() {
  const utils = trpc.useUtils();

  // Active mode: Gmail Hub vs Direct Portal Chat
  const [activeMode, setActiveMode] = useState<"gmail" | "portal_chat">("gmail");
  const [folder, setFolder] = useState<"all" | "inbox" | "sent" | "unread" | "needs_review">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Compose & Thread Modal States
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{
    toEmail?: string;
    parentContactId?: number | null;
    studentContactId?: number | null;
    subject?: string;
    replyThreadId?: string | null;
    replyToMessageId?: string | null;
  }>({});
  const [threadModalId, setThreadModalId] = useState<string | null>(null);

  // Direct Portal Chat State (Legacy Preserved)
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");

  // Queries
  const { data: gmailStatus, refetch: refetchGmailStatus } = trpc.messages.gmailStatus.useQuery();
  const {
    data: gmailData,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = trpc.messages.listGmailThreads.useQuery({
    folder,
    searchQuery: searchQuery.trim() || undefined,
    limit: 100,
    offset: 0,
  });

  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: directMessages = [] } = trpc.messages.list.useQuery(
    { recipientId: selectedRecipientId || 0 },
    { enabled: activeMode === "portal_chat" && Boolean(selectedRecipientId) }
  );

  // Mutations
  const syncMutation = trpc.messages.syncGmail.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Gmail synchronized: ${res.syncedCount} new, ${res.matchedCount} matched, ${res.needsReviewCount} in Needs Review`
      );
      refetchGmailStatus();
      refetchThreads();
    },
    onError: (err) => toast.error(err.message),
  });

  const markReadMutation = trpc.messages.markGmailRead.useMutation({
    onSuccess: () => {
      refetchThreads();
      refetchGmailStatus();
    },
  });

  const sendDirectMessage = trpc.messages.create.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.messages.list.invalidate();
      toast.success("Portal message sent");
    },
    onError: () => toast.error("Failed to send portal message"),
  });

  const threads = gmailData?.threads || [];
  const counts = gmailData?.counts || { inbox: 0, sent: 0, unread: 0, needsReview: 0 };

  const activeThread = useMemo(() => {
    if (!selectedThreadId) return threads[0] || null;
    return threads.find((t) => t.gmailThreadId === selectedThreadId) || threads[0] || null;
  }, [threads, selectedThreadId]);

  const overallStatus = gmailStatus?.overallStatus || "disconnected";
  const primaryMailbox = gmailStatus?.primaryMailbox;

  const statusPillConfig: Record<string, { label: string; cls: string }> = {
    connected: {
      label: primaryMailbox?.email ? `Connected · ${primaryMailbox.email}` : "Gmail Connected",
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
    },
    syncing: {
      label: "Syncing Gmail...",
      cls: "bg-sky-500/15 text-sky-300 border-sky-500/35",
    },
    disconnected: {
      label: "Gmail Disconnected",
      cls: "bg-slate-700/50 text-slate-300 border-slate-600",
    },
    attention_required: {
      label: "Gmail Attention Required",
      cls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    error: {
      label: "Gmail Sync Error",
      cls: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    },
    configuration_required: {
      label: "Gmail Configuration Required",
      cls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
  };
  const currentStatusPill = statusPillConfig[overallStatus] || statusPillConfig.disconnected;

  return (
    <div className="space-y-5 text-white">
      {/* ── TOP COMMAND HEADER ── */}
      <div className="rounded-2xl border border-[#0D4B84] bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] p-5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Client Communication Hub
            </h1>
            <PageIdBadge id="PG-045" name="Client Messages & Gmail Hub" />
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatusPill.cls}`}
            >
              {overallStatus === "connected" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{currentStatusPill.label}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-blue-200/80">
            Two-way Gmail synchronization, automatic family & student filing, Needs Review queue, and full conversation threads.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setComposeDefaults({});
              setComposeOpen(true);
            }}
            className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold rounded-xl text-xs gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Email</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || overallStatus === "disconnected" || overallStatus === "configuration_required"}
            className="border-blue-700 bg-blue-950/60 hover:bg-blue-900/60 text-blue-100 rounded-xl text-xs gap-1.5"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>Sync Gmail</span>
          </Button>

          <Link href="/integrations">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-800 bg-[#051428] hover:bg-blue-950 text-blue-200 rounded-xl text-xs gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Gmail Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── FILTER & MODE SWITCH DECK ── */}
      <div className="rounded-2xl border border-blue-900/60 bg-[#061830] p-3.5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: "all", label: "All Correspondence", count: gmailData?.totalEmails || 0 },
              { id: "inbox", label: "Inbox", count: counts.inbox },
              { id: "sent", label: "Sent", count: counts.sent },
              { id: "unread", label: "Unread", count: counts.unread },
              { id: "needs_review", label: "Needs Review", count: counts.needsReview, warn: true },
            ] as const
          ).map((f) => {
            const isSelected = activeMode === "gmail" && folder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveMode("gmail");
                  setFolder(f.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#F5B544] text-slate-950 font-bold shadow-sm"
                    : "bg-blue-950/60 text-blue-200 hover:text-white border border-blue-800/60"
                }`}
              >
                <span>{f.label}</span>
                {f.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950"
                        : f.id === "needs_review"
                          ? "bg-amber-500/25 text-amber-300 border border-amber-400/40"
                          : "bg-blue-900 text-blue-200"
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveMode("portal_chat")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === "portal_chat"
                ? "bg-[#F5B544] text-slate-950 font-bold shadow-sm"
                : "bg-blue-950/60 text-blue-200 hover:text-white border border-blue-800/60"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Portal Chat</span>
          </button>
        </div>

        {activeMode === "gmail" && (
          <div className="relative min-w-[240px] sm:min-w-[300px]">
            <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, sender, recipient, or body..."
              className="pl-8 h-9 bg-[#041022] border-blue-800/80 text-white rounded-xl text-xs"
            />
          </div>
        )}
      </div>

      {/* ── MAIN WORKSPACE CONTENT ── */}
      {activeMode === "gmail" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (5 cols): Scrollable Thread List */}
          <div className="lg:col-span-5 rounded-2xl border border-blue-900/60 bg-[#061830] p-4 shadow-xl space-y-2.5 max-h-[680px] overflow-y-auto">
            {isLoadingThreads ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            ) : threads.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <Mail className="w-8 h-8 text-blue-400/50 mx-auto" />
                <p className="text-sm font-semibold text-white">No email threads in this view</p>
                <p className="text-xs text-blue-300/70 max-w-xs mx-auto">
                  {overallStatus === "connected"
                    ? "Compose a client email or click Sync Gmail to import correspondence."
                    : "Connect the company Gmail account in Integrations to begin two-way synchronization."}
                </p>
              </div>
            ) : (
              threads.map((th) => {
                const isSelected = activeThread?.gmailThreadId === th.gmailThreadId;
                return (
                  <div
                    key={th.gmailThreadId}
                    onClick={() => {
                      setSelectedThreadId(th.gmailThreadId);
                      if (th.unreadCount > 0) {
                        markReadMutation.mutate({ gmailThreadId: th.gmailThreadId, isRead: true });
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-[#0B2548] border-[#F5B544] shadow-lg"
                        : "bg-[#041022]/80 border-blue-900/60 hover:border-blue-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {th.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-[#F5B544] shrink-0" />
                        )}
                        <span className="text-xs font-bold text-white truncate">
                          {th.participants.slice(0, 2).join(", ")}
                        </span>
                        {th.messageCount > 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-900/80 text-blue-200 text-[10px] font-mono">
                            {th.messageCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-blue-300/75 shrink-0">
                        {new Date(th.latestTimestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-blue-100 truncate">{th.subject}</div>
                    <p className="text-[11px] text-blue-300/75 line-clamp-2">{th.snippet}</p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {th.studentName && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                          {th.studentName}
                        </Badge>
                      )}
                      {th.parentName && !th.studentName && (
                        <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[10px]">
                          Family: {th.parentName}
                        </Badge>
                      )}
                      {th.matchStatus === "needs_review" && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                          Needs Review
                        </Badge>
                      )}
                      {th.hasAttachments && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-300">
                          <Paperclip className="w-3 h-3" />
                          <span>Attachment</span>
                        </span>
                      )}
                      <span
                        className={`ml-auto text-[10px] px-1.5 py-0.2 rounded ${
                          th.portalVisible
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {th.portalVisible ? "Portal Visible" : "Internal"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column (7 cols): Active Conversation Thread Detail */}
          <div className="lg:col-span-7 rounded-2xl border border-blue-900/60 bg-[#061830] p-5 shadow-xl flex flex-col justify-between min-h-[520px]">
            {!activeThread ? (
              <div className="m-auto text-center space-y-2 py-16">
                <Inbox className="w-10 h-10 text-blue-400/40 mx-auto" />
                <p className="text-sm font-semibold text-white">Select an email conversation</p>
                <p className="text-xs text-blue-300/70">
                  Choose a thread on the left to inspect messages, confirm student filing, or reply.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-blue-900/60 pb-3.5">
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-bold text-white">
                      {activeThread.subject}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-300">
                      <span>{activeThread.messageCount} message(s)</span>
                      {activeThread.studentName && (
                        <Link href={`/students/${activeThread.studentContactId}?tab=activity-timeline`}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[11px] cursor-pointer hover:bg-emerald-500/30">
                            <span>Student: {activeThread.studentName}</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </Link>
                      )}
                      {activeThread.matchStatus === "needs_review" && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                          Needs Review ({activeThread.reviewReason.replace(/_/g, " ")})
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setThreadModalId(activeThread.gmailThreadId)}
                      className="h-8 border-blue-700 bg-blue-950/60 text-blue-200 hover:bg-blue-900 text-xs gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {activeThread.matchStatus === "needs_review"
                          ? "Resolve Needs Review"
                          : "Manage Filing & Portal"}
                      </span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const lastMsg = activeThread.messages[activeThread.messages.length - 1];
                        const replyToAddr =
                          lastMsg.direction === "inbound"
                            ? lastMsg.fromEmail
                            : lastMsg.toEmails[0] || "";
                        setComposeDefaults({
                          toEmail: replyToAddr,
                          parentContactId: activeThread.parentContactId,
                          studentContactId: activeThread.studentContactId,
                          subject: activeThread.subject.startsWith("Re:")
                            ? activeThread.subject
                            : `Re: ${activeThread.subject}`,
                          replyThreadId: activeThread.gmailThreadId,
                          replyToMessageId: lastMsg.gmailMessageId,
                        });
                        setComposeOpen(true);
                      }}
                      className="h-8 bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs gap-1.5"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </Button>
                  </div>
                </div>

                {/* Chronological Thread Messages */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {activeThread.messages.map((msg) => (
                    <div
                      key={msg.gmailMessageId}
                      className="rounded-xl border border-blue-800/70 bg-[#041022] p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              msg.direction === "outbound"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {msg.direction === "outbound" ? "Sent" : "Received"}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {msg.fromName || msg.fromEmail}
                          </span>
                          <span className="text-[11px] text-blue-300/75">
                            to {msg.toEmails.join(", ")}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-blue-300/75">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div
                        className="text-xs sm:text-sm text-blue-50 leading-relaxed space-y-2"
                        dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.bodyText }}
                      />

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-2 border-t border-blue-900/50 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-800 text-xs text-sky-300 hover:text-white"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Direct Portal Chat (Preserved) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h2 className="font-semibold text-white text-sm">Contacts</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {(contacts as any[]).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedRecipientId(contact.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-xs ${
                    selectedRecipientId === contact.id
                      ? "bg-[#F5B544] text-slate-950 font-bold"
                      : "hover:bg-blue-950/60 text-blue-100"
                  }`}
                >
                  <p className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="opacity-75 truncate">{contact.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col">
            {selectedRecipientId ? (
              <>
                <Card className="flex-1 p-4 mb-4 overflow-y-auto max-h-96 space-y-3 bg-[#061830] border-blue-900/60 text-white">
                  {directMessages && directMessages.length > 0 ? (
                    directMessages.map((msg: any) => (
                      <div key={msg.id} className="flex flex-col">
                        <p className="text-xs text-blue-300">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="bg-blue-950 p-3 rounded-lg mt-1 text-xs text-white">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-blue-300 text-xs">
                      <p>No direct portal messages yet. Start the conversation!</p>
                    </div>
                  )}
                </Card>

                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a direct portal message..."
                    className="bg-[#041022] border-blue-800 text-white"
                  />
                  <Button
                    onClick={() => {
                      if (!messageText.trim()) return;
                      sendDirectMessage.mutate({
                        recipientId: selectedRecipientId,
                        content: messageText,
                      });
                    }}
                    className="gap-2 bg-[#F5B544] text-slate-950 font-bold"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <Card className="flex items-center justify-center h-96 bg-[#061830] border-blue-900/60 text-blue-300">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a contact to start direct portal messaging</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Shared Compose & Thread Modals */}
      <GmailComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultToEmail={composeDefaults.toEmail}
        defaultParentContactId={composeDefaults.parentContactId}
        defaultStudentContactId={composeDefaults.studentContactId}
        defaultSubject={composeDefaults.subject}
        replyThreadId={composeDefaults.replyThreadId}
        replyToMessageId={composeDefaults.replyToMessageId}
      />

      <GmailThreadViewerModal
        gmailThreadId={threadModalId}
        open={Boolean(threadModalId)}
        onClose={() => setThreadModalId(null)}
        onReply={(thread, lastMsg) => {
          setThreadModalId(null);
          const replyToAddr =
            lastMsg.direction === "inbound" ? lastMsg.fromEmail : lastMsg.toEmails[0] || "";
          setComposeDefaults({
            toEmail: replyToAddr,
            parentContactId: thread.parentContactId,
            studentContactId: thread.studentContactId,
            subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
            replyThreadId: thread.gmailThreadId,
            replyToMessageId: lastMsg.gmailMessageId,
          });
          setComposeOpen(true);
        }}
      />
    </div>
  );
}
