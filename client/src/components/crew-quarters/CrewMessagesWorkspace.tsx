import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Users,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Check,
  Search,
  FileText,
  Download,
  Settings,
  Scale,
  Edit3,
  Info,
  Paperclip,
  AtSign,
  Send,
  Plus,
  Link2,
  ChevronDown,
} from "lucide-react";
import ActionRequestModal from "./ActionRequestModal";
import MessageToTaskModal from "./MessageToTaskModal";
import { toast } from "sonner";

interface CrewMessagesWorkspaceProps {
  initialConversationId?: number | null;
  onGoBack?: () => void;
}

interface ConsoleMessageItem {
  id: number;
  senderName: string;
  displayTime: string;
  body: string;
  avatarSrc: string;
  attachment?: {
    title: string;
    subtitle: string;
  };
}

const DEFAULT_CHANNEL_MESSAGES: Record<string, ConsoleMessageItem[]> = {
  "all-team": [
    {
      id: 8001,
      senderName: "David Howard",
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
      displayTime: "9:18 AM",
      body: "Thank you, David. Let’s review it before our next discovery calls.",
      avatarSrc: "/images/crew-messages/avatar-byron.png",
    },
    {
      id: 8003,
      senderName: "Sarah Mitchell",
      displayTime: "9:24 AM",
      body: "I can take the first review this afternoon.",
      avatarSrc: "/images/crew-messages/avatar-sarah.png",
    },
  ],
  operations: [
    {
      id: 8101,
      senderName: "David Howard",
      displayTime: "8:45 AM",
      body: "All morning discovery call intake packets have been verified and synced.",
      avatarSrc: "/images/crew-messages/avatar-david.png",
    },
    {
      id: 8102,
      senderName: "Byron Honea",
      displayTime: "8:52 AM",
      body: "Great work. Let’s keep the new intake checklist attached to all incoming Cobb & Fulton packets.",
      avatarSrc: "/images/crew-messages/avatar-byron.png",
    },
  ],
  advocacy: [
    {
      id: 8201,
      senderName: "Sarah Mitchell",
      displayTime: "9:05 AM",
      body: "Drafted the Prior Written Notice response for the Thompson IEP amendment meeting.",
      avatarSrc: "/images/crew-messages/avatar-sarah.png",
      attachment: {
        title: "Thompson_PWN_Draft.pdf",
        subtitle: "PDF - 312 KB",
      },
    },
    {
      id: 8202,
      senderName: "Byron Honea",
      displayTime: "9:10 AM",
      body: "Reviewed and approved. Ready to share with the family before 2:00 PM.",
      avatarSrc: "/images/crew-messages/avatar-byron.png",
    },
  ],
  "david-howard": [
    {
      id: 8301,
      senderName: "David Howard",
      displayTime: "9:12 AM",
      body: "Hi Byron — I uploaded the revised Intake Checklist.pdf to the All Team channel as well.",
      avatarSrc: "/images/crew-messages/avatar-david.png",
      attachment: {
        title: "Intake Checklist.pdf",
        subtitle: "PDF - 284 KB",
      },
    },
  ],
  "sarah-mitchell": [
    {
      id: 8401,
      senderName: "Sarah Mitchell",
      displayTime: "9:24 AM",
      body: "I’m starting the first pass on the intake checklist now and will have notes ready by 1:00 PM.",
      avatarSrc: "/images/crew-messages/avatar-sarah.png",
    },
  ],
};

const CONVERSATION_META: Record<
  string,
  { id: number; name: string; subtitle: string }
> = {
  "all-team": {
    id: 1,
    name: "All Team",
    subtitle: "Team conversation",
  },
  operations: {
    id: 2,
    name: "Operations",
    subtitle: "Operations & intake coordination",
  },
  advocacy: {
    id: 3,
    name: "Advocacy",
    subtitle: "IEP & 504 advocacy strategy",
  },
  "david-howard": {
    id: 901,
    name: "David Howard",
    subtitle: "Direct message · Operations Lead",
  },
  "sarah-mitchell": {
    id: 902,
    name: "Sarah Mitchell",
    subtitle: "Direct message · Senior IEP Advocate",
  },
};

