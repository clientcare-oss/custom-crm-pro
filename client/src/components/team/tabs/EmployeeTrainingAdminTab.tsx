import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmployeeRecord, EmployeeTrainingItem } from "../teamTypes";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface EmployeeTrainingAdminTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeTrainingAdminTab({
  employee,
  onSave,
}: EmployeeTrainingAdminTabProps) {
  const [, setLocation] = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EmployeeTrainingItem["category"]>("IEP Strategy");
  const [dueDate, setDueDate] = useState("Nov 30, 2026");

  const handleAssignTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTraining: EmployeeTrainingItem = {
      id: `tr-${Date.now()}`,
      title: title.trim(),
      category,
      status: "Not Started",
      dueDate,
      assignedBy: "Byron Honea",
    };

    const updated: EmployeeRecord = {
      ...employee,
      training: [newTraining, ...(employee.training || [])],
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Training Assigned",
          details: `Assigned module "${newTraining.title}" due ${newTraining.dueDate}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setModalOpen(false);
    setTitle("");
    toast.success("Training module assigned and visible in Crew Quarters Resources!");
  };

  const handleToggleStatus = (trId: string) => {
    const updatedTraining = (employee.training || []).map((tr) => {
      if (tr.id !== trId) return tr;
      const nextStatus: EmployeeTrainingItem["status"] =
        tr.status === "Completed" ? "In Progress" : "Completed";
      return {
        ...tr,
        status: nextStatus,
        completedDate: nextStatus === "Completed" ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
      };
    });

    const updated: EmployeeRecord = {
      ...employee,
      training: updatedTraining,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Training Status Updated",
          details: "Toggled completion status of training record.",
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    toast.info("Training completion updated");
  };

  const completedCount = (employee.training || []).filter((t) => t.status === "Completed").length;
  const totalCount = (employee.training || []).length;

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">
              Required Training, Continuing Ed &amp; Onboarding
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Connected to <strong>Crew Quarters → Resources</strong>. Assign compliance coursework, state law updates, and advocacy modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4 gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Training</span>
          </Button>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Training Completion</span>
          <p className="text-base font-bold text-white mt-0.5">
            {completedCount} of {totalCount} Modules Completed
          </p>
        </div>
        <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-800/40">
          {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100}%
        </span>
      </div>

      {/* Training Modules List */}
      <div className="space-y-3">
        {(employee.training || []).map((tr) => (
          <div
            key={tr.id}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
              tr.status === "Completed"
                ? "bg-[#000d2b]/60 border-emerald-900/40"
                : tr.status === "Past Due"
                ? "bg-red-950/20 border-red-500/40"
                : "bg-[#000d2b] border-blue-900/50"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  tr.status === "Completed"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                    : "bg-blue-950/60 text-sky-400 border border-blue-800/40"
                }`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white flex items-center gap-2 truncate">
                  <span>{tr.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                    {tr.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  {tr.dueDate && <span>Due: {tr.dueDate}</span>}
                  {tr.completedDate && <span className="text-emerald-300">Completed: {tr.completedDate}</span>}
                  <span>Assigned by {tr.assignedBy}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  tr.status === "Completed"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : tr.status === "In Progress"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : tr.status === "Past Due"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {tr.status}
              </span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggleStatus(tr.id)}
                className="h-7 px-2 text-[10px] text-sky-400 hover:text-white rounded-lg cursor-pointer"
              >
                {tr.status === "Completed" ? "Mark Incomplete" : "Mark Completed"}
              </Button>
            </div>
          </div>
        ))}

        {(!employee.training || employee.training.length === 0) && (
          <div className="p-8 rounded-2xl border border-blue-900/30 bg-[#000820] text-center space-y-1">
            <GraduationCap className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No training modules assigned</p>
            <p className="text-xs text-slate-400">
              Click "Assign Training" to issue IEP curriculum or compliance coursework.
            </p>
          </div>
        )}
      </div>

      {/* Assign Training Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-400" />
              <span>Assign Training Module</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignTraining} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-white">Module Title / Topic</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Manifestation Determination Review Protocols"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger className="bg-[#000d2b] border-blue-900/60 text-xs text-white h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                  <SelectItem value="IEP Strategy">IEP Strategy &amp; Advocacy</SelectItem>
                  <SelectItem value="Legal & Compliance">Legal &amp; IDEA Compliance</SelectItem>
                  <SelectItem value="CRM Systems">CRM Systems &amp; Tools</SelectItem>
                  <SelectItem value="Ethics & FERPA">Ethics &amp; FERPA Privacy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Target Completion Date</Label>
              <Input
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Nov 30, 2026"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Assign Module
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
