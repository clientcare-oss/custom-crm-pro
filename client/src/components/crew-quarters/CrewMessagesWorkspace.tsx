import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ConversationListColumn from "./ConversationListColumn";
import ActiveConversationColumn from "./ActiveConversationColumn";
import LinkedContextColumn from "./LinkedContextColumn";
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
  MessageSquare,
  GraduationCap,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface CrewMessagesWorkspaceProps {
  initialConversationId?: number | null;
  onGoBack?: () => void;
}

export default function CrewMessagesWorkspace({
  initialConversationId,
  onGoBack,
}: CrewMessagesWorkspaceProps) {
  const { user } = useAuth();
  const currentUserId =
    typeof user?.id === "number" ? user.id : Number(user?.id) || 1;
  const isAdmin = user?.role === "admin";

  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  // New message modal state
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [newMessageType, setNewMessageType] = useState<"dm" | "group" | "case">(
    "dm"
  );
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [groupName, setGroupName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const utils = trpc.useUtils();

  // Queries
  const { data: convData } = trpc.crewMessages.listConversations.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchInterval: 10000,
    }
  );

  const { data: employees = [] } = trpc.crewMessages.listEmployees.useQuery();
  const { data: contactsList = [] } = trpc.contacts.list.useQuery();

  const dmEmployees = (employees as any[]).filter(
    (e) => !e.isCurrentUser && Number(e.id) !== currentUserId
  );

  const students = (contactsList as any[]).filter(
    (c) => c.jobTitle === "Student" || !c.parentContactId
  );

  const { data: linkedContext } = trpc.crewMessages.getLinkedContext.useQuery(
    { conversationId: activeConv?.id || 0 },
    { enabled: !!activeConv?.id && Number(activeConv?.id) > 0 }
  );

  // Default to "All Team" conversation so the workspace opens in the exact All Team view shown in the reference design
  useEffect(() => {
    if (!convData) {
      if (!activeConv) {
        setActiveConv({
          id: 1,
          type: "channel",
          name: "All Team",
          displayName: "All Team",
          role: "Team conversation",
        });
      }
      return;
    }

    const allConvs = [
      ...convData.channels,
      ...convData.directMessages,
      ...convData.caseThreads,
      ...convData.groupMessages,
    ];

    if (allConvs.length === 0) {
      if (!activeConv) {
        setActiveConv({
          id: 1,
          type: "channel",
          name: "All Team",
          displayName: "All Team",
          role: "Team conversation",
        });
      }
      return;
    }

    if (initialConversationId && !activeConv) {
      const match = allConvs.find((c) => c.id === initialConversationId);
      if (match) {
        setActiveConv(match);
        return;
      }
    }

    if (activeConv) {
      const updated = allConvs.find((c) => c.id === activeConv.id);
      if (
        updated &&
        (updated.displayName !== activeConv.displayName ||
          updated.unreadCount !== activeConv.unreadCount)
      ) {
        setActiveConv(updated);
      }
      return;
    }

    // Prefer "All Team" channel first to match reference image
    const allTeamChannel = convData.channels.find(
      (c: any) =>
        (c.name || c.displayName || "").toLowerCase().includes("all team") ||
        (c.name || c.displayName || "").toLowerCase().includes("general")
    );
    const defaultConv =
      allTeamChannel ||
      convData.channels[0] ||
      convData.directMessages[0] ||
      allConvs[0];
    setActiveConv({
      ...defaultConv,
      displayName:
        defaultConv.name?.toLowerCase() === "general"
          ? "All Team"
          : defaultConv.displayName || defaultConv.name || "All Team",
    });
  }, [convData, initialConversationId, activeConv]);

  // Mutations for starting new conversations
  const directMutation = trpc.crewMessages.getOrCreateDirect.useMutation({
    onSuccess: (data: any) => {
      utils.crewMessages.listConversations.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
      setNewMessageModalOpen(false);
      setActiveConv({
        id: data.conversationId,
        type: "direct",
        displayName: data.displayName || "Team Member",
        partnerUserId: data.partnerUserId,
        role: data.role || "Special Education Advocate",
        initials: data.initials || "TM",
      });
      toast.success(
        data.existed
          ? `Opened conversation with ${data.displayName || "team member"}`
          : `Started direct message with ${data.displayName || "team member"}`
      );
    },
    onError: (err) =>
      toast.error(err.message || "Failed to open direct message"),
  });

  const caseThreadMutation =
    trpc.crewMessages.getOrCreateCaseThread.useMutation({
      onSuccess: (data) => {
        utils.crewMessages.listConversations.invalidate();
        setNewMessageModalOpen(false);
        setActiveConv({ id: data.conversationId, type: "case" });
        toast.success("Student Case Thread opened");
      },
      onError: (err) =>
        toast.error(err.message || "Failed to open case thread"),
    });

  const groupMutation = trpc.crewMessages.createGroup.useMutation({
    onSuccess: (data) => {
      utils.crewMessages.listConversations.invalidate();
      setNewMessageModalOpen(false);
      setActiveConv({
        id: data.conversationId,
        type: "group",
        name: data.name,
        displayName: data.name,
      });
      toast.success(`Group "${data.name}" created`);
    },
    onError: (err) => toast.error(err.message || "Failed to create group"),
  });

  const handleStartConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageType === "dm") {
      const targetId = selectedTargetUserId
        ? Number(selectedTargetUserId)
        : dmEmployees[0]?.id;
      if (!targetId) {
        toast.error("Please choose a team member.");
        return;
      }
      directMutation.mutate({ targetUserId: targetId });
    } else if (newMessageType === "case") {
      const studentId = selectedStudentId
        ? Number(selectedStudentId)
        : students[0]?.id;
      if (!studentId) {
        toast.error("Please choose a student.");
        return;
      }
      caseThreadMutation.mutate({ studentContactId: studentId });
    } else if (newMessageType === "group") {
      if (!groupName.trim()) {
        toast.error("Please enter a group name.");
        return;
      }
      groupMutation.mutate({
        name: groupName.trim(),
        memberUserIds: dmEmployees.map((e: any) => e.id).slice(0, 5),
      });
    }
  };

  const conversations = convData || {
    channels: [],
    directMessages: [],
    groupMessages: [],
    caseThreads: [],
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #27324C 0%, #172035 18%, #0E1525 55%, #090E1B 100%)",
      }}
      className="relative flex flex-col flex-1 h-full min-h-0 w-full rounded-2xl overflow-hidden border-[2px] border-[#8C6D32]/80 shadow-[0_30px_90px_rgba(0,0,0,0.95),inset_0_2px_3px_rgba(255,255,255,0.22)] select-none"
    >
      {/* Brushed Horizontal Steel Micro-Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Top Electric Sapphire & Gold Specular Rim Shine */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7AA2F7] to-transparent opacity-90 z-30 pointer-events-none" />
      <div className="absolute top-[2px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#FFE394]/80 to-transparent z-30 pointer-events-none" />

      {/* ── TOP CONSOLE HEADER BAR + 3D ROTARY TELEPHONE HANDSET DOCK ── */}
      <div className="relative z-20 flex items-stretch justify-between px-3 sm:px-5 pt-2.5 pb-1.5 shrink-0">
        {/* Left: Go Back Button + Waypoint | Messages + Gold Horizontal Rule */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1426]/90 hover:bg-[#132240] border border-[#9E7D3B]/75 hover:border-[#FFE394] text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] shadow-[0_2px_8px_rgba(0,0,0,0.65)] transition-all cursor-pointer shrink-0"
              title="Back to Crew Quarters"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Go Back</span>
            </button>
          )}

          {/* 4-Point Gold Star + Embossed Gold "Waypoint" */}
          <div className="flex items-center gap-2 shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            >
              <defs>
                <linearGradient
                  id="wpStarGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#FFF3C4" />
                  <stop offset="50%" stopColor="#D6B265" />
                  <stop offset="100%" stopColor="#8F6B28" />
                </linearGradient>
              </defs>
              <path
                d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z"
                fill="url(#wpStarGrad)"
              />
            </svg>
            <span
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-b from-[#FFF3C4] via-[#E0BD72] to-[#A68139] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            >
              Waypoint
            </span>
          </div>

          {/* Vertical Brass Divider */}
          <div className="h-6 w-[1.5px] bg-gradient-to-b from-transparent via-[#C5A059] to-transparent shrink-0 mx-0.5" />

          {/* "Messages" Subtitle */}
          <span className="text-base sm:text-lg font-medium text-[#DCE5F5] tracking-wide shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Messages
          </span>

          {/* Long Horizontal Gold Rule Extending to Telephone Cradle */}
          <div className="hidden md:block flex-1 h-[1.5px] bg-gradient-to-r from-[#C5A059]/70 via-[#C5A059]/45 to-[#C5A059]/10 ml-3 rounded-full" />
        </div>

        {/* Right: 3D Admiralty Navy & Brass Rotary Telephone Cradle + "Team available" LED Pill */}
        {isDetailsOpen && (
          <div className="hidden lg:flex flex-col items-center justify-end w-[280px] xl:w-[295px] shrink-0 relative -mt-1">
            {/* Recessed Brushed-Metal Switchboard Well */}
            <div
              style={{
                background:
                  "linear-gradient(180deg, #1E283F 0%, #12192B 60%, #1B243A 100%)",
              }}
              className="w-full rounded-xl border border-[#7584A6]/35 px-3 pt-1 pb-2 flex flex-col items-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.85),0_2px_4px_rgba(255,255,255,0.08)]"
            >
              {/* 3D Sculpted Navy & Gold Rotary Telephone Handset SVG */}
              <svg
                viewBox="0 0 260 66"
                className="w-[235px] h-[56px] overflow-visible drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)]"
              >
                <defs>
                  <linearGradient
                    id="navyHandsetBar"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#4A69A8" />
                    <stop offset="28%" stopColor="#1E3568" />
                    <stop offset="70%" stopColor="#0C1733" />
                    <stop offset="100%" stopColor="#050A18" />
                  </linearGradient>
                  <radialGradient
                    id="navyEarCap"
                    cx="40%"
                    cy="30%"
                    r="70%"
                  >
                    <stop offset="0%" stopColor="#5274B8" />
                    <stop offset="45%" stopColor="#1B3163" />
                    <stop offset="85%" stopColor="#0A132B" />
                    <stop offset="100%" stopColor="#040814" />
                  </radialGradient>
                  <linearGradient
                    id="brassRingGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FFF2C2" />
                    <stop offset="45%" stopColor="#D4AF61" />
                    <stop offset="80%" stopColor="#8E6A25" />
                    <stop offset="100%" stopColor="#523B10" />
                  </linearGradient>
                </defs>

                {/* Left & Right Brass Cradle Plungers / Forks */}
                <rect
                  x="88"
                  y="30"
                  width="10"
                  height="28"
                  rx="4"
                  fill="url(#brassRingGrad)"
                />
                <circle
                  cx="93"
                  cy="29"
                  r="6.5"
                  fill="url(#brassRingGrad)"
                />
                <rect
                  x="162"
                  y="30"
                  width="10"
                  height="28"
                  rx="4"
                  fill="url(#brassRingGrad)"
                />
                <circle
                  cx="167"
                  cy="29"
                  r="6.5"
                  fill="url(#brassRingGrad)"
                />

                {/* Sculpted Curved Navy Handset Bridge */}
                <path
                  d="M 32 34 C 55 4, 205 4, 228 34 L 204 42 C 185 22, 75 22, 56 42 Z"
                  fill="url(#navyHandsetBar)"
                  stroke="#6D8FD1"
                  strokeWidth="0.6"
                  strokeOpacity="0.5"
                />

                {/* Left Receiver Bell & Brass Collar */}
                <ellipse
                  cx="44"
                  cy="38"
                  rx="24"
                  ry="14"
                  transform="rotate(-14 44 38)"
                  fill="url(#navyEarCap)"
                />
                <rect
                  x="21"
                  y="42"
                  width="44"
                  height="7"
                  rx="3.5"
                  transform="rotate(-14 43 45)"
                  fill="url(#brassRingGrad)"
                />
                <ellipse
                  cx="42"
                  cy="51"
                  rx="20"
                  ry="8"
                  transform="rotate(-14 42 51)"
                  fill="url(#navyEarCap)"
                />

                {/* Right Receiver Bell & Brass Collar */}
                <ellipse
                  cx="216"
                  cy="38"
                  rx="24"
                  ry="14"
                  transform="rotate(14 216 38)"
                  fill="url(#navyEarCap)"
                />
                <rect
                  x="195"
                  y="42"
                  width="44"
                  height="7"
                  rx="3.5"
                  transform="rotate(14 217 45)"
                  fill="url(#brassRingGrad)"
                />
                <ellipse
                  cx="218"
                  cy="51"
                  rx="20"
                  ry="8"
                  transform="rotate(14 218 51)"
                  fill="url(#navyEarCap)"
                />
              </svg>

              {/* Recessed "Team available" Status Capsule */}
              <div className="-mt-1 px-3.5 py-1 rounded-full bg-[#070E1F] border border-[#C5A059]/65 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9),0_1px_2px_rgba(255,255,255,0.12)] inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#4ADE80_45%,#16A34A_100%)] shadow-[0_0_8px_#4ADE80]" />
                <span className="text-[11px] font-semibold text-[#E2E8F0] tracking-wide">
                  Team available
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN 3-PANEL SWITCHBOARD DECK ── */}
      <div className="relative z-10 flex-1 min-h-0 w-full flex gap-3 px-3 pb-3 pt-0.5 overflow-hidden">
        {/* 1. Left Column: CONTACT INDEX */}
        <ConversationListColumn
          conversations={conversations}
          activeConversationId={activeConv?.id || null}
          activeConversationName={
            activeConv?.displayName || activeConv?.name || "All Team"
          }
          onSelectConversation={(c) => setActiveConv(c)}
          onNewMessage={() => {
            setNewMessageType("dm");
            setNewMessageModalOpen(true);
          }}
          onNewCaseThread={() => {
            setNewMessageType("case");
            setNewMessageModalOpen(true);
          }}
        />

        {/* 2. Center Column: Active Conversation Stage */}
        <div className="relative z-10 flex-1 min-w-0 h-full flex flex-col">
          {activeConv ? (
            <ActiveConversationColumn
              conversation={activeConv}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
              isDetailsOpen={isDetailsOpen}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border-[1.5px] border-[#C5A059]/80 bg-[#040B1B] text-slate-400 p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0A1833] border border-[#C5A059]/50 flex items-center justify-center text-[#E5C883]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  No Conversation Selected
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Select a team channel or direct message from the Contact Index
                  to begin collaborating.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Right Column: CONVERSATION DETAILS */}
        {isDetailsOpen && activeConv && (
          <LinkedContextColumn
            linkedContext={linkedContext}
            activeConversation={activeConv}
            onCollapse={() => setIsDetailsOpen(false)}
            onAddTask={() =>
              toast.success("Create task dialog opened for this conversation")
            }
            onAttachDocument={() =>
              toast.success("Link record / document picker ready")
            }
          />
        )}
      </div>

      {/* ── Compose / New Conversation Modal (Admiralty Navy & Brass) ── */}
      <Dialog open={newMessageModalOpen} onOpenChange={setNewMessageModalOpen}>
        <DialogContent className="bg-gradient-to-b from-[#08162E] via-[#050E20] to-[#030813] border border-[#C5A059]/70 text-[#FFF4D4] rounded-2xl max-w-md w-[94vw] sm:w-full max-h-[85vh] flex flex-col p-5 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
          <DialogHeader className="shrink-0 pb-3 border-b border-[#C5A059]/30">
            <DialogTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E5C883]" />
              Compose Message
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Start a direct message, team channel discussion, or family case
              thread.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleStartConversation}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 text-xs">
              <div className="grid grid-cols-3 gap-2">
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

                <button
                  type="button"
                  onClick={() => setNewMessageType("case")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    newMessageType === "case"
                      ? "bg-gradient-to-b from-[#E5C883] to-[#A8843E] border-[#FFF2C2] text-[#140E04] font-bold shadow"
                      : "bg-[#040B1A] border-[#C5A059]/35 text-[#C6B697] hover:text-white"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Family Thread</span>
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
                      (dmEmployees[0] ? String(dmEmployees[0].id) : "")
                    }
                    onValueChange={setSelectedTargetUserId}
                  >
                    <SelectTrigger className="bg-[#030814] border-[#C5A059]/50 text-white text-xs rounded-xl">
                      <SelectValue placeholder="Choose active employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#061024] border-[#C5A059]/50 text-white">
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
                disabled={
                  directMutation.isPending ||
                  caseThreadMutation.isPending ||
                  groupMutation.isPending
                }
                className="bg-gradient-to-b from-[#EBD08E] via-[#C9A55C] to-[#987532] text-[#140E04] font-bold rounded-lg px-4 h-8 text-xs border border-[#FFF3C8]/80 shadow-md cursor-pointer"
              >
                {(directMutation.isPending ||
                  caseThreadMutation.isPending ||
                  groupMutation.isPending) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                )}
                Open Conversation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
