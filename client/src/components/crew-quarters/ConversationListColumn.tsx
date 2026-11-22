import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Search,
  Edit3,
  Users,
  Settings,
  Scale,
  User,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface ConversationListColumnProps {
  conversations: {
    channels: any[];
    directMessages: any[];
    groupMessages: any[];
    caseThreads: any[];
  };
  activeConversationId: number | null;
  activeConversationName?: string;
  onSelectConversation: (conv: any) => void;
  onNewMessage: () => void;
  onNewCaseThread: () => void;
}

const CORE_TEAMS = [
  {
    id: 1,
    key: "all-team",
    name: "All Team",
    displayName: "All Team",
    type: "channel",
    role: "Team conversation",
    icon: Users,
  },
  {
    id: 2,
    key: "operations",
    name: "Operations",
    displayName: "Operations",
    type: "channel",
    role: "Operations & intake coordination",
    icon: Settings,
  },
  {
    id: 3,
    key: "advocacy",
    name: "Advocacy",
    displayName: "Advocacy",
    type: "channel",
    role: "IEP & 504 advocacy strategy",
    icon: Scale,
  },
];

const CORE_DIRECT_MESSAGES: {
  id: number;
  name: string;
  displayName: string;
  type: string;
  role: string;
  initials: string;
  isOnline: boolean;
  hasUnreadDot: boolean;
  unreadCount?: number;
}[] = [
  {
    id: 901,
    name: "David Howard",
    displayName: "David Howard",
    type: "direct",
    role: "Operations & Intake Lead",
    initials: "DH",
    isOnline: true,
    hasUnreadDot: false,
  },
  {
    id: 902,
    name: "Sarah Mitchell",
    displayName: "Sarah Mitchell",
    type: "direct",
    role: "Senior Special Education Advocate",
    initials: "SM",
    isOnline: false,
    hasUnreadDot: true,
  },
];

