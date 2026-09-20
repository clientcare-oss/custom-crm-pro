import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme, SuggestionMode } from "emoji-picker-react";
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
  Reply,
  Plus,
} from "lucide-react";
import ActionRequestCard from "./ActionRequestCard";
import ActionRequestModal from "./ActionRequestModal";
import MessageToTaskModal from "./MessageToTaskModal";
import { toast } from "sonner";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

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
  const [reactingToMessageId, setReactingToMessageId] = useState<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessageText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

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
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#051631] via-[#041124] to-[#020a17] relative overflow-hidden text-slate-100 min-w-0">
      {/* 3D Blue Background Bathymetric Mesh & Wave Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, #38bdf8 1.5px, transparent 1.5px),
            radial-gradient(circle at 0% 50%, #0284c7 1.5px, transparent 1.5px),
            linear-gradient(to right, rgba(56, 189, 248, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px, 32px 32px, 64px 64px, 64px 64px",
        }}
      />
      {/* Dynamic 3D Oceanic Radial Depth Spotlights */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50 z-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 50% at 50% 10%, rgba(14, 116, 244, 0.28), transparent 75%),
            radial-gradient(ellipse 70% 35% at 50% 90%, rgba(2, 132, 199, 0.15), transparent 70%),
            radial-gradient(ellipse 100% 70% at 50% 100%, rgba(0, 4, 16, 0.75), transparent 80%)
          `,
        }}
      />

      {/* ── Center Header (3D Sculpted Bar) ── */}
      <div className="h-16 px-4 sm:px-6 border-b border-sky-500/25 bg-gradient-to-r from-[#071f42]/95 via-[#0a2957]/95 to-[#071f42]/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0 shadow-[0_4px_20px_rgba(0,5,20,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="w-10 h-10 border-2 border-sky-400/50 bg-gradient-to-br from-[#0062E3] to-[#00388A] text-white shadow-[0_4px_12px_rgba(0,80,220,0.4)]">
              <AvatarFallback className="font-bold text-xs bg-transparent">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#071f42]" />
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons (3D Sculpted Navy Pills) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Search within this conversation active")}
            className="h-8.5 px-3 rounded-xl bg-gradient-to-b from-[#0e2c59] to-[#071933] hover:from-[#133973] hover:to-[#092244] border-t border-t-sky-300/40 border border-sky-500/30 text-xs font-semibold text-sky-200 hover:text-white shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Search</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleDetails}
            className={`h-8.5 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer transition-all hover:scale-[1.02] ${
              isDetailsOpen
                ? "bg-gradient-to-b from-[#0062E3] to-[#004BB5] text-white border-t border-t-sky-200/60 border border-sky-400 shadow-[0_4px_14px_rgba(0,98,227,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                : "bg-gradient-to-b from-[#0e2c59] to-[#071933] hover:from-[#133973] hover:to-[#092244] border-t border-t-sky-300/40 border border-sky-500/30 text-sky-200 hover:text-white shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]"
            }`}
          >
            <Info className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden sm:inline">Linked Context</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8.5 w-8.5 rounded-xl bg-gradient-to-b from-[#0e2c59] to-[#071933] hover:from-[#133973] hover:to-[#092244] border-t border-t-sky-300/40 border border-sky-500/30 text-sky-200 hover:text-white shadow-[0_3px_8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-gradient-to-b from-[#061833] to-[#020a17] border-t border-t-sky-400/40 border border-sky-500/30 text-white shadow-2xl rounded-2xl p-1.5">
              <DropdownMenuItem
                onClick={() => setShowActionModal(true)}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2 font-medium rounded-xl text-sky-100"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Request Action / Approval
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleAttachDemoRecord}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2 font-medium rounded-xl text-sky-100"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Share Service Agreement Card
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-sky-500/20 my-1" />
              <DropdownMenuItem
                onClick={() => toast.success("Conversation notifications muted for 8 hours")}
                className="cursor-pointer text-xs hover:bg-sky-500/20 focus:bg-sky-500/20 gap-2 rounded-xl text-sky-100"
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
          <div className="text-center py-20 max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-[#0e2c59] to-[#071933] border-t border-t-sky-400/50 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-300 shadow-[0_12px_30px_rgba(0,10,35,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white tracking-wide">Start of internal conversation</h4>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                This is a private Waypoint employee workspace. Messages, attachments, and actions are secure and visible only to authorized team members.
              </p>
            </div>
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

          const hasAttachedCards = Boolean((m.links && m.links.length > 0) || m.actionRequest);

          return (
            <div
              key={m.id}
              className={`group flex items-start gap-3 text-xs ${
                isMe ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <Avatar className="w-8 h-8 shrink-0 mt-0.5 border border-sky-400/40 bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md">
                <AvatarFallback className="text-[11px] font-bold bg-transparent">
                  {senderInitial}
                </AvatarFallback>
              </Avatar>

              {/* Bubble & Metadata */}
              <div className={`flex flex-col space-y-1.5 max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end text-right" : "items-start text-left"}`}>
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

                {/* 3D Message Bubble */}
                <div className={`relative group/bubble ${hasAttachedCards ? "w-full min-w-[280px] sm:min-w-[320px] max-w-full" : "w-fit max-w-full"}`}>
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed transition-all ${
                      hasAttachedCards ? "w-full min-w-[280px] sm:min-w-[320px]" : "w-fit"
                    } ${
                      isMe
                        ? "bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] text-white rounded-tr-xs shadow-[0_8px_24px_rgba(0,85,225,0.4),0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border-x border-x-sky-400/30 border-b border-b-blue-950 text-left"
                        : "bg-gradient-to-b from-[#102d54] via-[#0c2242] to-[#081830] text-slate-100 rounded-tl-xs shadow-[0_8px_24px_rgba(0,5,20,0.55),0_2px_5px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] border-t border-t-sky-400/35 border-x border-x-sky-500/25 border-b border-b-black/70 backdrop-blur-md text-left hover:brightness-105"
                    }`}
                  >
                    {/* Plain or Multiline text */}
                    <p className="whitespace-pre-wrap">{m.body}</p>

                    {/* Linked Record Card (e.g. Signed Service Agreement) */}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-3 space-y-2 w-full">
                        {m.links.map((link: any, idx: number) => {
                          const meta = link.parsedMetadata || {};
                          return (
                            <div
                              key={link.id || idx}
                              className="w-full max-w-full bg-[#020b18]/95 border border-sky-400/35 rounded-xl p-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.3)] space-y-2.5 overflow-hidden box-border"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8.5 h-8.5 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0 shadow-inner">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-white truncate">{meta.title || "Linked Document"}</h5>
                                  <p className="text-[10px] text-blue-200/70">{meta.subtitle || "PDF • Ready for Review"}</p>
                                </div>
                              </div>

                              {/* Perfectly Proportioned 2-Button Grid Row */}
                              <div className="grid grid-cols-2 gap-2 pt-0.5 w-full">
                                <Button
                                  size="sm"
                                  onClick={() => toast.success("Opening document in secure previewer...")}
                                  className="h-8 px-2 text-[11px] font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                                >
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Open Document</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedMessageForTask(m)}
                                  className="h-8 px-2 text-[11px] font-medium bg-[#061833] hover:bg-sky-500/20 text-sky-200 hover:text-white border border-sky-500/35 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-w-0"
                                >
                                  <CheckSquare className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                                  <span className="truncate">Turn into Task</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Request Card */}
                    {m.actionRequest && (
                      <div className="mt-3 w-full">
                        <ActionRequestCard
                          actionRequest={m.actionRequest}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  {/* Quick Action Emoji Trigger on Hover */}
                  <div
                    className={`absolute -top-3 ${
                      isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                    } opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-20`}
                  >
                    <button
                      onClick={() => handleAddReaction(m.id, "👍")}
                      className="p-1 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="React 👍"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleAddReaction(m.id, "❤️")}
                      className="p-1 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="React ❤️"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleAddReaction(m.id, "🎯")}
                      className="p-1 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="React 🎯"
                    >
                      🎯
                    </button>

                    {/* Full Emoji Reaction Picker */}
                    <Popover
                      open={reactingToMessageId === m.id}
                      onOpenChange={(open) => setReactingToMessageId(open ? m.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className="p-1 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                          title="React with any emoji (Search & Recent)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="center"
                        sideOffset={8}
                        className="w-auto p-0 border-t border-t-sky-300/50 border border-sky-500/35 bg-[#061833] rounded-2xl shadow-[0_20px_50px_rgba(0,5,20,0.85)] overflow-hidden z-50"
                      >
                        <Suspense
                          fallback={
                            <div className="w-[300px] h-[340px] flex items-center justify-center text-xs text-sky-300/70 bg-[#061833]">
                              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                            </div>
                          }
                        >
                          <div
                            style={{
                              "--epr-bg-color": "#061833",
                              "--epr-category-label-bg-color": "#061833",
                              "--epr-search-input-bg-color": "#020b18",
                              "--epr-text-color": "#ffffff",
                              "--epr-category-icon-active-color": "#38bdf8",
                              "--epr-hover-bg-color": "rgba(56, 189, 248, 0.18)",
                              "--epr-focus-bg-color": "rgba(56, 189, 248, 0.25)",
                              "--epr-preview-text-color": "#bae6fd",
                              "--epr-border-color": "rgba(56, 189, 248, 0.2)",
                            } as React.CSSProperties}
                          >
                            <EmojiPicker
                              theme={Theme.DARK}
                              onEmojiClick={(emojiData) => {
                                handleAddReaction(m.id, emojiData.emoji);
                                setReactingToMessageId(null);
                              }}
                              autoFocusSearch={false}
                              searchPlaceHolder="React with any emoji..."
                              width={300}
                              height={340}
                              suggestedEmojisMode={SuggestionMode.RECENT}
                              lazyLoadEmojis={true}
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        </Suspense>
                      </PopoverContent>
                    </Popover>

                    <button
                      onClick={() => setReplyToMessage(m)}
                      className="p-1.5 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSelectedMessageForTask(m)}
                      className="p-1.5 rounded-full bg-[#051733] border border-sky-400/40 text-sky-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Turn into Task"
                    >
                      <CheckSquare className="w-3 h-3" />
                    </button>
                    {isAdmin && conversation.linkedStudentId && (
                      <button
                        onClick={() =>
                          addToTimelineMutation.mutate({
                            messageId: m.id,
                            studentContactId: conversation.linkedStudentId,
                            title: `Crew Insight: ${(m.body || "Advocate note").slice(0, 45)}`,
                            notes: m.body,
                          })
                        }
                        className="p-1.5 rounded-full bg-[#051733] border border-amber-400/50 text-amber-300 hover:text-white shadow-md hover:scale-110 transition-transform cursor-pointer"
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
                            : "bg-[#020b18] border-sky-500/25 text-slate-300 hover:border-sky-400/40"
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

      {/* ── Fixed Floating Composer (3D Capsule) ── */}
      <div className="p-4 border-t border-sky-500/25 bg-gradient-to-b from-[#061833]/95 to-[#020a17]/95 backdrop-blur-md shrink-0 space-y-2.5 shadow-[0_-10px_30px_rgba(0,5,20,0.5)]">
        {/* Replying indicator */}
        {replyToMessage && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#020b18] border border-sky-400/40 rounded-xl text-xs text-sky-300 shadow-inner">
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

        <div className="flex items-center gap-2 bg-gradient-to-b from-[#081f42] to-[#030e21] border-t border-t-sky-400/50 border border-sky-500/35 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/30 rounded-2xl p-2.5 shadow-[0_12px_35px_rgba(0,5,20,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all">
          {/* Action Toolbar Icons */}
          <div className="flex items-center gap-1 shrink-0 px-1">
            <button
              onClick={() => setShowActionModal(true)}
              className="p-1.5 rounded-xl hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="Request Action / Approval"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>

            <button
              onClick={handleAttachDemoRecord}
              className="p-1.5 rounded-xl hover:bg-sky-500/20 text-sky-300/70 hover:text-white transition-colors cursor-pointer"
              title="Attach Document or CRM Record"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMessageText((prev) => prev + "@")}
              className="p-1.5 rounded-xl hover:bg-sky-500/20 text-sky-300/70 hover:text-white transition-colors cursor-pointer"
              title="Mention Colleague (@)"
            >
              <AtSign className="w-4 h-4" />
            </button>

            {/* Full-Range Emoji Suite with Search & Recent */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    showEmojiPicker
                      ? "bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-sm scale-105"
                      : "hover:bg-sky-500/20 text-sky-300/70 hover:text-white"
                  }`}
                  title="Add Emoji (Full catalog with search & recent)"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={14}
                className="w-auto p-0 border-t border-t-sky-300/50 border border-sky-500/35 bg-[#061833] rounded-2xl shadow-[0_25px_60px_rgba(0,5,20,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden z-50"
              >
                <Suspense
                  fallback={
                    <div className="w-[330px] h-[380px] flex flex-col items-center justify-center text-xs text-sky-300/70 gap-2 bg-[#061833]">
                      <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                      <span>Loading full emoji suite...</span>
                    </div>
                  }
                >
                  <div
                    style={{
                      "--epr-bg-color": "#061833",
                      "--epr-category-label-bg-color": "#061833",
                      "--epr-search-input-bg-color": "#020b18",
                      "--epr-text-color": "#ffffff",
                      "--epr-category-icon-active-color": "#38bdf8",
                      "--epr-hover-bg-color": "rgba(56, 189, 248, 0.18)",
                      "--epr-focus-bg-color": "rgba(56, 189, 248, 0.25)",
                      "--epr-preview-text-color": "#bae6fd",
                      "--epr-border-color": "rgba(56, 189, 248, 0.2)",
                    } as React.CSSProperties}
                  >
                    <EmojiPicker
                      theme={Theme.DARK}
                      onEmojiClick={handleEmojiSelect}
                      autoFocusSearch={false}
                      searchPlaceHolder="Search all emojis..."
                      width={330}
                      height={380}
                      suggestedEmojisMode={SuggestionMode.RECENT}
                      lazyLoadEmojis={true}
                      previewConfig={{
                        showPreview: true,
                        defaultEmoji: "👍",
                        defaultCaption: "Pick an emoji to insert",
                      }}
                    />
                  </div>
                </Suspense>
              </PopoverContent>
            </Popover>
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

          {/* Send Button (Tactile 3D Extruded Blue Button) */}
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-lg ${
              messageText.trim() && !isSending
                ? "bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white shadow-[0_4px_16px_rgba(0,112,243,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 hover:scale-105"
                : "bg-[#06162e] text-slate-500 border border-sky-950 cursor-not-allowed"
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
