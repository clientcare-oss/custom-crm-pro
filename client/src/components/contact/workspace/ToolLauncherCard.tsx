import React from "react";
import { cn } from "@/lib/utils";
import {
  Wrench,
  Compass,
  FileText,
  Scale,
  FolderOpen,
  Users,
  CalendarCheck,
  FileSearch,
  Megaphone,
  Share2,
  ChevronRight,
} from "lucide-react";

interface ToolLauncherCardProps {
  contactId: number;
  caseId?: string | null;
  studentName: string;
  onLaunchTool: (toolKey: string) => void;
}

export function ToolLauncherCard({
  contactId,
  caseId,
  studentName,
  onLaunchTool,
}: ToolLauncherCardProps) {
  const tools = [
    {
      key: "compass",
      title: "Case Compass",
      subtitle: "Guidance & next steps",
      icon: Compass,
      accent: "text-blue-400",
    },
    {
      key: "blueprint",
      title: "IEP Blueprint",
      subtitle: "Build with confidence",
      icon: FileText,
      accent: "text-amber-400",
    },
    {
      key: "comparator",
      title: "IEP Comparator",
      subtitle: "Spot changes easily",
      icon: Scale,
      accent: "text-emerald-400",
    },
    {
      key: "records-review",
      title: "Records Review",
      subtitle: "Analyze documents",
      icon: FolderOpen,
      accent: "text-cyan-400",
    },
    {
      key: "parent-concerns",
      title: "Parent Concerns",
      subtitle: "Organize & plan",
      icon: Users,
      accent: "text-purple-400",
    },
    {
      key: "meeting-prep",
      title: "Meeting Prep",
      subtitle: "Be ready. Be heard.",
      icon: CalendarCheck,
      accent: "text-yellow-400",
    },
    {
      key: "pwn-decoder",
      title: "PWN Decoder",
      subtitle: "Plain language support",
      icon: FileSearch,
      accent: "text-rose-400",
    },
    {
      key: "complaint-engine",
      title: "Complaint Engine",
      subtitle: "Turn concerns into action",
      icon: Megaphone,
      accent: "text-orange-400",
    },
    {
      key: "timeline-builder",
      title: "Timeline Builder",
      subtitle: "Visualize the journey",
      icon: Share2,
      accent: "text-indigo-400",
    },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0E274D] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#F5B544]" />
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              Let's Get To Work
            </h3>
          </div>
          <span className="text-[11px] italic text-slate-400 font-serif hidden sm:inline">
            Tools for a stronger tomorrow.
          </span>
        </div>

        {/* 2-Column Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                onClick={() => onLaunchTool(tool.key)}
                className="group flex items-center justify-between p-3 rounded-xl bg-[#07162B]/90 hover:bg-[#0F2342] border border-[#0E274D] hover:border-[#F5B544]/40 transition-all text-left shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#0A1A33] border border-[#0E274D] flex items-center justify-center shrink-0 group-hover:border-[#F5B544]/50 transition-colors">
                    <Icon className={cn("h-4 w-4 transition-colors", tool.accent)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-[#F5B544] truncate transition-colors">
                      {tool.title}
                    </div>
                    <div className="text-[10.5px] text-slate-400 truncate">
                      {tool.subtitle}
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-[#F5B544] group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
