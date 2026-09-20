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
    <div className="flex h-[calc(100vh-14rem)] min-h-[640px] max-h-[920px] w-full rounded-3xl overflow-hidden border border-sky-500/25 bg-[#07162B] shadow-[0_20px_60px_rgba(0,10,35,0.7)]">
      {/* ── Left Column: Conversations List ── */}
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

      {/* ── Center Column: Active Conversation ── */}
      {activeConv ? (
        <ActiveConversationColumn
          conversation={activeConv}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
          isDetailsOpen={isDetailsOpen}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#07162B] text-slate-400 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-white">No Conversation Selected</h3>
            <p className="text-xs text-blue-200/70 max-w-sm">
              Select an active channel, direct message, or student case thread from the left to start collaborating.
            </p>
          </div>
        </div>
      )}

      {/* ── Right Column: Linked Context (Collapsible) ── */}
      {isDetailsOpen && activeConv && (
        <LinkedContextColumn
          linkedContext={linkedContext}
          activeConversation={activeConv}
          onCollapse={() => setIsDetailsOpen(false)}
          onAddTask={() => toast.info("Create Task opened in conversation composer")}
          onAttachDocument={() => toast.info("Attach Document ready")}
        />
      )}

      {/* ── New Conversation Modal ── */}
      <Dialog open={newMessageModalOpen} onOpenChange={setNewMessageModalOpen}>
        <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-2xl max-w-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              New Crew Message
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Start an internal private direct message, group discussion, or student case thread.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartConversation} className="space-y-4 py-2">
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

            <div className="pt-3 border-t border-sky-500/15 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewMessageModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={directMutation.isPending || caseThreadMutation.isPending || groupMutation.isPending}
                className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl px-5 text-xs shadow-md shadow-sky-900/40"
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
