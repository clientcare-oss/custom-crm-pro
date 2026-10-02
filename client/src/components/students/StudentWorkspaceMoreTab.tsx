import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  SquarePen, Compass, Users, 
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

/**
 * Custom satin-brass calendar icon matching the reference image:
 * Top hanger tabs, rounded outer calendar frame, horizontal header dividing line,
 * and distinct square day cells.
 */
function TimelineCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top hanger tabs */}
      <line x1="8" y1="2.2" x2="8" y2="5.5" strokeWidth="2.2" />
      <line x1="16" y1="2.2" x2="16" y2="5.5" strokeWidth="2.2" />
      
      {/* Outer rounded calendar container */}
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      
      {/* Header divider line */}
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      
      {/* Day square cells directly matching the portfolio reference layout */}
      <rect x="6.5" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10.8" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="15.1" y="12" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="6.5" y="15.8" width="2.4" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StudentWorkspaceMoreTab({
  studentId,
  caseId,
  studentName,
}: StudentWorkspaceMoreTabProps) {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string>("activity-timeline");

  const items: WorkspaceItem[] = useMemo(() => [
    {
      id: "activity-timeline",
      title: "Activity Timeline",
      description: "Every case action in one place.",
      icon: TimelineCalendarIcon,
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
      {/* ─── Grid: Responsive columns allowing long titles like "Activity Timeline" to fit on 1 line ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                // Base layout & dimensions: identical padding, height, and alignment across all buttons
                "group relative w-full h-[88px] min-h-[88px] rounded-[12px] px-5 py-3 flex items-center gap-[18px]",
                "text-left select-none cursor-pointer transition-all duration-150 ease-out",
                // Keyboard focus outline in restrained warm brass
                "focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[#D4AF37]/90 focus-visible:border-[#C59E45]",
                // Surface: Translucent midnight-navy leather letting the portfolio texture subtly show through
                "bg-gradient-to-b from-[#0c2449]/55 via-[#071933]/65 to-[#030e20]/80 backdrop-blur-[1.5px]",
                // Thin muted steel-blue edge
                "border border-[#1d3f6d]/80",
                // Layered shadows: faint top highlight, bottom dark edge, soft external shadow beneath
                "shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.55),0_1px_3px_rgba(0,0,0,0.65)]",
                // Hover: Gently brightens leather surface and edge
                "hover:from-[#112f5a]/65 hover:via-[#092244]/75 hover:to-[#051328]/85",
                "hover:border-[#2b5894]/85",
                "hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.24),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.7)]",
                // Pressed state: Slightly compresses shadow to feel physically pressed
                "active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)]",
                // Selected state: Restrained brass outline
                isSelected && "border-[#C59E45]/85 ring-1 ring-[#D4AF37]/50 shadow-[0_0_14px_rgba(212,175,55,0.22),inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85)]"
              )}
            >
              {/* ─── Consistent 56px-wide icon area directly on button surface (no square box) ─── */}
              <div className="w-[56px] min-w-[56px] h-full flex items-center justify-center shrink-0">
                <Icon className="w-[36px] h-[36px] sm:w-[38px] sm:h-[38px] text-[#F1CB6C] stroke-[1.9] drop-shadow-[0_2px_3.5px_rgba(0,0,0,0.85)] group-hover:text-[#FDE295] group-hover:scale-[1.03] transition-all" />
              </div>

              {/* ─── Content Area: Left-aligned, refined serif title & muted blue description ─── */}
              <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                <h4
                  className="font-medium text-[15.5px] lg:text-[16px] text-[#F7F2E8] tracking-normal leading-tight whitespace-nowrap drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.85)] group-hover:text-[#FFF8EE] transition-colors"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {item.title}
                </h4>
                <p className="text-[12px] lg:text-[12.5px] text-[#93AECD] leading-[1.35] mt-1 line-clamp-2 group-hover:text-[#A8C4E6] transition-colors">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

