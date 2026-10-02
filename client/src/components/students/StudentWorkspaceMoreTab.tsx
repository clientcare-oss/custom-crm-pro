import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Search, CalendarCheck2, SquarePen, Compass, Users, 
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

interface WorkspaceCategory {
  id: string;
  name: string;
  items: WorkspaceItem[];
}

export function StudentWorkspaceMoreTab({
  studentId,
  caseId,
  studentName,
}: StudentWorkspaceMoreTabProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("meeting-workspace");

  const categories: WorkspaceCategory[] = useMemo(() => [
    {
      id: "case",
      name: "CASE",
      items: [
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
      ],
    },
    {
      id: "advocacy",
      name: "ADVOCACY",
      items: [
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
      ],
    },
    {
      id: "coordination",
      name: "COORDINATION",
      items: [
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
      ],
    },
    {
      id: "account",
      name: "ACCOUNT",
      items: [
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
      ],
    },
  ], [studentId, caseId, setLocation]);

  // Filter categories and items based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery]);

  return (
    <div className="w-full min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-5 sm:pt-7 flex flex-col justify-between select-none">
      <div>
        {/* ─── Top Header: Title, Subtitle & Search Input ─────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-7 border-b border-[#1b3b6f]/40 gap-4">
          <div>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-wide text-[#f6ecd9] drop-shadow-md"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Student Workspace
            </h2>
            <p className="text-sm sm:text-base text-blue-200/75 mt-1 font-normal">
              Choose where to work on this case.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 self-start md:self-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in workspace"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#03132b]/80 border border-blue-900/60 text-white placeholder-blue-300/40 text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>
        </div>

        {/* ─── Categorized Rows ────────────────────────────────────────────── */}
        <div className="space-y-6 sm:space-y-7">
          {filteredCategories.map((category, idx) => (
            <div
              key={category.id}
              className={cn(
                "pb-6 flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6",
                idx !== filteredCategories.length - 1 && "border-b border-[#1b3b6f]/35"
              )}
            >
              {/* Category Name Column */}
              <div className="w-full lg:w-36 shrink-0 pt-2 flex items-center lg:block">
                <span className="text-xs sm:text-[13px] font-bold tracking-[0.16em] text-[#d4af37] uppercase font-serif">
                  {category.name} —
                </span>
              </div>

              {/* Items Grid for this Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 flex-1">
                {category.items.map((item) => {
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
                        "group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer select-none text-left",
                        isSelected
                          ? "border-2 border-[#D4AF37] ring-1 ring-amber-400/40 bg-[#081f44]/80 shadow-[0_4px_16px_rgba(212,175,55,0.22),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                          : "border border-transparent hover:border-blue-700/40 hover:bg-[#071c3c]/50"
                      )}
                    >
                      {/* Embossed Dark Bevel Icon Button */}
                      <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-b from-[#0c2242] to-[#040e1e] border border-blue-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center text-[#f3c868] shrink-0 group-hover:scale-105 group-hover:text-amber-200 transition-all">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
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
          ))}

          {filteredCategories.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/60 text-sm">
                No workspace tools found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