function BrassRivet() {
  return (
    <span
      aria-hidden="true"
      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block bg-[radial-gradient(circle_at_35%_35%,#FFF5CC_0%,#D4AF61_50%,#6B4E1B_90%,#2A1D06_100%)] border border-[#FFE5A3]/65 shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
    />
  );
}

export default function CrewMessagesWorkspace({
  onGoBack,
}: CrewMessagesWorkspaceProps) {
  const { user } = useAuth();
  const currentUserId =
    typeof user?.id === "number" ? user.id : Number(user?.id) || 1;
  const currentUserName = user?.name || "Byron Honea";
  const currentUserInitials = currentUserName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [activeKey, setActiveKey] = useState<string>("all-team");
  const [directoryTab, setDirectoryTab] = useState<"team" | "families">("team");

  const [contactSearch, setContactSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState("");
  const [nextActionChecked, setNextActionChecked] = useState(false);

  const [messagesByKey, setMessagesByKey] = useState<
    Record<string, ConsoleMessageItem[]>
  >(DEFAULT_CHANNEL_MESSAGES);

  // Modals
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [newMessageType, setNewMessageType] = useState<"dm" | "group" | "case">(
    "dm"
  );
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [groupName, setGroupName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [taskModalMessage, setTaskModalMessage] = useState<{
    id: number;
    body: string;
    senderName?: string | null;
  } | null>(null);

  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const utils = trpc.useUtils();

  const { data: employees = [] } = trpc.crewMessages.listEmployees.useQuery();
  const { data: contactsList = [] } = trpc.contacts.list.useQuery();

  const dmEmployees = (employees as any[]).filter(
    (e) => !e.isCurrentUser && Number(e.id) !== currentUserId
  );

  const students = (contactsList as any[]).filter(
    (c) => c.jobTitle === "Student" || !c.parentContactId
  );

  const sendMutation = trpc.crewMessages.sendMessage.useMutation({
    onSuccess: () => {
      utils.crewMessages.listConversations.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
    },
  });

  const activeMeta =
    CONVERSATION_META[activeKey] || CONVERSATION_META["all-team"];

  useEffect(() => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
    }
  }, [activeKey, messagesByKey]);

  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const newMsg: ConsoleMessageItem = {
      id: Date.now(),
      senderName: currentUserName,
      displayTime: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: trimmed,
      avatarSrc: "/images/crew-messages/avatar-byron.png",
    };

    setMessagesByKey((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), newMsg],
    }));

    setMessageText("");

    if (activeMeta.id < 900) {
      sendMutation.mutate({
        conversationId: activeMeta.id,
        body: trimmed,
      });
    }
    toast.success(`Sent to ${activeMeta.name}`);
  };

  const handleAttachFile = () => {
    const newMsg: ConsoleMessageItem = {
      id: Date.now(),
      senderName: currentUserName,
      displayTime: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: "Shared updated Intake Checklist.pdf for review.",
      avatarSrc: "/images/crew-messages/avatar-byron.png",
      attachment: {
        title: "Intake Checklist.pdf",
        subtitle: "PDF - 284 KB",
      },
    };
    setMessagesByKey((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), newMsg],
    }));
    toast.success("Attached Intake Checklist.pdf");
  };

  const activeMessages = (messagesByKey[activeKey] || []).filter((m) => {
    if (!convSearchQuery.trim()) return true;
    const q = convSearchQuery.toLowerCase();
    return (
      m.body.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q)
    );
  });

  const teamItems = [
    { key: "all-team", label: "All Team", icon: Users },
    { key: "operations", label: "Operations", icon: Settings },
    { key: "advocacy", label: "Advocacy", icon: Scale },
  ].filter((t) =>
    !contactSearch.trim()
      ? true
      : t.label.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const dmItems = [
    {
      key: "david-howard",
      label: "David Howard",
      isOnline: true,
      hasDot: false,
    },
    {
      key: "sarah-mitchell",
      label: "Sarah Mitchell",
      isOnline: false,
      hasDot: true,
    },
  ].filter((d) =>
    !contactSearch.trim()
      ? true
      : d.label.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <div className="relative flex-1 w-full h-full min-h-0 bg-[#050914] flex items-center justify-center overflow-hidden select-none antialiased">
      {/* ── OUTER 2560x1440 SHARPENED SWITCHBOARD CHASSIS & CAST-BRASS BEZEL FRAME ── */}
      <div className="relative w-full h-full overflow-hidden rounded-xl shadow-[0_25px_80px_rgba(0,0,0,0.95)]">
        {/* Background Hardware Chassis (Provides the 3D Brushed-Steel Outer Frame, 3D Cast-Brass Double Bezels, Top "✦ Waypoint | Messages" Title, and Top-Right 3D Rotary Phone Cradle) */}
        <img
          src="/images/crew-messages/console-full-bg.jpg"
          alt="Waypoint Messages Switchboard Console"
          className="w-full h-full object-fill select-none pointer-events-none block"
        />

        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            style={{
              left: "66%",
              top: "2.8%",
            }}
            className="absolute z-20 h-7 px-2.5 rounded-lg bg-[#0A1326]/90 hover:bg-[#142547] border border-[#C5A059]/75 hover:border-[#FFE394] text-[11px] font-semibold text-[#FFE394] hover:text-white inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
            title="Return to Crew Quarters Overview"
          >
            <ArrowLeft className="w-3 h-3 text-[#C5A059]" />
            <span>Go Back</span>
          </button>
        )}

        {/* ── TOP-RIGHT ROTARY TELEPHONE CRADLE: RAZOR-SHARP "● Team available" PILL OVERLAY ── */}
        <button
          type="button"
          onClick={() =>
            toast.success("Switchboard Status: All Team Advocates Available")
          }
          style={{
            left: "81.15%",
            top: "15.8%",
            width: "11.8%",
            height: "4.6%",
          }}
          className="absolute z-20 rounded-full bg-[#070E1F] border border-[#C5A059]/80 shadow-[inset_0_2px_5px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 px-2.5 cursor-pointer hover:border-[#FFE394] transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#4ADE80_45%,#16A34A_100%)] shadow-[0_0_8px_#4ADE80] shrink-0" />
          <span className="text-[11px] sm:text-xs font-medium text-white whitespace-nowrap">
            Team available
          </span>
        </button>

        {/* ── 1. LEFT PANEL ("CONTACT INDEX") RAZOR-SHARP DOM INTERIOR (Framed inside the 3D Cast-Brass Bezel) ── */}
        <div
          style={{
            left: "1.45%",
            top: "11.8%",
            width: "21.2%",
            height: "73.2%",
          }}
          className="absolute z-20 bg-gradient-to-b from-[#081226] via-[#050C1C] to-[#030814] rounded-t-lg px-3 py-2.5 flex flex-col justify-between overflow-hidden"
        >
          {/* Top Controls */}
          <div className="space-y-2.5 shrink-0">
            {/* CONTACT INDEX Header with Rivets */}
            <div className="flex items-center justify-between px-0.5">
              <BrassRivet />
              <div className="flex items-center gap-2">
                <span className="w-3 h-[1px] bg-[#C5A059]/65" />
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#E5C883]">
                  CONTACT INDEX
                </span>
                <span className="w-3 h-[1px] bg-[#C5A059]/65" />
              </div>
              <BrassRivet />
            </div>

            {/* Razor-Sharp "Search contacts..." Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D8B973] pointer-events-none" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full h-8.5 pl-8 pr-2.5 rounded-lg bg-[#030813] border border-[#B3904B] text-xs text-white placeholder:text-[#CBD5E1]/80 focus:outline-none focus:border-[#FFE394] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Razor-Sharp Brushed-Brass "Compose" Button */}
            <button
              type="button"
              onClick={() => {
                setNewMessageType("dm");
                setNewMessageModalOpen(true);
              }}
              style={{
                backgroundImage:
                  "url('/images/crew-messages/clean-brass-texture.png')",
                backgroundSize: "100% 100%",
              }}
              className="w-full h-8.5 px-3 rounded-lg border border-[#FFF2C6]/85 text-[#171003] font-bold text-xs flex items-center justify-between shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.75)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A4012]" />
              <span className="inline-flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 stroke-[2.3]" />
                <span>Compose</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A4012]" />
            </button>
          </div>

          {/* Middle List: TEAMS & DIRECT MESSAGES */}
          <div className="flex-1 flex flex-col justify-evenly py-1 min-h-0 overflow-y-auto">
            {/* TEAMS */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-[#CBD5E1]">
                  TEAMS
                </span>
                <div className="flex-1 h-[1px] bg-[#C5A059]/55" />
              </div>

              <div className="space-y-1.5">
                {teamItems.map((team) => {
                  const isActive = activeKey === team.key;
                  const Icon = team.icon;
                  return (
                    <div key={team.key} className="flex items-center gap-2">
                      <img
                        src={
                          isActive
                            ? "/images/crew-messages/lamp-blue.png"
                            : "/images/crew-messages/lamp-brass.png"
                        }
                        alt=""
                        className="w-5 h-5 rounded-full object-contain shrink-0 pointer-events-none"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveKey(team.key)}
                        style={{
                          backgroundImage: isActive
                            ? "url('/images/crew-messages/clean-blue-texture.png')"
                            : "url('/images/crew-messages/clean-brass-texture.png')",
                          backgroundSize: "100% 100%",
                        }}
                        className={`flex-1 min-w-0 h-8.5 px-3 rounded-lg flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-white border-[1.5px] border-[#C4E0FF] shadow-[0_0_14px_rgba(96,165,250,0.55)]"
                            : "text-[#171003] border border-[#FFF2C5]/85 shadow-[0_3px_8px_rgba(0,0,0,0.75)] hover:brightness-105"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? "text-[#C7E2FF]" : "text-[#241804]"
                          }`}
                        />
                        <span className="truncate">{team.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DIRECT MESSAGES */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-[#CBD5E1] whitespace-nowrap">
                  DIRECT MESSAGES
                </span>
                <div className="flex-1 h-[1px] bg-[#C5A059]/55" />
              </div>

              <div className="space-y-1.5">
                {dmItems.map((dm) => {
                  const isActive = activeKey === dm.key;
                  return (
                    <div key={dm.key} className="flex items-center gap-2">
                      <img
                        src={
                          isActive
                            ? "/images/crew-messages/lamp-blue.png"
                            : dm.isOnline
                            ? "/images/crew-messages/lamp-green.png"
                            : "/images/crew-messages/lamp-brass.png"
                        }
                        alt=""
                        className="w-5 h-5 rounded-full object-contain shrink-0 pointer-events-none"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveKey(dm.key)}
                        style={{
                          backgroundImage: isActive
                            ? "url('/images/crew-messages/clean-blue-texture.png')"
                            : "url('/images/crew-messages/clean-brass-texture.png')",
                          backgroundSize: "100% 100%",
                        }}
                        className={`flex-1 min-w-0 h-8.5 px-3 rounded-lg flex items-center justify-between gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-white border-[1.5px] border-[#C4E0FF] shadow-[0_0_14px_rgba(96,165,250,0.55)]"
                            : "text-[#171003] border border-[#FFF2C5]/85 shadow-[0_3px_8px_rgba(0,0,0,0.75)] hover:brightness-105"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2 truncate min-w-0">
                          <User
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? "text-[#C7E2FF]" : "text-[#241804]"
                            }`}
                          />
                          <span className="truncate">{dm.label}</span>
                        </span>
                        {dm.hasDot && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#E0E7FF_0%,#6366F1_50%,#312E81_100%)] border border-white/75 shadow-[0_0_6px_#818CF8] shrink-0" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 1B. LEFT PANEL BOTTOM USER TRAY: RAZOR-SHARP "(BH) Byron Honea ⌄ | [⚙️]" */}
        <div
          style={{
            left: "2.3%",
            top: "87.2%",
            width: "19.5%",
            height: "7.2%",
          }}
          className="absolute z-20 flex items-center justify-between gap-2"
        >
          <button
            type="button"
            onClick={() =>
              toast.success(`Signed in as ${currentUserName} (On Duty)`)
            }
            className="flex-1 h-full px-2.5 rounded-lg bg-[#050C1C] border border-[#B3904B] flex items-center justify-between gap-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] hover:border-[#FFE394] transition-colors cursor-pointer min-w-0"
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

          <button
            type="button"
            onClick={() => toast.info("Messaging preferences & notifications")}
            title="Messaging Settings"
            className="aspect-square h-full rounded-lg bg-[#050C1C] border border-[#B3904B] hover:border-[#FFE394] flex items-center justify-center text-[#E5C883] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] transition-colors cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2. CENTER PANEL ("All Team" STAGE) RAZOR-SHARP DOM INTERIOR ── */}
        <div
          style={{
            left: "24.15%",
            top: "11.8%",
            width: "49.35%",
            height: "73.2%",
          }}
          className="absolute z-20 bg-gradient-to-b from-[#071126] via-[#050C1C] to-[#030814] rounded-t-lg flex flex-col overflow-hidden"
        >
          {/* Center Conversation Header */}
          <div className="px-5 py-3 border-b border-[#3A4D7A]/50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-6 h-6 text-[#E2C583] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white leading-tight truncate">
                  {activeMeta.name}
                </h2>
                <p className="text-xs text-[#94A3B8] truncate">
                  {activeMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Crisp Avatar Cluster + (+3) Badge */}
              <div className="hidden sm:flex items-center -space-x-2">
                <img
                  src="/images/crew-messages/avatar-david.png"
                  alt="David Howard"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#D8B772]"
                />
                <img
                  src="/images/crew-messages/avatar-sarah.png"
                  alt="Sarah Mitchell"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#D8B772]"
                />
                <img
                  src="/images/crew-messages/avatar-byron.png"
                  alt="Byron Honea"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#D8B772]"
                />
                <span className="w-8 h-8 rounded-full bg-[#112244] border-[1.5px] border-[#C5A059] text-xs font-bold text-white flex items-center justify-center z-10 shadow">
                  +3
                </span>
              </div>

              <div className="hidden sm:block h-5 w-[1px] bg-[#C5A059]/45 mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  setShowConvSearch((prev) => !prev);
                  if (showConvSearch) setConvSearchQuery("");
                }}
                title="Search in conversation"
                className={`w-9 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  showConvSearch
                    ? "bg-[#1A335C] border-[#FFE394] text-[#FFE394]"
                    : "bg-[#09152B] border-[#B3904B] text-[#E5C883] hover:border-[#FFE394]"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  toast.info(
                    `Conversation Details active for ${activeMeta.name}`
                  )
                }
                className="h-8 px-3 rounded-lg bg-[#09152B] border border-[#B3904B] hover:border-[#FFE394] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#DFC17B]" />
                <span>Details</span>
              </button>
            </div>
          </div>

          {showConvSearch && (
            <div className="px-5 py-1.5 bg-[#030917] border-b border-[#C5A059]/35 flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#C5A059]" />
              <input
                type="text"
                value={convSearchQuery}
                onChange={(e) => setConvSearchQuery(e.target.value)}
                placeholder={`Filter messages in ${activeMeta.name}...`}
                autoFocus
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
              />
              {convSearchQuery && (
                <button
                  type="button"
                  onClick={() => setConvSearchQuery("")}
                  className="text-[11px] text-[#FFE394] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Razor-Sharp Message Stream */}
          <div
            ref={feedScrollRef}
            className="flex-1 overflow-y-auto px-5 py-2.5 min-h-0"
          >
            {/* Today Rule */}
            <div className="flex items-center gap-4 my-1.5">
              <div className="flex-1 h-[1px] bg-[#33466E]/65" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Today
              </span>
              <div className="flex-1 h-[1px] bg-[#33466E]/65" />
            </div>

            <div className="divide-y divide-[#2B3D63]/65">
              {activeMessages.map((m) => (
                <div
                  key={m.id}
                  className="py-3.5 flex items-start gap-3.5 relative"
                >
                  <img
                    src={m.avatarSrc}
                    alt={m.senderName}
                    className="w-12 h-12 rounded-full object-cover shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[15px] font-bold text-white">
                        {m.senderName}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        {m.displayTime}
                      </span>
                    </div>

                    <p className="text-[14.5px] text-[#F1F5F9] leading-relaxed mt-0.5 whitespace-pre-wrap">
                      {m.body}
                    </p>

                    {m.attachment && (
                      <div
                        onClick={() =>
                          toast.success(
                            `Downloading ${m.attachment?.title}...`
                          )
                        }
                        className="mt-2.5 max-w-[330px] rounded-xl bg-[#0B1833] hover:bg-[#112348] border border-[#5C7DB5]/70 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-[0_6px_16px_rgba(0,0,0,0.6)] transition-colors cursor-pointer"
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
                        <Download className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2B. CENTER BOTTOM COMPOSER TRAY: RAZOR-SHARP INPUT & BRUSHED-BRASS "Send ⌲" */}
        <div
          style={{
            left: "25.0%",
            top: "87.2%",
            width: "47.3%",
            height: "7.0%",
          }}
          className="absolute z-20 flex items-center gap-2.5"
        >
          <div className="flex-1 h-full px-3.5 rounded-lg bg-[#030813] border border-[#B3904B] flex items-center gap-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)] focus-within:border-[#FFE394]">
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
            <div className="h-5 w-[1px] bg-[#9E7D3B]/50 shrink-0" />
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
              placeholder={`Message ${activeMeta.name}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-[#CBD5E1]/75 focus:outline-none min-w-0"
            />
          </div>

          <button
            type="button"
            onClick={handleSendMessage}
            style={{
              backgroundImage:
                "url('/images/crew-messages/clean-brass-texture.png')",
              backgroundSize: "100% 100%",
            }}
            className="h-full px-4 rounded-lg border border-[#FFF2C6]/85 text-[#171003] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.75)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 stroke-[2.3]" />
          </button>
        </div>

        {/* ── 3. RIGHT PANEL ("CONVERSATION DETAILS") RAZOR-SHARP DOM INTERIOR ── */}
        <div
          style={{
            left: "74.9%",
            top: "23.8%",
            width: "23.6%",
            height: "61.2%",
          }}
          className="absolute z-20 bg-gradient-to-b from-[#081226] via-[#050C1C] to-[#030814] rounded-t-lg px-3.5 py-2.5 flex flex-col justify-between overflow-hidden"
        >
          {/* CONVERSATION DETAILS Header with Rivets */}
          <div className="flex items-center justify-between pb-2 border-b border-[#C5A059]/35 shrink-0">
            <BrassRivet />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#E5C883]">
              CONVERSATION DETAILS
            </span>
            <BrassRivet />
          </div>

          {/* Shared files + Sharpened 3D Metal File Pocket Rack with Razor-Sharp Vector Folder Card */}
          <div className="space-y-2 my-auto">
            <h4 className="text-sm font-bold text-white tracking-wide">
              Shared files
            </h4>

            <div
              onClick={() =>
                toast.success("Opening Shared File: Intake Checklist.pdf")
              }
              className="relative w-full rounded-xl overflow-hidden border border-[#8E733E]/55 shadow-[0_8px_20px_rgba(0,0,0,0.8)] cursor-pointer group"
            >
              <img
                src="/images/crew-messages/shared-files-rack.png"
                alt="Shared files rack"
                className="w-full h-auto object-cover block select-none pointer-events-none"
              />
              {/* Razor-Sharp Vector Overlay for "📄 Intake Checklist.pdf" inside the top folder slot */}
              <div
                style={{
                  left: "9.5%",
                  top: "12%",
                  width: "81%",
                  height: "27%",
                }}
                className="absolute bg-[#0F2042] flex items-center gap-2.5 px-2.5 rounded-t-md"
              >
                <FileText className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  Intake Checklist.pdf
                </span>
              </div>
            </div>
          </div>

          {/* Next action + Razor-Sharp Interactive Action Card */}
          <div className="space-y-2 shrink-0 pb-1">
            <h4 className="text-sm font-bold text-white tracking-wide">
              Next action
            </h4>

            <div
              onClick={() => {
                setNextActionChecked((prev) => {
                  const next = !prev;
                  toast.success(
                    next
                      ? 'Completed: "Review intake checklist"'
                      : 'Reopened: "Review intake checklist"'
                  );
                  return next;
                });
              }}
              className="rounded-xl bg-[#07132B] hover:bg-[#0C1D3E] border border-[#B3904B] p-3 flex items-start gap-3 shadow-[0_6px_16px_rgba(0,0,0,0.75)] transition-all cursor-pointer"
            >
              <span
                className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  nextActionChecked
                    ? "bg-[#C5A059] border-[#FFE394] text-[#07162B]"
                    : "bg-[#040A18] border-[#94A3B8]"
                }`}
              >
                {nextActionChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-xs sm:text-[13px] font-bold text-white leading-snug ${
                    nextActionChecked ? "line-through opacity-65" : ""
                  }`}
                >
                  Review intake checklist
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  Sarah Mitchell · Today
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3B. RIGHT PANEL BOTTOM DUAL BRUSHED-BRASS BAR: RAZOR-SHARP "+ Create task | 🔗 Link record" */}
        <div
          style={{
            left: "75.6%",
            top: "87.2%",
            width: "22.2%",
            height: "6.6%",
            backgroundImage:
              "url('/images/crew-messages/clean-brass-texture.png')",
            backgroundSize: "100% 100%",
          }}
          className="absolute z-20 grid grid-cols-2 rounded-lg border border-[#FFF2C6]/85 shadow-[0_4px_12px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.75)] overflow-hidden text-[#171003] font-bold text-xs"
        >
          <button
            type="button"
            onClick={() =>
              setTaskModalMessage({
                id: 8001,
                body: "Review intake checklist — The updated intake checklist is ready for review.",
                senderName: "David Howard",
              })
            }
            className="h-full px-2 flex items-center justify-between border-r border-[#6E521F]/75 hover:brightness-105 cursor-pointer min-w-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#5A4012] shrink-0" />
            <span className="inline-flex items-center gap-1 truncate">
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="truncate">Create task</span>
            </span>
            <span className="w-1" />
          </button>

          <button
            type="button"
            onClick={() => setShowActionModal(true)}
            className="h-full px-2 flex items-center justify-between hover:brightness-105 cursor-pointer min-w-0"
          >
            <span className="w-1" />
            <span className="inline-flex items-center gap-1 truncate">
              <Link2 className="w-3.5 h-3.5 stroke-[2.3] shrink-0" />
              <span className="truncate">Link record</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5A4012] shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Compose / New Conversation Modal ── */}
      <Dialog open={newMessageModalOpen} onOpenChange={setNewMessageModalOpen}>
        <DialogContent className="bg-gradient-to-b from-[#08162E] via-[#050E20] to-[#030813] border border-[#C5A059]/70 text-[#FFF4D4] rounded-2xl max-w-md w-[94vw] sm:w-full max-h-[85vh] flex flex-col p-5 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-[#C5A059]/30">
            <DialogTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E5C883]" />
              Compose Message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Switch or start a direct message or team channel discussion.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNewMessageModalOpen(false);
              if (newMessageType === "dm") {
                setActiveKey("david-howard");
                toast.success("Opened direct message");
              } else {
                setActiveKey("operations");
                toast.success(
                  `Opened ${groupName.trim() || "Operations"} channel`
                );
              }
            }}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMessageType("dm")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    newMessageType === "dm"
                      ? "bg-gradient-to-b from-[#E5C883] to-[#A8843E] border-[#FFF2C2] text-[#140E04] font-bold shadow"
                      : "bg-[#040B1A] border-[#C5A059]/35 text-[#C6B697] hover:text-white"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Direct</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewMessageType("group")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    newMessageType === "group"
                      ? "bg-gradient-to-b from-[#E5C883] to-[#A8843E] border-[#FFF2C2] text-[#140E04] font-bold shadow"
                      : "bg-[#040B1A] border-[#C5A059]/35 text-[#C6B697] hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Team Group</span>
                </button>
              </div>

              {newMessageType === "dm" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#FFE394]">
                    Select Team Member
                  </Label>
                  <Select
                    value={
                      selectedTargetUserId ||
                      (dmEmployees[0] ? String(dmEmployees[0].id) : "901")
                    }
                    onValueChange={setSelectedTargetUserId}
                  >
                    <SelectTrigger className="bg-[#030814] border-[#C5A059]/50 text-white text-xs rounded-xl">
                      <SelectValue placeholder="Choose active employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#061024] border-[#C5A059]/50 text-white">
                      <SelectItem value="901" className="text-xs">
                        David Howard (Operations Lead)
                      </SelectItem>
                      <SelectItem value="902" className="text-xs">
                        Sarah Mitchell (Senior IEP Advocate)
                      </SelectItem>
                      {dmEmployees.map((e: any) => (
                        <SelectItem
                          key={e.id}
                          value={String(e.id)}
                          className="text-xs"
                        >
                          {e.name} ({e.jobTitle || e.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newMessageType === "case" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#FFE394]">
                    Select Family / Student
                  </Label>
                  <Select
                    value={
                      selectedStudentId ||
                      (students[0] ? String(students[0].id) : "")
                    }
                    onValueChange={setSelectedStudentId}
                  >
                    <SelectTrigger className="bg-[#030814] border-[#C5A059]/50 text-white text-xs rounded-xl">
                      <SelectValue placeholder="Choose student record" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#061024] border-[#C5A059]/50 text-white max-h-56">
                      {students.map((s: any) => (
                        <SelectItem
                          key={s.id}
                          value={String(s.id)}
                          className="text-xs"
                        >
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newMessageType === "group" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#FFE394]">
                    Team Channel / Group Name
                  </Label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Operations, Advocacy..."
                    className="bg-[#030814] border-[#C5A059]/50 text-white text-xs rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="shrink-0 pt-3 border-t border-[#C5A059]/30 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewMessageModalOpen(false)}
                className="text-xs text-[#C6B697] hover:text-white h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-gradient-to-b from-[#EBD08E] via-[#C9A55C] to-[#987532] text-[#140E04] font-bold rounded-lg px-4 h-8 text-xs border border-[#FFF3C8]/80 shadow-md cursor-pointer"
              >
                Open Conversation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Link Record / Action Approval Modal ── */}
      <ActionRequestModal
        open={showActionModal}
        onOpenChange={setShowActionModal}
        conversationId={activeMeta.id}
      />

      {/* ── Create Task Modal ── */}
      <MessageToTaskModal
        open={Boolean(taskModalMessage)}
        onOpenChange={(open) => {
          if (!open) setTaskModalMessage(null);
        }}
        message={taskModalMessage}
      />
    </div>
  );
}
