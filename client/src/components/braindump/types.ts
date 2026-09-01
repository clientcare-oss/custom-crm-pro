import React from "react";
import { Circle, Clock, Check, X, AlertCircle, Zap, Flame } from "lucide-react";

export type Status = "not_started" | "in_progress" | "done" | "archived";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ViewMode = "list" | "kanban" | "card";

export interface BrainItem {
  id: number;
  title: string;
  body?: string | null;
  category: string;
  status: Status;
  priority: Priority;
  nextStep?: string | null;
  pinned: boolean;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const DEFAULT_CATEGORIES = [
  "General",
  "CRM",
  "AI Tools",
  "Workflows",
  "Business",
  "Feature Requests",
  "Automations",
  "Operations",
];

export const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  not_started: {
    label: "Not Started",
    color: "bg-muted/60 text-muted-foreground border-border",
    dot: "bg-muted-foreground",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500",
    icon: Clock,
  },
  done: {
    label: "Done",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
    icon: Check,
  },
  archived: {
    label: "Archived",
    color: "bg-muted/30 text-muted-foreground/60 border-border/40",
    dot: "bg-muted-foreground/40",
    icon: X,
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bar: string; icon: React.ComponentType<{ className?: string }> }
> = {
  low: {
    label: "Low",
    color: "text-muted-foreground",
    bar: "bg-muted-foreground/30",
    icon: Circle,
  },
  medium: {
    label: "Medium",
    color: "text-blue-500 dark:text-blue-400",
    bar: "bg-blue-400",
    icon: AlertCircle,
  },
  high: {
    label: "High",
    color: "text-amber-500 dark:text-amber-400",
    bar: "bg-amber-400",
    icon: Zap,
  },
  urgent: {
    label: "Urgent",
    color: "text-rose-500 dark:text-rose-400",
    bar: "bg-rose-500",
    icon: Flame,
  },
};

export const KANBAN_COLUMNS: Status[] = ["not_started", "in_progress", "done", "archived"];
