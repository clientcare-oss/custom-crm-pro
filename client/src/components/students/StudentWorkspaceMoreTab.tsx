import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  CalendarCheck2, SquarePen, Compass, Users, 
  UsersRound, ClipboardCheck, Landmark, Wrench, 
  CalendarDays, Clock, Coins, Link2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentWorkspaceMoreTabProps {
  studentId: string | number;
  caseId?: string;
  studentName?: string;
}

interface WorkspaceItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  external?: boolean;
}

export function StudentWorkspaceMoreTab({
  studentId,
  caseId,
  studentName,
}: StudentWorkspaceMoreTabProps) {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string>("meeting-workspace");

  const items: WorkspaceItem[] = useMemo(() => [
    {
      id: "activity-timeline",
      title: "Activity Timeline",
      description: "Every case action in one place.",
      icon: CalendarCheck2,
      onClick: () => {
        setSelectedId("activity-timeline");
        setLocation(`/contacts/${studentId}?tab=activity-timeline`);
      },
    },
    {
      id: "voyage-log",
      title: "Voyage Log",
      description: "Record case updates.",
      icon: SquarePen,
      onClick: () => {
        setSelectedId("voyage-log");
        setLocation(`/tools/voyage-recorder`);
      },
    },
    {
      id: "case-compass",
      title: "Case Compass",
      description: "Priorities and next steps.",
      icon: Compass,
      onClick: () => {
        setSelectedId("case-compass");
        setLocation(`/case-compass`);
      },
    },
    {
      id: "lawyer-status",
      title: "Lawyer Status",
      description: "Track legal involvement.",
      icon: Users,
      onClick: () => {
        setSelectedId("lawyer-status");
        setLocation(`/contacts/${studentId}?tab=details`);
      },
    },
    {
      id: "meeting-workspace",
      title: "Meeting Workspace",
      description: "Prepare and guide the meeting.",
      icon: UsersRound,
      onClick: () => {
        setSelectedId("meeting-workspace");
        setLocation(`/meeting-workspace/${studentId}`);
      },
    },
    {
      id: "post-meeting-review",
      title: "Post-Meeting Review",
      description: "Confirm decisions and follow-up.",
      icon: ClipboardCheck,
      onClick: () => {
        setSelectedId("post-meeting-review");
        setLocation(`/post-meeting-review/${studentId}`);
      },
    },
    {
      id: "state-complaint",
      title: "State Complaint",
      description: "Build the complaint and evidence.",
      icon: Landmark,
      onClick: () => {
        setSelectedId("state-complaint");
        setLocation(`/state-complaint-builder`);
      },
    },
    {
      id: "tools",
      title: "Tools",
      description: "Open your advocacy toolkit.",
      icon: Wrench,
      onClick: () => {
        setSelectedId("tools");
        setLocation(`/tools`);
      },
    },
    {
      id: "appointments",
      title: "Appointments",
      description: "View and schedule sessions.",
      icon: CalendarDays,
      onClick: () => {
        setSelectedId("appointments");
        setLocation(`/appointments`);
      },
    },
    {
      id: "time-management",
      title: "Time Management",
      description: "Track time spent on the case.",
      icon: Clock,
      onClick: () => {
        setSelectedId("time-management");
        setLocation(`/contacts/${studentId}?tab=time-tracker`);
      },
    },
    {
      id: "parent-portal-controls",
      title: "Parent Portal Controls",
      description: "Manage parent access and visibility.",
      icon: Users,
      onClick: () => {
        setSelectedId("parent-portal-controls");
        const targetUrl = caseId ? `/portal?caseId=${caseId}` : `/portal`;
        window.open(targetUrl, "_blank");
      },
      external: true,
    },
    {
      id: "billing",
      title: "Billing",
      description: "Payments, invoices, and balance.",
      icon: Coins,
      onClick: () => {
        setSelectedId("billing");
        setLocation(`/invoices`);
      },
    },
    {
      id: "referral",
      title: "Referral",
      description: "Track referrals and credits.",
      icon: Link2,
      onClick: () => {
        setSelectedId("referral");
        setLocation(`/contacts/${studentId}?tab=referral`);
      },
    },
  ], [studentId, caseId, setLocation]);

  return (
    <div className="w-full min-h-[500px] p-5 sm:p-7 md:p-8 select-none">
      {/* ─── 4-Column Grid: Exactly matching mockup with no header or searchbar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedId === item.id;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={item.onClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  item.onClick();
                }
              }}
              className={cn(
                "group relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-150 cursor-pointer select-none text-left",
                isSelected
                  ? "border-2 border-[#D4AF37] ring-1 ring-amber-400/40 bg-[#081e3e] shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)]"
                  : "border border-blue-900/60 bg-[#05152b]/90 hover:bg-[#092040]/90 hover:border-blue-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)]"
              )}
            >
              {/* Gold Metallic Icon */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 text-[#f3c258] group-hover:text-amber-300 group-hover:scale-105 transition-all">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.8] drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]" />
              </div>

              {/* Text Header & Subtitle */}
              <div className="min-w-0 flex-1">
                <h4
                  className="text-sm sm:text-[15px] font-bold text-white tracking-wide group-hover:text-[#fcedb8] transition-colors leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {item.title}
                </h4>
                <p className="text-[11.5px] sm:text-xs text-blue-200/60 leading-tight mt-0.5 group-hover:text-blue-200/80 transition-colors">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
