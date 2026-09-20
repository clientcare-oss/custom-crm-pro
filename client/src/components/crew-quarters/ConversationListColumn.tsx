import React, { useState, useMemo, useRef, useEffect } from "react";
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

  // Saved width in localStorage or default compact width (170px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("waypoint_crew_messages_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 120 && parsed <= 420) {
          return parsed;
        }
      }
    } catch {}
    return 170; // Even slimmer default width as requested!
  });

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= 120 && newWidth <= 420) {
        setSidebarWidth(newWidth);
        try {
          localStorage.setItem("waypoint_crew_messages_sidebar_width", String(Math.round(newWidth)));
        } catch {}
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing || !e.touches[0]) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.touches[0].clientX - sidebarLeft;
      if (newWidth >= 120 && newWidth <= 420) {
        setSidebarWidth(newWidth);
        try {
          localStorage.setItem("waypoint_crew_messages_sidebar_width", String(Math.round(newWidth)));
        } catch {}
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

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
    <aside
      ref={sidebarRef}
      style={{ width: `${sidebarWidth}px` }}
      className={`shrink-0 bg-gradient-to-b from-[#061833]/98 via-[#041228]/98 to-[#020b18]/98 border-r border-sky-500/25 flex flex-col justify-between relative text-slate-100 select-none shadow-[inset_-10px_0_20px_rgba(0,0,0,0.35)] ${
        isResizing ? "transition-none" : "transition-[width] duration-150 ease-out"
      }`}
    >
      {/* Top Header & Search */}
      <div className="p-2.5 space-y-2 border-b border-sky-500/20 bg-[#061833]/50 backdrop-blur-sm">
        {/* Title */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-sans truncate">
              {sidebarWidth < 140 ? "Messages" : "Crew Messages"}
            </h2>
            {sidebarWidth >= 170 && (
              <PageIdBadge id="PG-038-MSG" name="Crew Messages Workspace" inline />
            )}
          </div>
          {sidebarWidth >= 185 && (
            <span className="text-[9px] font-mono text-sky-400 bg-sky-950/90 px-1.5 py-0.2 rounded-full border border-sky-400/40 font-bold shrink-0">
              INTERNAL
            </span>
          )}
        </div>

        {/* Search Bar with 3D Inset */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-sky-300/50 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={sidebarWidth < 150 ? "Search" : "Search..."}
            className="h-7.5 pl-7 pr-2.5 bg-[#020b18] border-sky-500/30 text-xs text-white rounded-lg placeholder:text-blue-200/40 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* "New Message" Tactile 3D Button */}
        <Button
          onClick={onNewMessage}
          title="New Message"
          className="w-full h-8 px-2 rounded-xl bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white text-xs font-bold tracking-wide shadow-[0_4px_14px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01] min-w-0"
        >
          <Edit3 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{sidebarWidth < 145 ? "New" : "New Message"}</span>
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
              <span className="uppercase tracking-wider text-[10px] font-bold truncate">
                {sidebarWidth < 155 ? "DMs" : "Direct Messages"}
              </span>
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
              <span className="uppercase tracking-wider text-[10px] font-bold truncate">
                {sidebarWidth < 155 ? "Cases" : "Case Threads"}
              </span>
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
      <div className="p-2.5 border-t border-sky-500/20 bg-[#020b18]/90 flex items-center justify-between text-[11px] text-blue-200/70 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <WaypointWaveIcon className="w-4 h-1.5 text-sky-400 shrink-0" />
          {sidebarWidth >= 140 && (
            <span className="font-medium text-[10px] truncate">Waypoint Crew</span>
          )}
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {sidebarWidth >= 150 ? "Online" : ""}
        </span>
      </div>

      {/* ── Draggable Divider Splitter (Left-Right Resizer) ── */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        onTouchStart={() => setIsResizing(true)}
        onDoubleClick={() => {
          setSidebarWidth(170);
          try {
            localStorage.setItem("waypoint_crew_messages_sidebar_width", "170");
          } catch {}
        }}
        title="Drag left/right to resize sidebar • Double-click to reset"
        className={`absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-40 flex items-center justify-center group/resizer select-none ${
          isResizing ? "pointer-events-auto" : ""
        }`}
      >
        {/* Subtle Active Accent Line */}
        <div
          className={`w-[2px] h-full transition-all ${
            isResizing
              ? "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
              : "bg-transparent group-hover/resizer:bg-sky-400/80 group-hover/resizer:shadow-[0_0_6px_rgba(56,189,248,0.5)]"
          }`}
        />

        {/* 3D Tactile Grip Pill with Glowing Nodes */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3.5 h-8 rounded-full bg-[#051733] border border-sky-400/60 shadow-[0_2px_8px_rgba(0,10,30,0.9)] flex items-center justify-center transition-all pointer-events-none ${
            isResizing
              ? "opacity-100 scale-110 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              : "opacity-0 group-hover/resizer:opacity-100 group-hover/resizer:scale-105"
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="w-1 h-1 rounded-full bg-sky-300" />
            <span className="w-1 h-1 rounded-full bg-sky-400" />
            <span className="w-1 h-1 rounded-full bg-sky-300" />
          </div>
        </div>
      </div>
    </aside>
  );
}