function BrassRivet() {
  return (
    <span
      aria-hidden="true"
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block bg-[radial-gradient(circle_at_35%_35%,#FFF5CC_0%,#D4AF61_50%,#6B4E1B_90%,#2A1D06_100%)] border border-[#FFE5A3]/60 shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
    />
  );
}

export default function ConversationListColumn({
  conversations,
  activeConversationId,
  activeConversationName = "All Team",
  onSelectConversation,
  onNewMessage,
  onNewCaseThread,
}: ConversationListColumnProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [directoryTab, setDirectoryTab] = useState<"team" | "families">("team");

  const currentUserName = user?.name || "Byron Honea";
  const currentUserInitials = currentUserName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Keep the exact 3 TEAMS ("All Team", "Operations", "Advocacy") when not searching so buttons never crowd or overlap
  const teamChannels = useMemo(() => {
    const serverChannels = [
      ...(conversations.channels || []),
      ...(conversations.groupMessages || []),
    ];

    const list = CORE_TEAMS.map((core) => {
      const match = serverChannels.find((sc) => {
        const scName = (sc.name || sc.displayName || "").toLowerCase();
        if (core.key === "all-team") {
          return scName.includes("all team") || scName === "general";
        }
        return scName.includes(core.name.toLowerCase());
      });
      return match
        ? {
            ...match,
            name: core.name,
            displayName: core.name,
            icon: core.icon,
            role: core.role,
          }
        : core;
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) =>
      (c.displayName || c.name || "").toLowerCase().includes(q)
    );
  }, [conversations.channels, conversations.groupMessages, searchQuery]);

  // Keep the exact 2 Direct Messages ("David Howard", "Sarah Mitchell") by default (plus any actively selected or searched DM) so buttons never overlap
  const directMessagesList = useMemo(() => {
    const serverDMs = conversations.directMessages || [];
    const list = CORE_DIRECT_MESSAGES.map((core) => {
      const match = serverDMs.find(
        (s: any) =>
          (s.displayName || s.name || "").toLowerCase() ===
          core.displayName.toLowerCase()
      );
      return match
        ? {
            ...core,
            ...match,
            displayName: core.displayName,
            hasUnreadDot: core.hasUnreadDot || Number(match.unreadCount || 0) > 0,
          }
        : core;
    });

    // If the user explicitly opened another DM via Compose or search, show that active DM too
    serverDMs.forEach((dm: any) => {
      const dmName = (dm.displayName || dm.name || "").toLowerCase();
      const alreadyInCore = list.some(
        (c) => c.displayName.toLowerCase() === dmName
      );
      if (
        !alreadyInCore &&
        (dm.id === activeConversationId || searchQuery.trim().length > 0)
      ) {
        list.push({
          ...dm,
          name: dm.displayName || dm.name || "Team Member",
          displayName: dm.displayName || dm.name || "Team Member",
          isOnline: true,
          hasUnreadDot: Number(dm.unreadCount || 0) > 0,
        });
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) =>
      (c.displayName || "").toLowerCase().includes(q)
    );
  }, [conversations.directMessages, activeConversationId, searchQuery]);

  const familyThreadsList = useMemo(() => {
    const raw = conversations.caseThreads || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter((c: any) =>
      (c.displayName || "").toLowerCase().includes(q)
    );
  }, [conversations.caseThreads, searchQuery]);

  const isConvSelected = (item: any) => {
    const activeLower = (activeConversationName || "").toLowerCase();
    const itemLower = (item.displayName || item.name || "").toLowerCase();
    if (activeLower && itemLower) {
      return activeLower === itemLower;
    }
    return Boolean(activeConversationId && item.id === activeConversationId);
  };

  return (
    <aside className="w-[232px] sm:w-[244px] shrink-0 h-full rounded-xl border-[1.5px] border-[#C9A65E] bg-gradient-to-b from-[#091326] via-[#050C1B] to-[#030712] shadow-[0_14px_34px_rgba(0,0,0,0.88),inset_0_1px_1px_rgba(255,227,148,0.25)] flex flex-col justify-between overflow-hidden relative text-[#FFF4D4]">
      {/* ── Top Controls: CONTACT INDEX Plaque + Search + Compose + Team/Families ── */}
      <div className="p-3 pb-2 space-y-2.5 shrink-0">
        {/* Header Plaque with Left & Right Brass Rivets */}
        <div className="flex items-center justify-between px-0.5">
          <BrassRivet />
          <div className="flex items-center gap-2">
            <span className="w-3 h-[1px] bg-[#C5A059]/60" />
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#E2C583]">
              CONTACT INDEX
            </span>
            <span className="w-3 h-[1px] bg-[#C5A059]/60" />
          </div>
          <BrassRivet />
        </div>

        {/* Search Input with Gold Rim */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C5A059] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full h-[34px] pl-8 pr-3 rounded-lg bg-[#030813] border border-[#A88644]/85 text-xs text-[#FFF4D4] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFE394] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Brushed-Brass "Compose" Button (Clean Centered Label — Zero Rivet Overlap) */}
        <button
          type="button"
          onClick={
            directoryTab === "families" ? onNewCaseThread : onNewMessage
          }
          style={{
            background:
              "linear-gradient(180deg, #F2D99B 0%, #CEA85D 48%, #98732F 100%)",
          }}
          className="w-full h-[34px] px-3 rounded-lg border border-[#FFF4CE]/85 text-[#171003] font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.78)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
          <span>Compose</span>
        </button>

        {/* Segmented "Team | Families" Toggle */}
        <div className="grid grid-cols-2 p-0.5 rounded-lg bg-[#040915] border border-[#8A6B32]/80 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)]">
          <button
            type="button"
            onClick={() => setDirectoryTab("team")}
            className={`h-[26px] rounded-md text-xs font-semibold transition-all cursor-pointer ${
              directoryTab === "team"
                ? "bg-gradient-to-b from-[#31538C] to-[#1A3057] text-white border border-[#7AA7EA]/60 shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
                : "text-[#CBD5E1] hover:text-white"
            }`}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => setDirectoryTab("families")}
            className={`h-[26px] rounded-md text-xs font-semibold transition-all cursor-pointer ${
              directoryTab === "families"
                ? "bg-gradient-to-b from-[#31538C] to-[#1A3057] text-white border border-[#7AA7EA]/60 shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
                : "text-[#CBD5E1] hover:text-white"
            }`}
          >
            Families
          </button>
        </div>
      </div>

      {/* ── Middle Section: TEAMS & DIRECT MESSAGES (Clean Non-Overlapping Hardware Plaques) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-3.5 min-h-0">
        {directoryTab === "team" ? (
          <>
            {/* TEAMS SECTION */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#CBD5E1]">
                  TEAMS
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/60 to-transparent" />
              </div>

              <div className="space-y-2">
                {teamChannels.map((team) => {
                  const isActive = isConvSelected(team);
                  const Icon = team.icon || Users;
                  return (
                    <div
                      key={team.key || team.id}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {/* Authentic Cropped 3D Jewel Indicator Lamp */}
                      <img
                        src={
                          isActive
                            ? "/images/crew-messages/lamp-blue.png"
                            : "/images/crew-messages/lamp-brass.png"
                        }
                        alt=""
                        className="w-5 h-5 rounded-full object-contain shrink-0 select-none pointer-events-none"
                      />

                      {/* Channel Plaque Button */}
                      <button
                        type="button"
                        onClick={() => onSelectConversation(team)}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(90deg, #19315B 0%, #284C86 50%, #172D53 100%)",
                              }
                            : {
                                background:
                                  "linear-gradient(180deg, #EDD394 0%, #C9A45B 50%, #98732F 100%)",
                              }
                        }
                        className={`flex-1 min-w-0 h-[34px] px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-white border-[1.5px] border-[#B6DAFF] shadow-[0_0_16px_rgba(96,165,250,0.55),inset_0_1px_2px_rgba(255,255,255,0.5)]"
                            : "text-[#171003] border border-[#FFF2C5]/80 shadow-[0_3px_8px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.68)] hover:brightness-105"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? "text-[#C7E2FF]" : "text-[#2A1D06]"
                            }`}
                          />
                          <span className="truncate">
                            {team.displayName || team.name}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DIRECT MESSAGES SECTION */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#CBD5E1] whitespace-nowrap">
                  DIRECT MESSAGES
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/60 to-transparent" />
              </div>

              <div className="space-y-2">
                {directMessagesList.map((dm, idx) => {
                  const isActive = isConvSelected(dm);
                  const showGreenLamp = idx === 0 || dm.isOnline;
                  return (
                    <div
                      key={dm.id}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {/* Authentic Cropped 3D Jewel Indicator Lamp */}
                      <img
                        src={
                          isActive
                            ? "/images/crew-messages/lamp-blue.png"
                            : showGreenLamp
                            ? "/images/crew-messages/lamp-green.png"
                            : "/images/crew-messages/lamp-brass.png"
                        }
                        alt=""
                        className="w-5 h-5 rounded-full object-contain shrink-0 select-none pointer-events-none"
                      />

                      {/* Direct Message Brass Nameplate Button */}
                      <button
                        type="button"
                        onClick={() => onSelectConversation(dm)}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(90deg, #19315B 0%, #284C86 50%, #172D53 100%)",
                              }
                            : {
                                background:
                                  "linear-gradient(180deg, #EDD394 0%, #C9A45B 50%, #98732F 100%)",
                              }
                        }
                        className={`flex-1 min-w-0 h-[34px] px-3 rounded-lg flex items-center justify-between gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-white border-[1.5px] border-[#B6DAFF] shadow-[0_0_16px_rgba(96,165,250,0.55),inset_0_1px_2px_rgba(255,255,255,0.5)]"
                            : "text-[#171003] border border-[#FFF2C5]/80 shadow-[0_3px_8px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.68)] hover:brightness-105"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate min-w-0">
                          <User
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? "text-[#C7E2FF]" : "text-[#2A1D06]"
                            }`}
                          />
                          <span className="truncate">{dm.displayName}</span>
                        </span>

                        {(dm.hasUnreadDot || Number(dm.unreadCount || 0) > 0) && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#E0E7FF_0%,#6366F1_50%,#312E81_100%)] border border-white/70 shadow-[0_0_6px_#818CF8] shrink-0" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* FAMILIES / CASE THREADS VIEW */
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#CBD5E1]">
                FAMILY CASE THREADS
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/60 to-transparent" />
            </div>

            {familyThreadsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#040A18] border border-[#9E7D3B]/40 text-center space-y-2">
                <GraduationCap className="w-5 h-5 text-[#C5A059] mx-auto" />
                <p className="text-[11px] text-[#C6B697]">
                  No family threads open yet. Click Compose above to start one.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {familyThreadsList.map((ct: any) => {
                  const isActive = isConvSelected(ct);
                  return (
                    <div
                      key={ct.id}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <img
                        src={
                          isActive
                            ? "/images/crew-messages/lamp-blue.png"
                            : "/images/crew-messages/lamp-brass.png"
                        }
                        alt=""
                        className="w-5 h-5 rounded-full object-contain shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => onSelectConversation(ct)}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(90deg, #19315B 0%, #284C86 50%, #172D53 100%)",
                              }
                            : {
                                background:
                                  "linear-gradient(180deg, #EDD394 0%, #C9A45B 50%, #98732F 100%)",
                              }
                        }
                        className={`flex-1 min-w-0 h-[34px] px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-white border-[1.5px] border-[#B6DAFF]"
                            : "text-[#171003] border border-[#FFF2C5]/80"
                        }`}
                      >
                        <span className="truncate">{ct.displayName}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Brushed-Steel User Tray ((BH) Byron Honea ⌄ | [⚙️]) ── */}
      <div
        style={{
          background:
            "linear-gradient(180deg, #212B42 0%, #151C2D 50%, #0E1320 100%)",
        }}
        className="relative px-3 py-2.5 border-t-[1.5px] border-[#C5A059]/80 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() =>
            toast.success(`Signed in as ${currentUserName} (On Duty)`)
          }
          className="flex-1 h-9 px-2 rounded-lg bg-[#050C1C] border border-[#A88644]/85 flex items-center justify-between gap-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] hover:border-[#FFE394] transition-colors cursor-pointer min-w-0"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className="w-6.5 h-6.5 rounded-full bg-[#0E1E3D] border border-[#C5A059] text-[11px] font-bold text-white flex items-center justify-center shrink-0">
              {currentUserInitials}
            </span>
            <span className="text-xs font-semibold text-white truncate">
              {currentUserName}
            </span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => toast.info("Messaging preferences & notifications")}
          title="Messaging Preferences"
          className="w-9 h-9 rounded-lg bg-[#050C1C] border border-[#A88644]/85 hover:border-[#FFE394] flex items-center justify-center text-[#E5C883] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] transition-colors cursor-pointer shrink-0"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
