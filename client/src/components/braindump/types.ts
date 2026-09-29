import React from "react";
import { Circle, Clock, Check, X, AlertCircle, Zap, Flame, Calendar, Tag } from "lucide-react";

export type Status = "not_started" | "in_progress" | "done" | "archived";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ViewMode = "wall" | "list" | "kanban" | "card";
export type NoteScope = "employee" | "company" | "unclassified";

export interface BrainItem {
  id: number;
  ownerId?: number;
  title: string;
  body?: string | null;
  category: string;
  status: Status;
  priority: Priority;
  nextStep?: string | null;
  pinned: boolean;
  tags: string[];
  scope: NoteScope;
  employeeId?: string | null;
  organizationId?: string;
  bringUpDate?: string | null;
  wallPositionX?: number | null;
  wallPositionY?: number | null;
  wallRotation?: number;
  taskConvertedId?: number | null;
  pinColor?: string;
  stickyColor?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const DEFAULT_CATEGORIES = [
  "Operations",
  "Email",
  "Website",
  "Content",
  "Business",
  "Resources",
  "CRM",
  "Clients",
  "Personal",
  "Marketing",
  "Legal",
  "Training",
  "General",
  "AI Tools",
  "Workflows",
];

// Soft pastel styling matching the approved prototypes
export const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Operations: { bg: "bg-teal-100/90 dark:bg-teal-950/70", text: "text-teal-800 dark:text-teal-200", border: "border-teal-300/60 dark:border-teal-700/50" },
  Email: { bg: "bg-sky-100/90 dark:bg-sky-950/70", text: "text-sky-800 dark:text-sky-200", border: "border-sky-300/60 dark:border-sky-700/50" },
  Website: { bg: "bg-fuchsia-100/90 dark:bg-fuchsia-950/70", text: "text-fuchsia-800 dark:text-fuchsia-200", border: "border-fuchsia-300/60 dark:border-fuchsia-700/50" },
  Content: { bg: "bg-rose-100/90 dark:bg-rose-950/70", text: "text-rose-800 dark:text-rose-200", border: "border-rose-300/60 dark:border-rose-700/50" },
  Business: { bg: "bg-emerald-100/90 dark:bg-emerald-950/70", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300/60 dark:border-emerald-700/50" },
  Resources: { bg: "bg-amber-100/90 dark:bg-amber-950/70", text: "text-amber-800 dark:text-amber-200", border: "border-amber-300/60 dark:border-amber-700/50" },
  CRM: { bg: "bg-indigo-100/90 dark:bg-indigo-950/70", text: "text-indigo-800 dark:text-indigo-200", border: "border-indigo-300/60 dark:border-indigo-700/50" },
  Clients: { bg: "bg-blue-100/90 dark:bg-blue-950/70", text: "text-blue-800 dark:text-blue-200", border: "border-blue-300/60 dark:border-blue-700/50" },
  Personal: { bg: "bg-pink-100/90 dark:bg-pink-950/70", text: "text-pink-800 dark:text-pink-200", border: "border-pink-300/60 dark:border-pink-700/50" },
  Marketing: { bg: "bg-orange-100/90 dark:bg-orange-950/70", text: "text-orange-800 dark:text-orange-200", border: "border-orange-300/60 dark:border-orange-700/50" },
  Legal: { bg: "bg-purple-100/90 dark:bg-purple-950/70", text: "text-purple-800 dark:text-purple-200", border: "border-purple-300/60 dark:border-purple-700/50" },
  Training: { bg: "bg-cyan-100/90 dark:bg-cyan-950/70", text: "text-cyan-800 dark:text-cyan-200", border: "border-cyan-300/60 dark:border-cyan-700/50" },
  Product: { bg: "bg-lime-100/90 dark:bg-lime-950/70", text: "text-lime-800 dark:text-lime-200", border: "border-lime-300/60 dark:border-lime-700/50" },
  Design: { bg: "bg-emerald-100/90 dark:bg-emerald-950/70", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300/60 dark:border-emerald-700/50" },
  General: { bg: "bg-slate-100/90 dark:bg-slate-800/80", text: "text-slate-800 dark:text-slate-200", border: "border-slate-300/60 dark:border-slate-600/50" },
};

export function getCategoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] || {
      bg: "bg-slate-100/90 dark:bg-slate-800/80",
      text: "text-slate-800 dark:text-slate-200",
      border: "border-slate-300/60 dark:border-slate-600/50",
    }
  );
}

export const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  not_started: {
    label: "Not Started",
    color: "bg-slate-800/60 text-slate-300 border-slate-700/60",
    dot: "bg-slate-400",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-950/60 text-blue-300 border-blue-800/60",
    dot: "bg-blue-400",
    icon: Clock,
  },
  done: {
    label: "Done",
    color: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
    dot: "bg-emerald-400",
    icon: Check,
  },
  archived: {
    label: "Archived",
    color: "bg-slate-900/60 text-slate-400 border-slate-800/60",
    dot: "bg-slate-600",
    icon: X,
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bar: string; dot: string; symbol: string; icon: React.ComponentType<{ className?: string }> }
> = {
  low: {
    label: "Low",
    color: "text-emerald-400",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    symbol: "↓",
    icon: Circle,
  },
  medium: {
    label: "Medium",
    color: "text-blue-400",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
    symbol: "ℹ",
    icon: AlertCircle,
  },
  high: {
    label: "High",
    color: "text-red-400",
    bar: "bg-red-500",
    dot: "bg-red-500",
    symbol: "!",
    icon: Zap,
  },
  urgent: {
    label: "Urgent",
    color: "text-rose-500",
    bar: "bg-rose-600",
    dot: "bg-rose-600",
    symbol: "🔥",
    icon: Flame,
  },
};

export const KANBAN_COLUMNS: Status[] = ["not_started", "in_progress", "done", "archived"];
