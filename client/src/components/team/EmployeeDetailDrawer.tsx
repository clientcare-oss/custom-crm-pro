import { useState } from "react";
import {
  X,
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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface EmployeeDetailDrawerProps {
  employee: EmployeeRecord | null;
  open: boolean;
  onClose: () => void;
  onSaveEmployee: (updated: EmployeeRecord) => void;
  timeOffRequests: any[];
  onApproveTimeOff: (id: string, note?: string) => void;
  onDenyTimeOff: (id: string, note?: string) => void;
  onDeactivateClick: (emp: EmployeeRecord) => void;
  onReactivateClick: (emp: EmployeeRecord) => void;
}

export default function EmployeeDetailDrawer({
  employee,
  open,
  onClose,
  onSaveEmployee,
  timeOffRequests,
  onApproveTimeOff,
  onDenyTimeOff,
  onDeactivateClick,
  onReactivateClick,
}: EmployeeDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  if (!employee) return null;

  const primaryRoleDef = ROLE_DEFINITIONS[employee.primaryRole];
  const PrimaryIcon = primaryRoleDef?.icon || Shield;

  const TABS = [
    { id: "overview", label: "Overview", icon: User },
    { id: "employment", label: "Employment", icon: Briefcase },
    { id: "payroll", label: "Payroll", icon: DollarSign },
    { id: "roles", label: "Roles & Access", icon: Shield },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "timeoff", label: "Time Off", icon: Plane },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "equipment", label: "Equipment", icon: Laptop },
    { id: "training", label: "Training", icon: GraduationCap },
    { id: "notes", label: "Notes", icon: MessageSquare },
    { id: "activity", label: "Activity", icon: History },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 bg-[#000820] border border-blue-800 text-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#000d2b] via-[#001035] to-[#000d2b] border-b border-blue-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md shrink-0 ${employee.avatarColor}`}
            >
              {employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-white tracking-wide">
                  {employee.name}
                </DialogTitle>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${primaryRoleDef?.badgeClass}`}
                >
                  <PrimaryIcon className="w-3 h-3" />
                  <span>{primaryRoleDef?.label}</span>
                </span>
                {employee.status === "on_leave" && (
                  <Badge className="bg-amber-950 text-amber-300 border border-amber-600/40 text-[10px]">
                    On Leave
                  </Badge>
                )}
                {employee.status === "inactive" && (
                  <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-blue-200/70">{employee.jobTitle} · {employee.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl h-9 w-9 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-1 px-5 sm:px-6 py-2 bg-[#000618] border-b border-blue-900/40 overflow-x-auto shrink-0 select-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-blue-200/70 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-sky-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#000820]">
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

          {activeTab === "activity" && <EmployeeActivityTab employee={employee} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
