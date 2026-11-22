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
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block bg-[radial-gradient(circle_at_35%_35%,#FFF5CC_0%,#D4AF61_50%,#6B4E1B_90%,#2A1D06_100%)] border border-[#FFE5A3]/55 shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
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

  // Merge core teams ("All Team", "Operations", "Advocacy") with server channels
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

    // Append any additional custom channels not in core 3
    serverChannels.forEach((sc) => {
      const scName = (sc.name || sc.displayName || "").toLowerCase();
      const isCore =
        scName === "general" ||
        scName.includes("all team") ||
        scName.includes("operations") ||
        scName.includes("advocacy");
      if (!isCore) {
        list.push({
          ...sc,
          name: sc.displayName || sc.name,
          displayName: sc.displayName || sc.name,
          icon: Users,
        });
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) =>
      (c.displayName || c.name || "").toLowerCase().includes(q)
    );
  }, [conversations.channels, conversations.groupMessages, searchQuery]);

  // Merge core DMs ("David Howard", "Sarah Mitchell") with server DMs
  const directMessagesList = useMemo(() => {
    const serverDMs = conversations.directMessages || [];
    const list = [...CORE_DIRECT_MESSAGES];

    serverDMs.forEach((dm) => {
      const dmName = (dm.displayName || dm.name || "").toLowerCase();
      const existingIdx = list.findIndex(
        (c) => c.displayName.toLowerCase() === dmName
      );
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...dm,
          displayName: list[existingIdx].displayName,
        };
      } else {
        list.push({
          ...dm,
          name: dm.displayName || dm.name || "Team Member",
          displayName: dm.displayName || dm.name || "Team Member",
          isOnline: true,
          hasUnreadDot: dm.unreadCount > 0,
        });
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) =>
      (c.displayName || "").toLowerCase().includes(q)
    );
  }, [conversations.directMessages, searchQuery]);

  const familyThreadsList = useMemo(() => {
    const raw = conversations.caseThreads || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter((c: any) =>
      (c.displayName || "").toLowerCase().includes(q)
    );
  }, [conversations.caseThreads, searchQuery]);

  const isConvSelected = (item: any) => {
    if (activeConversationId && item.id === activeConversationId) return true;
    const activeLower = (activeConversationName || "").toLowerCase();
    const itemLower = (item.displayName || item.name || "").toLowerCase();
    return Boolean(activeLower && itemLower && activeLower === itemLower);
  };

  return (
    <aside className="w-[248px] sm:w-[264px] shrink-0 rounded-xl border-[1.5px] border-[#C5A059]/85 bg-gradient-to-b from-[#0A1428] via-[#060D1D] to-[#040814] shadow-[0_14px_34px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,227,148,0.2)] flex flex-col justify-between overflow-hidden relative text-[#FFF4D4]">
      {/* ── Top Section: CONTACT INDEX Plaque + Search + Compose + Team/Families Switch ── */}
      <div className="p-3 space-y-2.5">
        {/* Header Plaque with Left & Right Brass Rivets */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <BrassRivet />
          <div className="flex items-center gap-2">
            <span className="w-3 h-[1px] bg-[#C5A059]/60" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#DFC17B]">
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
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#030813] border border-[#9E7D3B]/80 text-xs text-[#FFF4D4] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FFE394] shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]"
          />
        </div>

        {/* Brushed-Brass "Compose" Hardware Button with Twin Rivets */}
        <button
          type="button"
          onClick={
            directoryTab === "families" ? onNewCaseThread : onNewMessage
          }
          style={{
            background:
              "linear-gradient(180deg, #F0D696 0%, #CEA95E 48%, #9B7732 100%)",
          }}
          className="w-full h-9 px-3 rounded-lg border border-[#FFF3C8]/85 text-[#171003] font-bold text-xs flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.75)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#5E4414] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]" />
          <span className="inline-flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Compose</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#5E4414] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]" />
        </button>

        {/* Segmented "Team | Families" Toggle */}
        <div className="grid grid-cols-2 p-0.5 rounded-lg bg-[#040915] border border-[#8A6B32]/75 shadow-[inset_0_2px_5px_rgba(0,0,0,0.85)]">
          <button
            type="button"
            onClick={() => setDirectoryTab("team")}
            className={`h-7 rounded-md text-xs font-semibold transition-all cursor-pointer ${directoryTab === "team"
              ? "bg-gradient-to-b from-[#2E4F85] to-[#1A3057] text-white border border-[#77A5E8]/55 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              : "text-[#C6B697] hover:text-white"
              }`}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => setDirectoryTab("families")}
            className={`h-7 rounded-md text-xs font-semibold transition-all cursor-pointer ${directoryTab === "families"
              ? "bg-gradient-to-b from-[#2E4F85] to-[#1A3057] text-white border border-[#77A5E8]/55 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              : "text-[#C6B697] hover:text-white"
              }`}
          >
            Families
          </button>
        </div>
      </div>

      {/* ── Scrollable Channel & Direct Message Brass Plaque List ── */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {directoryTab === "team" ? (
          <>
            {/* TEAMS SECTION */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#C6B697]">
                  TEAMS
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/50 to-transparent" />
              </div>

              <div className="space-y-2">
                {teamChannels.map((team) => {
                  const isActive = isConvSelected(team);
                  const Icon = team.icon || Users;
                  return (
                    <div
                      key={team.key || team.id}
                      className="flex items-center gap-2.5"
                    >
                      {/* Left 3D Circular Indicator Lamp */}
                      <span
                        className={`w-4 h-4 rounded-full shrink-0 transition-all ${isActive
                          ? "bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#60A5FA_45%,#1D4ED8_100%)] border-[1.5px] border-[#FFE394] shadow-[0_0_12px_#60A5FA]"
                          : "bg-[radial-gradient(circle_at_35%_35%,#FFF2C6_0%,#C5A059_55%,#5C4316_100%)] border border-[#FFE394]/65 shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
                          }`}
                      />

                      {/* Channel Plaque Button */}
                      <button
                        type="button"
                        onClick={() => onSelectConversation(team)}
                        style={
                          isActive
                            ? {
                              background:
                                "linear-gradient(90deg, #19315A 0%, #274A82 50%, #172E54 100%)",
                            }
                            : {
                              background:
                                "linear-gradient(180deg, #EAD090 0%, #C8A35B 50%, #987431 100%)",
                            }
                        }
                        className={`flex-1 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${isActive
                          ? "text-white border-[1.5px] border-[#A5CEFF] shadow-[0_0_16px_rgba(96,165,250,0.5),inset_0_1px_2px_rgba(255,255,255,0.45)]"
                          : "text-[#171003] border border-[#FFF2C5]/75 shadow-[0_3px_8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.65)] hover:brightness-105"
                          }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#A5CEFF]" : "text-[#2A1D06]"
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
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#C6B697]">
                  DIRECT MESSAGES
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/50 to-transparent" />
              </div>

              <div className="space-y-2">
                {directMessagesList.map((dm, idx) => {
                  const isActive = isConvSelected(dm);
                  const showGreenLamp = idx === 0 || dm.isOnline;
                  return (
                    <div key={dm.id} className="flex items-center gap-2.5">
                      {/* Left 3D Circular Indicator Lamp (Emerald Green for David Howard / Online, Brass Sphere for others) */}
                      <span
                        className={`w-4 h-4 rounded-full shrink-0 transition-all ${isActive
                          ? "bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#60A5FA_45%,#1D4ED8_100%)] border-[1.5px] border-[#FFE394] shadow-[0_0_12px_#60A5FA]"
                          : showGreenLamp
                            ? "bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#4ADE80_45%,#15803D_100%)] border-[1.5px] border-[#FFE394] shadow-[0_0_10px_#4ADE80]"
                            : "bg-[radial-gradient(circle_at_35%_35%,#FFF2C6_0%,#C5A059_55%,#5C4316_100%)] border border-[#FFE394]/65 shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
                          }`}
                      />

                      {/* Direct Message Brass Nameplate Button */}
                      <button
                        type="button"
                        onClick={() => onSelectConversation(dm)}
                        style={
                          isActive
                            ? {
                              background:
                                "linear-gradient(90deg, #19315A 0%, #274A82 50%, #172E54 100%)",
                            }
                            : {
                              background:
                                "linear-gradient(180deg, #EAD090 0%, #C8A35B 50%, #987431 100%)",
                            }
                        }
                        className={`flex-1 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${isActive
                          ? "text-white border-[1.5px] border-[#A5CEFF] shadow-[0_0_16px_rgba(96,165,250,0.5),inset_0_1px_2px_rgba(255,255,255,0.45)]"
                          : "text-[#171003] border border-[#FFF2C5]/75 shadow-[0_3px_8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.65)] hover:brightness-105"
                          }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <User
                            className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#A5CEFF]" : "text-[#2A1D06]"
                              }`}
                          />
                          <span className="truncate">{dm.displayName}</span>
                        </span>

                        {(dm.hasUnreadDot || Number(dm.unreadCount || 0) > 0) && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#E0E7FF_0%,#6366F1_50%,#312E81_100%)] border border-white/60 shadow-[0_0_6px_#818CF8] shrink-0" />
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
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#C6B697]">
                FAMILY CASE THREADS
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-[#C5A059]/50 to-transparent" />
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
                    <div key={ct.id} className="flex items-center gap-2.5">
                      <span
                        className={`w-4 h-4 rounded-full shrink-0 ${isActive
                          ? "bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#60A5FA_45%,#1D4ED8_100%)] border-[1.5px] border-[#FFE394] shadow-[0_0_12px_#60A5FA]"
                          : "bg-[radial-gradient(circle_at_35%_35%,#FFF2C6_0%,#C5A059_55%,#5C4316_100%)] border border-[#FFE394]/65"
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => onSelectConversation(ct)}
                        style={
                          isActive
                            ? {
                              background:
                                "linear-gradient(90deg, #19315A 0%, #274A82 50%, #172E54 100%)",
                            }
                            : {
                              background:
                                "linear-gradient(180deg, #EAD090 0%, #C8A35B 50%, #987431 100%)",
                            }
                        }
                        className={`flex-1 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${isActive
                          ? "text-white border-[1.5px] border-[#A5CEFF]"
                          : "text-[#171003] border border-[#FFF2C5]/75"
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

      {/* ── Bottom Brushed-Steel User Tray with 4 Corner Brass Rivets ── */}
      <div
        style={{
          background:
            "linear-gradient(180deg, #1C263B 0%, #111829 50%, #0C111E 100%)",
        }}
        className="relative p-2.5 border-t-[1.5px] border-[#C5A059]/75 flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* User Profile Switcher Pill */}
          <button
            type="button"
            onClick={() =>
              toast.success(`Signed in as ${currentUserName} (On Duty)`)
            }
            className="flex-1 h-10 px-2.5 rounded-lg bg-[#050C1C] border border-[#9E7D3B]/80 flex items-center justify-between gap-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)] hover:border-[#FFE394] transition-colors cursor-pointer min-w-0"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#0E1E3D] border border-[#C5A059] text-xs font-bold text-white flex items-center justify-center shrink-0">
                {currentUserInitials}
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {currentUserName}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
          </button>

          {/* Settings Gear Button */}
          <button
            type="button"
            onClick={() => toast.info("Messaging preferences & notifications")}
            title="Messaging Preferences"
            className="w-10 h-10 rounded-lg bg-[#050C1C] border border-[#9E7D3B]/80 hover:border-[#FFE394] flex items-center justify-center text-[#E5C883] shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)] transition-colors cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
