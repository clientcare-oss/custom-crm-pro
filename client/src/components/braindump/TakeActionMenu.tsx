import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrainItem } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  PlusCircle,
  Send,
  UserCheck,
  Calendar,
  Archive,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getStoredEmployees } from "@/components/team/teamStore";

interface TakeActionMenuProps {
  selectedNote: BrainItem | null;
  onActionComplete: () => void;
  canAssign?: boolean;
}

export default function TakeActionMenu({
  selectedNote,
  onActionComplete,
  canAssign = true,
}: TakeActionMenuProps) {
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [bringUpOpen, setBringUpOpen] = useState(false);
  const [customBringUpDate, setCustomBringUpDate] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [assignPriority, setAssignPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const employees = getStoredEmployees().filter((e) => e.status === "active");
  const utils = trpc.useUtils();

  // 1. Add to My Tasks
  const convertTaskMutation = trpc.brainDump.convertToTask.useMutation({
    onSuccess: () => {
      toast.success("Added to My Tasks! 🎯");
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
      utils.internalTasks.list.invalidate();
      onActionComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddToMyTasks = async (note: BrainItem) => {
    if (note.taskConvertedId) {
      toast.info("A task has already been created from this note.");
      return;
    }
    await convertTaskMutation.mutateAsync({
      noteId: note.id,
      title: note.title,
      description: note.body || undefined,
      priority: note.priority,
    });
  };

  // 2. Recommend Task
  const recommendTaskMutation = trpc.brainDump.recommendTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Task recommendation sent!");
      setRecommendOpen(false);
      onActionComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSendRecommendation = async () => {
    if (!selectedNote || !targetEmployeeId) {
      toast.error("Please select a team member.");
      return;
    }
    const emp = employees.find((e) => e.id === targetEmployeeId);
    await recommendTaskMutation.mutateAsync({
      noteId: selectedNote.id,
      noteTitle: selectedNote.title,
      noteBody: selectedNote.body || undefined,
      senderName: "Byron Honea",
      targetEmployeeId,
      targetEmployeeName: emp?.name || targetEmployeeId,
    });
  };

  // 3. Directly Assign Task
  const handleAssignTask = async () => {
    if (!selectedNote || !targetEmployeeId) {
      toast.error("Please select an assignee.");
      return;
    }
    await convertTaskMutation.mutateAsync({
      noteId: selectedNote.id,
      title: selectedNote.title,
      description: selectedNote.body || undefined,
      priority: assignPriority,
    });
    setAssignOpen(false);
  };

  // 4. Update Bring Up Date
  const updateMutation = trpc.brainDump.update.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
      onActionComplete();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSetBringUp = (dateStr: string) => {
    if (!selectedNote) return;
    updateMutation.mutate({
      id: selectedNote.id,
      bringUpDate: dateStr,
    });
    toast.success(`Bring Up set for ${dateStr}`);
    setBringUpOpen(false);
  };

  const handleArchive = (note: BrainItem) => {
    updateMutation.mutate({
      id: note.id,
      status: "archived",
    });
    toast.success("Note archived");
  };

  // Quick preset calculations for Bring Up
  const getPresetDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <>
      {/* ── Recommend Task Modal ────────────────────────────────────────── */}
      <Dialog open={recommendOpen} onOpenChange={setRecommendOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
              <Send className="w-4 h-4" /> Recommend Task to Teammate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Sends an action card through Crew Messages allowing your colleague to Accept, Decline, or Discuss.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Note to Recommend
              </span>
              <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                {selectedNote?.title}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Select Team Member</Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-xs h-9 text-slate-200">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.name} ({emp.jobTitle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecommendOpen(false)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendRecommendation}
              disabled={recommendTaskMutation.isPending || !targetEmployeeId}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {recommendTaskMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Send Recommendation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Task Modal ────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
              <UserCheck className="w-4 h-4" /> Directly Assign Task
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Creates a formal task in the Tasks queue assigned to the selected team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                Task Title
              </span>
              <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                {selectedNote?.title}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Assignee</Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-xs h-9 text-slate-200">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.name} ({emp.jobTitle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Priority</Label>
              <Select value={assignPriority} onValueChange={(v) => setAssignPriority(v as any)}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-xs h-9 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(false)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssignTask}
              disabled={convertTaskMutation.isPending || !targetEmployeeId}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {convertTaskMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bring Up Later Modal ────────────────────────────────────────── */}
      <Dialog open={bringUpOpen} onOpenChange={setBringUpOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-400">
              <Calendar className="w-4 h-4" /> Bring Up Later
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Brings this note back to your attention without creating a task due date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2">
            <p className="text-xs text-slate-300 font-medium">Quick Presets:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetBringUp(getPresetDate(1))}
                className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 justify-start"
              >
                Tomorrow ({getPresetDate(1).split(",")[0]})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetBringUp(getPresetDate(3))}
                className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 justify-start"
              >
                In 3 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetBringUp(getPresetDate(7))}
                className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 justify-start"
              >
                Next Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetBringUp(getPresetDate(14))}
                className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 justify-start"
              >
                In 2 Weeks
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <Label className="text-xs text-slate-400 mb-1 block">Or pick custom date:</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customBringUpDate}
                  onChange={(e) => setCustomBringUpDate(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-slate-200 h-9"
                />
                <Button
                  size="sm"
                  disabled={!customBringUpDate}
                  onClick={() => handleSetBringUp(customBringUpDate)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Set
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
