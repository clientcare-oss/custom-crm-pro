import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Briefcase,
  CheckSquare,
  Laptop,
  ShieldAlert,
  Headset,
  FileText,
  UserX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeRecord, ROLE_DEFINITIONS } from "./teamTypes";
import { toast } from "sonner";

interface DeactivateEmployeeModalProps {
  employee: EmployeeRecord | null;
  open: boolean;
  onClose: () => void;
  onConfirmDeactivate: (id: string, notes: string) => void;
}

export default function DeactivateEmployeeModal({
  employee,
  open,
  onClose,
  onConfirmDeactivate,
}: DeactivateEmployeeModalProps) {
  const [chkAppointments, setChkAppointments] = useState(false);
  const [chkCases, setChkCases] = useState(false);
  const [chkTasks, setChkTasks] = useState(false);
  const [chkEquipment, setChkEquipment] = useState(false);
  const [chkAccess, setChkAccess] = useState(false);
  const [notes, setNotes] = useState("");

  if (!employee) return null;

  const isAllChecked = chkAppointments && chkCases && chkTasks && chkEquipment && chkAccess;

  const handleDeactivate = () => {
    if (!isAllChecked) {
      toast.error("Please confirm all offboarding checklist items");
      return;
    }

    onConfirmDeactivate(employee.id, notes);
    toast.success(`${employee.name} deactivated. Historical data safely preserved.`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-[#000821] border border-red-800/80 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-red-950 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/60 border border-red-600/40 flex items-center justify-center text-red-400">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Deactivate Employee · Offboarding Checklist</span>
              </DialogTitle>
              <p className="text-xs text-red-300/80 mt-0.5">
                {employee.name} ({employee.jobTitle})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl border border-red-900/40 bg-red-950/20 text-slate-300 text-[11px] leading-relaxed">
            Deactivating an employee removes their active login credentials and hides them from active scheduling queues. <strong>Their historical time entries, case notes, and documents are preserved indefinitely</strong> and remain accessible under the Inactive filter.
          </div>

          {/* Offboarding Checklist */}
          <div className="space-y-2.5">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Required Offboarding Verifications
            </span>

            {/* Item 1: Appointments */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/40 bg-[#000d2b] cursor-pointer hover:border-blue-800 transition-colors">
              <input
                type="checkbox"
                checked={chkAppointments}
                onChange={(e) => setChkAppointments(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calendar &amp; Scheduled Meetings Reassigned</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Future IEP meetings and discovery calls reassigned to available advocates or call coordinator.
                </p>
              </div>
            </label>

            {/* Item 2: Cases */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/40 bg-[#000d2b] cursor-pointer hover:border-blue-800 transition-colors">
              <input
                type="checkbox"
                checked={chkCases}
                onChange={(e) => setChkCases(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  <span>Active Student Cases Transferred ({employee.activeCaseloadCount} Assigned)</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Case lead and documentation assignments handed over to continuing staff advocates.
                </p>
              </div>
            </label>

            {/* Item 3: Open Tasks */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/40 bg-[#000d2b] cursor-pointer hover:border-blue-800 transition-colors">
              <input
                type="checkbox"
                checked={chkTasks}
                onChange={(e) => setChkTasks(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Tasks &amp; Milestones Audited</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Pending records reviews, draft IEP comparisons, and state complaint tasks reassigned.
                </p>
              </div>
            </label>

            {/* Item 4: Equipment */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/40 bg-[#000d2b] cursor-pointer hover:border-blue-800 transition-colors">
              <input
                type="checkbox"
                checked={chkEquipment}
                onChange={(e) => setChkEquipment(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Company Equipment &amp; Security Keys Recovered</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Hardware assets (laptops, displays, YubiKeys) verified and marked returned in inventory.
                </p>
              </div>
            </label>

            {/* Item 5: Permissions */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/40 bg-[#000d2b] cursor-pointer hover:border-blue-800 transition-colors">
              <input
                type="checkbox"
                checked={chkAccess}
                onChange={(e) => setChkAccess(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Revoke CRM &amp; Crew Quarters Login Access</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Zero Trust token sessions invalidated and Clerk authentication disabled.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1 pt-2">
            <Label className="text-xs text-white">Offboarding Notes &amp; Handover Summary</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Completed exit interview. Cases reassigned to Sarah Jenkins. Equipment received."
              className="bg-[#000d2b] border-blue-900/60 text-white text-xs min-h-[70px] rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-red-950 pt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!isAllChecked}
            onClick={handleDeactivate}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl h-8 px-4 cursor-pointer disabled:opacity-50"
          >
            Confirm &amp; Deactivate Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
