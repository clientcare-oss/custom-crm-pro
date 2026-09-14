import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Bot, UserCheck, Zap, User } from "lucide-react";

export type AssignmentSource = "manager" | "system_automation" | "self" | "employee";

interface TaskAssignmentBadgeProps {
  source?: AssignmentSource | string | null;
  assignedByName?: string | null;
  className?: string;
  compact?: boolean;
}

export function TaskAssignmentBadge({
  source = "manager",
  assignedByName,
  className = "",
  compact = false,
}: TaskAssignmentBadgeProps) {
  const normalizedSource = (source || "manager").toLowerCase();

  if (normalizedSource === "system_automation") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 font-medium border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ${
          compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
        } ${className}`}
        title="Created automatically by system workflow, intake trigger, or automation rule"
      >
        <Bot className={compact ? "h-2.5 w-2.5 text-cyan-500" : "h-3 w-3 text-cyan-500"} />
        <span>{compact ? "Automation" : (assignedByName || "System Automation")}</span>
      </Badge>
    );
  }

  if (normalizedSource === "self") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 font-medium border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300 ${
          compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
        } ${className}`}
        title="Self-assigned task"
      >
        <UserCheck className={compact ? "h-2.5 w-2.5 text-slate-500" : "h-3 w-3 text-slate-400"} />
        <span>Self-Assigned</span>
      </Badge>
    );
  }

  if (normalizedSource === "employee") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ${
          compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
        } ${className}`}
        title={`Assigned by staff member: ${assignedByName || "Team Member"}`}
      >
        <User className={compact ? "h-2.5 w-2.5 text-emerald-500" : "h-3 w-3 text-emerald-500"} />
        <span>{compact ? (assignedByName || "Staff") : `Staff: ${assignedByName || "Team Member"}`}</span>
      </Badge>
    );
  }

  // Default: Manager Assigned (Byron Honea / Supervisor)
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ${
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
      } ${className}`}
      title={`Assigned by Supervisor / Manager: ${assignedByName || "Byron Honea"}`}
    >
      <Shield className={compact ? "h-2.5 w-2.5 text-indigo-500" : "h-3 w-3 text-indigo-500"} />
      <span>{compact ? "Manager" : `Manager: ${assignedByName || "Byron Honea"}`}</span>
    </Badge>
  );
}
