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
  Hash,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface CrewMessagesWorkspaceProps {
  initialConversationId?: number | null;
}

export default function CrewMessagesWorkspace({
  initialConversationId,
}: CrewMessagesWorkspaceProps) {
  const { user } = useAuth();
  const currentUserId = typeof user?.id === "number" ? user.id : (Number(user?.id) || 1);
  const isAdmin = user?.role === "admin";

  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  // New message modal state
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [newMessageType, setNewMessageType] = useState<"dm" | "group" | "case">("dm");
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [groupName, setGroupName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const utils = trpc.useUtils();

  // Queries
  const { data: convData, isLoading: isConvsLoading } =
    trpc.crewMessages.listConversations.useQuery(undefined, {
      enabled: !!user,
      refetchInterval: 10000,
    });

  const { data: employees = [] } = trpc.crewMessages.listEmployees.useQuery();
  const { data: contactsList = [] } = trpc.contacts.list.useQuery();

  // Extract students
  const students = (contactsList as any[]).filter(
    (c) => c.jobTitle === "Student" || !c.parentContactId
  );

  const { data: linkedContext } = trpc.crewMessages.getLinkedContext.useQuery(
    { conversationId: activeConv?.id || 0 },
    { enabled: !!activeConv?.id }
  );

  // Set initial active conversation
  useEffect(() => {
    if (!convData) return;

    const allConvs = [
      ...convData.directMessages,
      ...convData.channels,
      ...convData.caseThreads,
      ...convData.groupMessages,
    ];

    if (allConvs.length === 0) return;

    if (initialConversationId) {
      const match = allConvs.find((c) => c.id === initialConversationId);
      if (match) {
        setActiveConv(match);
        return;
      }
    }

    if (!activeConv) {
      // Default to Emily DM or first direct message or first channel
      const defaultConv =
        convData.directMessages.find((d) => d.displayName?.toLowerCase().includes("emily")) ||
        convData.directMessages[0] ||
        convData.channels[0] ||
        allConvs[0];
      setActiveConv(defaultConv);
    }
  }, [convData, initialConversationId]);

  // Mutations for starting new conversations
  const directMutation = trpc.crewMessages.getOrCreateDirect.useMutation({
    onSuccess: (data) => {
      utils.crewMessages.listConversations.invalidate();
      setNewMessageModalOpen(false);
      // Switch to new conversation
      setActiveConv({ id: data.conversationId, type: "direct" });
      toast.success("Direct message workspace opened");
    },
    onError: (err) => toast.error(err.message || "Failed to open direct message"),
  });

  const caseThreadMutation = trpc.crewMessages.getOrCreateCaseThread.useMutation({
    onSuccess: (data) => {
      utils.crewMessages.listConversations.invalidate();
      setNewMessageModalOpen(false);
      setActiveConv({ id: data.conversationId, type: "case" });
      toast.success("Student Case Thread opened");
    },
    onError: (err) => toast.error(err.message || "Failed to open case thread"),
  });

  const groupMutation = trpc.crewMessages.createGroup.useMutation({
    onSuccess: (data) => {
      utils.crewMessages.listConversations.invalidate();
      setNewMessageModalOpen(false);
      setActiveConv({ id: data.conversationId, type: "group", displayName: data.name });
      toast.success(`Group "${data.name}" created`);
    },
    onError: (err) => toast.error(err.message || "Failed to create group"),
  });

  const handleStartConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageType === "dm") {
      const targetId = selectedTargetUserId
        ? Number(selectedTargetUserId)
        : employees[0]?.id;
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
        memberUserIds: employees.map((e) => e.id).slice(0, 3),
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
    <div className="relative flex h-[calc(100vh-13rem)] min-h-[660px] max-h-[940px] w-full rounded-3xl overflow-hidden border border-sky-400/30 bg-[#040f24] shadow-[0_30px_90px_rgba(0,5,20,0.9),0_0_0_1px_rgba(56,189,248,0.25),inset_0_1px_2px_rgba(255,255,255,0.18)]">
      {/* 3D Top Rim Light Specular Reflection */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-300/80 to-transparent z-30 pointer-events-none" />

      {/* Rich 3D Blue Background Bathymetric Mesh & Topography Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08] z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, #38bdf8 1.5px, transparent 1.5px),
            radial-gradient(circle at 0% 50%, #0284c7 1.5px, transparent 1.5px),
            linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px, 32px 32px, 64px 64px, 64px 64px",
        }}
      />
      {/* Dynamic 3D Oceanic Radial Spotlights */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60 z-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 50% at 50% -5%, rgba(14, 116, 244, 0.35), transparent 75%),
            radial-gradient(ellipse 60% 40% at 20% 100%, rgba(2, 132, 199, 0.2), transparent 70%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0, 5, 20, 0.8), transparent 80%)
          `,
        }}
      />

      {/* ── Left Column: Conversations List (Sleek Compact Navigation) ── */}
      <div className="relative z-10 flex h-full">
        <ConversationListColumn
          conversations={conversations}
          activeConversationId={activeConv?.id || null}
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
      </div>

      {/* ── Center Column: Active Conversation (Largest, Dominant Message Section) ── */}
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
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#05152e] via-[#041124] to-[#020914] text-slate-400 p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0e2c59] to-[#071933] border-t border-t-sky-400/40 border border-sky-500/30 flex items-center justify-center text-sky-300 shadow-[0_8px_25px_rgba(0,10,35,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1.5 max-w-sm">
              <h3 className="text-lg font-bold text-white tracking-wide">No Conversation Selected</h3>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                Select an active channel, direct message, or student case thread from the left to start collaborating in your secure 3D advocacy workspace.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Linked Context (Collapsible 3D Context Sidebar) ── */}
      {isDetailsOpen && activeConv && (
        <div className="relative z-10 flex h-full">
          <LinkedContextColumn
            linkedContext={linkedContext}
            activeConversation={activeConv}
            onCollapse={() => setIsDetailsOpen(false)}
            onAddTask={() => toast.info("Create Task opened in conversation composer")}
            onAttachDocument={() => toast.info("Attach Document ready")}
          />
        </div>
      )}

      {/* ── New Conversation Modal (Deep 3D Navy, Zero White, Compact) ── */}
      <Dialog open={newMessageModalOpen} onOpenChange={setNewMessageModalOpen}>
        <DialogContent className="bg-gradient-to-b from-[#061833] via-[#041126] to-[#020a17] border-t border-t-sky-300/50 border border-sky-500/30 text-white rounded-2xl max-w-md w-[94vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,4,16,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden">
          <DialogHeader className="shrink-0 pb-2.5 border-b border-sky-500/20">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-sky-400" />
              New Crew Message
            </DialogTitle>
            <DialogDescription className="text-[11px] text-blue-200/70">
              Start an internal private direct message, group discussion, or student case thread.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartConversation} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 py-2.5 pr-1 text-xs">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewMessageType("dm")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  newMessageType === "dm"
                    ? "bg-sky-500/25 border-sky-400 text-white shadow-sm"
                    : "bg-[#000E26] border-sky-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Direct</span>
              </button>

              <button
                type="button"
                onClick={() => setNewMessageType("case")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  newMessageType === "case"
                    ? "bg-sky-500/25 border-sky-400 text-white shadow-sm"
                    : "bg-[#000E26] border-sky-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap className="w-4 h-4 text-sky-400" />
                <span>Case Thread</span>
              </button>

              <button
                type="button"
                onClick={() => setNewMessageType("group")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  newMessageType === "group"
                    ? "bg-sky-500/25 border-sky-400 text-white shadow-sm"
                    : "bg-[#000E26] border-sky-500/20 text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span>Group</span>
              </button>
            </div>

            {/* Direct Message employee dropdown */}
            {newMessageType === "dm" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-300">Select Employee</Label>
                <Select
                  value={selectedTargetUserId || (employees[0] ? String(employees[0].id) : "")}
                  onValueChange={setSelectedTargetUserId}
                >
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Choose active employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                        {e.name} ({e.jobTitle || e.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Case thread student dropdown */}
            {newMessageType === "case" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-300">Select Student</Label>
                <Select
                  value={selectedStudentId || (students[0] ? String(students[0].id) : "")}
                  onValueChange={setSelectedStudentId}
                >
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Choose student record" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-56">
                    {students.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group Name */}
            {newMessageType === "group" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-sky-300">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. High School Advocacy Team"
                  className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
                />
              </div>
            )}
          </div>

          <div className="shrink-0 pt-2.5 border-t border-sky-500/20 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewMessageModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white h-8.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={directMutation.isPending || caseThreadMutation.isPending || groupMutation.isPending}
              className="bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white font-bold rounded-xl px-4 h-8.5 text-xs shadow-[0_4px_14px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 cursor-pointer"
            >
              {(directMutation.isPending || caseThreadMutation.isPending || groupMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              )}
              Start Conversation
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </div>
  );
}
