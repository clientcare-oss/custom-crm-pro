import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Bot, UserCheck, Users, HelpCircle } from "lucide-react";

export type AssignmentFilterValue = "all" | "manager" | "system_automation" | "employee" | "unassigned";

interface TaskAssignmentAreaProps {
  currentFilter: AssignmentFilterValue;
  onFilterChange: (filter: AssignmentFilterValue) => void;
  counts: {
    total: number;
    manager: number;
    automation: number;
    team: number;
    unassigned: number;
  };
}

export function TaskAssignmentArea({
  currentFilter,
  onFilterChange,
  counts,
}: TaskAssignmentAreaProps) {
  const filterButtons: {
    id: AssignmentFilterValue;
    label: string;
    icon: React.ReactNode;
    count: number;
    activeClass: string;
    badgeClass: string;
  }[] = [
    {
      id: "all",
      label: "All Sources",
      icon: <Users className="h-3.5 w-3.5" />,
      count: counts.total,
      activeClass: "bg-primary text-primary-foreground font-semibold shadow-xs",
      badgeClass: "bg-primary-foreground/20 text-primary-foreground",
    },
    {
      id: "manager",
      label: "Manager Assigned",
      icon: <Shield className="h-3.5 w-3.5 text-indigo-500" />,
      count: counts.manager,
      activeClass: "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/20",
      badgeClass: "bg-white/20 text-white",
    },
    {
      id: "system_automation",
      label: "System Automation",
      icon: <Bot className="h-3.5 w-3.5 text-cyan-500" />,
      count: counts.automation,
      activeClass: "bg-cyan-600 text-white font-semibold shadow-sm shadow-cyan-600/20",
      badgeClass: "bg-white/20 text-white",
    },
    {
      id: "employee",
      label: "Team / Self-Assigned",
      icon: <UserCheck className="h-3.5 w-3.5 text-emerald-500" />,
      count: counts.team,
      activeClass: "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/20",
      badgeClass: "bg-white/20 text-white",
    },
    {
      id: "unassigned",
      label: "Needs Assignee",
      icon: <HelpCircle className="h-3.5 w-3.5 text-amber-500" />,
      count: counts.unassigned,
      activeClass: "bg-amber-600 text-white font-semibold shadow-sm shadow-amber-600/20",
      badgeClass: "bg-white/20 text-white",
    },
  ];

  return (
    <div className="mb-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-3 shadow-xs">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
            Assignment Origin
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Know who assigned tasks (Manager vs System Automation vs Team)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{counts.manager}</span> Manager
          <span>•</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{counts.automation}</span> Automation
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{counts.team}</span> Team
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {filterButtons.map((btn) => {
          const isActive = currentFilter === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => onFilterChange(btn.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                isActive
                  ? btn.activeClass
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? btn.badgeClass : "bg-muted text-muted-foreground"
                }`}
              >
                {btn.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
