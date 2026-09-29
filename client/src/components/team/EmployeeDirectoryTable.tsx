import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Shield,
  Eye,
  Settings2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeRecord, RoleId, ROLE_DEFINITIONS } from "./teamTypes";

interface EmployeeDirectoryTableProps {
  employees: EmployeeRecord[];
  onSelectEmployee: (emp: EmployeeRecord) => void;
  onAddEmployee: () => void;
  roleFilter: RoleId | "all";
  onRoleFilterChange: (role: RoleId | "all") => void;
  onDeactivateClick: (emp: EmployeeRecord) => void;
  onReactivateClick: (emp: EmployeeRecord) => void;
}

export default function EmployeeDirectoryTable({
  employees,
  onSelectEmployee,
  onAddEmployee,
  roleFilter,
  onRoleFilterChange,
  onDeactivateClick,
  onReactivateClick,
}: EmployeeDirectoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "on_leave" | "inactive">("all");
  const [includeInactive, setIncludeInactive] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesEmail = emp.email.toLowerCase().includes(query);
        const matchesTitle = emp.jobTitle.toLowerCase().includes(query);
        const matchesRole =
          ROLE_DEFINITIONS[emp.primaryRole]?.label.toLowerCase().includes(query) ||
          emp.additionalRoles.some((r) => ROLE_DEFINITIONS[r]?.label.toLowerCase().includes(query));
        if (!matchesName && !matchesEmail && !matchesTitle && !matchesRole) {
          return false;
        }
      }

      // 2. Role Filter
      if (roleFilter !== "all") {
        const hasRole = emp.primaryRole === roleFilter || emp.additionalRoles.includes(roleFilter);
        if (!hasRole) return false;
      }

      // 3. Status Filter & Inactive Toggle
      if (statusFilter !== "all") {
        if (emp.status !== statusFilter) return false;
      } else if (!includeInactive) {
        if (emp.status === "inactive") return false;
      }

      return true;
    });
  }, [employees, searchQuery, roleFilter, statusFilter, includeInactive]);

  const getStatusBadge = (status: EmployeeRecord["status"], availability: EmployeeRecord["availabilityStatus"]) => {
    if (status === "inactive") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Inactive
        </span>
      );
    }
    if (status === "on_leave") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-600/40">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          On Leave
        </span>
      );
    }
    if (availability === "In Meeting") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/60 text-sky-300 border border-sky-600/40">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          In Meeting
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  };

  return (
    <div className="rounded-3xl border border-blue-900/60 bg-[#000d2b]/80 shadow-2xl p-5 sm:p-7 space-y-5">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Employee Directory
            </h2>
            <Badge variant="outline" className="text-xs border-blue-800 text-blue-300 ml-1">
              {filteredEmployees.length} of {employees.length} Staff
            </Badge>
          </div>
          <p className="text-xs text-blue-200/70 mt-0.5">
            Click any staff record to view full employment details, schedule, payroll, module access, and documents.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onAddEmployee}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-blue-900/40">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, job title, or role…"
            className="pl-9 bg-[#000820] border-blue-900/60 text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={(val) => onRoleFilterChange(val as RoleId | "all")}
          >
            <SelectTrigger className="w-[150px] bg-[#000820] border-blue-900/60 text-xs text-white h-9 rounded-xl">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="bg-[#000821] border border-blue-800/80 text-white text-xs">
              <SelectItem value="all">All Roles</SelectItem>
              {Object.values(ROLE_DEFINITIONS).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as any)}
          >
            <SelectTrigger className="w-[140px] bg-[#000820] border-blue-900/60 text-xs text-white h-9 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#000821] border border-blue-800/80 text-white text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Inactive toggle button */}
          <button
            onClick={() => setIncludeInactive(!includeInactive)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all whitespace-nowrap h-9 ${
              includeInactive
                ? "bg-blue-950/80 border-blue-400 text-sky-300"
                : "bg-[#000820] border-blue-900/60 text-slate-400 hover:text-white"
            }`}
          >
            {includeInactive ? "Showing Inactive" : "+ Include Inactive"}
          </button>
        </div>
      </div>

      {/* Employee Directory Table */}
      <div className="overflow-x-auto rounded-2xl border border-blue-900/50 bg-[#000820]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-blue-900/60 bg-[#001035]/60 text-blue-200/70 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Role(s)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Normal Schedule</th>
              <th className="py-3 px-4">Next Time Off</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-900/30">
            {filteredEmployees.map((emp) => {
              const primaryRoleDef = ROLE_DEFINITIONS[emp.primaryRole];
              const PrimaryIcon = primaryRoleDef?.icon || Users;

              return (
                <tr
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  className="hover:bg-blue-950/40 transition-colors cursor-pointer group"
                >
                  {/* Employee Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${emp.avatarColor}`}
                      >
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5 truncate">
                          <span>{emp.name}</span>
                          {emp.preferredName && emp.preferredName !== emp.name.split(" ")[0] && (
                            <span className="text-[10px] text-slate-400">({emp.preferredName})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-blue-300/80 truncate">{emp.jobTitle}</div>
                        <div className="text-[10px] text-slate-400 truncate">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role(s) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Primary Role */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${primaryRoleDef?.badgeClass}`}
                        title="Primary Role"
                      >
                        <PrimaryIcon className="w-3 h-3" />
                        <span>{primaryRoleDef?.label}</span>
                      </span>

                      {/* Additional Roles */}
                      {emp.additionalRoles.map((roleId) => {
                        const rDef = ROLE_DEFINITIONS[roleId];
                        if (!rDef) return null;
                        const RIcon = rDef.icon;
                        return (
                          <span
                            key={roleId}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/40"
                            title="Additional Role"
                          >
                            <RIcon className="w-2.5 h-2.5 opacity-70" />
                            <span>{rDef.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(emp.status, emp.availabilityStatus)}
                  </td>

                  {/* Normal Schedule */}
                  <td className="py-3 px-4 text-blue-200/80">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.normalScheduleSummary}</span>
                    </div>
                  </td>

                  {/* Next Time Off */}
                  <td className="py-3 px-4 text-slate-300">
                    {emp.nextTimeOff ? (
                      <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{emp.nextTimeOff}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectEmployee(emp)}
                        className="h-8 px-2.5 text-xs text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>Manage</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#000821] border border-blue-800 text-white text-xs">
                          <DropdownMenuItem onClick={() => onSelectEmployee(emp)} className="cursor-pointer">
                            <Eye className="w-3.5 h-3.5 mr-2 text-sky-400" />
                            Open Employee Record
                          </DropdownMenuItem>
                          {emp.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => onDeactivateClick(emp)}
                              className="text-red-400 focus:text-red-300 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-2" />
                              Deactivate Employee
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onReactivateClick(emp)}
                              className="text-emerald-400 focus:text-emerald-300 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                              Reactivate Employee
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No employees match this filter</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search terms or toggling "Include Inactive" employees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
