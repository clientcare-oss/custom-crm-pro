import {
  Users,
  UserCheck,
  UserX,
  Plane,
  Plus,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Phone,
  CalendarCheck,
  Crown,
  Headset,
  FileText,
  Laptop,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeRecord,
  ROLE_DEFINITIONS,
  RoleId,
} from "./teamTypes";
import {
  WorkforceTotals,
  RoleCounts,
  AttentionItem,
} from "./teamStore";
import { useLocation } from "wouter";

interface TeamOverviewHeaderProps {
  totals: WorkforceTotals;
  roleCounts: RoleCounts;
  attentionItems: AttentionItem[];
  timeOffRequests: any[];
  onApproveTimeOff: (id: string) => void;
  onAddEmployee: () => void;
  onSelectEmployeeById: (id: string) => void;
  activeRoleFilter?: RoleId | "all";
  onRoleFilterSelect?: (role: RoleId | "all") => void;
}

export default function TeamOverviewHeader({
  totals,
  roleCounts,
  attentionItems,
  timeOffRequests,
  onApproveTimeOff,
  onAddEmployee,
  onSelectEmployeeById,
  activeRoleFilter = "all",
  onRoleFilterSelect,
}: TeamOverviewHeaderProps) {
  const [, setLocation] = useLocation();

  const pendingLeaves = timeOffRequests.filter((r) => r.status === "Pending");

  return (
    <div className="space-y-6">
      {/* ── Top Workforce Summary & Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Employees */}
        <div className="rounded-2xl border border-blue-900/60 bg-[#000d2b]/80 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
              Total Workforce
            </span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
            {totals.total}
          </div>
          <p className="text-[11px] text-blue-300/60 mt-1">Full-time, part-time & contractors</p>
        </div>

        {/* Active Staff */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#000d2b]/80 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Active Duty
            </span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono mt-2">
            {totals.active}
          </div>
          <p className="text-[11px] text-emerald-400/70 mt-1">Available & actively taking cases</p>
        </div>

        {/* On Leave */}
        <div className="rounded-2xl border border-amber-900/40 bg-[#000d2b]/80 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              On Leave
            </span>
            <Plane className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-2">
            {totals.onLeave}
          </div>
          <p className="text-[11px] text-amber-400/70 mt-1">Approved PTO / coverage active</p>
        </div>

        {/* Inactive / Former */}
        <div className="rounded-2xl border border-blue-900/30 bg-[#000d2b]/50 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Inactive
            </span>
            <UserX className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-400 font-mono mt-2">
            {totals.inactive}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Offboarded (history retained)</p>
        </div>
      </div>

      {/* ── Role Count Badges (Dynamic from Real Workforce Records) ── */}
      <div className="rounded-2xl border border-blue-900/60 bg-[#000a26] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Workforce Distribution by Role
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {activeRoleFilter !== "all" && (
              <button
                type="button"
                onClick={() => onRoleFilterSelect?.("all")}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer"
              >
                Clear filter (show all)
              </button>
            )}
            <span className="text-[11px] text-blue-300/70">
              Click any role to filter the employee directory
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {(
            [
              { id: "advocate", label: "Advocates", sub: "IEP Advocacy", icon: Users, count: roleCounts.advocate, color: "text-sky-400 border-sky-500/30 bg-sky-950/40" },
              { id: "call_center", label: "Call Center", sub: "Phone & Intake", icon: Headset, count: roleCounts.call_center, color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
              { id: "documentation", label: "Documentation", sub: "Records & Filing", icon: FileText, count: roleCounts.documentation, color: "text-purple-400 border-purple-500/30 bg-purple-950/40" },
              { id: "technology", label: "Technology", sub: "Systems & Security", icon: Laptop, count: roleCounts.technology, color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40" },
              { id: "operations", label: "Operations", sub: "Logistics & Workflow", icon: Settings, count: roleCounts.operations, color: "text-slate-300 border-slate-500/30 bg-slate-900/40" },
              { id: "management", label: "Management", sub: "Executive & Admin", icon: Crown, count: roleCounts.management, color: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
            ] as const
          ).map((item) => {
            const isSelected = activeRoleFilter === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onRoleFilterSelect?.(isSelected ? "all" : item.id)}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all cursor-pointer text-left ${item.color} ${
                  isSelected ? "ring-2 ring-amber-400 scale-[1.02] shadow-lg shadow-amber-950/30" : "hover:border-blue-400/50 hover:bg-opacity-80"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black font-mono px-2.5 py-0.5 rounded-lg bg-black/50 text-white border border-white/10 shadow-xs shrink-0">
                    {item.count}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight whitespace-nowrap">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-blue-200/60 leading-tight whitespace-nowrap mt-0.5">
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Optional Management Attention Area (Only shown when actionable) ── */}
      {attentionItems.length > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-[#000d2b] to-[#000d2b] p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Needs Attention · {attentionItems.length} Action Item{attentionItems.length > 1 ? "s" : ""}
              </h3>
            </div>
            <span className="text-[10px] text-amber-400/80 font-mono">Action Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map((att) => (
              <div
                key={att.id}
                className="p-3.5 rounded-xl border border-amber-400/20 bg-[#000820]/90 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${att.level === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
                    <span>{att.title}</span>
                  </div>
                  <p className="text-[11px] text-blue-200/70 leading-relaxed">
                    {att.description}
                  </p>
                </div>
                {att.actionLabel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (att.employeeId) {
                        onSelectEmployeeById(att.employeeId);
                      }
                    }}
                    className="h-7 px-2.5 text-[10px] font-bold border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:text-white shrink-0 cursor-pointer"
                  >
                    <span>{att.actionLabel}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Preserved: Team Workload & Leadership Controls Management Deck ── */}
      <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#000821] via-[#001035] to-[#000821] p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/30">
                Management Deck
              </span>
              <span className="text-xs text-blue-300">Practice Owner &amp; Admin Oversight</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-white font-bold">
              Team Workload &amp; Leadership Controls
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onAddEmployee}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl gap-1.5 cursor-pointer shadow-md px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Leaves Awaiting Approval */}
          <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-amber-400" />
                <span>Leaves Awaiting Approval</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                {pendingLeaves.length} Pending
              </span>
            </div>
            <p className="text-[11px] text-blue-200/70">
              Staff time-off requests needing review. Approve to automatically sync team coverage.
            </p>
            <div className="space-y-2">
              {pendingLeaves.map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-[#000821] border border-blue-800/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{r.type}</div>
                    <div className="text-[10px] text-blue-300/80">{r.startDate} — {r.endDate}</div>
                    {r.returnDate && (
                      <div className="text-[10px] text-amber-300/90 font-medium flex items-center gap-1 mt-0.5">
                        <CalendarCheck className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>First day back: <strong className="text-amber-200">{r.returnDate}</strong></span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onApproveTimeOff(r.id)}
                    className="h-7 px-2 text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer"
                  >
                    Approve
                  </Button>
                </div>
              ))}
              {pendingLeaves.length === 0 && (
                <div className="p-3 rounded-xl bg-[#000821]/60 border border-blue-800/30 text-center">
                  <p className="text-xs text-blue-300/70">No pending leave requests</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Team Caseload Capacity */}
          <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Team Caseload Capacity</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-400/20 text-sky-300 font-bold">
                Balanced
              </span>
            </div>
            <p className="text-[11px] text-blue-200/70">
              Current active student caseloads distributed across staff advocates.
            </p>
            <div className="space-y-2">
              {[
                { name: "Byron Honea", cases: 8, capacity: "80%" },
                { name: "Sarah Jenkins", cases: 6, capacity: "60%" },
                { name: "Marcus Vance", cases: 4, capacity: "40%" },
              ].map((emp, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#000821] border border-blue-800/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{emp.name}</div>
                    <div className="text-[10px] text-blue-300/80">{emp.cases} Active Cases</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-300">{emp.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Unassigned Callbacks & Inquiries */}
          <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Unassigned Lead Callbacks</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold">
                3 Pending
              </span>
            </div>
            <p className="text-[11px] text-blue-200/70">
              Inbound family inquiries and voicemails pending advocate assignment.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/call-logs")}
              className="w-full border-blue-700/60 hover:bg-blue-900/40 text-blue-200 text-xs rounded-xl py-2 gap-1.5 cursor-pointer mt-2"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Triage Inbound Calls &amp; Assign</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
