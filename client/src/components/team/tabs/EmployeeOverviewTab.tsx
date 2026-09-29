import {
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  Briefcase,
  AlertTriangle,
  Building,
  MapPin,
  HeartHandshake,
  Award,
  Crown,
  Edit,
  DollarSign,
  FileText,
  CalendarDays,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployeeRecord, ROLE_DEFINITIONS } from "../teamTypes";

interface EmployeeOverviewTabProps {
  employee: EmployeeRecord;
  onNavigateTab: (tabId: string) => void;
  onDeactivateClick: () => void;
  onReactivateClick: () => void;
}

export default function EmployeeOverviewTab({
  employee,
  onNavigateTab,
  onDeactivateClick,
  onReactivateClick,
}: EmployeeOverviewTabProps) {
  const primaryRoleDef = ROLE_DEFINITIONS[employee.primaryRole];
  const PrimaryIcon = primaryRoleDef?.icon || Shield;

  return (
    <div className="space-y-6 text-xs text-white">
      {/* ── Top Hero Card ── */}
      <div className="rounded-2xl border border-blue-900/60 bg-[#000d2b] p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md shrink-0 ${employee.avatarColor}`}
          >
            {employee.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {employee.name}
              </h3>
              {employee.preferredName && (
                <span className="text-xs text-blue-300">"{employee.preferredName}"</span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${primaryRoleDef?.badgeClass}`}
              >
                <PrimaryIcon className="w-3 h-3" />
                <span>{primaryRoleDef?.label}</span>
              </span>
            </div>
            <p className="text-xs text-blue-200/80 font-medium mt-0.5">{employee.jobTitle}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-sky-400" />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Availability Status */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-900/40">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Availability
          </span>
          <div className="mt-1">
            {employee.status === "inactive" ? (
              <Badge className="bg-slate-800 text-slate-400 border border-slate-700">
                Inactive
              </Badge>
            ) : employee.status === "on_leave" ? (
              <Badge className="bg-amber-950 text-amber-300 border border-amber-600/40">
                On Leave
              </Badge>
            ) : employee.availabilityStatus === "In Meeting" ? (
              <Badge className="bg-sky-950 text-sky-300 border border-sky-600/40">
                In Meeting
              </Badge>
            ) : (
              <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                Available
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-blue-300/60 mt-1">
            Started {employee.startDate}
          </span>
        </div>
      </div>

      {/* ── Quick Action Shortcuts Bar ── */}
      <div className="p-3.5 rounded-2xl border border-blue-900/50 bg-[#000a26] flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          Quick Actions:
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab("roles")}
          className="h-7 px-2.5 text-[11px] border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 rounded-lg shrink-0 cursor-pointer"
        >
          <Crown className="w-3 h-3 mr-1 text-amber-400" />
          <span>Manage Roles</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab("schedule")}
          className="h-7 px-2.5 text-[11px] border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 rounded-lg shrink-0 cursor-pointer"
        >
          <CalendarDays className="w-3 h-3 mr-1 text-sky-400" />
          <span>Adjust Schedule</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab("timeoff")}
          className="h-7 px-2.5 text-[11px] border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 rounded-lg shrink-0 cursor-pointer"
        >
          <Calendar className="w-3 h-3 mr-1 text-amber-400" />
          <span>View Time Off</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab("payroll")}
          className="h-7 px-2.5 text-[11px] border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 rounded-lg shrink-0 cursor-pointer"
        >
          <DollarSign className="w-3 h-3 mr-1 text-emerald-400" />
          <span>Manage Pay</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onNavigateTab("documents")}
          className="h-7 px-2.5 text-[11px] border-blue-800 text-blue-200 hover:text-white hover:bg-blue-900/40 rounded-lg shrink-0 cursor-pointer"
        >
          <FileText className="w-3 h-3 mr-1 text-purple-400" />
          <span>Documents</span>
        </Button>
      </div>

      {/* ── 2-Column Info Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employment & Roles Details */}
        <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-white pb-2 border-b border-blue-900/40">
            <Briefcase className="w-4 h-4 text-sky-400" />
            <span>Employment &amp; Roles</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Role</span>
              <p className="font-bold text-white mt-0.5">{primaryRoleDef?.label}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Additional Roles</span>
              <p className="font-bold text-white mt-0.5">
                {employee.additionalRoles.length > 0
                  ? employee.additionalRoles.map((r) => ROLE_DEFINITIONS[r]?.label).join(", ")
                  : "None assigned"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Employment Type</span>
              <p className="font-bold text-white mt-0.5">{employee.employmentType}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Manager / Lead</span>
              <p className="font-bold text-white mt-0.5">{employee.manager}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Department</span>
              <p className="font-bold text-white mt-0.5">{employee.department}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Caseload</span>
              <p className="font-bold text-amber-300 font-mono mt-0.5">
                {employee.activeCaseloadCount} Cases
              </p>
            </div>
          </div>
        </div>

        {/* Schedule & Availability Snapshot */}
        <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-white pb-2 border-b border-blue-900/40">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Schedule &amp; Availability</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Normal Work Schedule</span>
              <p className="font-bold text-sky-300 mt-0.5">{employee.normalScheduleSummary}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Next Scheduled Time Off</span>
              <p className="font-bold text-amber-300 mt-0.5">
                {employee.nextTimeOff || "No upcoming time off requested"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Work Location / Office</span>
              <p className="font-medium text-white mt-0.5">{employee.workLocation}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Emergency Contact</span>
              <p className="font-medium text-slate-300 mt-0.5">{employee.emergencyContact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bio / Professional Background if available */}
      {employee.bio && (
        <div className="rounded-2xl border border-blue-900/40 bg-[#000820] p-4 space-y-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Advocate Profile &amp; Bio
          </span>
          <p className="text-xs text-blue-200/90 leading-relaxed">{employee.bio}</p>
          {employee.certifications && (
            <p className="text-[11px] text-amber-300/90 pt-1 font-medium">
              Verified Credentials: {employee.certifications}
            </p>
          )}
        </div>
      )}

      {/* ── Danger Zone: Offboarding / Deactivation ── */}
      <div className="pt-4 border-t border-red-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-950/20 p-4 rounded-2xl border border-red-900/30">
        <div className="space-y-0.5">
          <div className="font-bold text-red-400 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Workforce Status &amp; Offboarding</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {employee.status === "active"
              ? "Deactivating this employee launches the offboarding checklist to safely reassign appointments, cases, and tasks."
              : "This employee is currently inactive. You can restore active status and CRM access at any time."}
          </p>
        </div>

        {employee.status === "active" ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeactivateClick}
            className="text-xs font-bold rounded-xl h-8 px-3 shrink-0 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            <span>Deactivate Employee</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onReactivateClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-8 px-3 shrink-0 cursor-pointer"
          >
            Reactivate Employee
          </Button>
        )}
      </div>
    </div>
  );
}
