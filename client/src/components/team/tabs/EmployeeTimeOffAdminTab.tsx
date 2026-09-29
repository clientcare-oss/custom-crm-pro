import { useState } from "react";
import {
  Plane,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Headset,
  FileText,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeRecord, ROLE_DEFINITIONS } from "../teamTypes";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface EmployeeTimeOffAdminTabProps {
  employee: EmployeeRecord;
  timeOffRequests: any[];
  onApprove: (id: string, note?: string) => void;
  onDeny: (id: string, note?: string) => void;
  onSaveEmployee: (updated: EmployeeRecord) => void;
}

export default function EmployeeTimeOffAdminTab({
  employee,
  timeOffRequests,
  onApprove,
  onDeny,
  onSaveEmployee,
}: EmployeeTimeOffAdminTabProps) {
  const [, setLocation] = useLocation();
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "approved" | "denied" | "all">("pending");
  const [reviewNoteModalOpen, setReviewNoteModalOpen] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const pendingRequests = timeOffRequests.filter((r) => r.status === "Pending");
  const approvedRequests = timeOffRequests.filter((r) => r.status === "Approved");
  const deniedRequests = timeOffRequests.filter((r) => r.status === "Denied");

  const displayedRequests =
    activeSubTab === "pending"
      ? pendingRequests
      : activeSubTab === "approved"
      ? approvedRequests
      : activeSubTab === "denied"
      ? deniedRequests
      : timeOffRequests;

  // Role-specific coverage detection
  const isAdvocate = employee.primaryRole === "advocate" || employee.additionalRoles.includes("advocate");
  const isCallCenter = employee.primaryRole === "call_center" || employee.additionalRoles.includes("call_center");
  const isDocumentation = employee.primaryRole === "documentation" || employee.additionalRoles.includes("documentation");

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Time Off, Leave Requests &amp; Coverage Sync
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Review staff PTO submissions, approve coverage, and evaluate role-based calendar scheduling impact.
          </p>
        </div>

        {/* PTO Balance Chip */}
        <div className="flex items-center gap-2 bg-[#000820] px-3 py-1.5 rounded-xl border border-blue-800/60 shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">PTO Balance</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">14 Days Avail</span>
        </div>
      </div>

      {/* ── Role-Specific Coverage Intelligence Banner ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-white">
              Role-Based Coverage Diagnostics ({ROLE_DEFINITIONS[employee.primaryRole]?.label})
            </h4>
          </div>
          <span className="text-[10px] font-mono text-blue-300">Live Coverage Engine</span>
        </div>

        {isAdvocate && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Advocate Coverage Check: Active IEP Caseload ({employee.activeCaseloadCount} Students)</span>
              </div>
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                When approving absences for {employee.name}, the system scans the calendar for scheduled IEP meetings and manifestation reviews that require substitute advocate coverage.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation("/calendar")}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 shrink-0 cursor-pointer"
            >
              <span>View Calendar &amp; Reassign</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {isCallCenter && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Headset className="w-4 h-4 text-emerald-400" />
                <span>Call Center Shift Coverage</span>
              </div>
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                Absences require phone shift reassignment to ensure 100% callback compliance on incoming family inquiries.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation("/call-center")}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 shrink-0 cursor-pointer"
            >
              <span>Assign Phone Shift</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {isDocumentation && (
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Records Review &amp; Documentation Deadlines</span>
              </div>
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                Check open paperwork tasks to prevent delay on IEP comparisons and PWN analyses.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation("/tasks")}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl h-8 px-3 shrink-0 cursor-pointer"
            >
              <span>Review Open Tasks</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Sub-tabs filter: Pending | Approved | Denied | All ── */}
      <div className="flex items-center gap-1 bg-[#000820] p-1 rounded-xl border border-blue-900/60 w-fit">
        {[
          { id: "pending", label: `Pending (${pendingRequests.length})` },
          { id: "approved", label: `Approved (${approvedRequests.length})` },
          { id: "denied", label: `Denied (${deniedRequests.length})` },
          { id: "all", label: `All Requests (${timeOffRequests.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === tab.id
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Requests List ── */}
      <div className="space-y-3">
        {displayedRequests.map((req) => (
          <div
            key={req.id}
            className="p-4 rounded-2xl border border-blue-900/50 bg-[#000d2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{req.type}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    req.status === "Approved"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : req.status === "Pending"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-red-500/20 text-red-300 border border-red-500/40"
                  }`}
                >
                  {req.status}
                </span>
                <span className="text-[10px] text-slate-400">({req.days || 2} Days)</span>
              </div>

              <div className="text-xs text-blue-200/90 font-mono">
                {req.startDate} — {req.endDate}
              </div>

              {req.returnDate && (
                <div className="text-[11px] text-amber-300 font-medium">
                  First day back on duty: <strong>{req.returnDate}</strong>
                </div>
              )}

              {req.notes && (
                <p className="text-[11px] text-slate-400 italic">
                  "{req.notes}"
                </p>
              )}
            </div>

            {/* Management Actions */}
            {req.status === "Pending" ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeny(req.id)}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs rounded-xl h-8 px-3 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Deny</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove(req.id)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Approve Leave</span>
                </Button>
              </div>
            ) : (
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400">Reviewed &amp; Recorded</span>
              </div>
            )}
          </div>
        ))}

        {displayedRequests.length === 0 && (
          <div className="p-8 rounded-2xl border border-blue-900/30 bg-[#000820] text-center space-y-1">
            <Plane className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No requests in this category</p>
            <p className="text-xs text-slate-400">
              When the employee submits time-off in Crew Quarters, it appears here instantly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
