import React from "react";
import { trpc } from "@/lib/trpc";
import { Status, Priority, STATUS_CONFIG, PRIORITY_CONFIG } from "./types";

export function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cfg.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <Icon className="h-2.5 w-2.5 opacity-70" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function CategoryPill({ category }: { category: string }) {
  const colors: Record<string, string> = {
    CRM: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/40",
    "AI Tools": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/40",
    Workflows: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40",
    Business: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40",
    "Feature Requests": "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40",
    Automations: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/40",
    Operations: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40",
  };
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center ${
        colors[category] ?? "bg-muted/80 text-muted-foreground border border-border/50"
      }`}
    >
      {category}
    </span>
  );
}

export function SmallThumbnailStrip({ itemId }: { itemId: number }) {
  const { data: images = [] } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: itemId },
    { refetchOnWindowFocus: false }
  );
  if (!images.length) return null;
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
      {images.slice(0, 4).map((img) => (
        <a
          key={img.id}
          href={img.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-md overflow-hidden border border-border/70 flex-shrink-0 hover:ring-2 hover:ring-violet-400 hover:scale-105 transition-all shadow-2xs"
          title="Click to view full image"
        >
          <img src={img.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
        </a>
      ))}
      {images.length > 4 && (
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold flex-shrink-0 border border-border/50">
          +{images.length - 4}
        </div>
      )}
    </div>
  );
}
