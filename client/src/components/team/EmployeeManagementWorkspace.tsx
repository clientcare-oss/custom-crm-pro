import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  DollarSign,
  Shield,
  Calendar,
  Plane,
  FileText,
  Laptop,
  GraduationCap,
  MessageSquare,
  History,
  Crown,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building,
  AlertTriangle,
  UserX,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import PageIdBadge from "@/components/PageIdBadge";
import { EmployeeRecord, ROLE_DEFINITIONS } from "./teamTypes";
import EmployeeOverviewTab from "./tabs/EmployeeOverviewTab";
import EmployeeEmploymentTab from "./tabs/EmployeeEmploymentTab";
import EmployeePayrollAdminTab from "./tabs/EmployeePayrollAdminTab";
import EmployeeRolesAccessTab from "./tabs/EmployeeRolesAccessTab";
import EmployeeScheduleAdminTab from "./tabs/EmployeeScheduleAdminTab";
import EmployeeTimeOffAdminTab from "./tabs/EmployeeTimeOffAdminTab";
import EmployeeDocumentsTab from "./tabs/EmployeeDocumentsTab";
import EmployeeEquipmentAdminTab from "./tabs/EmployeeEquipmentAdminTab";
import EmployeeTrainingAdminTab from "./tabs/EmployeeTrainingAdminTab";
import EmployeeNotesTab from "./tabs/EmployeeNotesTab";
import EmployeeActivityTab from "./tabs/EmployeeActivityTab";

interface EmployeeManagementWorkspaceProps {
  employee: EmployeeRecord;
  allEmployees: EmployeeRecord[];
  onBackToDirectory: () => void;
  onSelectEmployee: (emp: EmployeeRecord) => void;
  onSaveEmployee: (updated: EmployeeRecord) => void;
  timeOffRequests: any[];
  onApproveTimeOff: (id: string, note?: string) => void;
  onDenyTimeOff: (id: string, note?: string) => void;
  onDeactivateClick: (emp: EmployeeRecord) => void;
  onReactivateClick: (emp: EmployeeRecord) => void;
}

