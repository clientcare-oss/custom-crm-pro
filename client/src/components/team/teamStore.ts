import {
  EmployeeRecord,
  INITIAL_EMPLOYEES,
  RoleId,
  ROLE_DEFINITIONS,
  CRM_MODULES,
} from "./teamTypes";

const STORAGE_KEY = "waypoint_team_employees";
const EVENT_NAME = "waypoint_team_updated";

export function getStoredEmployees(): EmployeeRecord[] {
  if (typeof window === "undefined") return INITIAL_EMPLOYEES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EMPLOYEES;
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveStoredEmployees(employees: EmployeeRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { employees } }));
  } catch (err) {
    console.error("Failed to save employees to localStorage", err);
  }
}

export function saveEmployee(updated: EmployeeRecord): void {
  const current = getStoredEmployees();
  const exists = current.some((e) => e.id === updated.id);
  const next = exists
    ? current.map((e) => (e.id === updated.id ? updated : e))
    : [...current, updated];
  saveStoredEmployees(next);
}

export function addEmployee(newEmp: Omit<EmployeeRecord, "id"> & { id?: string }): EmployeeRecord {
  const current = getStoredEmployees();
  const id = newEmp.id || `emp-${Date.now()}`;
  const full: EmployeeRecord = {
    ...newEmp,
    id,
    activeCaseloadCount: newEmp.activeCaseloadCount ?? 0,
    documents: newEmp.documents ?? [],
    equipment: newEmp.equipment ?? [],
    training: newEmp.training ?? [],
    notes: newEmp.notes ?? [],
    activity: [
      {
        id: `act-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        actor: "Byron Honea",
        action: "Employee Onboarded",
        details: `Created record for ${newEmp.name} as ${newEmp.jobTitle}.`,
      },
      ...(newEmp.activity ?? []),
    ],
  };
  saveStoredEmployees([...current, full]);
  return full;
}

export function deactivateEmployee(id: string, checklistNotes?: string): void {
  const current = getStoredEmployees();
  const next = current.map((emp) => {
    if (emp.id !== id) return emp;
    return {
      ...emp,
      status: "inactive" as const,
      availabilityStatus: "Offline" as const,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Employee Deactivated",
          details: checklistNotes
            ? `Offboarding complete. Responsibilities reassigned. Notes: ${checklistNotes}`
            : "Offboarding completed and login access revoked. History preserved.",
        },
        ...emp.activity,
      ],
    };
  });
  saveStoredEmployees(next);
}

export function reactivateEmployee(id: string): void {
  const current = getStoredEmployees();
  const next = current.map((emp) => {
    if (emp.id !== id) return emp;
    return {
      ...emp,
      status: "active" as const,
      availabilityStatus: "Available" as const,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Employee Reactivated",
          details: "Workforce record and CRM access restored to active status.",
        },
        ...emp.activity,
      ],
    };
  });
  saveStoredEmployees(next);
}

export interface WorkforceTotals {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
}

export function calculateWorkforceTotals(employees: EmployeeRecord[]): WorkforceTotals {
  return {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    onLeave: employees.filter((e) => e.status === "on_leave").length,
    inactive: employees.filter((e) => e.status === "inactive").length,
  };
}

export interface RoleCounts {
  advocate: number;
  call_center: number;
  documentation: number;
  technology: number;
  operations: number;
  management: number;
}

export function calculateRoleCounts(employees: EmployeeRecord[]): RoleCounts {
  const counts: RoleCounts = {
    advocate: 0,
    call_center: 0,
    documentation: 0,
    technology: 0,
    operations: 0,
    management: 0,
  };

  // Only count active or on-leave staff, or all employees
  employees.forEach((emp) => {
    const allRoles = Array.from(new Set([emp.primaryRole, ...(emp.additionalRoles || [])]));
    allRoles.forEach((role) => {
      if (role in counts) {
        counts[role as RoleId]++;
      }
    });
  });

  return counts;
}

export interface AttentionItem {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: "view_pto" | "view_coverage" | "view_employee" | "reassign";
  employeeId?: string;
}

export function calculateAttentionItems(
  employees: EmployeeRecord[],
  pendingTimeOffCount: number
): AttentionItem[] {
  const items: AttentionItem[] = [];

  // 1. Pending PTO requests
  if (pendingTimeOffCount > 0) {
    items.push({
      id: "att-pto",
      level: "critical",
      title: `${pendingTimeOffCount} Time-Off Request${pendingTimeOffCount > 1 ? "s" : ""} Waiting Approval`,
      description: "Staff leave requests requiring practice management review to sync calendar coverage.",
      actionLabel: "Review Requests",
      actionType: "view_pto",
    });
  }

  // 2. Active employees on leave requiring coverage
  const onLeaveStaff = employees.filter((e) => e.status === "on_leave");
  onLeaveStaff.forEach((emp) => {
    if (emp.primaryRole === "advocate" || emp.additionalRoles.includes("advocate")) {
      items.push({
        id: `att-cov-${emp.id}`,
        level: "critical",
        title: `Coverage Alert: ${emp.name} is on leave`,
        description: `Advocate has ${emp.activeCaseloadCount} active student cases. Verify IEP meeting assignments.`,
        actionLabel: "Check IEP Coverage",
        actionType: "view_coverage",
        employeeId: emp.id,
      });
    } else if (emp.primaryRole === "call_center") {
      items.push({
        id: `att-cc-${emp.id}`,
        level: "warning",
        title: `Call Center Coverage Needed: ${emp.name}`,
        description: "Intake phone queue shift needs coverage during employee absence.",
        actionLabel: "Assign Coverage",
        actionType: "reassign",
        employeeId: emp.id,
      });
    }
  });

  // 3. Equipment needing repair or unreturned
  employees.forEach((emp) => {
    const unreturned = emp.equipment?.filter((eq) => eq.status === "Repair");
    if (unreturned && unreturned.length > 0) {
      items.push({
        id: `att-eq-${emp.id}`,
        level: "warning",
        title: `Equipment Service Required: ${emp.name}`,
        description: `${unreturned.length} company asset(s) flagged for repair or replacement (${unreturned.map((u) => u.item).join(", ")}).`,
        actionLabel: "View Asset",
        actionType: "view_employee",
        employeeId: emp.id,
      });
    }
  });

  // 4. Overdue training
  employees.forEach((emp) => {
    const pastDue = emp.training?.filter((tr) => tr.status === "Past Due");
    if (pastDue && pastDue.length > 0) {
      items.push({
        id: `att-tr-${emp.id}`,
        level: "warning",
        title: `Mandatory Training Overdue: ${emp.name}`,
        description: `${pastDue.length} required module(s) past due: ${pastDue.map((p) => p.title).join(", ")}.`,
        actionLabel: "View Training",
        actionType: "view_employee",
        employeeId: emp.id,
      });
    }
  });

  return items;
}

/**
 * Checks whether an employee has access to a given CRM module.
 * 1. Checks specific employee override (if defined)
 * 2. Falls back to role default permissions
 * 3. Management role has access to all modules
 */
export function checkEmployeeModuleAccess(
  employee: EmployeeRecord,
  moduleId: string
): "none" | "view" | "edit" {
  // If employee has a specific override:
  if (employee.modulePermissions && moduleId in employee.modulePermissions) {
    return employee.modulePermissions[moduleId];
  }

  // Management role gets full access to everything
  if (employee.primaryRole === "management" || employee.additionalRoles.includes("management")) {
    return "edit";
  }

  // Check role defaults
  const allRoles = [employee.primaryRole, ...employee.additionalRoles];
  for (const roleId of allRoles) {
    const roleDef = ROLE_DEFINITIONS[roleId];
    if (roleDef) {
      if (roleDef.defaultModules.includes("all") || roleDef.defaultModules.includes(moduleId)) {
        return "edit";
      }
    }
  }

  return "none";
}
