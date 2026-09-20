import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Info,
  MoreVertical,
  Paperclip,
  AtSign,
  Smile,
  Send,
  CheckCheck,
  Check,
  CheckSquare,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  ArrowDown,
  ShieldCheck,
  Loader2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import ActionRequestCard from "./ActionRequestCard";
import ActionRequestModal from "./ActionRequestModal";
import MessageToTaskModal from "./MessageToTaskModal";
import { toast } from "sonner";

interface ActiveConversationColumnProps {
  conversation: any;
  currentUserId: number;
  isAdmin: boolean;
  onToggleDetails: () => void;
  isDetailsOpen: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "👀", "💡"];

export default function ActiveConversationColumn({
  conversation,
  currentUserId,
  isAdmin,
  onToggleDetails,
  isDetailsOpen,
}: ActiveConversationColumnProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<any | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messages = [], isLoading } = trpc.crewMessages.getMessages.useQuery(
    { conversationId: conversation.id, limit: 100 },
    { refetchInterval: 5000 } // Soft background refresh every 5s without heavy polling
  );

  const sendMutation = trpc.crewMessages.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setReplyToMessage(null);
      setIsSending(false);
      utils.crewMessages.getMessages.invalidate({ conversationId: conversation.id });
      utils.crewMessages.listConversations.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
      scrollToBottom();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
      setIsSending(false);
    },
  });

  const toggleReactionMutation = trpc.crewMessages.toggleReaction.useMutation({
    onSuccess: () => {
      utils.crewMessages.getMessages.invalidate({ conversationId: conversation.id });
    },
  });

  const addToTimelineMutation = trpc.crewMessages.addToActivityTimeline.useMutation({
    onSuccess: () => {
      toast.success("Flagged and added to Student Activity Timeline!");
    },
    onError: (err) => {
      toast.error(err.message || "Could not log to timeline");
    },
  });

  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [conversation.id]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distFromBottom > 150);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);

    sendMutation.mutate({
      conversationId: conversation.id,
      body: messageText.trim(),
      replyToMessageId: replyToMessage?.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddReaction = (messageId: number, emoji: string) => {
    toggleReactionMutation.mutate({ messageId, emoji });
  };

  const handleAttachDemoRecord = () => {
    setIsSending(true);
    sendMutation.mutate({
      conversationId: conversation.id,
      body: "Here's the signed agreement. Let me know if you need anything else!",
      messageType: "linked_record",
      links: [
        {
          recordType: "document",
          recordId: "doc-101",
          metadata: {
            title: "Signed Service Agreement",
            subtitle: "PDF • 245 KB",
            fileUrl: "#",
          },
        },
      ],
    });
  };

  const partnerName = conversation.displayName || conversation.name || "Conversation";
  const partnerRole = conversation.role || (conversation.type === "channel" ? "Company Channel" : "IEP Advocacy Team");
  const partnerInitials = partnerName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07162B] relative overflow-hidden text-slate-100">
      {/* ── Center Header ── */}
      <div className="h-16 px-4 sm:px-6 border-b border-sky-500/20 bg-[#07162B]/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="w-10 h-10 border-2 border-sky-500/40 bg-gradient-to-br from-[#0062E3] to-[#00388A] text-white shadow-md">
              <AvatarFallback className="font-bold text-xs bg-transparent">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#07162B]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-wide">
                {partnerName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200/70">
              <span className="truncate">{partnerRole}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Available
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons (Matching Mockup Pills) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Search within this conversation active")}
            className="h-8 px-3 rounded-xl bg-[#001433]/70 hover:bg-[#001E4D] border-sky-500/30 text-xs font-semibold text-slate-200 hover:text-white shadow-xs gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Search</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleDetails}
            className={`h-8 px-3 rounded-xl border-sky-500/30 text-xs font-semibold shadow-xs gap-1.5 cursor-pointer transition-all ${
              isDetailsOpen
                ? "bg-sky-500/20 text-sky-300 border-sky-400/50"
                : "bg-[#001433]/70 hover:bg-[#001E4D] text-slate-200 hover:text-white"
            }`}
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Conversation Details</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl bg-[#001433]/70 hover:bg-[#001E4D] border-sky-500/30 text-slate-300 hover:text-white cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#001433] border-sky-500/30 text-white shadow-2xl">
              <DropdownMenuItem
                onClick={() => setShowActionModal(true)}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2 font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Request Action / Approval
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleAttachDemoRecord}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2 font-medium"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Share Service Agreement Card
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sky-500/20" />
              <DropdownMenuItem
                onClick={() => toast.success("Conversation notifications muted for 8 hours")}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2"
              >
                Mute Notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Message Stream (Dark Navy, Soft 3D Bubbles) ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-blue-200/50 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>Loading conversation messages...</span>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center py-20 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Start of internal conversation</h4>
            <p className="text-xs text-blue-200/70 leading-relaxed">
              This is a private Waypoint employee workspace. Messages, attachments, and actions are secure and visible only to authorized team members.
            </p>
          </div>
        )}

        {messages.map((m: any) => {
          const isMe = m.isSender;
          const senderInitial = (m.senderName || "U")
            .split(" ")
            .map((p: string) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          const messageTime = new Date(m.createdAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={m.id}
              className={`group flex items-start gap-3 text-xs ${
                isMe ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <Avatar className="w-8 h-8 shrink-0 mt-0.5 border border-sky-500/30 bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md">
                <AvatarFallback className="text-[11px] font-bold bg-transparent">
                  {senderInitial}
                </AvatarFallback>
              </Avatar>

              {/* Bubble & Metadata */}
              <div className={`space-y-1.5 max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end text-right" : "items-start"}`}>
                {/* Sender Name & Timestamp */}
                <div className="flex items-center gap-2 px-1 text-[11px] text-blue-200/60 font-medium">
                  <span className="font-semibold text-white/90">{m.senderName || "Advocate"}</span>
                  <span>{messageTime}</span>
                </div>

                {/* Reply snippet preview if any */}
                {m.replySnippet && (
                  <div className="text-[11px] px-3 py-1.5 rounded-xl bg-[#001433]/70 border-l-2 border-sky-400 text-blue-200/80 mb-1 italic text-left">
                    <span className="font-semibold text-sky-300 not-italic block text-[10px]">
                      Replying to {m.replySnippet.senderName || "message"}:
                    </span>
                    {m.replySnippet.body.slice(0, 90)}...
                  </div>
                )}

                {/* Floating Message Bubble */}
                <div className="relative group/bubble">
                  <div
                    className={`rounded-2xl p-3.5 text-sm leading-relaxed shadow-md transition-all ${
                      isMe
                        ? "bg-gradient-to-r from-[#0062E3] to-[#0051B8] text-white rounded-tr-xs shadow-[0_4px_15px_rgba(0,98,227,0.3)] border border-sky-400/30 text-left"
                        : "bg-[#0E223D]/90 hover:bg-[#122A4C] border border-sky-500/20 text-slate-100 rounded-tl-xs shadow-[0_4px_15px_rgba(0,10,30,0.5)] backdrop-blur-md text-left"
                    }`}
                  >
                    {/* Plain or Multiline text */}
                    <p className="whitespace-pre-wrap">{m.body}</p>

                    {/* Linked Record Card (e.g. Signed Service Agreement) */}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {m.links.map((link: any, idx: number) => {
                          const meta = link.parsedMetadata || {};
                          return (
                            <div
                              key={link.id || idx}
                              className="bg-[#001026]/90 border border-sky-400/30 rounded-xl p-3 shadow-md space-y-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-white">{meta.title || "Linked Document"}</h5>
                                  <p className="text-[10px] text-blue-200/70">{meta.subtitle || "PDF • Ready for Review"}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => toast.success("Opening document in secure previewer...")}
                                  className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg shadow-sm"
                                >
                                  Open Document
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedMessageForTask(m)}
                                  className="h-7 px-3 text-[11px] font-medium bg-transparent hover:bg-white/10 text-slate-200 border-sky-500/30 rounded-lg"
                                >
                                  Create Task
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Request Card */}
                    {m.actionRequest && (
                      <div className="mt-3">
                        <ActionRequestCard
                          actionRequest={m.actionRequest}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  {/* Hover Actions Toolbar */}
                  <div
                    className={`absolute -top-3.5 flex items-center gap-0.5 bg-[#001433] border border-sky-500/30 rounded-full px-1.5 py-0.5 shadow-xl opacity-0 group-hover/bubble:opacity-100 transition-opacity z-20 ${
                      isMe ? "left-0" : "right-0"
                    }`}
                  >
                    {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(m.id, emoji)}
                        className="text-xs hover:scale-125 transition-transform p-1 cursor-pointer"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <button
                      onClick={() => setReplyToMessage(m)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedMessageForTask(m)}
                      className="p-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                      title="Create Task from Message"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>

                    {conversation.linkedStudentId && (
                      <button
                        onClick={() =>
                          addToTimelineMutation.mutate({
                            messageId: m.id,
                            studentContactId: conversation.linkedStudentId,
                            title: `Advocate Note: ${m.body.slice(0, 50)}...`,
                            notes: m.body,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Add to Student Activity Timeline"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reactions list */}
                {m.reactions && m.reactions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {m.reactions.map((r: any) => (
                      <button
                        key={r.emoji}
                        onClick={() => handleAddReaction(m.id, r.emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          r.hasReacted
                            ? "bg-sky-500/25 border-sky-400/50 text-sky-200"
                            : "bg-[#001026] border-sky-500/20 text-slate-300 hover:border-sky-400/40"
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="text-[10px] font-bold">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sent message read receipt */}
                {isMe && (
                  <div className="flex items-center justify-end gap-1 text-[11px] text-blue-200/60 pt-0.5">
                    <span>Read {messageTime}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-8 z-30 px-3 py-1.5 rounded-full bg-[#0062E3] hover:bg-[#0070F3] text-white text-xs font-bold shadow-xl border border-sky-300/40 flex items-center gap-1.5 animate-bounce cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Jump to Latest</span>
        </button>
      )}

      {/* ── Fixed Floating Composer ── */}
      <div className="p-4 border-t border-sky-500/20 bg-[#07162B]/95 backdrop-blur-md shrink-0 space-y-2">
        {/* Replying indicator */}
        {replyToMessage && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#001026] border border-sky-500/30 rounded-xl text-xs text-sky-300">
            <span className="truncate">
              Replying to: <strong>{replyToMessage.senderName || "Advocate"}</strong> ("{replyToMessage.body.slice(0, 50)}...")
            </span>
            <button
              onClick={() => setReplyToMessage(null)}
              className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#001026] border border-sky-500/30 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 rounded-2xl p-2 shadow-inner transition-all">
          {/* Action Toolbar Icons */}
          <div className="flex items-center gap-1 shrink-0 px-1">
            <button
              onClick={() => setShowActionModal(true)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="Request Action / Approval"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              onClick={handleAttachDemoRecord}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Attach Document or CRM Record"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMessageText((prev) => prev + "@")}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Mention Colleague (@)"
            >
              <AtSign className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMessageText((prev) => prev + " 👍")}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Text Area */}
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${partnerName}... (Enter to send, Shift + Enter for new line)`}
            rows={1}
            className="flex-1 bg-transparent border-none text-white text-xs placeholder:text-blue-200/40 resize-none focus:outline-none max-h-24 overflow-y-auto leading-relaxed py-1"
          />

          {/* Send Button (Vibrant Blue Circle with Paper Airplane) */}
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md ${
              messageText.trim() && !isSending
                ? "bg-gradient-to-tr from-[#0062E3] to-[#00A3FF] hover:scale-105 text-white shadow-blue-500/40"
                : "bg-blue-900/30 text-slate-500 cursor-not-allowed"
            }`}
            title="Send Message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 translate-x-0.5 -translate-y-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ActionRequestModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        conversationId={conversation.id}
        partnerUserId={conversation.partnerUserId}
        linkedStudentId={conversation.linkedStudentId}
      />

      <MessageToTaskModal
        open={!!selectedMessageForTask}
        onOpenChange={(open) => !open && setSelectedMessageForTask(null)}
        message={selectedMessageForTask}
        linkedStudentId={conversation.linkedStudentId}
      />
    </div>
  );
}
