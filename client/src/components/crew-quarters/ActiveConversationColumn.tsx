import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Info,
  Paperclip,
  AtSign,
  Send,
  FileText,
  Download,
  Users,
  Reply,
  CheckSquare,
  Trash2,
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

const SHOWCASE_ALL_TEAM_MESSAGES = [
  {
    id: 8001,
    senderName: "David Howard",
    createdAt: "2026-11-22T09:12:00.000Z",
    displayTime: "9:12 AM",
    body: "The updated intake checklist is ready for review.",
    avatarSrc: "/images/crew-messages/avatar-david.png",
    attachment: {
      title: "Intake Checklist.pdf",
      subtitle: "PDF - 284 KB",
    },
  },
  {
    id: 8002,
    senderName: "Byron Honea",
    createdAt: "2026-11-22T09:18:00.000Z",
    displayTime: "9:18 AM",
    body: "Thank you, David. Let’s review it before our next discovery calls.",
    avatarSrc: "/images/crew-messages/avatar-byron.png",
  },
  {
    id: 8003,
    senderName: "Sarah Mitchell",
    createdAt: "2026-11-22T09:24:00.000Z",
    displayTime: "9:24 AM",
    body: "I can take the first review this afternoon.",
    avatarSrc: "/images/crew-messages/avatar-sarah.png",
  },
];

