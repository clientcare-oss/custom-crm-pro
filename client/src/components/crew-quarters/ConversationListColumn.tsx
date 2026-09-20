import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Hash,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Edit3,
  Users,
  Compass,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";

interface ConversationListColumnProps {
  conversations: {
    channels: any[];
    directMessages: any[];
    groupMessages: any[];
    caseThreads: any[];
  };
  activeConversationId: number | null;
  onSelectConversation: (conv: any) => void;
  onNewMessage: () => void;
  onNewCaseThread: () => void;
}

export default function ConversationListColumn({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewMessage,
  onNewCaseThread,
}: ConversationListColumnProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [caseThreadsOpen, setCaseThreadsOpen] = useState(true);

  // Filter conversations by search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return conversations.channels;
    const q = searchQuery.toLowerCase();
    return conversations.channels.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [conversations.channels, searchQuery]);

  const filteredDMs = useMemo(() => {
    if (!searchQuery.trim()) return conversations.directMessages;
    const q = searchQuery.toLowerCase();
    return conversations.directMessages.filter(
      (c) => c.displayName?.toLowerCase().includes(q) || c.lastMessage?.body?.toLowerCase().includes(q)
    );
  }, [conversations.directMessages, searchQuery]);

  const filteredCaseThreads = useMemo(() => {
    if (!searchQuery.trim()) return conversations.caseThreads;
    const q = searchQuery.toLowerCase();
    return conversations.caseThreads.filter(
      (c) => c.displayName?.toLowerCase().includes(q) || c.student?.notes?.toLowerCase().includes(q)
    );
  }, [conversations.caseThreads, searchQuery]);

  return (
    <aside className="w-72 sm:w-80 shrink-0 bg-[#07162B] border-r border-sky-500/20 flex flex-col justify-between overflow-hidden relative text-slate-100 select-none">
      {/* Top Header & Search */}
      <div className="p-4 space-y-3.5 border-b border-sky-500/15">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wide font-sans">
              Crew Messages
            </h2>
          </div>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-400/30">
            INTERNAL
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, people, or channels..."
            className="h-9 pl-9 pr-3 bg-[#001026] border-sky-500/25 text-xs text-white rounded-xl placeholder:text-blue-200/40 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 shadow-inner"
          />
        </div>

        {/* "New Message" Tactile Button */}
        <Button
          onClick={onNewMessage}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-[#0070F3] via-[#0060E6] to-[#004BB5] hover:from-[#0080FF] hover:to-[#0055CC] text-white text-xs font-bold tracking-wide shadow-[0_4px_15px_rgba(0,112,243,0.35)] border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Edit3 className="w-4 h-4" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Scrollable Conversation Lists */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ── Channels Section ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-blue-200/70">
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {channelsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[11px] font-bold">Channels</span>
            </button>
            <button
              onClick={onNewMessage}
              className="p-0.5 rounded hover:bg-white/10 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="Create Channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {channelsOpen && (
            <div className="space-y-0.5">
              {filteredChannels.map((ch) => {
                const isActive = activeConversationId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectConversation(ch)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0D305C] to-[#001D47] text-white border border-sky-400/40 shadow-md"
                        : "text-blue-100/80 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {ch.unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-500 text-white shrink-0">
                        {ch.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Direct Messages Section ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-blue-200/70">
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {dmsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[11px] font-bold">Direct Messages</span>
            </button>
            <button
              onClick={onNewMessage}
              className="p-0.5 rounded hover:bg-white/10 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="New Direct Message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {dmsOpen && (
            <div className="space-y-0.5">
              {filteredDMs.map((dm) => {
                const isActive = activeConversationId === dm.id;
                return (
                  <button
                    key={dm.id}
                    onClick={() => onSelectConversation(dm)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0D305C] to-[#001D47] text-white border border-sky-400/40 shadow-md"
                        : "text-blue-100/80 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with Presence Indicator */}
                      <div className="relative shrink-0">
                        <Avatar className="w-7 h-7 border border-sky-500/30 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                          <AvatarFallback className="text-[10px] font-bold bg-transparent">
                            {dm.initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#07162B]" />
                      </div>
                      <span className="truncate font-semibold">{dm.displayName}</span>
                    </div>

                    {dm.unreadCount > 0 && (
                      <span className="ml-2 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-[#0070F3] text-white shadow-md shadow-blue-500/30 shrink-0">
                        {dm.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Case Threads Section ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-blue-200/70">
            <button
              onClick={() => setCaseThreadsOpen(!caseThreadsOpen)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {caseThreadsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[11px] font-bold">Case Threads</span>
            </button>
            <button
              onClick={onNewCaseThread}
              className="p-0.5 rounded hover:bg-white/10 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="Start Internal Case Thread"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {caseThreadsOpen && (
            <div className="space-y-0.5">
              {filteredCaseThreads.map((ct) => {
                const isActive = activeConversationId === ct.id;
                return (
                  <button
                    key={ct.id}
                    onClick={() => onSelectConversation(ct)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0D305C] to-[#001D47] text-white border border-sky-400/40 shadow-md"
                        : "text-blue-100/80 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                      <span className="truncate">{ct.displayName}</span>
                    </div>
                    {ct.unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-500 text-white shrink-0">
                        {ct.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subtle Nautical Wave Ribbon Footer */}
      <div className="p-3 border-t border-sky-500/15 bg-[#001026]/70 flex items-center justify-between text-[11px] text-blue-200/70">
        <div className="flex items-center gap-1.5">
          <WaypointWaveIcon className="w-6 h-2 text-sky-400" />
          <span className="font-medium text-[10px]">Waypoint Advocates</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>
    </aside>
  );
}
