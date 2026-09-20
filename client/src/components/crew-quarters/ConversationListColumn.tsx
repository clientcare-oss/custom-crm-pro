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
import PageIdBadge from "@/components/PageIdBadge";

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
    <aside className="w-48 sm:w-52 md:w-56 shrink-0 bg-gradient-to-b from-[#061833]/98 via-[#041228]/98 to-[#020b18]/98 border-r border-sky-500/25 flex flex-col justify-between overflow-hidden relative text-slate-100 select-none shadow-[inset_-10px_0_20px_rgba(0,0,0,0.35)]">
      {/* Top Header & Search */}
      <div className="p-2.5 space-y-2 border-b border-sky-500/20 bg-[#061833]/50 backdrop-blur-sm">
        {/* Title */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold text-white tracking-wide font-sans">
              Crew Messages
            </h2>
            <PageIdBadge id="PG-038-MSG" name="Crew Messages Workspace" inline />
          </div>
          <span className="text-[9px] font-mono text-sky-400 bg-sky-950/90 px-1.5 py-0.2 rounded-full border border-sky-400/40 font-bold">
            INTERNAL
          </span>
        </div>

        {/* Search Bar with 3D Inset */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-sky-300/50 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-7.5 pl-7 pr-2.5 bg-[#020b18] border-sky-500/30 text-xs text-white rounded-lg placeholder:text-blue-200/40 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* "New Message" Tactile 3D Button */}
        <Button
          onClick={onNewMessage}
          className="w-full h-8 rounded-xl bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white text-xs font-bold tracking-wide shadow-[0_4px_14px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Scrollable Conversation Lists */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
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
              className="p-1 rounded hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors cursor-pointer"
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
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0052cc] via-[#0066ee] to-[#0047b3] text-white border-t border-t-sky-200/50 border-x border-x-sky-400/30 border-b border-b-blue-950 shadow-[0_4px_14px_rgba(0,85,225,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] font-semibold"
                        : "text-blue-100/80 hover:bg-sky-500/15 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Hash className={`w-3 h-3 shrink-0 ${isActive ? "text-white" : "text-sky-400/70"}`} />
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {ch.unreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-sky-400 text-slate-950 shadow-sm shrink-0">
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
          <div className="flex items-center justify-between px-2 py-0.5 text-xs font-semibold text-blue-200/70">
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {dmsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-bold">Direct Messages</span>
            </button>
            <button
              onClick={onNewMessage}
              className="p-1 rounded hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="New Direct Message"
            >
              <Plus className="w-3 h-3" />
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
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0052cc] via-[#0066ee] to-[#0047b3] text-white border-t border-t-sky-200/50 border-x border-x-sky-400/30 border-b border-b-blue-950 shadow-[0_4px_14px_rgba(0,85,225,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] font-semibold"
                        : "text-blue-100/80 hover:bg-sky-500/15 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Avatar with Presence Indicator */}
                      <div className="relative shrink-0">
                        <Avatar className="w-5.5 h-5.5 border border-sky-400/40 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs">
                          <AvatarFallback className="text-[9px] font-bold bg-transparent">
                            {dm.initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#041228]" />
                      </div>
                      <span className="truncate font-semibold">{dm.displayName}</span>
                    </div>

                    {dm.unreadCount > 0 && (
                      <span className="ml-1.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-sky-400 text-slate-950 shadow-md shrink-0">
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
          <div className="flex items-center justify-between px-2 py-0.5 text-xs font-semibold text-blue-200/70">
            <button
              onClick={() => setCaseThreadsOpen(!caseThreadsOpen)}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              {caseThreadsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wider text-[10px] font-bold">Case Threads</span>
            </button>
            <button
              onClick={onNewCaseThread}
              className="p-1 rounded hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors cursor-pointer"
              title="Start Internal Case Thread"
            >
              <Plus className="w-3 h-3" />
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
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#0052cc] via-[#0066ee] to-[#0047b3] text-white border-t border-t-sky-200/50 border-x border-x-sky-400/30 border-b border-b-blue-950 shadow-[0_4px_14px_rgba(0,85,225,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] font-semibold"
                        : "text-blue-100/80 hover:bg-sky-500/15 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? "text-white" : "text-sky-400/70"}`} />
                      <span className="truncate">{ct.displayName}</span>
                    </div>
                    {ct.unreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-sky-400 text-slate-950 shrink-0">
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
      <div className="p-3 border-t border-sky-500/20 bg-[#020b18]/90 flex items-center justify-between text-[11px] text-blue-200/70">
        <div className="flex items-center gap-1.5">
          <WaypointWaveIcon className="w-5 h-2 text-sky-400" />
          <span className="font-medium text-[10px]">Waypoint Crew</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>
    </aside>
  );
}