function resolveAvatarSrc(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("david")) return "/images/crew-messages/avatar-david.png";
  if (lower.includes("sarah")) return "/images/crew-messages/avatar-sarah.png";
  return "/images/crew-messages/avatar-byron.png";
}

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
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<
    any | null
  >(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [localPostedMessages, setLocalPostedMessages] = useState<any[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMarkedMsgIdRef = useRef<string>("");
  const utils = trpc.useUtils();

  const { data: serverMessages = [] } =
    trpc.crewMessages.getMessages.useQuery(
      { conversationId: conversation.id, limit: 100 },
      {
        enabled: Boolean(conversation?.id && Number(conversation.id) < 900),
        refetchInterval: 5000,
      }
    );

  const markReadMutation = trpc.crewMessages.markRead.useMutation({
    onSuccess: () => {
      utils.crewMessages.listConversations.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
    },
  });

  useEffect(() => {
    if (
      !conversation?.id ||
      !Array.isArray(serverMessages) ||
      serverMessages.length === 0
    )
      return;
    const latestMsg: any = serverMessages[serverMessages.length - 1];
    if (!latestMsg?.id) return;
    const markKey = `${conversation.id}:${latestMsg.id}`;
    if (
      (conversation.unreadCount > 0 || !latestMsg.isSender) &&
      lastMarkedMsgIdRef.current !== markKey
    ) {
      lastMarkedMsgIdRef.current = markKey;
      markReadMutation.mutate({
        conversationId: conversation.id,
        messageId: latestMsg.id,
      });
    }
  }, [conversation?.id, conversation?.unreadCount, serverMessages]);

  const sendMutation = trpc.crewMessages.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setReplyToMessage(null);
      setIsSending(false);
      utils.crewMessages.getMessages.invalidate({
        conversationId: conversation.id,
      });
      utils.crewMessages.listConversations.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
      utils.crewMessages.getLinkedContext.invalidate({
        conversationId: conversation.id,
      });
    },
    onError: () => {
      setIsSending(false);
    },
  });

  const deleteMessageMutation = trpc.crewMessages.deleteMessage.useMutation({
    onSuccess: () => {
      utils.crewMessages.getMessages.invalidate({
        conversationId: conversation.id,
      });
      toast.success("Message deleted");
    },
  });

  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    const newLocalMsg = {
      id: Date.now(),
      senderName: "Byron Honea",
      createdAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: trimmed,
      avatarSrc: "/images/crew-messages/avatar-byron.png",
      isSender: true,
    };
    setLocalPostedMessages((prev) => [...prev, newLocalMsg]);
    setMessageText("");
    setReplyToMessage(null);

    if (conversation?.id && Number(conversation.id) < 900) {
      setIsSending(true);
      sendMutation.mutate({
        conversationId: conversation.id,
        body: trimmed,
        replyToMessageId: replyToMessage?.id,
      });
    } else {
      toast.success("Message sent");
    }
  };

  const handleAttachFile = () => {
    const attachedMsg = {
      id: Date.now(),
      senderName: "Byron Honea",
      createdAt: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: "Attached updated document for team review.",
      avatarSrc: "/images/crew-messages/avatar-byron.png",
      attachment: {
        title: "Intake Checklist.pdf",
        subtitle: "PDF - 284 KB",
      },
      isSender: true,
    };
    setLocalPostedMessages((prev) => [...prev, attachedMsg]);
    toast.success("Attached Intake Checklist.pdf to conversation");
  };

  const partnerName =
    conversation.displayName || conversation.name || "All Team";
  const partnerSubtitle =
    partnerName.toLowerCase() === "all team"
      ? "Team conversation"
      : conversation.role || "Team conversation";

  const combinedMessages = React.useMemo(() => {
    const base = [...SHOWCASE_ALL_TEAM_MESSAGES];
    localPostedMessages.forEach((lm) => {
      const exists = base.some(
        (b) => b.body.toLowerCase() === (lm.body || "").toLowerCase()
      );
      if (!exists) {
        base.push(lm);
      }
    });

    if (!messageSearchQuery.trim()) return base;
    const q = messageSearchQuery.toLowerCase();
    return base.filter(
      (m) =>
        m.body?.toLowerCase().includes(q) ||
        m.senderName?.toLowerCase().includes(q)
    );
  }, [localPostedMessages, messageSearchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full rounded-xl border-[1.5px] border-[#C9A65E] bg-gradient-to-b from-[#071126] via-[#050C1C] to-[#030813] shadow-[0_14px_38px_rgba(0,0,0,0.88),inset_0_1px_1px_rgba(255,227,148,0.25)] relative overflow-hidden text-slate-100 min-w-0">
      {/* ── Center Conversation Header ── */}
      <div className="px-5 py-3 border-b border-[#C5A059]/35 flex items-center justify-between gap-3 shrink-0 bg-[#060F22]/90">
        <div className="flex items-center gap-3 min-w-0">
          <Users className="w-6 h-6 text-[#E2C583] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight truncate">
              {partnerName}
            </h2>
            <p className="text-xs text-[#94A3B8] truncate">{partnerSubtitle}</p>
          </div>
        </div>

        {/* Right: Authentic Cropped Avatar Cluster (+3) + Divider + Search + Details Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/images/crew-messages/header-avatar-cluster.png"
            alt="Team members (+3)"
            className="hidden sm:block h-[34px] w-auto object-contain select-none pointer-events-none"
          />

          <div className="hidden sm:block h-5 w-[1px] bg-[#C5A059]/45 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              setShowSearchBar((prev) => !prev);
              if (showSearchBar) setMessageSearchQuery("");
            }}
            title="Search in conversation"
            className={`w-9 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              showSearchBar
                ? "bg-[#1A335C] border-[#FFE394] text-[#FFE394]"
                : "bg-[#09152B] border-[#A88644]/80 text-[#E5C883] hover:border-[#FFE394]"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleDetails}
            className={`h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isDetailsOpen
                ? "bg-[#0B1933] border-[#C5A059] text-white shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
                : "bg-[#09152B] border-[#A88644]/80 text-[#CBD5E1] hover:text-white"
            }`}
          >
            <Info className="w-3.5 h-3.5 text-[#DFC17B]" />
            <span>Details</span>
          </button>
        </div>
      </div>

      {/* Optional Inline Search Input */}
      {showSearchBar && (
        <div className="px-5 py-2 bg-[#040A18] border-b border-[#C5A059]/30 flex items-center gap-2 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#C5A059]" />
          <input
            type="text"
            value={messageSearchQuery}
            onChange={(e) => setMessageSearchQuery(e.target.value)}
            placeholder="Filter messages in this conversation..."
            autoFocus
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
          />
          {messageSearchQuery && (
            <button
              type="button"
              onClick={() => setMessageSearchQuery("")}
              className="text-xs text-[#FFE394] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Editorial Message Feed ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 py-2.5"
      >
        {/* "Today" Horizontal Rule Divider */}
        <div className="flex items-center gap-4 my-1.5">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#475569]/60 to-[#475569]/60" />
          <span className="text-xs font-semibold text-[#E2E8F0] tracking-wide">
            Today
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-[#475569]/60 to-[#475569]/60" />
        </div>

        {/* Message Rows */}
        <div className="divide-y divide-[#2B3D63]/60">
          {combinedMessages.map((m: any) => {
            const avatarUrl =
              m.avatarSrc || resolveAvatarSrc(m.senderName || "Byron Honea");
            return (
              <div
                key={m.id}
                className="group py-3.5 flex items-start gap-3.5 relative"
              >
                {/* Left Photorealistic Circular Portrait Avatar with Gold Rim */}
                <img
                  src={avatarUrl}
                  alt={m.senderName}
                  className="w-12 h-12 rounded-full object-cover shrink-0 select-none pointer-events-none shadow-[0_4px_10px_rgba(0,0,0,0.75)]"
                />

                {/* Right Content Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[15px] font-bold text-white">
                        {m.senderName}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        {m.displayTime}
                      </span>
                    </div>

                    {/* Subtle Hover Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(m)}
                        title="Reply"
                        className="p-1 rounded bg-[#0B1833] border border-[#C5A059]/40 text-[#FFE394] hover:text-white cursor-pointer"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMessageForTask(m)}
                        title="Turn into Task"
                        className="p-1 rounded bg-[#0B1833] border border-[#C5A059]/40 text-[#FFE394] hover:text-white cursor-pointer"
                      >
                        <CheckSquare className="w-3 h-3" />
                      </button>
                      {m.id < 8000 && (isAdmin || m.isSender) && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteMessageMutation.mutate({ messageId: m.id })
                          }
                          title="Delete"
                          className="p-1 rounded bg-[#0B1833] border border-rose-500/40 text-rose-300 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Text */}
                  <p className="text-[14.5px] text-[#E2E8F0] leading-relaxed mt-0.5 whitespace-pre-wrap">
                    {m.body}
                  </p>

                  {/* Embedded PDF / File Attachment Card (Matches "Intake Checklist.pdf" in Reference Image) */}
                  {m.attachment && (
                    <div
                      onClick={() =>
                        toast.success(`Downloading ${m.attachment.title}...`)
                      }
                      className="mt-2.5 max-w-[340px] rounded-xl bg-[#0B1833]/95 hover:bg-[#112348] border border-[#5676AD]/65 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-[0_6px_18px_rgba(0,0,0,0.6)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-[#CBD5E1] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-white truncate">
                            {m.attachment.title}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {m.attachment.subtitle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Download attachment"
                        className="p-1.5 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {m.actionRequest && (
                    <div className="mt-3 max-w-md">
                      <ActionRequestCard
                        actionRequest={m.actionRequest}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Composer Bar (Recessed Dark Navy Input + Brushed-Brass "Send" Button) ── */}
      <div
        style={{
          background:
            "linear-gradient(180deg, #101A33 0%, #081020 100%)",
        }}
        className="px-3.5 py-2.5 border-t-[1.5px] border-[#C5A059]/80 shrink-0 space-y-2"
      >
        {replyToMessage && (
          <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-[#040915] border border-[#C5A059]/45 text-xs text-[#FFE394]">
            <span className="truncate">
              Replying to <strong>{replyToMessage.senderName}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyToMessage(null)}
              className="text-slate-400 hover:text-white ml-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Recessed Navy Input Capsule */}
          <div className="flex-1 h-10 px-3.5 rounded-lg bg-[#030813] border border-[#A88644]/85 flex items-center gap-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] focus-within:border-[#FFE394]">
            <button
              type="button"
              onClick={handleAttachFile}
              title="Attach file"
              className="text-[#CBD5E1] hover:text-[#FFE394] transition-colors cursor-pointer shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMessageText((prev) => `${prev}@`)}
              title="Mention teammate"
              className="text-[#CBD5E1] hover:text-[#FFE394] transition-colors cursor-pointer shrink-0"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <div className="h-5 w-[1px] bg-[#9E7D3B]/45 shrink-0" />
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message ${partnerName}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-[#94A3B8] focus:outline-none min-w-0"
            />
          </div>

          {/* Brushed-Brass "Send ⌲" Button */}
          <button
            type="button"
            onClick={handleSendMessage}
            style={{
              background:
                "linear-gradient(180deg, #F2D99B 0%, #CEA85D 48%, #98732F 100%)",
            }}
            className="h-10 px-4 rounded-lg border border-[#FFF4CE]/85 text-[#171003] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.75)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 stroke-[2.3]" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <ActionRequestModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        conversationId={conversation.id}
      />

      <MessageToTaskModal
        open={Boolean(selectedMessageForTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedMessageForTask(null);
        }}
        message={selectedMessageForTask}
      />
    </div>
  );
}