export default function EmployeeManagementWorkspace({
  employee,
  allEmployees,
  onBackToDirectory,
  onSelectEmployee,
  onSaveEmployee,
  timeOffRequests,
  onApproveTimeOff,
  onDenyTimeOff,
  onDeactivateClick,
  onReactivateClick,
}: EmployeeManagementWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const primaryRoleDef = ROLE_DEFINITIONS[employee.primaryRole];
  const PrimaryIcon = primaryRoleDef?.icon || Shield;

  const currentIndex = allEmployees.findIndex((e) => e.id === employee.id);
  const prevEmployee = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmployee = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  const TABS = [
    { id: "overview", label: "Overview", icon: User },
    { id: "employment", label: "Employment", icon: Briefcase },
    { id: "payroll", label: "Payroll & Comp", icon: DollarSign },
    { id: "roles", label: "Roles & Access", icon: Shield },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "timeoff", label: "Time Off", icon: Plane },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "equipment", label: "Equipment", icon: Laptop },
    { id: "training", label: "Training", icon: GraduationCap },
    { id: "notes", label: "Management Notes", icon: MessageSquare },
    { id: "activity", label: "Activity Audit", icon: History },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Top Executive Breadcrumb & Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-blue-900/40">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBackToDirectory}
            variant="outline"
            className="border-blue-700/60 bg-[#000d2b] hover:bg-blue-900/50 text-sky-300 hover:text-white font-bold text-xs h-9 px-3 gap-2 rounded-xl cursor-pointer shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Employee Directory</span>
          </Button>

          <span className="text-slate-600 hidden sm:inline">•</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Record ID:</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
              {employee.id}
            </span>
            <PageIdBadge id="PG-019" name="Employee Management Workspace" />
          </div>
        </div>

        {/* Quick Employee Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="icon"
            variant="outline"
            disabled={!prevEmployee}
            onClick={() => prevEmployee && onSelectEmployee(prevEmployee)}
            className="h-8 w-8 rounded-lg border-blue-900/60 bg-[#000d2b] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            title={prevEmployee ? `Previous: ${prevEmployee.name}` : "No previous employee"}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 px-3 text-xs font-semibold border-blue-800/60 bg-[#000d2b] hover:bg-blue-900/40 text-white rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <div className={`w-2 h-2 rounded-full ${employee.status === "active" ? "bg-emerald-400" : employee.status === "on_leave" ? "bg-amber-400" : "bg-slate-400"}`} />
                <span className="max-w-[150px] truncate">{employee.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-[#000a26] border border-blue-800 text-white rounded-xl shadow-2xl p-1.5 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 py-1">
                Switch Employee ({allEmployees.length})
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-blue-900/50 my-1" />
              {allEmployees.map((emp) => {
                const isCurrent = emp.id === employee.id;
                const rDef = ROLE_DEFINITIONS[emp.primaryRole];
                return (
                  <DropdownMenuItem
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer ${
                      isCurrent ? "bg-blue-600/30 text-sky-200 font-bold" : "hover:bg-white/5 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${emp.avatarColor}`}>
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <div className="truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{rDef?.label}</div>
                      </div>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="outline"
            disabled={!nextEmployee}
            onClick={() => nextEmployee && onSelectEmployee(nextEmployee)}
            className="h-8 w-8 rounded-lg border-blue-900/60 bg-[#000d2b] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            title={nextEmployee ? `Next: ${nextEmployee.name}` : "No next employee"}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Active Employee Executive Header Banner ── */}
      <div className="rounded-3xl border border-blue-800/80 bg-gradient-to-r from-[#000d2b] via-[#00133d] to-[#000d2b] p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-xl shrink-0 ring-4 ring-blue-900/40 ${employee.avatarColor}`}
            >
              {employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                  {employee.name}
                </h2>
                {employee.preferredName && (
                  <span className="text-xs sm:text-sm text-blue-200/60 font-medium">
                    ("{employee.preferredName}")
                  </span>
                )}

                {/* Primary Role Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${primaryRoleDef?.badgeClass}`}
                >
                  <PrimaryIcon className="w-3.5 h-3.5" />
                  <span>{primaryRoleDef?.label}</span>
                </span>

                {/* Additional Roles */}
                {employee.additionalRoles?.map((rId) => {
                  const r = ROLE_DEFINITIONS[rId];
                  if (!r) return null;
                  const RIcon = r.icon;
                  return (
                    <span
                      key={rId}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${r.badgeClass} opacity-80`}
                    >
                      <RIcon className="w-3 h-3" />
                      <span>{r.label}</span>
                    </span>
                  );
                })}

                {/* Employment Status Badge */}
                {employee.status === "active" && (
                  <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold gap-1 px-2.5 py-0.5">
                    <UserCheck className="w-3 h-3" /> Active Duty
                  </Badge>
                )}
                {employee.status === "on_leave" && (
                  <Badge className="bg-amber-950 text-amber-300 border border-amber-500/40 text-xs font-bold gap-1 px-2.5 py-0.5">
                    <Plane className="w-3 h-3" /> On Leave
                  </Badge>
                )}
                {employee.status === "inactive" && (
                  <Badge className="bg-slate-900 text-slate-400 border border-slate-700 text-xs font-bold gap-1 px-2.5 py-0.5">
                    <UserX className="w-3 h-3" /> Inactive
                  </Badge>
                )}
              </div>

              {/* Job Title & Contact Details */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-blue-200/80">
                <span className="font-semibold text-white">{employee.jobTitle}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 text-blue-300/80">
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <a href={`mailto:${employee.email}`} className="hover:text-white transition-colors">
                    {employee.email}
                  </a>
                </span>
                {employee.phone && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5 text-blue-300/80">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <a href={`tel:${employee.phone}`} className="hover:text-white transition-colors">
                        {employee.phone}
                      </a>
                    </span>
                  </>
                )}
                {employee.department && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5 text-blue-300/80">
                      <Building className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{employee.department}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Operational Badges & Deactivation */}
          <div className="flex flex-wrap items-center gap-2.5 lg:self-center">
            {employee.status === "active" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeactivateClick(employee)}
                className="border-red-900/60 bg-red-950/30 hover:bg-red-950/60 text-red-300 hover:text-white text-xs font-semibold rounded-xl h-8 px-3 gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <UserX className="w-3.5 h-3.5 text-red-400" />
                <span>Offboard Employee</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onReactivateClick(employee)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-8 px-3 gap-1.5 cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Staff</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation Ribbon (11 Management Domains) ── */}
      <div className="bg-[#000a26] border border-blue-900/60 rounded-2xl p-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 select-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-950/50 ring-1 ring-white/20"
                    : "text-blue-200/70 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content Workspace (Full Width, Natural Scrolling) ── */}
      <div className="rounded-3xl border border-blue-900/50 bg-[#000820] p-6 sm:p-8 shadow-2xl min-h-[600px]">
        {activeTab === "overview" && (
          <EmployeeOverviewTab
            employee={employee}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
            onDeactivateClick={() => onDeactivateClick(employee)}
            onReactivateClick={() => onReactivateClick(employee)}
          />
        )}

        {activeTab === "employment" && (
          <EmployeeEmploymentTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "payroll" && (
          <EmployeePayrollAdminTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "roles" && (
          <EmployeeRolesAccessTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "schedule" && (
          <EmployeeScheduleAdminTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "timeoff" && (
          <EmployeeTimeOffAdminTab
            employee={employee}
            timeOffRequests={timeOffRequests}
            onApprove={onApproveTimeOff}
            onDeny={onDenyTimeOff}
            onSaveEmployee={onSaveEmployee}
          />
        )}

        {activeTab === "documents" && (
          <EmployeeDocumentsTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "equipment" && (
          <EmployeeEquipmentAdminTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "training" && (
          <EmployeeTrainingAdminTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "notes" && (
          <EmployeeNotesTab employee={employee} onSave={onSaveEmployee} />
        )}

        {activeTab === "activity" && (
          <EmployeeActivityTab employee={employee} />
        )}
      </div>
    </div>
  );
}
